"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.invokeOllama = invokeOllama;
exports.registerTool = registerTool;
exports.invokeTool = invokeTool;
exports.renderTemplate = renderTemplate;
const axios_1 = __importDefault(require("axios"));
const legacy_handlers_1 = require("./legacy-handlers");
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const DEFAULT_TOOL_TIMEOUT_MS = Number(process.env.MCP_TOOL_TIMEOUT_MS || 10000);
async function invokeOllama(model, prompt, system) {
    const resp = await axios_1.default.post(`${OLLAMA_BASE_URL}/api/generate`, {
        model,
        prompt,
        system,
        stream: false,
    });
    if (!resp || !resp.data)
        throw new Error('No response from Ollama');
    // Ollama shape: { response: "..." }
    return resp.data.response;
}
const toolRegistry = {};
function registerTool(name, fn) {
    toolRegistry[name] = fn;
}
function withTimeout(p, ms, name) {
    if (ms == null || ms === Infinity)
        return p;
    let timer = null;
    const t = new Promise((_, rej) => {
        timer = setTimeout(() => rej(new Error(`Tool invocation timed out after ${ms}ms${name ? `: ${name}` : ''}`)), ms);
    });
    return Promise.race([
        p.then((r) => {
            if (timer)
                clearTimeout(timer);
            return r;
        }),
        t,
    ]);
}
async function invokeTool(name, args, options) {
    const fn = toolRegistry[name];
    const timeoutMs = options && typeof options.timeoutMs === 'number' ? options.timeoutMs : DEFAULT_TOOL_TIMEOUT_MS;
    if (fn) {
        const p = Promise.resolve(fn(args));
        return await withTimeout(p, timeoutMs, name);
    }
    // Fallback: try calling local MCP handlers if available
    try {
        const p = Promise.resolve((0, legacy_handlers_1.callToolHandler)({ name, arguments: args }));
        return await withTimeout(p, timeoutMs, name);
    }
    catch (_e) {
        const e = _e;
        throw new Error(`Unknown tool or handler failed: ${name} (${e.message})`);
    }
}
function resolvePath(obj, path) {
    if (!obj)
        return undefined;
    if (!path)
        return undefined;
    const parts = path.split('.');
    let cur = obj;
    for (const p of parts) {
        if (cur == null)
            return undefined;
        cur = cur[p];
    }
    return cur;
}
function renderTemplate(template, ctx) {
    if (!template)
        return '';
    return template.replace(/\${([^}]+)}/g, (_, expr) => {
        const parts = expr.split('.');
        if (parts[0] === 'memory') {
            return String(resolvePath(ctx.memory, parts.slice(1).join('.')) ?? '');
        }
        if (parts[0] === 'variables' || parts[0] === '$') {
            return String(resolvePath(ctx.variables, parts.slice(1).join('.')) ?? '');
        }
        // fallback: try variables then memory
        const v = resolvePath(ctx.variables, expr);
        if (v !== undefined)
            return String(v);
        const m = resolvePath(ctx.memory, expr);
        if (m !== undefined)
            return String(m);
        return '';
    });
}
exports.default = { invokeOllama, registerTool, invokeTool, renderTemplate };
