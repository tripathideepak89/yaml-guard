import re
from typing import Any, Dict, Iterable, List

from .jsonpath import match

Finding = Dict[str, Any]


def _iter_docs(doc: Any) -> Iterable[Any]:
    """Normalize input into a sequence of documents."""
    if doc is None:
        return []
    if isinstance(doc, list):
        return doc
    return [doc]


def apply_rules(doc: Any, rules_yaml: List[dict]) -> List[Finding]:
    findings: List[Finding] = []
    rules_yaml = rules_yaml or []

    for rule in rules_yaml:
        for unit in _iter_docs(doc):
            if not _applies(rule, unit):
                continue
            for assertion in rule.get("assert", []):
                path = assertion.get("path")
                if not path:
                    continue
                values = match(unit, path)

                if "not_matches" in assertion:
                    pat = re.compile(str(assertion["not_matches"]))
                    bad = [v for v in values if isinstance(v, str) and pat.search(v)]
                    if bad:
                        findings.append(
                            _finding(
                                rule,
                                path,
                                f"Value matched forbidden pattern: {pat.pattern}",
                                bad,
                            )
                        )

                if "must_include" in assertion:
                    req = str(assertion["must_include"])
                    bad = [v for v in values if isinstance(v, str) and req not in v]
                    if bad:
                        findings.append(_finding(rule, path, f"Value must include '{req}'", bad))

                if "equals" in assertion:
                    want = assertion["equals"]
                    bad = [v for v in values if v != want]
                    if bad:
                        findings.append(_finding(rule, path, f"Value must equal {want}", bad))

    return findings


def _applies(rule: dict, unit: Any) -> bool:
    """Return True if the rule should run against this unit (doc or element)."""
    when = rule.get("when", {}) or {}

    # Only gate by kind if unit is a mapping
    kind = when.get("kind")
    if kind:
        if not isinstance(unit, dict):
            return False
        if unit.get("kind") != kind:
            return False
    return True


def _finding(rule: dict, path: str, message: str, values: list) -> Finding:
    return {
        "rule_id": rule.get("id", "RULE"),
        "severity": rule.get("severity", "medium"),
        "path": path,
        "message": message,
        "values": values,
        "remediation": rule.get("remediation"),
    }
