import { z } from 'zod';

// Ollama Request Schema
export const OllamaRequestSchema = z.object({
  model: z.string().min(1, 'Model name is required'),
  prompt: z.string().min(1, 'Prompt is required'),
  stream: z.boolean().optional().default(false),
  system: z.string().optional(),
  systemPrompt: z.string().optional(), // Alias for system
  template: z.string().optional(),
  context: z.array(z.number()).optional(),
  timeout: z.number().min(1000).max(600000).optional(), // Timeout in milliseconds
  temperature: z.number().min(0).max(2).optional(), // Top-level for backwards compat
  options: z
    .object({
      temperature: z.number().min(0).max(2).optional(),
      top_p: z.number().min(0).max(1).optional(),
      top_k: z.number().min(0).optional(),
      num_predict: z.number().optional(),
    })
    .optional(),
});

export type OllamaRequest = z.infer<typeof OllamaRequestSchema>;

// Ollama Response Schema
export const OllamaResponseSchema = z.object({
  model: z.string(),
  response: z.string(),
  done: z.boolean(),
  created_at: z.string(),
  total_duration: z.number().optional(),
  load_duration: z.number().optional(),
  prompt_eval_count: z.number().optional(),
  eval_count: z.number().optional(),
  context: z.array(z.number()).optional(),
});

export type OllamaResponse = z.infer<typeof OllamaResponseSchema>;

// Ollama Error Response
export const OllamaErrorResponseSchema = z.object({
  error: z.string(),
});

export type OllamaErrorResponse = z.infer<typeof OllamaErrorResponseSchema>;
