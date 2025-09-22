import re
from typing import List, Dict, Any
from .jsonpath import match

Finding = Dict[str, Any]


def apply_rules(doc: dict, rules_yaml: List[dict]) -> List[Finding]:
    findings: List[Finding] = []
    rules_yaml = rules_yaml or []

    for rule in rules_yaml:
        if not _applies(rule, doc):
            continue
        for assertion in rule.get("assert", []):
            path = assertion.get("path")
            if not path:
                continue
            values = match(doc, path)

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
                    findings.append(
                        _finding(
                            rule,
                            path,
                            f"Value must include '{req}'",
                            bad,
                        )
                    )

            if "equals" in assertion:
                want = assertion["equals"]
                bad = [v for v in values if v != want]
                if bad:
                    findings.append(
                        _finding(
                            rule,
                            path,
                            f"Value must equal {want}",
                            bad,
                        )
                    )

    return findings


def _applies(rule: dict, doc: dict) -> bool:
    when = rule.get("when", {}) or {}
    kind = when.get("kind")
    if kind and doc.get("kind") != kind:
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
