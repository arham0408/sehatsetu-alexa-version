"""Exercise the public JSON-RPC boundary, report isolation, and pairing lifecycle."""
import unittest
from unittest.mock import patch
from fastapi.testclient import TestClient
from backend.main import app
from backend import mcp_server as server

HEADERS = {"Accept": "application/json, text/event-stream", "MCP-Protocol-Version": "2025-11-25"}
REPORT = "ULTRASOUND: Gallbladder contains a 12 mm calculus. No renal calculus or hydronephrosis. Liver is normal."


class McpTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.client.__enter__()
        cls.provider = patch.object(server.provider, "api_key", "")
        cls.provider.start()

    def setUp(self):
        server.sessions.clear(); server.companions.clear(); server.invitations.clear()

    @classmethod
    def tearDownClass(cls):
        cls.provider.stop()
        cls.client.__exit__(None, None, None)
        server.sessions.clear(); server.companions.clear(); server.invitations.clear()

    def rpc(self, method, params=None):
        response = self.client.post("/mcp", headers=HEADERS, json={
            "jsonrpc": "2.0", "id": 1, "method": method, "params": params or {}})
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()["result"]

    def tool(self, name, **arguments):
        return self.rpc("tools/call", {"name": name, "arguments": arguments})

    def create(self, text=REPORT):
        result = self.tool("create_report", text=text)
        self.assertFalse(result.get("isError"), result)
        return result["structuredContent"]

    def test_handshake_and_discovery(self):
        result = self.rpc("initialize", {"protocolVersion": "2025-11-25", "capabilities": {},
            "clientInfo": {"name": "test", "version": "1"}})
        self.assertEqual(result["protocolVersion"], "2025-11-25")
        notification = self.client.post("/mcp", headers=HEADERS, json={
            "jsonrpc": "2.0", "method": "notifications/initialized"})
        self.assertEqual(notification.status_code, 202)
        names = {tool["name"] for tool in self.rpc("tools/list")["tools"]}
        self.assertTrue({"create_report", "ask_report", "focus_anatomy", "join_pairing", "disconnect"} <= names)

    def test_report_evidence_and_navigation(self):
        report = self.create()
        key = report["session_key"]
        answer = self.tool("ask_report", session_key=key, question="Show me the gallbladder", language="hi")["structuredContent"]
        self.assertIn("12 mm", answer["answer"])
        self.assertEqual(answer["provider"], "deterministic_local")
        self.assertEqual(answer["response_language"], "en")
        self.assertTrue(answer["evidence"])
        state = self.tool("get_viewer_state", session_key=key)["structuredContent"]
        self.assertGreater(state["revision"], 0)
        self.assertIn("gallbladder", state["anatomy_terms"])
        questions = self.tool("prepare_questions", session_key=key)["structuredContent"]
        self.assertIn(questions["questions"][0]["quote"], REPORT)

    def test_capabilities_and_report_isolation(self):
        a = self.create()
        b = self.create("CHEST REPORT: Right lung consolidation. Heart size is normal.")
        self.assertNotEqual(a["session_key"], b["session_key"])
        self.assertTrue(self.tool("get_report", session_key="invented")["isError"])
        answer = self.tool("ask_report", session_key=b["session_key"], question="gallbladder")["structuredContent"]
        self.assertNotIn("12 mm", answer["answer"])
        self.assertNotIn("calculus (gallstone)", answer["answer"])
        self.assertTrue(self.tool("focus_anatomy", session_key=a["session_key"], finding_id="invented")["isError"])

    def test_pairing_is_single_use_and_revocable(self):
        owner = self.create()["session_key"]
        code = self.tool("create_pairing", session_key=owner)["structuredContent"]["pairing_code"]
        peer = self.tool("join_pairing", pairing_code=code)["structuredContent"]["session_key"]
        self.assertNotEqual(owner, peer)
        self.assertTrue(self.tool("join_pairing", pairing_code=code)["isError"])
        self.assertTrue(self.tool("create_pairing", session_key=peer)["isError"])
        self.assertFalse(self.tool("get_report", session_key=peer).get("isError"))
        self.tool("disconnect", session_key=owner, mode="revoke_companions")
        self.assertTrue(self.tool("get_report", session_key=peer)["isError"])
        self.assertFalse(self.tool("get_report", session_key=owner).get("isError"))
        self.tool("disconnect", session_key=owner)
        self.assertTrue(self.tool("get_report", session_key=owner)["isError"])

    def test_expiry_and_bounds(self):
        owner = self.create()["session_key"]
        code = self.tool("create_pairing", session_key=owner)["structuredContent"]["pairing_code"]
        with patch("backend.mcp_server.time.monotonic", return_value=server.time.monotonic() + 121):
            self.assertTrue(self.tool("join_pairing", pairing_code=code)["isError"])
        server.sessions[owner].expires = 0
        self.assertTrue(self.tool("get_report", session_key=owner)["isError"])
        self.assertTrue(self.tool("create_report", text="x" * 100001)["isError"])
        self.assertTrue(self.tool("create_report", text=REPORT, language="invalid")["isError"])

    def test_http_guards(self):
        self.assertEqual(self.client.post("/mcp", headers={"Origin": "https://evil.example"}, json={}).status_code, 403)
        self.assertEqual(self.client.get("/api/health", headers={"Host": "evil.example"}).status_code, 400)
        self.assertEqual(self.client.post("/mcp", content=b"x" * (10 * 1024 * 1024 + 1)).status_code, 413)
        health = self.client.get("/api/health", headers={"Origin": "http://localhost:3016"})
        self.assertEqual(health.status_code, 200)
        self.assertEqual(health.headers["access-control-allow-origin"], "http://localhost:3016")

    def test_fallback_preserves_measurements_and_does_not_invent_disease(self):
        result = server.provider._extract_findings_deterministic(
            "Liver is normal in size (13.8 cm). Suspected gallstones in the gallbladder. "
            "No renal calculus in the right and left kidneys.", "en")
        liver = next(f for f in result["findings"] if f["term"] == "liver")
        self.assertEqual(liver["measurement"], {"value": 13.8, "unit": "cm"})
        self.assertIsNone(liver["condition"])
        gallbladder = next(f for f in result["findings"] if f["term"] == "gallbladder")
        self.assertEqual(gallbladder["certainty"], "suspected")
        kidney = next(f for f in result["findings"] if f["term"] == "kidney")
        self.assertEqual(kidney["negation"], "ruled_out")
        self.assertEqual(kidney["laterality"], "bilateral")


if __name__ == "__main__":
    unittest.main()
