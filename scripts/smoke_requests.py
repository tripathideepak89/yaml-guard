"""Alternate smoke test using requests library (requires pip install requests).

Starts assuming the server is already running (does not start/stop server).
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path
import json
import ruamel.yaml
import requests

yaml = ruamel.yaml.YAML(typ="safe")

def gather_rules(policies: Path):
    rules = []
    for p in sorted(policies.rglob('*.yaml')):
        try:
            with p.open('r', encoding='utf-8') as fh:
                docs = list(yaml.load_all(fh))
            for d in docs:
                if isinstance(d, list):
                    rules.extend([r for r in d if isinstance(r, dict) and 'id' in r])
                elif isinstance(d, dict) and 'id' in d:
                    rules.append(d)
        except Exception as e:  # pragma: no cover
            print(f"[warn] {p}: {e}", file=sys.stderr)
    return rules

def gather_files(examples: Path):
    out = []
    for p in sorted(examples.glob('*.yaml')):
        try:
            out.append({'path': str(p), 'content': p.read_text(encoding='utf-8')})
        except Exception as e:  # pragma: no cover
            print(f"[warn] {p}: {e}", file=sys.stderr)
    return out

def main(argv):
    ap = argparse.ArgumentParser()
    ap.add_argument('--host', default='http://127.0.0.1:8000', help='Base host:port (no /v1)')
    args = ap.parse_args(argv)

    root = Path(__file__).resolve().parents[1]
    rules = gather_rules(root / 'policies')
    files = gather_files(root / 'examples')
    if not files:
        print('No example files found', file=sys.stderr)
        return 2
    payload = { 'files': files, 'rules': rules, 'optimize': False }
    base = args.host.rstrip('/') + '/v1'
    try:
        v = requests.post(base + '/validate', json=payload, timeout=10)
        s = requests.post(base + '/suggest', json=payload, timeout=10)
    except Exception as e:
        print(f'[error] network: {e}', file=sys.stderr)
        return 1
    if not v.ok:
        print(f'[error] validate status {v.status_code}: {v.text[:200]}', file=sys.stderr)
        return 1
    if not s.ok:
        print(f'[error] suggest status {s.status_code}: {s.text[:200]}', file=sys.stderr)
        return 1
    vj = v.json(); sj = s.json()
    findings = vj.get('findings', [])
    suggestions = sj.get('suggestions', [])
    print(f'Validate: ok={vj.get("ok")} findings={len(findings)}')
    print(f'Suggest: suggestions={len(suggestions)}')
    return 0

if __name__ == '__main__':
    raise SystemExit(main(sys.argv[1:]))
