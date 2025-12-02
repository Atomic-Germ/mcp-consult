// Custom error types for better error handling

export class OllamaConsultError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'OllamaConsultError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export class OllamaConnectionError extends OllamaConsultError {
  constructor(message: string, originalError?: Error) {
    super(message, 'OLLAMA_CONNECTION_ERROR', originalError);
    this.name = 'OllamaConnectionError';
  }
}

export class OllamaTimeoutError extends OllamaConsultError {
  constructor(message: string, originalError?: Error) {
    super(message, 'OLLAMA_TIMEOUT_ERROR', originalError);
    this.name = 'OllamaTimeoutError';
  }
}

export class OllamaValidationError extends OllamaConsultError {
  constructor(message: string, originalError?: Error) {
    super(message, 'OLLAMA_VALIDATION_ERROR', originalError);
    this.name = 'OllamaValidationError';
  }
}

export class OllamaModelNotFoundError extends OllamaConsultError {
  constructor(modelName: string, originalError?: Error) {
    super(`Model '${modelName}' not found`, 'OLLAMA_MODEL_NOT_FOUND', originalError);
    this.name = 'OllamaModelNotFoundError';
  }
}

// Legacy compatibility
export class ValidationError extends OllamaValidationError {
  constructor(
    message: string,
    public readonly field?: string
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class OllamaError extends OllamaConsultError {
  constructor(
    message: string,
    code: string,
    public readonly statusCode?: number
  ) {
    super(message, code);
    this.name = 'OllamaError';
  }
}
