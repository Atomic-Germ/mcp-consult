import { z } from 'zod';

// Consultant in a sequential chain
export const ConsultantSchema = z.object({
  id: z.string().min(1, 'Consultant ID is required'),
  model: z.string().min(1, 'Model name is required'),
  prompt: z.string().min(1, 'Prompt is required'),
  systemPrompt: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  timeoutMs: z.number().positive().optional(),
});

export type Consultant = z.infer<typeof ConsultantSchema>;

// Context for sequential chains
export const ChainContextSchema = z.object({
  systemPrompt: z.string().optional(),
  variables: z.record(z.unknown()).optional(),
  passThrough: z.boolean().optional().default(true),
});

export type ChainContext = z.infer<typeof ChainContextSchema>;

// Flow control for chains
export const FlowControlSchema = z.object({
  continueOnError: z.boolean().optional().default(false),
  maxRetries: z.number().min(0).optional().default(0),
  retryDelayMs: z.number().min(0).optional().default(1000),
});

export type FlowControl = z.infer<typeof FlowControlSchema>;

// Memory options for chains
export const MemoryOptionsSchema = z.object({
  storeConversation: z.boolean().optional().default(false),
  memoryKey: z.string().optional(),
});

export type MemoryOptions = z.infer<typeof MemoryOptionsSchema>;

// Sequential consultation chain request
export const SequentialChainRequestSchema = z.object({
  consultants: z.array(ConsultantSchema).min(1, 'At least one consultant required'),
  context: ChainContextSchema.optional(),
  flowControl: FlowControlSchema.optional(),
  memory: MemoryOptionsSchema.optional(),
});

export type SequentialChainRequest = z.infer<typeof SequentialChainRequestSchema>;

// Consultation result
export const ConsultationResultSchema = z.object({
  consultantId: z.string(),
  model: z.string(),
  prompt: z.string(),
  response: z.string(),
  duration: z.number(),
  error: z.string().optional(),
});

export type ConsultationResult = z.infer<typeof ConsultationResultSchema>;

// Simple comparison result for model comparisons
export interface ComparisonResult {
  model: string;
  response: string;
  duration?: number;
  error?: string;
}

// Sequential chain response
export const SequentialChainResponseSchema = z.object({
  results: z.array(ConsultationResultSchema),
  totalDuration: z.number(),
  success: z.boolean(),
  finalResponse: z.string().optional(),
});

export type SequentialChainResponse = z.infer<typeof SequentialChainResponseSchema>;
