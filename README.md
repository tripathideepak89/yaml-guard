# YAML Guard (Local Starter)


A minimal, local-first DevSecOps helper that validates and lint/guards YAML files with simple rules. It exposes:
- A **CLI**: `yamlguard <files|globs> [--rules policies/k8s/core.yaml] [--optimize]`
- A **REST API** (FastAPI) at `http://127.0.0.1:8000` with endpoints like `/v1/validate`, `/v1/policies`, `/v1/suggest`.
- A lightweight **Web UI** (React + Vite) for uploading/editing YAML, loading policy rules, validating, and viewing auto-fix suggestions.


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
uvicorn yamlguard.server.main:app --reload --port 8000


# 6) Call the API (same machine)
curl -s -H "Content-Type: application/json" \
	-d '{"files":[{"path":"pod-bad.yaml","content":"'"$(cat examples/pod-bad.yaml | sed 's/"/\\"/g')"'"}],"optimize":false,"rules":'"$(cat policies/k8s/core.yaml | jq -Rs '.')"'}' \
	http://127.0.0.1:8000/v1/validate | jq .
```

## Web UI

The optional web UI lives under `ui/` and talks to the local FastAPI server.

### Dev Mode

```bash
cd ui
npm install
npm run dev
```

Open http://127.0.0.1:5173 (the UI will call the API at `http://127.0.0.1:8000` by default).

You can override the backend base via an environment variable when starting Vite:

```bash
VITE_API_BASE=http://127.0.0.1:8000 npm run dev
```

### Production Build & Serve

```bash
cd ui
npm run build
```

If the `ui/dist` directory exists when the Python server starts, it will be mounted at `/ui` (e.g. http://127.0.0.1:8000/ui/).

### One-Click Dev (Backend + UI)

You can launch both the FastAPI backend (auto rule loading) and the React UI in a single step:

Option 1 (VS Code Task):

1. Open the command palette (Ctrl/Cmd+Shift+P) and run: Tasks: Run Task.
2. Choose `Dev: Start All (parallel)`.
3. This starts `uvicorn` (reload) and `npm run dev` concurrently.

Option 2 (Python helper script):

```bash
python scripts/start_all.py
```

The script:
* Finds free ports near 8000 (API) and 5173 (UI) if defaults are busy.
* Exports `VITE_API_BASE` for the UI automatically.
* Prints URLs once healthy.

Flags:
```bash
python scripts/start_all.py --no-ui            # Only backend
python scripts/start_all.py --no-api           # Only UI
python scripts/start_all.py --api-port 9000 --ui-port 6000
```

Press Ctrl+C to stop both processes.

### Features

* List available policies (`/v1/policies`) grouped by directory.
* View raw policy file content and add its rules to the in-memory working set.
* Create / edit multiple YAML files inline and validate against selected rules.
* View findings with severity, file, JSONPath, message, line number, and snippets.
* Request suggestions (aggregated or per-finding) and view unified diffs.
* Toggle optimization (canonicalization) when validating.
* Automatic policy rule loading: omit `rules` (or pass empty list) and the server aggregates rules from every file under `policies/**`.


### Roadmap Ideas

* Persist last edited docs in `localStorage` (DONE).
* Drag & drop file upload (DONE).
* Export patched YAML after applying suggestions (DONE).
* Rule editor / authoring workflow (PLANNED).

## Smoke Test Scripts

After starting the API (e.g. on port 8000), you can run a quick end-to-end smoke test:

```bash
python scripts/smoke_validate.py --host http://127.0.0.1:8000
```

OR using the requests-based variant:

```bash
python scripts/smoke_requests.py --host http://127.0.0.1:8000
```

Sample output:

```
Validate: ok=False findings=3 (high:2, medium:1)
Suggest: suggestions=1
	First suggestion title: Pin image tag
```

This aggregates all policy rules (either client-side or via omission on the API) and exercises `/v1/validate` and `/v1/suggest`.

## Containerized Usage

You can build and run a container that bundles the FastAPI backend and the compiled React UI (served at `/ui`).

### Build Image

```bash
docker build -t yamlguard:latest .
```

Override the baked-in API base for the UI (default `http://localhost:8000`) during build:

```bash
docker build --build-arg VITE_API_BASE=http://localhost:8000 -t yamlguard:latest .
```

### Run Container

```bash
docker run --rm -p 8000:8000 yamlguard:latest
```

Open:
- API: http://127.0.0.1:8000/v1/policies
- UI:  http://127.0.0.1:8000/ui/

The container includes all policy files under `policies/**` and examples under `examples/`.

### docker-compose (Recommended for Dev + Tests)

Bring up the API (and UI) with:

```bash
docker compose up --build
```

Run tests in an isolated stage:

```bash
docker compose --profile test up --build --abort-on-container-exit --exit-code-from tests
```

Or build and execute the test target directly:

```bash
docker build -t yamlguard-test --target test .
docker run --rm yamlguard-test
```

### Hot-Reload UI Separately (Optional)

If you want live UI development while the API runs in the container, enable the `dev` profile which launches a lightweight Node container mounting your local `ui/` directory:

```bash
docker compose --profile dev up api ui-dev
```

This keeps the Python API inside the image while Vite serves the UI with hot reload on your host at http://127.0.0.1:5173.

### Passing Custom Policies

Mount a host directory containing additional policies:

```bash
docker run --rm -p 8000:8000 -v "$(pwd)/policies:/app/policies:ro" yamlguard:latest
```

### Health Check

The image includes a Docker healthcheck hitting `/health`. Compose will report the container as healthy once the FastAPI app is ready.

### Smoke Test Against Running Container

```bash
python scripts/smoke_validate.py --host http://127.0.0.1:8000
```

Or from another container (after compose up):

```bash
docker compose exec api python scripts/smoke_validate.py --host http://127.0.0.1:8000
```

### Suggested Workflow

1. Iterate locally (Python / UI) as before.
2. Build image to ensure reproducibility.
3. Run test target (or compose test profile) in CI to guarantee production parity.
4. Ship the single image (contains both API + static UI) to your registry.

### Image Size Optimization (Future)

Potential optimizations not yet applied:
* Use `--only=production` or `pnpm` for faster UI install.
* Multi-stage with a wheel build + slim runtime copying only wheels.
* Distroless / Python base trimming once dependencies stabilized.

Contributions welcome!
