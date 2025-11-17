import { describe, it, expect } from 'vitest';
import { OllamaRequestSchema, OllamaResponseSchema } from '../../src/types/ollama.types';

describe('Ollama Types', () => {
  describe('OllamaRequest validation', () => {
    it('should validate a valid request', () => {
      const validRequest = {
        model: 'llama2',
        prompt: 'Hello',
        stream: false,
      };
      const result = OllamaRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    it('should reject request without model', () => {
      const invalidRequest = {
        prompt: 'Hello',
      };
      const result = OllamaRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it('should reject request without prompt', () => {
      const invalidRequest = {
        model: 'llama2',
      };
      const result = OllamaRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });
  });

  describe('OllamaResponse validation', () => {
    it('should validate a valid response', () => {
      const validResponse = {
        model: 'llama2',
        response: 'Hello back!',
        done: true,
        created_at: '2024-01-01T00:00:00Z',
      };
      const result = OllamaResponseSchema.safeParse(validResponse);
      expect(result.success).toBe(true);
    });
  });
});
