# src/yamlguard/core/locate.py
import re
from typing import Optional

def guess_location(yaml_text: str, jsonpath: str, values: list[str]) -> tuple[Optional[int], Optional[str]]:
    """
    Best-effort line locator:
    1) Try to infer the last key from the JSONPath (e.g., '$.spec.containers[*].image' -> 'image')
    2) Look for lines like: '  image: <...value...>'
    3) If that fails, search for the offending value alone.
    Returns (line_number_1_based or None, snippet or None).
    """
    lines = yaml_text.splitlines()
    key_hint = None
    m = re.search(r"\.([A-Za-z0-9_\-]+)(?:\[\*])?$", jsonpath)
    if m:
        key_hint = m.group(1)

    # Build candidate regexes
    patterns = []
    for v in values or []:
        v_esc = re.escape(str(v))
        if key_hint:
            patterns.append(re.compile(rf"^\s*{re.escape(key_hint)}\s*:\s*.*{v_esc}.*$", re.IGNORECASE))
        # fallback: value only
        patterns.append(re.compile(rf".*{v_esc}.*"))

    for pat in patterns:
        for idx, line in enumerate(lines):
            if pat.search(line):
                # Grab a small snippet (previous, current, next)
                lo = max(0, idx - 1)
                hi = min(len(lines), idx + 2)
                snippet = "\n".join(lines[lo:hi])
                return idx + 1, snippet

    return None, None
