"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listToolsHandler = exports.ListToolsHandler = void 0;
const BaseHandler_js_1 = require("./BaseHandler.js");
class ListToolsHandler extends BaseHandler_js_1.BaseHandler {
    async handle() {
        return {
            tools: [
                {
                    name: 'consult_ollama',
                    description: 'Consult with Ollama AI models for architectural decisions, code reviews, and design discussions. Supports sequential chaining of consultations for complex multi-step reasoning.',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            consultation_type: {
                                type: 'string',
                                enum: ['thinking', 'instruction', 'general'],
                                description: 'Type of consultation: "thinking" (uses kimi-k2-thinking:cloud for reasoning tasks), "instruction" (uses qwen3-vl:235b-instruct-cloud for instruction-following), or "general" (uses specified model or default). If specified, overrides the model parameter.',
                            },
                            model: {
                                type: 'string',
                                description: 'Model to use (e.g., "qwen2.5-coder:7b-cloud"). If not specified and no consultation_type, uses the first available model. Must be a cloud model (ends with :cloud or -cloud) or locally installed.',
                            },
                            prompt: {
                                type: 'string',
                                description: 'Your question or prompt for the AI model. Can reference previous consultation results.',
                            },
                            system_prompt: {
                                type: 'string',
                                description: 'Optional system prompt to guide model behavior',
                            },
                            context: {
                                type: 'object',
                                description: 'Optional context including code, previous results, and metadata',
                                properties: {
                                    code: {
                                        type: 'string',
                                        description: 'Code snippet or file content for analysis',
                                    },
                                    language: {
                                        type: 'string',
                                        description: 'Programming language of the code',
                                    },
                                    previous_results: {
                                        type: 'array',
                                        description: 'Results from previous consultations in the chain',
                                        items: { type: 'string' },
                                    },
                                    metadata: {
                                        type: 'object',
                                        description: 'Additional contextual information',
                                    },
                                },
                            },
                            temperature: {
                                type: 'number',
                                description: 'Sampling temperature (0.0-2.0, default: 0.7)',
                            },
                            timeout_ms: {
                                type: 'number',
                                description: 'Request timeout in milliseconds (default: 60000). Increase for complex prompts with system prompts (e.g., 120000-300000 for complex reasoning)',
                            },
                        },
                        required: ['prompt'],
                    },
                },
                {
                    name: 'list_ollama_models',
                    description: 'List all available Ollama models on the local system (installed or cloud-based)',
                    inputSchema: {
                        type: 'object',
                        properties: {},
                        required: [],
                    },
                },
                {
                    name: 'compare_ollama_responses',
                    description: 'Compare responses from multiple Ollama models on the same prompt to get diverse perspectives',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            models: {
                                type: 'array',
                                items: { type: 'string' },
                                description: 'List of model names to compare. If not specified, uses the first two available models.',
                            },
                            prompt: {
                                type: 'string',
                                description: 'The prompt to send to all models',
                            },
                            context: {
                                type: 'object',
                                description: 'Optional shared context for all models',
                                properties: {
                                    code: { type: 'string' },
                                    language: { type: 'string' },
                                    metadata: { type: 'object' },
                                },
                            },
                        },
                        required: ['prompt'],
                    },
                },
                {
                    name: 'remember_context',
                    description: 'Store context for use in future consultations within the same session',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            key: {
                                type: 'string',
                                description: 'Identifier for this context',
                            },
                            value: {
                                type: 'string',
                                description: 'Context data to remember',
                            },
                            metadata: {
                                type: 'object',
                                description: 'Optional metadata about the context',
                            },
                        },
                        required: ['key', 'value'],
                    },
                },
            ],
        };
    }
}
exports.ListToolsHandler = ListToolsHandler;
const listToolsHandler = () => new ListToolsHandler();
exports.listToolsHandler = listToolsHandler;
