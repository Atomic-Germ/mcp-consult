"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OllamaError = exports.ValidationError = exports.OllamaModelNotFoundError = exports.OllamaValidationError = exports.OllamaTimeoutError = exports.OllamaConnectionError = exports.OllamaConsultError = void 0;
// Re-export all types from a single entry point
__exportStar(require("./ollama.types"), exports);
__exportStar(require("./conversation.types"), exports);
__exportStar(require("./executor.types"), exports);
// Explicitly export error classes to avoid naming conflicts
var errors_types_1 = require("./errors.types");
Object.defineProperty(exports, "OllamaConsultError", { enumerable: true, get: function () { return errors_types_1.OllamaConsultError; } });
Object.defineProperty(exports, "OllamaConnectionError", { enumerable: true, get: function () { return errors_types_1.OllamaConnectionError; } });
Object.defineProperty(exports, "OllamaTimeoutError", { enumerable: true, get: function () { return errors_types_1.OllamaTimeoutError; } });
Object.defineProperty(exports, "OllamaValidationError", { enumerable: true, get: function () { return errors_types_1.OllamaValidationError; } });
Object.defineProperty(exports, "OllamaModelNotFoundError", { enumerable: true, get: function () { return errors_types_1.OllamaModelNotFoundError; } });
Object.defineProperty(exports, "ValidationError", { enumerable: true, get: function () { return errors_types_1.ValidationError; } });
Object.defineProperty(exports, "OllamaError", { enumerable: true, get: function () { return errors_types_1.OllamaError; } });
