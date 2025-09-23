from __future__ import annotations
import difflib
from dataclasses import dataclass
from typing import Optional, Dict, Any, List
from ruamel.yaml import YAML
from io import StringIO
import re

yaml = YAML(typ="safe")
yaml.default_flow_style = False

@dataclass
class Suggestion:
    title: str
    rationale: str
    patched_text: str
    diff: str
    confidence: float  # 0..1

def _dump(obj) -> str:
    sio = StringIO()
    y = YAML()
    y.default_flow_style = False
    y.dump(obj, sio)
    return sio.getvalue()

def _load(text: str) -> Any:
    return yaml.load(StringIO(text))

def _unified_diff(before: str, after: str, path: str) -> str:
    return "".join(
        difflib.unified_diff(
            before.splitlines(keepends=True),
            after.splitlines(keepends=True),
            fromfile=f"a/{path}",
            tofile=f"b/{path}",
            n=3,
        )
    )

def _update_at_key_scalar_text(text: str, key: str, replace: callable) -> str:
    # very targeted line-level replace: key: value lines only (keeps comments stable)
    lines = text.splitlines()
    pat = re.compile(rf'^(\s*{re.escape(key)}\s*:\s*)(.+)$')
    out = []
    changed = False
    for ln in lines:
        m = pat.match(ln)
        if m:
            prefix, val = m.group(1), m.group(2)
            new_val = replace(val)
            if new_val != val:
                out.append(prefix + new_val)
                changed = True
            else:
                out.append(ln)
        else:
            out.append(ln)
    return "\n".join(out) + ("\n" if text.endswith("\n") else ""), changed

def suggest_for_finding(path: str, finding: Dict[str, Any], original_text: str) -> Optional[Suggestion]:
    rid = finding.get("rule_id", "")
    values = finding.get("values") or []
    title = rationale = ""
    patched = original_text

    # 1) K8S-NO-LATEST-TAG: replace ":latest" with a stable placeholder tag
    if rid in ("K8S-NO-LATEST-TAG", "NO_LATEST"):
        def repl(v: str) -> str:
            new = re.sub(r":latest(\b|$)", ":1.0", v)
            if "@sha256:" not in new:
                new = f"{new}@sha256:REPLACE_WITH_REAL_DIGEST"
            return new

        patched2, changed = _update_at_key_scalar_text(patched, "image", repl)
        if not changed and values:
            # fallback: global text replace for that literal (safe enough for sample)
            patched2 = patched.replace(values[0], repl(values[0]))
            changed = patched2 != patched
        if changed:
            title = "Pin image tag (avoid :latest)"
            rationale = "Floating tags break reproducibility. Replace ':latest' with a pinned version; ideally also add a digest."
            patched = patched2
            diff = _unified_diff(original_text, patched, path)
            return Suggestion(title, rationale, patched, diff, 0.75)

    # 2) K8S-IMAGE-PIN-DIGEST: append a digest placeholder if missing
    if rid in ("K8S-IMAGE-PIN-DIGEST",):
        def repl(v: str) -> str:
            if "@sha256:" in v:
                return v
            return f"{v}@sha256:REPLACE_WITH_REAL_DIGEST"
        patched2, changed = _update_at_key_scalar_text(patched, "image", repl)
        if changed:
            title = "Pin image by digest"
            rationale = "Use immutable digests to guarantee exact image contents."
            patched = patched2
            diff = _unified_diff(original_text, patched, path)
            return Suggestion(title, rationale, patched, diff, 0.8)

    # 3) K8S-RESOURCES-LIMITS-PRESENT: add resource limits if missing
    if rid in ("K8S-RESOURCES-LIMITS-PRESENT",):
        try:
            doc = _load(patched)
            containers = (((doc or {}).get("spec") or {}).get("containers") or [])
            changed = False
            for c in containers:
                res = c.setdefault("resources", {})
                lim = res.setdefault("limits", {})
                if "cpu" not in lim: lim["cpu"] = "100m"
                if "memory" not in lim: lim["memory"] = "128Mi"
                changed = True
            if changed:
                patched2 = _dump(doc)
                title = "Add resource limits"
                rationale = "Define CPU/Memory limits for each container to prevent noisy-neighbor issues."
                diff = _unified_diff(patched, patched2, path)
                return Suggestion(title, rationale, patched2, diff, 0.7)
        except Exception:
            pass

    # 4) Secrets (mask and move to secrets)
    if rid.startswith("SECRET-"):
        # replace literal value with a placeholder and hint to use secret reference
        def repl(v: str) -> str:
            return "*****"
        # common keys are variable values, not fixed key names, so mask any matching literal
        patched2 = patched
        for v in values:
            patched2 = patched2.replace(str(v), "*****")
        if patched2 != patched:
            title = "Remove hardcoded secret"
            rationale = "Delete hardcoded credentials and reference a secret (e.g., GitHub Actions `${{ secrets.MY_TOKEN }}` or K8s Secret)."
            diff = _unified_diff(patched, patched2, path)
            return Suggestion(title, rationale, patched2, diff, 0.9)


def suggest_for_file(path: str, findings: list[dict], original_text: str) -> Optional[Suggestion]:
    """
    Apply multiple rule-specific suggestions in sequence to produce one combined patch.
    Order matters: tag pin first, then digest, then resources, then secret masking.
    """
    order = ["K8S-NO-LATEST-TAG", "NO_LATEST", "K8S-IMAGE-PIN-DIGEST",
             "K8S-RESOURCES-LIMITS-PRESENT"]
    # bring secrets last (text masking)
    ordered = sorted(findings, key=lambda f: (order.index(f["rule_id"]) if f.get("rule_id") in order else 999,
                                              1 if f.get("rule_id","").startswith("SECRET-") else 0))
    current = original_text
    changed_any = False
    rationales, titles = [], []
    conf = 0.0

    for f in ordered:
        s = suggest_for_finding(path, f, current)
        if s and s.patched_text != current:
            current = s.patched_text
            changed_any = True
            rationales.append(s.rationale)
            titles.append(s.title)
            conf = max(conf, s.confidence)

    if not changed_any:
        return None

    diff = _unified_diff(original_text, current, path)
    title = "Apply recommended hardening (pin tags/digests, add limits, mask secrets)"
    rationale = " ".join(dict.fromkeys(rationales))  # de-duplicate in order
    return Suggestion(title, rationale, current, diff, conf if conf else 0.7)

    return None
