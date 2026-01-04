"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseFlowConfigText = parseFlowConfigText;
exports.parseFlowConfigFile = parseFlowConfigFile;
exports.tryParseFlowConfigText = tryParseFlowConfigText;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const js_yaml_1 = __importDefault(require("js-yaml"));
const zod_1 = require("zod");
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
const MemoryActionSchema = zod_1.z.object({
    type: zod_1.z.literal('store').optional(),
    key: zod_1.z.string().optional(),
    from: zod_1.z.string().optional(),
});
const FlowStepSchema = zod_1.z
    .object({
    id: zod_1.z.string().optional(),
    name: zod_1.z.string().optional(),
    model: zod_1.z.string().optional(),
    tool: zod_1.z.string().optional(),
    prompt: zod_1.z.string().optional(),
    system_prompt: zod_1.z.string().optional(),
    condition: zod_1.z.string().optional(),
    memory: zod_1.z.array(MemoryActionSchema).optional(),
})
    .passthrough();
const FlowSchema = zod_1.z
    .object({
    steps: zod_1.z.array(FlowStepSchema).min(1),
})
    .passthrough();
const TopSchema = zod_1.z
    .object({
    flows: zod_1.z.record(FlowSchema),
})
    .passthrough();
function parseFlowConfigText(text, format) {
    let raw;
    try {
        if (format === 'json') {
            raw = JSON.parse(text);
        }
        else if (format === 'yaml') {
            raw = js_yaml_1.default.load(text);
        }
        else {
            // try to auto-detect: JSON if it starts with { or [, otherwise YAML
            const trimmed = text.trimLeft();
            if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
                raw = JSON.parse(text);
            }
            else {
                raw = js_yaml_1.default.load(text);
            }
        }
    }
    catch (_err) {
        const err = _err;
        throw new Error(`Failed to parse config (${format ?? 'auto'}): ${err.message}`);
    }
    try {
        const parsed = TopSchema.parse(raw);
        return parsed;
    }
    catch (_err) {
        const err = _err;
        if (err instanceof zod_1.z.ZodError) {
            throw new Error(`Flow config validation error: ${err.message}`);
        }
        throw err;
    }
}
async function parseFlowConfigFile(filePath) {
    const data = await promises_1.default.readFile(filePath, 'utf-8');
    const ext = path_1.default.extname(filePath).toLowerCase();
    if (ext === '.json')
        return parseFlowConfigText(data, 'json');
    return parseFlowConfigText(data, 'yaml');
}
function tryParseFlowConfigText(text, format) {
    try {
        const cfg = parseFlowConfigText(text, format);
        return { success: true, config: cfg };
    }
    catch (_e) {
        return { success: false, error: _e instanceof Error ? _e.message : String(_e) };
    }
}
exports.default = { parseFlowConfigText, parseFlowConfigFile, tryParseFlowConfigText };
