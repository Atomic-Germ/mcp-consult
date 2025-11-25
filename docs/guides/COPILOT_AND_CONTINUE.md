# Copilot & Continue: MCP Consult

> Quick reference for using `mcp-consult` with GitHub Copilot and Continue (local `.continue` configs).

## Purpose

MCP Consult provides multi-model consultation and sequential reasoning tools built on the Model Context Protocol (MCP). Use this toolkit when you need multiple model perspectives, model comparisons, or multi-step chains for problem solving.

## When to use

- When you need diverse model opinions or direct model comparison (e.g. `compare_ollama_models`).
- When you need a multi-step reasoning flow where models build on previous results (`sequential_consultation_chain`).
- When you want to store or remember consultation outputs for follow-up (`remember_consult`).

## Quick start

```bash
# Install
npm install

# Build
npm run build

# Run server (dev)
npm run dev

# Run server (production)
npm start

# Run tests
npm test
```

## When to run with Continue

If you use the Continue plugin or the `.continue` local YAML, `mcp-consult` has a `.continue` entry: `.continue/mcpServers/mcp-consult.yaml`.

To run with Continue (example CLI provided by your environment):

```bash
# Start consult server using `.continue` config
# (example command, varies by Continue client)
continue run --config .continue/mcpServers/mcp-consult.yaml
```

Or run the server directly:

```bash
node dist/index.js
```

## Copilot prompt examples (how to use Copilot to continue work)

- "Copilot, implement a new handler `consult_ollama` that supports a `context` field and adds logging for model choice."
- "Copilot, add tests for `compare_ollama_models` that compare 3 models and assert the structure of the result."
- "Copilot, add better error handling when Ollama is unreachable—fall back to a queued response."

These prompts give Copilot the intent and the desired outcomes to continue development.

## 'Continue' integration

- `.continue/mcpServers/mcp-consult.yaml` exists to help tools like Continue launch this server.
- For VS Code: add the server entry to your user `mcp.json` or the workspace `mcp.json` to auto-launch with Claude Desktop.

## Example scenarios

- Use `mcp-consult` when a user asks for a multi-perspective analysis that includes both technical and business reasoning.
- Use sequential chains to break down an audit process: `analyze -> synthesize -> recommend`.

## Helpful files

- `README.md` – Full overview and examples
- `sequential_chain_demos.md` – Workflow demos
- `.continue/mcpServers/mcp-consult.yaml` – Continue launch configuration

## Contribution & Copilot tips

- Ask Copilot to scaffold tests first (TDD) using `tdd_write_test` patterns, then implement code.
- Use Copilot to write example prompts for demo workflows used in `demo/*.ts` or `demo/*.js`.

---

_Generated to help contributors use `mcp-consult` effectively with GitHub Copilot and Continue._
