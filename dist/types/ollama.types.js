"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OllamaResponseSchema = exports.OllamaRequestSchema = void 0;
const zod_1 = require("zod");
// Ollama API request schema
exports.OllamaRequestSchema = zod_1.z.object({
    model: zod_1.z.string().min(1, 'Model name is required'),
    prompt: zod_1.z.string().min(1, 'Prompt is required'),
    systemPrompt: zod_1.z.string().optional(),
    temperature: zod_1.z.number().min(0).max(2).optional(),
    stream: zod_1.z.boolean(),
    timeout: zod_1.z.number().positive().optional(),
});
// Ollama API response schema
exports.OllamaResponseSchema = zod_1.z.object({
    model: zod_1.z.string(),
    response: zod_1.z.string(),
    done: zod_1.z.boolean(),
    // Additional fields that may be present in Ollama responses
    created_at: zod_1.z.string().optional(),
    total_duration: zod_1.z.number().optional(),
    load_duration: zod_1.z.number().optional(),
    prompt_eval_count: zod_1.z.number().optional(),
    prompt_eval_duration: zod_1.z.number().optional(),
    eval_count: zod_1.z.number().optional(),
    eval_duration: zod_1.z.number().optional(),
});
