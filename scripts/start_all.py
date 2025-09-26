#!/usr/bin/env python
"""One-click dev launcher: starts backend (uvicorn --reload) and UI (vite dev).

Usage: python scripts/start_all.py [--no-ui] [--no-api]

Detects free alternative ports if defaults are busy.
"""
from __future__ import annotations

import argparse
import os
import socket
import subprocess
import sys
import time
from contextlib import closing

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
UI_DIR = os.path.join(ROOT, "ui")


def free_port(start: int, limit: int = 30) -> int:
    for p in range(start, start + limit):
        with closing(socket.socket(socket.AF_INET, socket.SOCK_STREAM)) as s:
            if s.connect_ex(("127.0.0.1", p)) != 0:
                return p
    raise SystemExit("No free port available")


def spawn(cmd: list[str], cwd: str | None = None) -> subprocess.Popen:
    print(f"[spawn] {' '.join(cmd)} (cwd={cwd or os.getcwd()})")
    return subprocess.Popen(cmd, cwd=cwd)


def wait_log(url: str, retries: int = 40, delay: float = 0.25):  # pragma: no cover
    try:
        import urllib.request
    except Exception:
        print("urllib missing? unexpected", file=sys.stderr)
        return
    for _ in range(retries):
        try:
            with urllib.request.urlopen(url, timeout=0.5):  # nosec B310
                print(f"[ready] {url}")
                return
        except Exception:
            time.sleep(delay)
    print(f"[warn] Timeout waiting for {url}")


def main(argv: list[str]):
    ap = argparse.ArgumentParser()
    ap.add_argument("--no-ui", action="store_true", help="Skip starting Vite UI dev server")
    ap.add_argument("--no-api", action="store_true", help="Skip starting FastAPI server")
    ap.add_argument("--api-port", type=int, default=8000, help="Preferred API port")
    ap.add_argument("--ui-port", type=int, default=5173, help="Preferred UI port")
    args = ap.parse_args(argv)

    procs: list[subprocess.Popen] = []

    try:
        api_port = free_port(args.api_port) if not args.no_api else None
        ui_port = free_port(args.ui_port) if not args.no_ui else None

        env = os.environ.copy()
        if api_port and ui_port:
            env["VITE_API_BASE"] = f"http://127.0.0.1:{api_port}"

        if not args.no_api:
            procs.append(
                spawn(
                    [
                        "uvicorn",
                        "yamlguard.server.main:app",
                        "--reload",
                        "--host",
                        "127.0.0.1",
                        "--port",
                        str(api_port),
                    ],
                    cwd=ROOT,
                )
            )
            wait_log(f"http://127.0.0.1:{api_port}/health")

        if not args.no_ui:
            # Ensure deps installed (best effort)
            if not os.path.isdir(os.path.join(UI_DIR, "node_modules")):
                subprocess.run(["npm", "install"], cwd=UI_DIR, check=False)
            procs.append(
                spawn(
                    ["npm", "run", "dev", "--", "--port", str(ui_port)],
                    cwd=UI_DIR,
                )
            )

        print()
        if api_port:
            print(f"API:    http://127.0.0.1:{api_port}")
        if ui_port:
            print(f"UI:     http://127.0.0.1:{ui_port}")
            if api_port:
                print(f"(UI dev server proxies to API base {env.get('VITE_API_BASE')})")
        print("Press Ctrl+C to stop all.")

        # Wait forever
        while True:  # pragma: no cover
            time.sleep(2)

    except KeyboardInterrupt:  # pragma: no cover
        print("\n[shutdown] Stopping processes...")
    finally:
        for p in procs:
            if p.poll() is None:
                p.terminate()
        for p in procs:
            try:
                p.wait(timeout=5)
            except Exception:
                pass


if __name__ == "__main__":  # pragma: no cover
    main(sys.argv[1:])
