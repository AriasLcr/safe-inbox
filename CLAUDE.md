# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SafeInbox is a web app simulating a DM inbox with AI-powered message filtering. Incoming messages are analyzed by the Gemini API before display; harmful messages are visually suppressed (blurred) but never deleted — the user always retains control.

## Planned Tech Stack

- **Frontend**: React.js
- **Backend**: Python Flask, single file (`app.py`)
- **AI**: Gemini API (`gemini-pro` model) via `google-generativeai` Python package
- **State**: In-memory only — no database, no persistence; refresh resets everything

## Running the App

Once built:

```bash
pip install flask google-generativeai
python app.py
```

## Architecture

### Two-panel UI
- **Left panel ("Stranger" view)**: Text input + Send button for simulating an incoming message
- **Right panel ("Your Inbox")**: Chat thread with safe messages displayed normally and harmful messages blurred

### Backend API (`app.py`)
Single Flask endpoint receives a message + full conversation history, calls Gemini with a safety-classifier system prompt, and returns:
```json
{ "risk_score": 0-10, "category": "safe|creepy|threatening|explicit|manipulative", "reason": "brief explanation" }
```
- Risk score ≥ 6 → message is filtered (blurred in UI)
- Risk score < 6 → message delivered normally

### Gemini Prompt Design
Each call sends the full conversation thread as context (not just the latest message). The system prompt instructs Gemini to:
- Act as a message safety classifier
- Consider tone escalation across the full history (safe early messages + later shift raises score)
- Flag whether the user has opted into "Continue Contact" (affects how subsequent messages are annotated in the prompt)

### Session State (in-memory)
- One active thread per session
- Whitelist/block status for the sender
- "Continue Contact" flag — shown as a persistent soft warning in UI; noted in subsequent Gemini prompts

### Filtered Message UX
Blurred/frosted block with:
- "This message was filtered. It may contain harmful content."
- **Reveal Message** button (unblurs on click)
- **Block Sender** button (ends thread)
- **Continue Contact** button (whitelists sender for session, adds "trusted" badge)

## Key Constraints

- No login, no database, no persistence
- All state lives in Flask session or in-memory for the MVP
- Do not implement future scope items: computer vision for images, cross-session trust scoring, mobile app, or browser extension
