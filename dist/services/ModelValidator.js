"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModelValidator = void 0;
const types_1 = require("../types");
class ModelValidator {
    constructor(config) {
        this.config = config;
    }
    looksLikeCloudModel(name) {
        if (!name)
            return false;
        return name.includes(':cloud') || name.includes('-cloud');
    }
    modelIsSafe(model) {
        if (!model)
            return false;
        // Accept all models returned by Ollama
        return true;
    }
    async getAvailableModels() {
        try {
            const url = this.config.getApiUrl('/api/tags');
            const response = await fetch(url, {
                method: 'GET',
                signal: AbortSignal.timeout(this.config.getTimeout()),
            });
            if (!response.ok) {
                throw new types_1.OllamaError(`Failed to fetch models: ${response.statusText}`, 'LIST_MODELS_FAILED');
            }
            const text = await response.text();
            const data = JSON.parse(text);
            const models = data.models || [];
            const available = models
                .filter((m) => this.modelIsSafe(m))
                .map((m) => ({
                name: m.name,
                installed: !this.looksLikeCloudModel(m.name),
                isCloud: this.looksLikeCloudModel(m.name),
            }));
            return available;
        }
        catch (error) {
            if (error instanceof types_1.OllamaError)
                throw error;
            throw new types_1.OllamaError(`Failed to fetch available models: ${error instanceof Error ? error.message : 'Unknown error'}`, 'CONNECTION_FAILED');
        }
    }
    async isModelAvailable(modelName) {
        if (!modelName)
            return false;
        // Cloud models are always acceptable
        if (this.looksLikeCloudModel(modelName))
            return true;
        try {
            const available = await this.getAvailableModels();
            return available.some((m) => m.name === modelName);
        }
        catch (_error) {
            void _error;
            // If we can't check, assume unavailable to be safe
            return false;
        }
    }
    async getDefaultModel() {
        try {
            const available = await this.getAvailableModels();
            if (available.length === 0) {
                throw new types_1.OllamaError('No models available', 'NO_MODELS_AVAILABLE');
            }
            // Prefer installed models over cloud models
            const installed = available.find((m) => m.installed);
            if (installed)
                return installed.name;
            // Fall back to first cloud model
            const cloud = available.find((m) => m.isCloud);
            if (cloud)
                return cloud.name;
            // Fall back to first available
            return available[0].name;
        }
        catch (error) {
            if (error instanceof types_1.OllamaError)
                throw error;
            throw new types_1.OllamaError(`Failed to determine default model: ${error instanceof Error ? error.message : 'Unknown error'}`, 'CONNECTION_FAILED');
        }
    }
    getSuggestions(count = 3) {
        return this.getAvailableModels().then((models) => models.slice(0, count).map((m) => m.name));
    }
}
exports.ModelValidator = ModelValidator;
