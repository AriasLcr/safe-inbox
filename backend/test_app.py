"""
Tests for SafeInbox backend (app.py).

Gemini API calls are mocked throughout — no real network calls are made.
"""

import json
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

import app as app_module
from app import app, build_prompt, state


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(autouse=True)
def reset_state():
    """Reset global state before every test."""
    state["messages"].clear()
    state["sender_status"] = "normal"
    state["continue_contact"] = False
    yield


@pytest.fixture
def client():
    return TestClient(app)


def _mock_classification(risk_score: int, category: str = "safe", reason: str = "test"):
    """Return a mock that makes classify_message return a given classification."""
    mock_response = MagicMock()
    mock_response.text = json.dumps(
        {"risk_score": risk_score, "category": category, "reason": reason}
    )
    mock_client = MagicMock()
    mock_client.models.generate_content.return_value = mock_response
    return mock_client


# ---------------------------------------------------------------------------
# GET /state
# ---------------------------------------------------------------------------

class TestGetState:
    def test_returns_initial_state(self, client):
        r = client.get("/state")
        assert r.status_code == 200
        data = r.json()
        assert data["messages"] == []
        assert data["sender_status"] == "normal"
        assert data["continue_contact"] is False

    def test_reflects_messages_after_send(self, client):
        with patch.object(app_module, "client", _mock_classification(1)):
            client.post("/send", json={"message": "hello"})

        r = client.get("/state")
        assert len(r.json()["messages"]) == 1


# ---------------------------------------------------------------------------
# POST /send
# ---------------------------------------------------------------------------

class TestSendMessage:
    def test_empty_message_rejected(self, client):
        r = client.post("/send", json={"message": "   "})
        assert r.status_code == 400

    def test_blocked_sender_rejected(self, client):
        state["sender_status"] = "blocked"
        r = client.post("/send", json={"message": "hello"})
        assert r.status_code == 403

    def test_safe_message_not_filtered(self, client):
        with patch.object(app_module, "client", _mock_classification(3, "safe", "Harmless")):
            r = client.post("/send", json={"message": "Hey, how are you?"})

        assert r.status_code == 200
        data = r.json()
        assert data["filtered"] is False
        assert data["risk_score"] == 3
        assert data["category"] == "safe"
        assert data["revealed"] is False
        assert "id" in data
        assert "timestamp" in data

    def test_harmful_message_is_filtered(self, client):
        with patch.object(app_module, "client", _mock_classification(8, "threatening", "Contains threat")):
            r = client.post("/send", json={"message": "I know where you live."})

        assert r.status_code == 200
        data = r.json()
        assert data["filtered"] is True
        assert data["risk_score"] == 8

    def test_boundary_score_5_not_filtered(self, client):
        with patch.object(app_module, "client", _mock_classification(5)):
            r = client.post("/send", json={"message": "borderline"})
        assert r.json()["filtered"] is False

    def test_boundary_score_6_is_filtered(self, client):
        with patch.object(app_module, "client", _mock_classification(6)):
            r = client.post("/send", json={"message": "borderline"})
        assert r.json()["filtered"] is True

    def test_message_stored_in_state(self, client):
        with patch.object(app_module, "client", _mock_classification(2)):
            client.post("/send", json={"message": "nice day"})

        assert len(state["messages"]) == 1
        assert state["messages"][0]["text"] == "nice day"

    def test_multiple_messages_accumulate(self, client):
        with patch.object(app_module, "client", _mock_classification(1)):
            client.post("/send", json={"message": "first"})
            client.post("/send", json={"message": "second"})

        assert len(state["messages"]) == 2

    def test_response_contains_reason(self, client):
        with patch.object(app_module, "client", _mock_classification(7, "creepy", "Unsettling tone")):
            r = client.post("/send", json={"message": "I watch you sleep."})
        assert r.json()["reason"] == "Unsettling tone"


# ---------------------------------------------------------------------------
# POST /sender-status
# ---------------------------------------------------------------------------

class TestSenderStatus:
    def test_block_sender(self, client):
        r = client.post("/sender-status", json={"status": "blocked"})
        assert r.status_code == 200
        assert state["sender_status"] == "blocked"

    def test_trust_sender_sets_continue_contact(self, client):
        r = client.post("/sender-status", json={"status": "trusted"})
        assert r.status_code == 200
        body = r.json()
        assert body["sender_status"] == "trusted"
        assert body["continue_contact"] is True
        assert state["continue_contact"] is True

    def test_reset_to_normal_clears_continue_contact(self, client):
        state["sender_status"] = "trusted"
        state["continue_contact"] = True

        r = client.post("/sender-status", json={"status": "normal"})
        assert r.status_code == 200
        body = r.json()
        assert body["sender_status"] == "normal"
        assert body["continue_contact"] is False

    def test_invalid_status_rejected(self, client):
        r = client.post("/sender-status", json={"status": "unknown"})
        assert r.status_code == 422


# ---------------------------------------------------------------------------
# POST /reset
# ---------------------------------------------------------------------------

class TestReset:
    def test_reset_clears_messages(self, client):
        with patch.object(app_module, "client", _mock_classification(1)):
            client.post("/send", json={"message": "hi"})

        assert len(state["messages"]) == 1
        client.post("/reset")
        assert state["messages"] == []

    def test_reset_clears_sender_status(self, client):
        state["sender_status"] = "blocked"
        client.post("/reset")
        assert state["sender_status"] == "normal"

    def test_reset_clears_continue_contact(self, client):
        state["continue_contact"] = True
        client.post("/reset")
        assert state["continue_contact"] is False

    def test_reset_response(self, client):
        r = client.post("/reset")
        assert r.status_code == 200
        assert r.json() == {"status": "ok"}

    def test_can_send_after_reset_from_blocked(self, client):
        state["sender_status"] = "blocked"
        client.post("/reset")
        with patch.object(app_module, "client", _mock_classification(1)):
            r = client.post("/send", json={"message": "hi again"})
        assert r.status_code == 200


# ---------------------------------------------------------------------------
# Unit tests: build_prompt
# ---------------------------------------------------------------------------

class TestBuildPrompt:
    def test_no_history(self):
        prompt = build_prompt("hello stranger")
        assert "(no prior messages)" in prompt
        assert "[STRANGER]: hello stranger" in prompt

    def test_history_included(self):
        state["messages"].append({"text": "first message"})
        prompt = build_prompt("second message")
        assert "[STRANGER]: first message" in prompt
        assert "[STRANGER]: second message" in prompt

    def test_continue_contact_note_absent_by_default(self):
        prompt = build_prompt("hello")
        assert "Continue Contact" not in prompt

    def test_continue_contact_note_present_when_set(self):
        state["continue_contact"] = True
        prompt = build_prompt("hello")
        assert "Continue Contact" in prompt

    def test_multiple_history_messages(self):
        state["messages"] = [{"text": "one"}, {"text": "two"}, {"text": "three"}]
        prompt = build_prompt("four")
        for msg in ["one", "two", "three", "four"]:
            assert msg in prompt
