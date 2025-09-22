from yamlguard.core.rules import apply_rules

def test_detect_github_pat():
    doc = {"env": {"TOKEN": "ghp_123456789012345678901234567890123456"}}
    rules = [{
        "id": "SECRET-GITHUB-TOKEN",
        "severity": "critical",
        "when": {},
        "assert": [{"path": "$..*", "not_matches": r"\bghp_[A-Za-z0-9]{36}\b"}],
    }]
    f = apply_rules(doc, rules)
    assert f and f[0]["rule_id"] == "SECRET-GITHUB-TOKEN"
