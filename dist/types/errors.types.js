"use strict";
// Custom error types for better error handling
Object.defineProperty(exports, "__esModule", { value: true });
exports.OllamaError = exports.ValidationError = exports.OllamaModelNotFoundError = exports.OllamaValidationError = exports.OllamaTimeoutError = exports.OllamaConnectionError = exports.OllamaConsultError = void 0;
class OllamaConsultError extends Error {
    constructor(message, code, originalError) {
        super(message);
        this.code = code;
        this.originalError = originalError;
        this.name = 'OllamaConsultError';
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.OllamaConsultError = OllamaConsultError;
class OllamaConnectionError extends OllamaConsultError {
    constructor(message, originalError) {
        super(message, 'OLLAMA_CONNECTION_ERROR', originalError);
        this.name = 'OllamaConnectionError';
    }
}
exports.OllamaConnectionError = OllamaConnectionError;
class OllamaTimeoutError extends OllamaConsultError {
    constructor(message, originalError) {
        super(message, 'OLLAMA_TIMEOUT_ERROR', originalError);
        this.name = 'OllamaTimeoutError';
    }
}
exports.OllamaTimeoutError = OllamaTimeoutError;
class OllamaValidationError extends OllamaConsultError {
    constructor(message, originalError) {
        super(message, 'OLLAMA_VALIDATION_ERROR', originalError);
        this.name = 'OllamaValidationError';
    }
}
exports.OllamaValidationError = OllamaValidationError;
class OllamaModelNotFoundError extends OllamaConsultError {
    constructor(modelName, originalError) {
        super(`Model '${modelName}' not found`, 'OLLAMA_MODEL_NOT_FOUND', originalError);
        this.name = 'OllamaModelNotFoundError';
    }
}
exports.OllamaModelNotFoundError = OllamaModelNotFoundError;
// Legacy compatibility
class ValidationError extends OllamaValidationError {
    constructor(message, field) {
        super(message);
        this.field = field;
        this.name = 'ValidationError';
    }
}
exports.ValidationError = ValidationError;
class OllamaError extends OllamaConsultError {
    constructor(message, code, statusCode) {
        super(message, code);
        this.statusCode = statusCode;
        this.name = 'OllamaError';
    }
}
exports.OllamaError = OllamaError;
