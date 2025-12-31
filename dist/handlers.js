"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listTools = listTools;
exports.callToolHandler = callToolHandler;
const axios_1 = __importDefault(require("axios"));
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
// Ensure a reasonable default timeout for Ollama calls
axios_1.default.defaults.timeout = axios_1.default.defaults.timeout || 60000;
function listTools() {
    return {
        tools: [
            {
                name: 'consult_ollama',
                description: 'Consult an Ollama model with a prompt and get its response for reasoning from another viewpoint.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        model: { type: 'string' },
                        prompt: { type: 'string' },
                        system_prompt: { type: 'string' },
                    },
                    required: ['model', 'prompt'],
                },
            },
            {
                name: 'list_ollama_models',
                description: 'List all available Ollama models on the local instance.',
                inputSchema: { type: 'object', properties: {} },
            },
            {
                name: 'compare_ollama_models',
                description: 'Run the same prompt against multiple Ollama models and return their outputs side-by-side for comparison.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        models: { type: 'array', items: { type: 'string' } },
                        prompt: { type: 'string' },
                        system_prompt: { type: 'string' },
                    },
                    required: ['prompt'],
                },
            },
            {
                name: 'remember_consult',
                description: 'Store the result of a consult into a local memory store (or configured memory service).',
                inputSchema: {
                    type: 'object',
                    properties: {
                        key: { type: 'string' },
                        prompt: { type: 'string' },
                        model: { type: 'string' },
                        response: { type: 'string' },
                    },
                    required: ['prompt'],
                },
            },
        ],
    };
}
// The handler expects the `params` object (i.e. the CallTool request params).
async function callToolHandler(params) {
    const name = params.name;
    const args = params.arguments || {};
    switch (name) {
        case 'consult_ollama': {
            const model = args?.model;
            const prompt = args?.prompt;
            const system_prompt = args?.system_prompt;
            try {
                const response = await axios_1.default.post(`${OLLAMA_BASE_URL}/api/generate`, {
                    model,
                    prompt,
                    system: system_prompt,
                    stream: false,
                });
                return {
                    content: [
                        {
                            type: 'text',
                            text: response.data.response,
                        },
                    ],
                };
            }
            catch (error) {
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
        case 'list_ollama_models': {
            try {
                const response = await axios_1.default.get(`${OLLAMA_BASE_URL}/api/tags`);
                const models = (response.data.models || []).map((m) => m.name).join(', ');
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Available models: ${models}`,
                        },
                    ],
                };
            }
            catch (error) {
                const message = error instanceof Error ? error.message : 'Unknown error';
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Error listing models: ${message}`,
                        },
                    ],
                    isError: true,
                };
            }
        }
        case 'compare_ollama_models': {
            const modelsArg = args?.models;
            const prompt = args?.prompt;
            const system_prompt = args?.system_prompt;
            if (!prompt) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: 'Missing required argument: prompt',
                        },
                    ],
                    isError: true,
                };
            }
            let modelsToUse = [];
            if (Array.isArray(modelsArg) && modelsArg.length > 0) {
                modelsToUse = modelsArg;
            }
            else {
                try {
                    const resp = await axios_1.default.get(`${OLLAMA_BASE_URL}/api/tags`);
                    modelsToUse = (resp.data.models || []).map((m) => m.name).slice(0, 2);
                }
                catch (err) {
                    modelsToUse = ['llama2'];
                }
            }
            const contents = [];
            for (const m of modelsToUse) {
                try {
                    const gen = await axios_1.default.post(`${OLLAMA_BASE_URL}/api/generate`, {
                        model: m,
                        prompt,
                        system: system_prompt,
                        stream: false,
                    });
                    contents.push({ type: 'text', text: `Model ${m}:\n${gen.data.response}` });
                }
                catch (e) {
                    const message = e instanceof Error ? e.message : String(e);
                    contents.push({ type: 'text', text: `Model ${m} failed: ${message}` });
                }
            }
            return { content: contents };
        }
        case 'remember_consult': {
            const key = args?.key;
            const prompt = args?.prompt;
            const model = args?.model;
            let responseText = args?.response;
            if (!prompt) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: 'Missing required argument: prompt',
                        },
                    ],
                    isError: true,
                };
            }
            if (!responseText) {
                // generate using Ollama if a model was provided
                if (!model) {
                    return {
                        content: [
                            { type: 'text', text: "Missing 'response' and no 'model' provided to generate it." },
                        ],
                        isError: true,
                    };
                }
                try {
                    const gen = await axios_1.default.post(`${OLLAMA_BASE_URL}/api/generate`, {
                        model,
                        prompt,
                        stream: false,
                    });
                    responseText = gen.data.response;
                }
                catch (e) {
                    const message = e instanceof Error ? e.message : String(e);
                    return {
                        content: [{ type: 'text', text: `Failed to generate response: ${message}` }],
                        isError: true,
                    };
                }
            }
            // Persist to a simple local memory directory by default. Can be overridden with MEMORY_DIR.
            const memoryDir = process.env.MEMORY_DIR || path_1.default.join('/tmp', 'mcp-consult-memory');
            try {
                await promises_1.default.mkdir(memoryDir, { recursive: true });
                const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
                const filePath = path_1.default.join(memoryDir, `observation-${id}.json`);
                const payload = {
                    key: key || null,
                    prompt,
                    model: model || null,
                    response: responseText,
                    _meta: { createdAt: new Date().toISOString() },
                };
                await promises_1.default.writeFile(filePath, JSON.stringify(payload, null, 2), 'utf-8');
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Saved consult to ${filePath}`,
                        },
                        {
                            type: 'resource',
                            resource: {
                                uri: `file://${filePath}`,
                                text: responseText,
                            },
                        },
                    ],
                };
            }
            catch (err) {
                const message = err instanceof Error ? err.message : String(err);
                return {
                    content: [{ type: 'text', text: `Failed to save memory: ${message}` }],
                    isError: true,
                };
            }
        }
        default:
            throw new Error(`Unknown tool: ${name}`);
    }
}
exports.default = { listTools, callToolHandler };
