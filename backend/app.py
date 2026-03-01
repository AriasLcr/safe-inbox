import json
import os
import uuid
from datetime import datetime, timezone
from typing import Literal

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from google import genai
from google.genai import types
from pydantic import BaseModel

load_dotenv()

app = FastAPI(title="SafeInbox API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://chic-chaja-0213f1.netlify.app"],
    allow_methods=["*"],
    allow_headers=["*"],
)

state: dict = {
    "messages": [],
    "sender_status": "normal",
    "continue_contact": False,
}

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

SYSTEM_PROMPT = """You are a message safety classifier for a DM inbox protection system.

Analyze incoming messages and assess their safety level given the full conversation history.

Rules:
- Consider the ENTIRE conversation thread, not just the latest message
- Flag escalation: safe early messages followed by a harmful shift should raise the score
- If the user has opted into "Continue Contact", still flag harmful content — just note the context
- Score 0–10: 0 = completely benign, 10 = severely harmful

Categories:
- safe: No concerning content
- creepy: Overly familiar, unsettling, or boundary-pushing
- threatening: Implicit or explicit threats
- explicit: Sexual or graphic content
- manipulative: Guilt-tripping, gaslighting, love-bombing, coercion

Respond ONLY with valid JSON — no markdown, no explanation outside the JSON:
{"risk_score": <integer 0-10>, "category": "<safe|creepy|threatening|explicit|manipulative>", "reason": "<one sentence>"}"""


def build_prompt(new_message: str) -> str:
    history = state["messages"]
    if history:
        lines = [f"[STRANGER]: {m['text']}" for m in history]
        conversation = "\n".join(lines)
    else:
        conversation = "(no prior messages)"

    note = ""
    if state["continue_contact"]:
        note = "\n[CONTEXT: The user has opted into Continue Contact with this sender.]\n"

    return (
        f"Conversation so far:\n{conversation}{note}\n\n"
        f"New message to classify:\n[STRANGER]: {new_message}\n\n"
        "Return only the JSON classification."
    )


def classify_message(message: str) -> dict:
    prompt = build_prompt(message)
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_PROMPT,
            response_mime_type="application/json",
        ),
    )
    return json.loads(response.text)


class SendRequest(BaseModel):
    message: str


class SenderStatusRequest(BaseModel):
    status: Literal["blocked", "trusted", "normal"]


@app.get("/state")
def get_state():
    """Return full current session state."""
    return state


@app.post("/send")
def send_message(req: SendRequest):
    """
    Receive a stranger's message, classify it with Gemini, store it, return it.
    Returns 403 if sender is blocked.
    """
    if not req.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    if state["sender_status"] == "blocked":
        raise HTTPException(status_code=403, detail="Sender is blocked")

    classification = classify_message(req.message)

    risk_score: int = int(classification.get("risk_score", 0))
    category: str = classification.get("category", "safe")
    reason: str = classification.get("reason", "")

    msg = {
        "id": str(uuid.uuid4()),
        "text": req.message,
        "risk_score": risk_score,
        "category": category,
        "reason": reason,
        "filtered": risk_score >= 6,
        "revealed": False,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

    state["messages"].append(msg)
    return msg


@app.post("/sender-status")
def update_sender_status(req: SenderStatusRequest):
    """Block or trust the sender. Trusting also sets continue_contact."""
    state["sender_status"] = req.status
    if req.status == "trusted":
        state["continue_contact"] = True
    elif req.status == "normal":
        state["continue_contact"] = False
    return {"sender_status": state["sender_status"], "continue_contact": state["continue_contact"]}


@app.post("/reset")
def reset_session():
    """Wipe all session state (simulates a page refresh)."""
    state["messages"].clear()
    state["sender_status"] = "normal"
    state["continue_contact"] = False
    return {"status": "ok"}


# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
