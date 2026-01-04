"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.callToolHandler = exports.CallToolHandler = void 0;
const BaseHandler_js_1 = require("./BaseHandler.js");
const ConsultOllamaHandler_js_1 = require("./ConsultOllamaHandler.js");
const SequentialChainHandler_js_1 = require("./SequentialChainHandler.js");
const ModelValidator_js_1 = require("../services/ModelValidator.js");
class CallToolHandler extends BaseHandler_js_1.BaseHandler {
    constructor(ollamaService, sessionContext, modelValidator) {
        super();
        this.ollamaService = ollamaService;
        this.sessionContext = sessionContext;
        this.modelValidator = modelValidator || new ModelValidator_js_1.ModelValidator(this.ollamaService.getConfig());
    }
    async handle(request) {
        const { name, arguments: args } = request.params;
        switch (name) {
            case 'consult_ollama': {
                const handler = new ConsultOllamaHandler_js_1.ConsultOllamaHandler(this.ollamaService, this.modelValidator);
                return await handler.handle(args);
            }
            case 'list_ollama_models': {
                try {
                    const available = await this.modelValidator.getAvailableModels();
                    if (available.length === 0) {
                        return {
                            content: [
                                {
                                    type: 'text',
                                    text: 'No models available. Please install a model locally or use a cloud-based model (e.g., qwen2.5-coder:7b-cloud)',
                                },
                            ],
                            isError: true,
                        };
                    }
                    const modelNames = available.map((m) => m.name);
                    return {
                        content: [
                            {
                                type: 'text',
                                text: JSON.stringify({
                                    models: modelNames,
                                    count: modelNames.length,
                                    note: 'These are available models (installed locally or cloud-based)',
                                }, null, 2),
                            },
                        ],
                    };
                }
                catch (error) {
                    const message = error instanceof Error ? error.message : 'Failed to list models';
                    return {
                        content: [
                            {
                                type: 'text',
                                text: `Error: ${message}`,
                            },
                        ],
                        isError: true,
                    };
                }
            }
            case 'compare_ollama_responses': {
                try {
                    const { models, prompt, context = {}, } = args;
                    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
                        return {
                            content: [
                                {
                                    type: 'text',
                                    text: 'Error: prompt is required and must be a non-empty string',
                                },
                            ],
                            isError: true,
                        };
                    }
                    // Validate model availability
                    let modelsToUse = [];
                    if (Array.isArray(models) && models.length > 0) {
                        const available = await Promise.all(models.map(async (m) => ({
                            model: m,
                            isAvailable: await this.modelValidator.isModelAvailable(m),
                        })));
                        modelsToUse = available.filter((m) => m.isAvailable).map((m) => m.model);
                        if (modelsToUse.length === 0) {
                            const suggestions = await this.modelValidator.getSuggestions(3);
                            return {
                                content: [
                                    {
                                        type: 'text',
                                        text: `None of the requested models are available: ${models.join(', ')}. Try these instead: ${suggestions.join(', ')}`,
                                    },
                                ],
                                isError: true,
                            };
                        }
                    }
                    else {
                        // Use available models if not specified
                        const available = await this.modelValidator.getAvailableModels();
                        modelsToUse = available.slice(0, 2).map((m) => m.name);
                        if (modelsToUse.length === 0) {
                            return {
                                content: [
                                    {
                                        type: 'text',
                                        text: 'Error: No models available to compare',
                                    },
                                ],
                                isError: true,
                            };
                        }
                    }
                    const results = await Promise.allSettled(modelsToUse.map(async (model) => {
                        const handler = new ConsultOllamaHandler_js_1.ConsultOllamaHandler(this.ollamaService, this.modelValidator);
                        const result = await handler.handle({ model, prompt, context });
                        return {
                            model,
                            response: result.content[0]?.text || '',
                            isError: result.isError,
                        };
                    }));
                    const responses = results.map((result, index) => {
                        if (result.status === 'fulfilled') {
                            return result.value;
                        }
                        return {
                            model: modelsToUse[index],
                            response: '',
                            error: 'Request failed',
                            isError: true,
                        };
                    });
                    return {
                        content: [
                            {
                                type: 'text',
                                text: JSON.stringify(responses, null, 2),
                            },
                        ],
                    };
                }
                catch (error) {
                    const message = error instanceof Error ? error.message : 'Comparison failed';
                    return {
                        content: [
                            {
                                type: 'text',
                                text: `Error: ${message}`,
                            },
                        ],
                        isError: true,
                    };
                }
            }
            case 'remember_context': {
                try {
                    const { key, value, metadata } = args;
                    if (!key || typeof key !== 'string') {
                        return {
                            content: [
                                {
                                    type: 'text',
                                    text: 'Error: key parameter is required and must be a string',
                                },
                            ],
                            isError: true,
                        };
                    }
                    this.sessionContext.set(key, { value, metadata, timestamp: Date.now() });
                    return {
                        content: [
                            {
                                type: 'text',
                                text: `Context stored with key: ${key}`,
                            },
                        ],
                    };
                }
                catch (error) {
                    const message = error instanceof Error ? error.message : 'Failed to store context';
                    return {
                        content: [
                            {
                                type: 'text',
                                text: `Error: ${message}`,
                            },
                        ],
                        isError: true,
                    };
                }
            }
            case 'sequential_consultation_chain': {
                const handler = new SequentialChainHandler_js_1.SequentialChainHandler(this.ollamaService, this.modelValidator);
                return await handler.handle(args);
            }
            default:
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Error: Unknown tool '${name}'`,
                        },
                    ],
                    isError: true,
                };
        }
    }
}
exports.CallToolHandler = CallToolHandler;
const callToolHandler = (ollamaService, sessionContext, modelValidator) => new CallToolHandler(ollamaService, sessionContext, modelValidator);
exports.callToolHandler = callToolHandler;
