###############################
# YAML Guard Multi-Stage Image #
###############################
# Targets:
#  - ui-build : Build the production React UI (Vite)
#  - base     : Python base with deps (prod only)
#  - runtime  : Final image (FastAPI + optional static UI mounted at /ui)
#  - test     : Installs dev deps & runs pytest (use: --target test)

######## UI BUILD STAGE ########
FROM node:22-alpine AS ui-build
WORKDIR /app/ui

# Build arg to configure API base baked into the UI (optional)
ARG VITE_API_BASE="http://localhost:8000"
ENV VITE_API_BASE=${VITE_API_BASE}

COPY ui/package.json ./
# Copy lock file if present for better caching (will not fail if absent)
COPY ui/package-lock.json ./
RUN npm install --no-audit --no-fund || npm install --no-audit --no-fund

COPY ui/ .
# Build the production bundle (will emit to ui/dist)
RUN npm run build

######## PYTHON BASE STAGE ########
FROM python:3.12-slim AS base
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# System deps (add as needed; keeping minimal)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl ca-certificates && \
    rm -rf /var/lib/apt/lists/*

COPY pyproject.toml README.md ./
COPY src ./src
COPY policies ./policies
COPY examples ./examples

######## INSTALL PROD DEPS ########
RUN pip install --upgrade pip && pip install .

######## RUNTIME STAGE ########
FROM base AS runtime
ARG BUILD_DATE
ARG VCS_REF
LABEL org.opencontainers.image.title="yamlguard" \
      org.opencontainers.image.description="Local-first YAML validation + policy guard (FastAPI + optional React UI)" \
      org.opencontainers.image.source="https://github.com/tripathideepak89/yaml-guard" \
      org.opencontainers.image.revision=$VCS_REF \
      org.opencontainers.image.created=$BUILD_DATE

# Copy built UI (if present) from ui-build stage
COPY --from=ui-build /app/ui/dist ./ui/dist

EXPOSE 8000
ENV YAML_GUARD_ALLOWED_ORIGINS="*"

# Basic healthcheck hitting /health (inline python -c)
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s CMD python -c "import urllib.request,sys,json;u='http://127.0.0.1:8000/health';\n\
import contextlib;\n\
import socket;\n\
try:\n\
    with contextlib.closing(urllib.request.urlopen(u,timeout=2)) as r:\n\
        d=json.loads(r.read().decode());\n\
        sys.exit(0 if d.get('status')=='ok' else 1)\n\
except Exception as e:\n\
    sys.exit(1)" || exit 1
CMD ["uvicorn", "yamlguard.server.main:app", "--host", "0.0.0.0", "--port", "8000"]

######## TEST STAGE (optional) ########
FROM base AS test
RUN pip install .[dev]
COPY tests ./tests
# Default command runs tests quietly
CMD ["pytest", "-q"]
