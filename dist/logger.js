"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.info = info;
exports.warn = warn;
exports.error = error;
exports.debug = debug;
const DEBUG = Boolean(process.env.DEBUG_MCP);
function info(...args) {
    console.info('[mcp]', ...args);
}
function warn(...args) {
    console.warn('[mcp]', ...args);
}
function error(...args) {
    console.error('[mcp]', ...args);
}
function debug(...args) {
    if (DEBUG)
        console.debug('[mcp][debug]', ...args);
}
exports.default = { info, warn, error, debug };
