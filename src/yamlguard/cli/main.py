# src/yamlguard/cli/main.py
import argparse
import glob
import json
import os
import sys

from yamlguard.core.loader import load_yaml, dump_yaml
from yamlguard.core.rules import apply_rules
from yamlguard.core.optimize import canonicalize
from yamlguard.core.locate import guess_location  # add import


try:
    import yaml as pyyaml
except Exception:  # pragma: no cover
    pyyaml = None


def _load_rules(path: str | None):
    if not path:
        return []
    if not pyyaml:
        raise SystemExit("pyyaml not installed; required to load rules")
    with open(path, "r", encoding="utf-8") as f:
        return pyyaml.safe_load(f) or []


def _expand(paths):
    for p in paths:
        if os.path.isdir(p):
            yield from glob.glob(os.path.join(p, "**/*.y*ml"), recursive=True)
        else:
            yield from glob.glob(p)


def main():
    ap = argparse.ArgumentParser("yamlguard")
    ap.add_argument("paths", nargs="+", help="Files or globs to validate")
    ap.add_argument("--rules", help="Rules YAML file (list)")
    ap.add_argument("--optimize", action="store_true", help="Write canonicalized YAML back to files")
    args = ap.parse_args()

    rules = _load_rules(args.rules)

    findings = []
    for p in _expand(args.paths):
        with open(p, "r", encoding="utf-8") as fh:
            text = fh.read()
        doc = load_yaml(text)
        fs = apply_rules(doc, rules)
        for x in fs:
            x["file"] = p
            ln, snip = guess_location(text, x.get("path",""), x.get("values", []))
            if ln is not None:
                x["line"] = ln
            if snip:
                x["snippet"] = snip
        findings.extend(fs)


    print(json.dumps({"ok": len(findings) == 0, "findings": findings}, indent=2))
    sys.exit(1 if findings else 0)


if __name__ == "__main__":  # pragma: no cover
    main()
