# src/yamlguard/server/main.py
from fastapi import FastAPI
from pydantic import BaseModel

from yamlguard.core.loader import load_yaml, dump_yaml
from yamlguard.core.optimize import canonicalize
from yamlguard.core.rules import apply_rules

app = FastAPI(title="YAML Guard (Local)")


class FileIn(BaseModel):
    path: str
    content: str


class ValidateReq(BaseModel):
    files: list[FileIn]
    rules: list[dict] | None = None
    optimize: bool = False


@app.post("/v1/validate")
def validate(req: ValidateReq):
    findings = []
    optimized = []

    rules = req.rules or []

    for f in req.files:
        doc = load_yaml(f.content)
        fs = apply_rules(doc, rules)
        for x in fs:
            x["file"] = f.path
        findings.extend(fs)

        if req.optimize:
            opt = canonicalize(doc)
            optimized.append({"path": f.path, "content": dump_yaml(opt)})

    return {"ok": len(findings) == 0, "findings": findings, "optimized": optimized}
