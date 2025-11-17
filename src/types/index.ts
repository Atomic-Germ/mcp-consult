// Re-export all types from a single entry point
export * from './ollama.types';
export * from './conversation.types';
export * from './executor.types';

// Explicitly export error classes to avoid naming conflicts
export {
  OllamaConsultError,
  OllamaConnectionError,
  OllamaTimeoutError,
  OllamaValidationError,
  OllamaModelNotFoundError,
  ValidationError,
  OllamaError,
} from './errors.types';

// Legacy compatibility exports (deprecated)
export type { OllamaRequest as ConsultRequest } from './ollama.types';
export type { OllamaResponse as ConsultResponse } from './ollama.types';
export type { Consultant as SequentialConsultant } from './conversation.types';
export type { ChainContext as SequentialContext } from './conversation.types';
export type { SequentialChainRequest as SequentialConsultationRequest } from './conversation.types';
export type { SequentialChainResponse as SequentialConsultationResponse } from './conversation.types';

// OllamaModel type for listing models
export interface OllamaModel {
  name: string;
  size?: number;
  digest?: string;
  modified_at?: string;
}
