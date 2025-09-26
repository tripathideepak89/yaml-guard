from fastapi.testclient import TestClient
from yamlguard.server.main import app
from pathlib import Path

def test_validate_autoloads_policies():
    client = TestClient(app)
    # Use structured variant to ensure YAML parses as expected
    bad_path = Path(__file__).resolve().parents[1] / "examples" / "pod-bad-structured.yaml"
    content = bad_path.read_text(encoding="utf-8")
    resp = client.post("/v1/validate", json={
        "files": [{"path": str(bad_path), "content": content}],
        "optimize": False
    })
    assert resp.status_code == 200
    data = resp.json()
    assert len(data.get("findings", [])) >= 1
