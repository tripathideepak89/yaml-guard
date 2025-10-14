# src/yamlguard/server/main.py
import glob
import os
import pathlib
import time
from collections import defaultdict
from typing import List, Optional

import importlib.metadata
from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from ruamel.yaml import YAML
from starlette.middleware.base import BaseHTTPMiddleware

from yamlguard.core.loader import dump_yaml, load_yaml
from yamlguard.core.locate import guess_location
from yamlguard.core.optimize import canonicalize
from yamlguard.core.recommend import suggest_for_file, suggest_for_finding
from yamlguard.core.rules import apply_rules

app = FastAPI(title="YAML Guard API", version="1.0.0")

# Production CORS configuration
_origins_env = os.getenv("ALLOWED_ORIGINS", "*")
if _origins_env == "*":
    _allowed_origins = ["*"]
else:
    _allowed_origins = [o.strip() for o in _origins_env.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True if _allowed_origins != ["*"] else False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# Request size limit middleware
MAX_BYTES = int(os.environ.get("MAX_BYTES", "2000000"))

class RequestSizeLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.method in ["POST", "PUT", "PATCH"]:
            content_length = request.headers.get("content-length")
            if content_length and int(content_length) > MAX_BYTES:
                return Response(
                    content="Request too large",
                    status_code=413,
                    media_type="text/plain"
                )
        return await call_next(request)

app.add_middleware(RequestSizeLimitMiddleware)

# Simple in-memory rate limiting
RL_WINDOW_SECONDS = int(os.environ.get("RL_WINDOW_SECONDS", "60"))
RL_MAX_REQUESTS = int(os.environ.get("RL_MAX_REQUESTS", "120"))
rate_limit_storage = defaultdict(list)

class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        client_ip = request.client.host if request.client else "unknown"
        now = time.time()
        
        # Clean old entries
        rate_limit_storage[client_ip] = [
            timestamp for timestamp in rate_limit_storage[client_ip]
            if now - timestamp < RL_WINDOW_SECONDS
        ]
        
        # Check rate limit
        if len(rate_limit_storage[client_ip]) >= RL_MAX_REQUESTS:
            return Response(
                content="Rate limit exceeded",
                status_code=429,
                media_type="text/plain"
            )
        
        # Record this request
        rate_limit_storage[client_ip].append(now)
        
        return await call_next(request)

app.add_middleware(RateLimitMiddleware)

# ---- Models ----


class FileIn(BaseModel):
    path: str = Field(examples=["examples/pod-bad.yaml"])
    content: str = Field(description="Raw YAML content")


class AssertionFinding(BaseModel):
    rule_id: str
    severity: str
    path: str
    message: str
    values: List[str] = []
    remediation: Optional[str] = None
    file: Optional[str] = None
    line: Optional[int] = None
    snippet: Optional[str] = None


class OptimizedFile(BaseModel):
    path: str
    content: str


class ValidateReq(BaseModel):
    files: List[FileIn] = Field(
        examples=[[{"path": "examples/pod-bad.yaml", "content": "apiVersion: v1\nkind: Pod\n..."}]]
    )
    rules: Optional[List[dict]] = Field(
        default=None, description="Array of rule objects (from policies/*.yaml)"
    )
    optimize: bool = False


class ValidateResp(BaseModel):
    ok: bool
    findings: List[AssertionFinding]
    optimized: List[OptimizedFile] = []


class SuggestionOut(BaseModel):
    file: str
    title: str
    rationale: str
    diff: str
    confidence: float


class SuggestReq(ValidateReq):
    pass


class SuggestResp(BaseModel):
    suggestions: List[SuggestionOut] = []


class PolicyMeta(BaseModel):
    group: str
    file: str
    rules: int


class PolicyListResp(BaseModel):
    policies: List[PolicyMeta]


class PolicyFileResp(BaseModel):
    group: str
    file: str
    content: str


# ---- Routes ----


@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/version")
def version():
    try:
        version = importlib.metadata.version("yamlguard")
    except importlib.metadata.PackageNotFoundError:
        version = "0.0.0"
    return {"version": version}

@app.get("/favicon.ico")
def favicon():
    return Response(status_code=204)


POLICY_BASE_DIR = os.path.abspath(
    os.path.join(
        os.path.dirname(__file__),
        "..",
        "..",
        "..",
        "policies",
    )
)


def _policy_dir() -> str:
    if os.path.isdir(POLICY_BASE_DIR):
        return POLICY_BASE_DIR
    alt = os.path.abspath(os.path.join(os.getcwd(), "policies"))
    return alt if os.path.isdir(alt) else ""


def _count_rules(text: str) -> int:
    return sum(1 for ln in text.splitlines() if ln.lstrip().startswith("- id:"))


def _load_all_policy_rules() -> list[dict]:
    base = _policy_dir()
    if not base:
        return []
    yaml = YAML(typ="safe")
    out: list[dict] = []
    for group in sorted(os.listdir(base)):
        gpath = os.path.join(base, group)
        if not os.path.isdir(gpath):
            continue
        for file in sorted(glob.glob(os.path.join(gpath, "*.yaml"))):
            try:
                with open(file, "r", encoding="utf-8") as fh:
                    docs = list(yaml.load_all(fh))
                for doc in docs:
                    if isinstance(doc, list):
                        for item in doc:
                            if isinstance(item, dict) and "id" in item:
                                out.append(item)
                    elif isinstance(doc, dict) and "id" in doc:
                        out.append(doc)
            except Exception:
                continue
    return out


@app.get("/v1/policies", response_model=PolicyListResp, summary="List available policy files")
def list_policies():
    base = _policy_dir()
    if not base:
        return PolicyListResp(policies=[])
    metas: List[PolicyMeta] = []
    for group in sorted(os.listdir(base)):
        gpath = os.path.join(base, group)
        if not os.path.isdir(gpath):
            continue
        for file in sorted(glob.glob(os.path.join(gpath, "*.yaml"))):
            try:
                with open(file, "r", encoding="utf-8") as fh:
                    txt = fh.read()
                metas.append(
                    PolicyMeta(
                        group=group,
                        file=os.path.basename(file),
                        rules=_count_rules(txt),
                    )
                )
            except Exception:
                continue
    return PolicyListResp(policies=metas)


@app.get(
    "/v1/policies/{group}/{file}",
    response_model=PolicyFileResp,
    summary="Fetch raw policy file",
)
def get_policy(group: str, file: str):
    base = _policy_dir()
    path = os.path.join(base, group, file)
    if not os.path.isfile(path):
        raise HTTPException(status_code=404, detail="Policy not found")
    with open(path, "r", encoding="utf-8") as fh:
        txt = fh.read()
    return PolicyFileResp(group=group, file=file, content=txt)


# --- Optional Static UI Mount (/ui) ---
_here = pathlib.Path(__file__).resolve().parent
_ui_dist = _here.parent.parent.parent / "ui" / "dist"
if _ui_dist.is_dir():
    app.mount("/ui", StaticFiles(directory=str(_ui_dist), html=True), name="ui")


@app.post("/v1/validate", response_model=ValidateResp, summary="Validate YAML using rules")
def validate(req: ValidateReq):
    findings: List[dict] = []
    optimized: List[OptimizedFile] = []
    rules = (
        req.rules
        if (req.rules not in (None, []) and len(req.rules) > 0)
        else _load_all_policy_rules()
    )
    for f in req.files:
        original_text = f.content
        doc = load_yaml(f.content)
        fs = apply_rules(doc, rules)
        for x in fs:
            x["file"] = f.path
            ln, snip = guess_location(original_text, x.get("path", ""), x.get("values", []))
            if ln is not None:
                x["line"] = ln
            if snip:
                x["snippet"] = snip
        findings.extend(fs)
        if req.optimize:
            opt = canonicalize(doc)
            optimized.append(OptimizedFile(path=f.path, content=dump_yaml(opt)))
    return ValidateResp(ok=(len(findings) == 0), findings=findings, optimized=optimized)


@app.post("/v1/suggest", response_model=SuggestResp, summary="Suggest fixes for YAML findings")
def suggest(req: SuggestReq):
    suggestions: list[SuggestionOut] = []
    rules = (
        req.rules
        if (req.rules not in (None, []) and len(req.rules) > 0)
        else _load_all_policy_rules()
    )
    for f in req.files:
        doc = load_yaml(f.content)
        fs = apply_rules(doc, rules)
        combo = suggest_for_file(f.path, fs, f.content)
        if combo:
            suggestions.append(
                SuggestionOut(
                    file=f.path,
                    title=combo.title,
                    rationale=combo.rationale,
                    diff=combo.diff,
                    confidence=combo.confidence,
                )
            )
            continue
        for x in fs:
            s = suggest_for_finding(f.path, x, f.content)
            if s:
                suggestions.append(
                    SuggestionOut(
                        file=f.path,
                        title=s.title,
                        rationale=s.rationale,
                        diff=s.diff,
                        confidence=s.confidence,
                    )
                )
    return SuggestResp(suggestions=suggestions)
