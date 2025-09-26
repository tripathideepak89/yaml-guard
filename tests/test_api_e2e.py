import threading
import time
import socket
from contextlib import closing

import httpx
import uvicorn
import pytest

from yamlguard.server.main import app


def _free_port(start: int = 8010, limit: int = 50) -> int:
    for p in range(start, start + limit):
        with closing(socket.socket(socket.AF_INET, socket.SOCK_STREAM)) as s:
            if s.connect_ex(("127.0.0.1", p)) != 0:
                return p
    raise RuntimeError("No free port found")


class ServerThread(threading.Thread):
    def __init__(self, port: int):
        super().__init__(daemon=True)
        self.port = port
        self._server = uvicorn.Server(uvicorn.Config(app, host="127.0.0.1", port=port, log_level="warning"))

    def run(self):  # pragma: no cover (integration path)
        self._server.run()

    def should_exit(self):
        self._server.should_exit = True


@pytest.mark.integration
def test_api_end_to_end():
    port = _free_port()
    t = ServerThread(port)
    t.start()

    base = f"http://127.0.0.1:{port}"
    # Poll health
    for _ in range(40):
        try:
            r = httpx.get(base + "/health", timeout=0.5)
            if r.status_code == 200:
                break
        except Exception:
            pass
        time.sleep(0.25)
    else:
        t.should_exit()
        assert False, "Server did not become healthy in time"

    # Validate with autoload (omit rules)
    pod_yaml = """apiVersion: v1\nkind: Pod\nmetadata:\n  name: bad-pod\nspec:\n  containers:\n    - name: web\n      image: nginx:latest\n"""
    payload = {"files": [{"path": "pod-bad-inline.yaml", "content": pod_yaml}], "optimize": False}
    vresp = httpx.post(base + "/v1/validate", json=payload, timeout=5)
    assert vresp.status_code == 200
    findings = vresp.json().get("findings", [])
    assert any(f.get("rule_id") == "K8S-NO-LATEST-TAG" for f in findings), "Expected latest tag finding"

    # Suggest
    sresp = httpx.post(base + "/v1/suggest", json=payload, timeout=5)
    assert sresp.status_code == 200
    suggestions = sresp.json().get("suggestions", [])
    assert len(suggestions) >= 1

    t.should_exit()
    # Give server a moment to stop gracefully
    time.sleep(0.5)
