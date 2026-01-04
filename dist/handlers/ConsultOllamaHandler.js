"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConsultOllamaHandler = void 0;
const BaseHandler_js_1 = require("./BaseHandler.js");
const ModelValidator_js_1 = require("../services/ModelValidator.js");
const modelSettings_js_1 = require("../modelSettings.js");
class ConsultOllamaHandler extends BaseHandler_js_1.BaseHandler {
    constructor(ollamaService, modelValidator) {
        super();
        this.ollamaService = ollamaService;
        this.modelValidator = modelValidator || new ModelValidator_js_1.ModelValidator(this.ollamaService.getConfig());
    }
    async handle(params) {
        // Validate and cast parameters
        const typedParams = params;
        try {
            // Validate required parameters
            this.validateRequired(typedParams, ['prompt']);
            let model = typedParams.model || '';
            const consultationType = typedParams.consultation_type;
            // Auto-select model based on consultation type
            if (consultationType === 'thinking') {
                model = 'kimi-k2-thinking:cloud';
            }
            else if (consultationType === 'instruction') {
                model = 'qwen3-vl:235b-instruct-cloud';
            }
            else if (!model) {
                // If no model specified and no consultation type, use default
                model = await this.modelValidator.getDefaultModel();
            }
            // Validate model availability
            if (model) {
                const isAvailable = await this.modelValidator.isModelAvailable(model);
                if (!isAvailable) {
                    const suggestions = await this.modelValidator.getSuggestions(3);
                    const typeInfo = consultationType
                        ? ` (auto-selected for ${consultationType} consultation)`
                        : '';
                    return {
                        content: [
                            {
                                type: 'text',
                                text: `Model '${model}'${typeInfo} is not available. Available models: ${suggestions.join(', ')}. Please install the model or choose an available one.`,
                            },
                        ],
                        isError: true,
                    };
                }
            }
            // Build consult request
            const request = {
                model,
                prompt: typedParams.prompt,
                stream: true,
            };
            // Include system prompt if provided
            if (typedParams.system_prompt) {
                request.systemPrompt = typedParams.system_prompt;
            }
            // Include temperature if provided
            if (typeof typedParams.temperature === 'number') {
                request.temperature = typedParams.temperature;
            }
            // Include timeout if provided
            if (typeof typedParams.timeout_ms === 'number') {
                request.timeout = typedParams.timeout_ms;
            }
            // Optional: auto-suggest temperature/timeout based on model + prompt heuristics
            // Inspired by the StandardLlama “autonomy” branch: best-effort defaults rather than strict config.
            if ((0, modelSettings_js_1.shouldAutoModelSettings)(typedParams)) {
                const hasSystemPrompt = Boolean(typedParams.system_prompt);
                const suggested = (0, modelSettings_js_1.suggestConsultSettings)({
                    modelName: model,
                    prompt: request.prompt,
                    hasSystemPrompt,
                    baseTimeoutMs: this.ollamaService.getConfig().getTimeout(),
                });
                if (request.temperature === undefined)
                    request.temperature = suggested.temperature;
                if (request.timeout === undefined)
                    request.timeout = suggested.timeoutMs;
            }
            // Call Ollama service
            const response = await this.ollamaService.consult(request);
            // Return formatted response
            return {
                content: [
                    {
                        type: 'text',
                        text: response.response,
                    },
                ],
            };
        }
        catch (error) {
            // Handle errors with consistent formatting
            const message = error instanceof Error ? error.message : 'Unknown error';
            return {
                content: [
                    {
                        type: 'text',
                        text: `Error consulting Ollama: ${message}`,
                    },
                ],
                isError: true,
            };
        }
    }
}
exports.ConsultOllamaHandler = ConsultOllamaHandler;
