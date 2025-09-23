# src/yamlguard/server/main.py
from typing import List, Optional
from fastapi import FastAPI
from pydantic import BaseModel, Field

from yamlguard.core.loader import load_yaml, dump_yaml
from yamlguard.core.optimize import canonicalize
from yamlguard.core.rules import apply_rules
from yamlguard.core.locate import guess_location

app = FastAPI(title="YAML Guard (Local)")

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
    file: Optional[str] = None  # we add this after rule evaluation
    line: Optional[int] = None          # <-- new
    snippet: Optional[str] = None       # <-- new

class OptimizedFile(BaseModel):
    path: str
    content: str

class ValidateReq(BaseModel):
    files: List[FileIn] = Field(
        examples=[[{"path": "examples/pod-bad.yaml", "content": "apiVersion: v1\nkind: Pod\n..."}]]
    )
    rules: Optional[List[dict]] = Field(
        default=None,
        description="Array of rule objects (from policies/*.yaml)"
    )
    optimize: bool = False

class ValidateResp(BaseModel):
    ok: bool
    findings: List[AssertionFinding]
    optimized: List[OptimizedFile] = []

# ---- Routes ----

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/v1/validate", response_model=ValidateResp, summary="Validate YAML using rules")
def validate(req: ValidateReq):
    findings: List[dict] = []
    optimized: List[OptimizedFile] = []

    rules = req.rules or []

    for f in req.files:
        # keep original text for location lookup
        original_text = f.content

        doc = load_yaml(f.content)
        fs = apply_rules(doc, rules)
        for x in fs:
            x["file"] = f.path
            # best-effort line+snippet
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
