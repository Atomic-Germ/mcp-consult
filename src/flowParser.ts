import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';
import { z } from 'zod';

/*
  Flow configuration parser for Decision Flow Orchestration.

  Supported input formats: YAML and JSON.

  Basic schema:
  {
    flows: {
      <flowName>: {
        steps: [ { id?, name?, model?, tool?, prompt?, system_prompt?, condition?, memory? } ]
      }
    }
  }

  This module exposes helpers to parse text or files and returns a validated shape.
*/

const MemoryActionSchema = z.object({
  type: z.literal('store').optional(),
  key: z.string().optional(),
  from: z.string().optional(),
});

const FlowStepSchema = z
  .object({
    id: z.string().optional(),
    name: z.string().optional(),
    model: z.string().optional(),
    tool: z.string().optional(),
    prompt: z.string().optional(),
    system_prompt: z.string().optional(),
    condition: z.string().optional(),
    memory: z.array(MemoryActionSchema).optional(),
  })
  .passthrough();

const FlowSchema = z
  .object({
    steps: z.array(FlowStepSchema).min(1),
  })
  .passthrough();

const TopSchema = z
  .object({
    flows: z.record(FlowSchema),
  })
  .passthrough();

export type MemoryAction = z.infer<typeof MemoryActionSchema>;
export type FlowStep = z.infer<typeof FlowStepSchema>;
export type FlowDefinition = z.infer<typeof FlowSchema>;
export type FlowConfig = z.infer<typeof TopSchema>;

export function parseFlowConfigText(text: string, format?: 'yaml' | 'json'): FlowConfig {
  let raw: unknown;

  try {
    if (format === 'json') {
      raw = JSON.parse(text);
    } else if (format === 'yaml') {
      raw = yaml.load(text);
    } else {
      // try to auto-detect: JSON if it starts with { or [, otherwise YAML
      const trimmed = text.trimLeft();
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        raw = JSON.parse(text);
      } else {
        raw = yaml.load(text);
      }
    }
  } catch (err) {
    throw new Error(`Failed to parse config (${format ?? 'auto'}): ${(err as Error).message}`);
  }

  try {
    const parsed = TopSchema.parse(raw);
    return parsed;
  } catch (err) {
    if (err instanceof z.ZodError) {
      throw new Error(`Flow config validation error: ${err.message}`);
    }
    throw err;
  }
}

export async function parseFlowConfigFile(filePath: string): Promise<FlowConfig> {
  const data = await fs.readFile(filePath, 'utf-8');
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.json') return parseFlowConfigText(data, 'json');
  return parseFlowConfigText(data, 'yaml');
}

export function tryParseFlowConfigText(
  text: string,
  format?: 'yaml' | 'json'
): { success: true; config: FlowConfig } | { success: false; error: string } {
  try {
    const cfg = parseFlowConfigText(text, format);
    return { success: true, config: cfg };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export default { parseFlowConfigText, parseFlowConfigFile, tryParseFlowConfigText };
