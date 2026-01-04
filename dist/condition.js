"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evalCondition = evalCondition;
function evalCondition(expr, ctx) {
    try {
        // Provide `memory` and `$` (variables accessor) only
        // Note: this intentionally limits the globals available to the expression.
        const fn = new Function('memory', '$', `return (${expr});`);
        const result = fn(ctx.memory, (k) => ctx.variables[k]);
        return Boolean(result);
    }
    catch (_e) {
        const e = _e;
        throw new Error(`Condition eval error: ${e.message}`);
    }
}
exports.default = { evalCondition };
