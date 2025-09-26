#!/usr/bin/env python
"""Convenience script to build the React UI and start the FastAPI server.

Usage:
  python scripts/build_and_serve_ui.py [--port 8080] [--skip-install]

Steps:
  1. (Optional) npm install (unless --skip-install)
  2. npm run build in ui/
  3. Launch uvicorn yamlguard.server.main:app --port <port>

The FastAPI server auto-mounts the built UI at /ui if ui/dist exists.
"""

from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
UI_DIR = os.path.join(ROOT, "ui")


def run(cmd: list[str], cwd: str | None = None):
    print(f"[run] {' '.join(cmd)} (cwd={cwd or os.getcwd()})")
    proc = subprocess.run(cmd, cwd=cwd, check=False)
    if proc.returncode != 0:
        print(f"Command failed with code {proc.returncode}", file=sys.stderr)
        sys.exit(proc.returncode)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8080)
    parser.add_argument("--skip-install", action="store_true", help="Skip npm install step")
    parser.add_argument(
        "--no-serve",
        action="store_true",
        help="Only build the UI; do not launch server",
    )
    args = parser.parse_args()

    if not shutil.which("node") or not shutil.which("npm"):
        print("ERROR: node/npm not found in PATH. Install Node.js first.", file=sys.stderr)
        sys.exit(1)

    if not args.skip_install:
        run(["npm", "install"], cwd=UI_DIR)
    run(["npm", "run", "build"], cwd=UI_DIR)

    if args.no_serve:
        print("UI build complete. Skipping server launch (--no-serve).")
        return

    # Launch uvicorn (inherits current virtual env if active)
    if not shutil.which("uvicorn"):
        print(
            "WARNING: uvicorn not found. Install project dependencies first (pip install -e .).",
            file=sys.stderr,
        )
        sys.exit(1)
    run(
        [
            "uvicorn",
            "yamlguard.server.main:app",
            "--host",
            "127.0.0.1",
            "--port",
            str(args.port),
            "--reload",
        ],
        cwd=ROOT,
    )


if __name__ == "__main__":
    main()
