# tests/test_rules.py
from yamlguard.core.rules import apply_rules


def test_no_latest():
    pod = {"kind": "Pod", "spec": {"containers": [{"image": "nginx:latest"}]}}
    rules = [
        {
            "id": "NO_LATEST",
            "severity": "high",
            "when": {"kind": "Pod"},
            "assert": [{"path": "$.spec.containers[*].image", "not_matches": ".*:latest$"}],
        }
    ]
    f = apply_rules(pod, rules)
    assert f and f[0]["rule_id"] == "NO_LATEST"


def test_image_digest_required():
    pod = {"kind": "Pod", "spec": {"containers": [{"image": "nginx:1.21"}]}}
    rules = [
        {
            "id": "PIN_DIGEST",
            "severity": "high",
            "when": {"kind": "Pod"},
            "assert": [{"path": "$.spec.containers[*].image", "must_include": "@sha256:"}],
        }
    ]
    f = apply_rules(pod, rules)
    assert f and f[0]["rule_id"] == "PIN_DIGEST"
