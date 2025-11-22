# MCP Toolkit Enhancement Utilities

This directory contains utilities for AI-assisted toolkit enhancement planning.

## Scripts

### `ask_kimi.js`

Single-stage consultation with kimi-k2-thinking:cloud for strategic tool suggestions.

**Output:** Markdown-formatted suggestions optimized for AI parsing

```bash
# Preview the prompt
npm run ask-kimi

# Execute consultation
npm run ask-kimi:run
```

### `ask_kimi_then_qwen.js` ⭐

**Two-stage AI collaboration workflow:**

1. **Stage 1 (Kimi - Thinking):** Analyzes toolkit gaps and suggests 5-7 new tools in structured JSON format
2. **Stage 2 (Qwen - Instruction):** Takes the suggestions and generates detailed implementation instructions

**Outputs:**

- `.tmp/toolkit_enhancement_plan.json` - Full analysis + instructions
- `TOOLKIT_ENHANCEMENT_PLAN.md` - Human-readable markdown report

```bash
npm run ask-kimi-then-qwen
```

**What it does:**

- Consults kimi with a JSON-structured prompt requesting tool suggestions
- Parses kimi's response and extracts structured tool specifications
- Feeds those specs to qwen3-vl:235b-instruct-cloud for implementation guidance
- Generates copy-paste ready TypeScript code and step-by-step instructions
- Creates both JSON and Markdown outputs for different use cases

**Expected duration:** 4-5 minutes total (2-3 min kimi + 1-2 min qwen)

## Workflow Design

The two-stage approach leverages model specialization:

- **Kimi (k2-thinking):** Deep reasoning for strategic analysis
  - What tools are missing?
  - What would provide the most value?
  - How should implementation be prioritized?

- **Qwen (3-vl:235b-instruct):** Instruction-following for tactical implementation
  - How do we build this?
  - What's the file structure?
  - What code needs to be written?

## Output Format

### Kimi Output (JSON)

```json
{
  "analysis_summary": "Overview of gaps",
  "suggested_tools": [
    {
      "tool_name": "consult_chain_ollama",
      "display_name": "Sequential Consultation Chain",
      "category": "collaboration",
      "priority": "P1",
      "description": "...",
      "parameters": { ... },
      "use_cases": [ ... ],
      "implementation": { ... }
    }
  ],
  "implementation_roadmap": {
    "phase_1": ["tool_1", "tool_2"],
    "phase_2": ["tool_3"]
  }
}
```

### Qwen Output (Markdown)

```markdown
# Implementation Guide: [Tool Name]

## 1. File Structure

## 2. Handler Implementation

## 3. Service Integration

## 4. Tool Registration

## 5. Type Definitions

## 6. Testing Strategy

## 7. Implementation Order
```

## Tips

- Run `npm run build` before executing these scripts
- Ensure Ollama is running and models are available
- Check `.tmp/` directory for intermediate results
- The markdown report is great for human review
- The JSON output is perfect for feeding into other automation

## Extending

To modify the prompts:

- Edit `buildPrompt()` in `ask_kimi.js` for strategic analysis
- Edit `buildQwenPrompt()` in `ask_kimi_then_qwen.js` for implementation instructions

To add more stages:

- Follow the pattern in `ask_kimi_then_qwen.js`
- Use `consultation_type: 'thinking'` or `'instruction'` as appropriate
- Chain results through JSON parsing and formatting
