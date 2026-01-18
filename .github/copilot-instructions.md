# AI Coding Guide

- **Scope**: Single Flask app with a CLI wrapper. Core logic lives in identity.py; UI is a thin fetch client in templates/index.html and static.
- **Run locally**: `pip install -r requirements.txt`; `PORT=5000 python app.py` for web (Flask debug on, host 0.0.0.0); `python main.py` for CLI (no tests present).
- **Architecture**: identity.py defines ALIASES (label -> aliases) and precomputed NORMALIZED_KEYWORDS for fast lookup; app.py exposes POST /api/identify; main.py is a CLI thin wrapper.
- **Identity rules**: normalize() lowercases/strips; identify() returns (label, method) where method is alias|fallback; alias hit when normalized keyword contains the query or vice versa; fallback_pick() sums ASCII of characters and mods by len(labels) for deterministic assignment.
- **Data changes**: Update ALIASES in identity.py; NORMALIZED_KEYWORDS is built at import time, so restart the app after edits; keep alias strings varied (full names, nicknames, pinyin, partials) to leverage the substring check.
- **API contract**: POST /api/identify JSON { "input": "text" } -> { input, result, method }; 400 with { error } when input is empty. Frontend expects method to be "alias" or anything else treated as fallback.
- **Frontend flow**: static/js/app.js listens for click/Enter, calls /api/identify, renders result, and stores up to 6 recent queries in localStorage key identity-history; "随机体验" picks a sample alias. index.html wires chip buttons and history list; style.css handles the dark gradient card layout.
- **CLI flow**: main.py accepts args as a single joined string; otherwise runs interactive_loop() reading stdin until exit/quit; prints suffix "规则匹配" for alias hits, "智能分配" for fallback.
- **Error handling**: Backend only validates non-empty input; keep responses small JSON objects. Frontend shows alert() on failures; keep API stable to avoid breaking UI.
- **Extending features**: If adding persistence (DB) or analytics, keep identify() pure and side-effect free; add new routes in app.py without coupling to UI state; mirror any new result fields in app.js displayResult().
- **Styling conventions**: CSS uses custom gradients and card layout; prefer extending existing classes instead of inline styles; mobile tweaks live in the single @media block in static/css/style.css.
- **Deployment**: Only Flask builtin server is defined; to deploy behind WSGI, import app from app.py; honor PORT env for cloud runs.
- **Known assumptions**: No authentication; no rate limiting; history is client-side only; matching is substring-based, so shorter aliases may produce broad matches—adjust logic in identify() if you need stricter rules.
