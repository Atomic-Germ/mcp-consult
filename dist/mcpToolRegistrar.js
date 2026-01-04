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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerMcpTools = registerMcpTools;
const invoke_1 = require("./invoke");
const legacy_handlers_1 = require("./legacy-handlers");
const logger = __importStar(require("./logger"));
const config_1 = require("./config");
function minimalForSchema(propSchema) {
    if (!propSchema)
        return 'test';
    const t = propSchema.type;
    if (!t)
        return 'test';
    if (Array.isArray(t)) {
        if (t.includes('string'))
            return 'test';
        if (t.includes('object'))
            return {};
        return null;
    }
    switch (t) {
        case 'string':
            return 'test';
        case 'number':
            return 0;
        case 'boolean':
            return true;
        case 'array':
            return [];
        case 'object':
            return {};
        default:
            return 'test';
    }
}
function mapArgsFromSchema(name, schema, invokeArgs) {
    const props = (schema && schema.properties) || {};
    const callArgs = {};
    for (const propName of Object.keys(props)) {
        // Prefer explicit arg if provided
        if (invokeArgs && Object.prototype.hasOwnProperty.call(invokeArgs, propName)) {
            callArgs[propName] = invokeArgs[propName];
            continue;
        }
        // Common mappings
        if (['prompt', 'text', 'message', 'query'].includes(propName)) {
            if (invokeArgs && invokeArgs.prompt)
                callArgs[propName] = invokeArgs.prompt;
            continue;
        }
        if (['response', 'value', 'content'].includes(propName)) {
            if (invokeArgs && invokeArgs.response)
                callArgs[propName] = invokeArgs.response;
            else if (invokeArgs && invokeArgs.result)
                callArgs[propName] = invokeArgs.result;
            else if (invokeArgs && invokeArgs.prompt)
                callArgs[propName] = invokeArgs.prompt;
            continue;
        }
        if (propName === 'resource') {
            callArgs.resource =
                invokeArgs && invokeArgs.resource
                    ? invokeArgs.resource
                    : {
                        uri: `mcp-consult://runtime/${name}`,
                        text: invokeArgs && invokeArgs.prompt ? invokeArgs.prompt : '',
                    };
            continue;
        }
        if (propName === 'key') {
            callArgs.key =
                invokeArgs && invokeArgs.key
                    ? invokeArgs.key
                    : invokeArgs && invokeArgs.prompt
                        ? invokeArgs.prompt
                        : undefined;
            continue;
        }
        // fallback: check memory or variables
        if (invokeArgs &&
            invokeArgs.memory &&
            Object.prototype.hasOwnProperty.call(invokeArgs.memory, propName)) {
            callArgs[propName] = invokeArgs.memory[propName];
            continue;
        }
        // last resort: default sample based on schema
        callArgs[propName] = minimalForSchema(props[propName]);
    }
    return callArgs;
}
/**
 * Register MCP tools exposed by local handlers into the runtime tool registry.
 * If `healthCheck` is true, attempts a minimal invocation of each tool using required schema keys.
 */
async function registerMcpTools(healthCheck = false, allowedTools) {
    const res = (0, legacy_handlers_1.listTools)();
    const tools = res.tools || [];
    const names = [];
    const registered = new Set();
    // Determine allowed tools: function argument takes precedence, then env/file config
    let allowedSet;
    if (Array.isArray(allowedTools) && allowedTools.length > 0) {
        allowedSet = new Set(allowedTools.map((s) => String(s)));
    }
    else {
        const cfg = (0, config_1.getAllowedTools)();
        if (Array.isArray(cfg) && cfg.length > 0)
            allowedSet = new Set(cfg.map((s) => String(s)));
    }
    for (const t of tools) {
        const name = t.name;
        if (!name || typeof name !== 'string') {
            logger.warn('Skipping tool with invalid name', name);
            continue;
        }
        // If a server-side whitelist is configured, only register allowed tools
        if (allowedSet && !allowedSet.has(name)) {
            logger.warn(`Skipping tool not in allowed list: ${name}`);
            continue;
        }
        if (registered.has(name)) {
            logger.warn('Duplicate tool registration skipped:', name);
            continue;
        }
        const inputSchema = t.inputSchema || {};
        // Basic descriptor validation
        try {
            if (inputSchema && typeof inputSchema === 'object') {
                // ok
            }
            else if (inputSchema && inputSchema !== undefined) {
                logger.warn(`Tool ${name} has non-object inputSchema; skipping`);
                continue;
            }
            // Register safe wrapper
            (0, invoke_1.registerTool)(name, async (args) => {
                try {
                    const callArgs = mapArgsFromSchema(name, inputSchema, args || {});
                    const resp = await (0, legacy_handlers_1.callToolHandler)({ name, arguments: callArgs });
                    return resp;
                }
                catch (_e) {
                    const e = _e;
                    logger.error(`Tool invocation failed: ${name}`, e instanceof Error ? e.message : String(e));
                    // Standardized error object
                    return { isError: true, error: e instanceof Error ? e.message : String(e) };
                }
            });
            names.push(name);
            registered.add(name);
            logger.info(`Registered tool: ${name}`);
            if (healthCheck) {
                try {
                    const required = (inputSchema && inputSchema.required) || [];
                    const sampleArgs = {};
                    for (const r of required) {
                        const propSchema = (inputSchema.properties || {})[r];
                        sampleArgs[r] = minimalForSchema(propSchema);
                    }
                    // Try call with sample args; ignore result but log errors
                    await (0, legacy_handlers_1.callToolHandler)({ name, arguments: sampleArgs }).catch((e) => {
                        logger.warn(`Health check failed for ${name}: ${e.message}`);
                    });
                }
                catch (_e) {
                    const e = _e;
                    logger.warn(`Health check exception for ${name}: ${e.message}`);
                }
            }
        }
        catch (_e) {
            const e = _e;
            logger.error(`Failed to register tool ${name}:`, e instanceof Error ? e.message : String(e));
            continue;
        }
    }
    return names;
}
exports.default = { registerMcpTools };
