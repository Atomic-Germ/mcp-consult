"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SequentialChainResponseSchema = exports.ConsultationResultSchema = exports.SequentialChainRequestSchema = exports.MemoryOptionsSchema = exports.FlowControlSchema = exports.ChainContextSchema = exports.ConsultantSchema = void 0;
const zod_1 = require("zod");
// Consultant in a sequential chain
exports.ConsultantSchema = zod_1.z.object({
    id: zod_1.z.string().min(1, 'Consultant ID is required'),
    model: zod_1.z.string().min(1, 'Model name is required'),
    prompt: zod_1.z.string().min(1, 'Prompt is required'),
    systemPrompt: zod_1.z.string().optional(),
    temperature: zod_1.z.number().min(0).max(2).optional(),
    timeoutMs: zod_1.z.number().positive().optional(),
});
// Context for sequential chains
exports.ChainContextSchema = zod_1.z.object({
    systemPrompt: zod_1.z.string().optional(),
    variables: zod_1.z.record(zod_1.z.unknown()).optional(),
    passThrough: zod_1.z.boolean().optional().default(true),
});
// Flow control for chains
exports.FlowControlSchema = zod_1.z.object({
    continueOnError: zod_1.z.boolean().optional().default(false),
    maxRetries: zod_1.z.number().min(0).optional().default(0),
    retryDelayMs: zod_1.z.number().min(0).optional().default(1000),
});
// Memory options for chains
exports.MemoryOptionsSchema = zod_1.z.object({
    storeConversation: zod_1.z.boolean().optional().default(false),
    memoryKey: zod_1.z.string().optional(),
});
// Sequential consultation chain request
exports.SequentialChainRequestSchema = zod_1.z.object({
    consultants: zod_1.z.array(exports.ConsultantSchema).min(1, 'At least one consultant required'),
    context: exports.ChainContextSchema.optional(),
    flowControl: exports.FlowControlSchema.optional(),
    memory: exports.MemoryOptionsSchema.optional(),
});
// Consultation result
exports.ConsultationResultSchema = zod_1.z.object({
    consultantId: zod_1.z.string(),
    model: zod_1.z.string(),
    prompt: zod_1.z.string(),
    response: zod_1.z.string(),
    duration: zod_1.z.number(),
    error: zod_1.z.string().optional(),
});
// Sequential chain response
exports.SequentialChainResponseSchema = zod_1.z.object({
    results: zod_1.z.array(exports.ConsultationResultSchema),
    totalDuration: zod_1.z.number(),
    success: zod_1.z.boolean(),
    finalResponse: zod_1.z.string().optional(),
});
