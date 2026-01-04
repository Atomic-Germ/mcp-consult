"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OllamaService = void 0;
const types_1 = require("../types");
class OllamaService {
    constructor(config) {
        this.config = config;
    }
    getConfig() {
        return this.config;
    }
    async listModels() {
        try {
            const url = this.config.getApiUrl('/api/tags');
            const response = await fetch(url, {
                method: 'GET',
                signal: AbortSignal.timeout(this.config.getTimeout()),
            });
            if (!response.ok) {
                throw new types_1.OllamaError(`Failed to list models: ${response.statusText}`, 'LIST_MODELS_FAILED', response.status);
            }
            const text = await response.text();
            const data = JSON.parse(text);
            return data.models || [];
        }
        catch (error) {
            if (error instanceof types_1.OllamaError)
                throw error;
            throw new types_1.OllamaError(`Failed to connect to Ollama: ${error instanceof Error ? error.message : 'Unknown error'}`, 'CONNECTION_FAILED');
        }
    }
    async consult(request) {
        this.validateConsultRequest(request);
        try {
            const response = await this.makeRequest('/api/generate', {
                model: request.model,
                prompt: request.prompt,
                system: request.systemPrompt,
                temperature: request.temperature,
                stream: false,
            }, request.timeout);
            return response;
        }
        catch (error) {
            if (error instanceof types_1.OllamaError || error instanceof types_1.ValidationError)
                throw error;
            throw new types_1.OllamaError(`Consultation failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'CONSULT_FAILED');
        }
    }
    async compareModels(models, prompt, systemPrompt, timeoutMs) {
        if (!models || models.length === 0) {
            throw new types_1.ValidationError('At least one model is required', 'models');
        }
        if (!prompt || prompt.trim().length === 0) {
            throw new types_1.ValidationError('Prompt cannot be empty', 'prompt');
        }
        const results = await Promise.allSettled(models.map(async (model) => {
            const startTime = Date.now();
            try {
                const response = await this.consult({
                    model,
                    prompt,
                    systemPrompt,
                    stream: true,
                    timeout: timeoutMs,
                });
                return {
                    model,
                    response: response.response,
                    duration: Date.now() - startTime,
                };
            }
            catch (error) {
                return {
                    model,
                    response: '',
                    duration: Date.now() - startTime,
                    error: error instanceof Error ? error.message : 'Unknown error',
                };
            }
        }));
        return results.map((result, index) => {
            if (result.status === 'fulfilled') {
                return result.value;
            }
            return {
                model: models[index],
                response: '',
                error: 'Request failed',
            };
        });
    }
    validateConsultRequest(request) {
        if (!request.model || request.model.trim().length === 0) {
            throw new types_1.ValidationError('Model name is required', 'model');
        }
        if (!request.prompt || request.prompt.trim().length === 0) {
            throw new types_1.ValidationError('Prompt is required', 'prompt');
        }
        if (request.temperature !== undefined) {
            if (request.temperature < 0 || request.temperature > 2) {
                throw new types_1.ValidationError('Temperature must be between 0 and 2', 'temperature');
            }
        }
    }
    async makeRequest(endpoint, body, timeoutMs) {
        let lastError = null;
        const timeout = timeoutMs || this.config.getTimeout();
        for (let attempt = 0; attempt <= this.config.getMaxRetries(); attempt++) {
            try {
                const response = await fetch(this.config.getApiUrl(endpoint), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                    signal: AbortSignal.timeout(timeout),
                });
                if (!response.ok) {
                    const errorText = await response.text();
                    throw new types_1.OllamaError(`Ollama API error: ${errorText}`, 'API_ERROR', response.status);
                }
                return await response.json();
            }
            catch (error) {
                lastError = error instanceof Error ? error : new Error('Unknown error');
                if (error instanceof types_1.OllamaError)
                    throw error;
                if (attempt < this.config.getMaxRetries()) {
                    await this.delay(1000 * Math.pow(2, attempt));
                }
            }
        }
        throw new types_1.OllamaError(`Failed after ${this.config.getMaxRetries()} retries: ${lastError?.message}`, 'MAX_RETRIES_EXCEEDED');
    }
    delay(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
exports.OllamaService = OllamaService;
