# YAML Guard (Local Starter)


A minimal, local-first DevSecOps helper that validates and lint/guards YAML files with simple rules. It exposes:
- A **CLI**: `yamlguard <files|globs> [--rules policies/k8s/core.yaml] [--optimize]`
- A **REST API** (FastAPI) at `http://127.0.0.1:8080` with a `/v1/validate` endpoint.


## Quick start
```bash
# 1) Create and enter a virtual environment (recommended)
python -m venv .venv && source .venv/bin/activate


# 2) Install in editable mode (and test deps)
pip install -e .[dev]


# 3) Try the CLI
yamlguard examples/pod-bad.yaml --rules policies/k8s/core.yaml || true


# 4) Run tests
pytest


# 5) Start API server
uvicorn yamlguard.server.main:app --reload --port 8080


# 6) Call the API (same machine)
curl -s -H "Content-Type: application/json" \
-d '{"files":[{"path":"pod-bad.yaml","content":"'"$(cat examples/pod-bad.yaml | sed 's/"/\\"/g')"'"}],"optimize":false,"rules":'"$(cat policies/k8s/core.yaml | jq -Rs '.')"'}' \
http://127.0.0.1:8080/v1/validate | jq .