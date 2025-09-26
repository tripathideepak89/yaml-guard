"""Simple smoke test for YAML Guard API.

Usage:
  python scripts/smoke_validate.py [--host http://127.0.0.1:8000]

It will:
  * Load all policy YAML files under policies/**.yaml
  * Load example YAML files under examples/*.yaml
  * POST /v1/validate (auto rule aggregation client-side)
  * POST /v1/suggest
  * Print summary of findings grouped by severity and suggestion counts

Exit code is non‑zero if a request fails (network or non-2xx) but it does
NOT fail if findings exist (so it can be used in CI to just exercise paths).
"""

from __future__ import annotations

import argparse
import json
import sys
import urllib.request
from pathlib import Path
from typing import Any, Dict, List

import ruamel.yaml

yaml = ruamel.yaml.YAML(typ="safe")


def load_rules(policies_dir: Path) -> List[Dict[str, Any]]:
    rules: List[Dict[str, Any]] = []
    if not policies_dir.is_dir():
        return rules
    for path in sorted(policies_dir.rglob("*.yaml")):
        try:
            with path.open("r", encoding="utf-8") as fh:
                docs = list(yaml.load_all(fh))
            for doc in docs:
                if isinstance(doc, list):
                    for item in doc:
                        if isinstance(item, dict) and "id" in item:
                            rules.append(item)
                elif isinstance(doc, dict) and "id" in doc:
                    rules.append(doc)
        except Exception as e:  # pragma: no cover - best effort
            print(f"[warn] failed reading {path}: {e}", file=sys.stderr)
    return rules


def load_example_files(examples_dir: Path) -> List[Dict[str, str]]:
    files: List[Dict[str, str]] = []
    if not examples_dir.is_dir():
        return files
    for path in sorted(examples_dir.glob("*.yaml")):
        try:
            files.append({"path": str(path), "content": path.read_text(encoding="utf-8")})
        except Exception as e:  # pragma: no cover
            print(f"[warn] failed reading {path}: {e}", file=sys.stderr)
    return files


def post_json(url: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=10) as resp:  # nosec B310 (local use)
        body = resp.read().decode("utf-8")
        return json.loads(body)


def summarize_findings(findings: List[Dict[str, Any]]) -> str:
    from collections import Counter

    c = Counter(f.get("severity", "unknown") for f in findings)
    parts = [f"{sev}:{cnt}" for sev, cnt in sorted(c.items(), key=lambda x: x[0])]
    return ", ".join(parts) if parts else "none"


def main(argv: List[str]) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "--host",
        default="http://127.0.0.1:8000",
        help="Base host:port for API (no trailing /v1)",
    )
    args = ap.parse_args(argv)

    root = Path(__file__).resolve().parents[1]
    policies_dir = root / "policies"
    examples_dir = root / "examples"

    rules = load_rules(policies_dir)
    files = load_example_files(examples_dir)

    if not files:
        print("No example YAML files found; aborting.", file=sys.stderr)
        return 2

    validate_payload = {"files": files, "rules": rules, "optimize": False}
    suggest_payload = {"files": files, "rules": rules, "optimize": False}

    base_v1 = args.host.rstrip("/") + "/v1"
    try:
        vresp = post_json(base_v1 + "/validate", validate_payload)
        sresp = post_json(base_v1 + "/suggest", suggest_payload)
    except Exception as e:
        print(f"[error] request failed: {e}", file=sys.stderr)
        return 1

    findings = vresp.get("findings", [])
    suggestions = sresp.get("suggestions", [])

    print(
        "Validate: ok="
        + str(vresp.get("ok"))
        + f" findings={len(findings)} ("
        + summarize_findings(findings)
        + ")"
    )
    print("Suggest: suggestions=" + str(len(suggestions)))
    if suggestions:
        first = suggestions[0]
        print("  First suggestion title: " + first.get("title", "<none>"))
    return 0


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main(sys.argv[1:]))
