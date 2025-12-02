import { describe, it, expect } from 'vitest';
import { parseFlowConfigText, tryParseFlowConfigText } from '../src/flowParser';

const yamlSample = `
flows:
  technical_review:
    steps:
      - id: analyze
        model: gpt-4
        prompt: "Analyze problem complexity"
      - id: summarize
        model: local-llm
        prompt: "Summarize recommendations"
`;

const jsonSample = JSON.stringify({
  flows: {
    quick: {
      steps: [{ id: 's1', model: 'm1', prompt: 'Do thing' }],
    },
  },
});

describe('flowParser', () => {
  it('parses YAML flow config', () => {
    const cfg = parseFlowConfigText(yamlSample, 'yaml');
    expect(cfg).toBeDefined();
    expect(cfg.flows.technical_review.steps.length).toBe(2);
    expect(cfg.flows.technical_review.steps[0].id).toBe('analyze');
  });

  it('parses JSON flow config', () => {
    const cfg = parseFlowConfigText(jsonSample, 'json');
    expect(cfg.flows.quick.steps[0].id).toBe('s1');
  });

  it('returns error for invalid config via tryParse', () => {
    const bad = 'flows:\n  badflow: {}\n';
    const res = tryParseFlowConfigText(bad, 'yaml');
    expect(res.success).toBe(false);
    expect((res as any).error).toBeDefined();
  });
});
