import { z } from 'zod';

// Ollama API request schema
export const OllamaRequestSchema = z.object({
  model: z.string().min(1, 'Model name is required'),
  prompt: z.string().min(1, 'Prompt is required'),
  systemPrompt: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  stream: z.boolean(),
  timeout: z.number().positive().optional(),
});

export type OllamaRequest = z.infer<typeof OllamaRequestSchema>;

// Ollama API response schema
export const OllamaResponseSchema = z.object({
  model: z.string(),
  response: z.string(),
  done: z.boolean(),
  // Additional fields that may be present in Ollama responses
  created_at: z.string().optional(),
  total_duration: z.number().optional(),
  load_duration: z.number().optional(),
  prompt_eval_count: z.number().optional(),
  prompt_eval_duration: z.number().optional(),
  eval_count: z.number().optional(),
  eval_duration: z.number().optional(),
});

export type OllamaResponse = z.infer<typeof OllamaResponseSchema>;

// A parsed chunk from a streaming response. Handlers may receive these and forward
// partial text to clients or notifications.
export interface OllamaStreamChunk {
  // Preferential text fields we attempt to extract
  response?: string;
  text?: string;
  // Delta-style content (OpenAI-style / Ollama choices)
  choices?: any;
  // Raw object when we couldn't interpret other fields
  raw?: any;
}