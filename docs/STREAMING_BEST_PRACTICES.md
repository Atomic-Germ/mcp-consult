# Streaming Best Practices

This document describes how to use streaming safely and effectively with the mcp-consult Ollama wrapper.

## Key environment flags
- `MCP_ENABLE_ADVANCED_STREAMING` (opt-in, default: off) — When set to `1`, the server will use advanced streaming paths (`consultStream`) and will forward chunks immediately to reporters.
- `MCP_DISABLE_STREAM_HINT` (opt-out, default: unset) — When set to `1`, the server will not inject the streaming system prompt hint into the request.
- `MCP_HEARTBEAT_INTERVAL_MS` (default: `15000`) — Interval for heartbeat keepalive messages when no chunks arrive.

## How to call streaming from a client
- Using curl (directly to Ollama HTTP endpoint):

```bash
curl -N -X POST "http://localhost:11434/api/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "model":"gifted_knuth_145/qwen3-4b-q4_k_m:latest",
    "messages":[{"role":"user","content":"What is the sum of all prime numbers below 50? Show your reasoning."}],
    "stream": true
  }'
```

- Using the MCP SDK (stdio server):
  - Call the `tools/call` method with `stream: true` and include `_meta.progressToken` for progress correlation.
  - Subscribe to notifications `notifications/message` and `notifications/progress` to receive partial text and progress updates.

## Client-side recommendations (VS Code / UI)
- Subscribe to `notifications/message` to render partial text as it arrives.
- Subscribe to `notifications/progress` to update a progress bar or spinner.
- If no partial updates arrive within a short interval (< 20s), expect a heartbeat message (e.g., "[Still working — no output yet]") which indicates the server/model is still processing.

## Server-side guidelines
- The server will not enable advanced streaming paths by default: set `MCP_ENABLE_ADVANCED_STREAMING=1` to opt-in.
- Heartbeat messages are enabled by default to improve UX in environments where output may be delayed.
- The server accepts the `disable_stream_hint` request parameter or `MCP_DISABLE_STREAM_HINT=1` to opt out of system prompt hint injection.

## Prompt engineering hints
- When streaming is enabled, models often respond better if nudged to emit small partial outputs:
  - Example hint (opt-in):
    > "Please stream intermediate outputs as newline-delimited JSON objects like {\"response\":\"...\"}. Send [DONE] when complete. Provide short progress messages occasionally."

## Notes
- If you need curl-like token-level performance from the server, consider calling Ollama directly with `curl -N` (the server adds helpful features but can add small processing latency depending on transport).
- If you want an alternate transport (WebSocket), consider adding a transport adapter; stdio is convenient for local CLI & VS Code integrations but has limits for networked UIs.

