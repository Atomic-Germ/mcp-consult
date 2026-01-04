"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigManager = void 0;
const index_js_1 = require("../types/index.js");
class ConfigManager {
    constructor(options = {}) {
        this.ollamaBaseUrl = this.validateUrl(options.ollamaBaseUrl || process.env.OLLAMA_BASE_URL || 'http://localhost:11434');
        this.defaultModel = options.defaultModel || process.env.OLLAMA_DEFAULT_MODEL || 'llama2';
        this.timeout = this.validateTimeout(options.timeout || 60000);
        this.maxRetries = this.validateMaxRetries(options.maxRetries || 3);
    }
    validateUrl(url) {
        try {
            const parsed = new URL(url);
            if (!parsed.protocol.startsWith('http')) {
                throw new index_js_1.ValidationError('URL must use HTTP or HTTPS protocol', 'ollamaBaseUrl');
            }
            return url.replace(/\/$/, ''); // Remove trailing slash
        }
        catch {
            throw new index_js_1.ValidationError(`Invalid Ollama base URL: ${url}`, 'ollamaBaseUrl');
        }
    }
    validateTimeout(timeout) {
        if (timeout < 1000 || timeout > 300000) {
            throw new index_js_1.ValidationError('Timeout must be between 1000 and 300000 ms', 'timeout');
        }
        return timeout;
    }
    validateMaxRetries(retries) {
        if (retries < 0 || retries > 10) {
            throw new index_js_1.ValidationError('Max retries must be between 0 and 10', 'maxRetries');
        }
        return retries;
    }
    getOllamaBaseUrl() {
        return this.ollamaBaseUrl;
    }
    getDefaultModel() {
        return this.defaultModel;
    }
    getTimeout() {
        return this.timeout;
    }
    getMaxRetries() {
        return this.maxRetries;
    }
    getApiUrl(endpoint) {
        return `${this.ollamaBaseUrl}${endpoint}`;
    }
}
exports.ConfigManager = ConfigManager;
