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
exports.FlowExecutor = void 0;
const invoke_1 = require("./invoke");
const condition_1 = require("./condition");
const logger = __importStar(require("./logger"));
function sleep(ms) {
    return new Promise((res) => setTimeout(res, ms));
}
class FlowExecutor {
    constructor(memoryStore) {
        this.memoryStore = memoryStore;
    }
    async run(flow, variables, options) {
        const memory = await this.memoryStore.load(flow.id);
        const ctx = {
            flowId: flow.id,
            stepResults: {},
            memory: memory ?? {},
            variables: variables ?? {},
        };
        // Detect DAG usage: if any step has dependsOn/depends_on, use DAG executor
        const usesDag = flow.steps.some((s) => Boolean(s.dependsOn || s.depends_on));
        if (usesDag) {
            await this.runDAG(flow, ctx, options?.maxConcurrency);
            await this.memoryStore.save(flow.id, ctx.memory);
            return ctx;
        }
        // Sequential/branching fallback (existing behavior)
        // Build id->index map and ensure ids exist
        const idToIndex = new Map();
        for (let i = 0; i < flow.steps.length; i++) {
            if (!flow.steps[i].id)
                flow.steps[i].id = `step-${i}`;
            idToIndex.set(flow.steps[i].id, i);
        }
        let index = 0;
        const maxIterations = flow.steps.length * 10; // Prevent infinite loops
        let iterations = 0;
        while (index < flow.steps.length && iterations < maxIterations) {
            iterations++;
            const original = flow.steps[index];
            const step = { ...original };
            const stepId = step.id;
            // Evaluate condition if present
            if (step.condition) {
                let ok = false;
                try {
                    ok = (0, condition_1.evalCondition)(step.condition, { memory: ctx.memory, variables: ctx.variables });
                }
                catch (_e) {
                    // Record condition error and skip to next
                    ctx.stepResults[stepId] = {
                        stepId,
                        success: false,
                        error: `Condition error: ${_e.message}`,
                    };
                    index = index + 1;
                    continue;
                }
                if (!ok) {
                    index = index + 1;
                    continue;
                }
            }
            const prompt = (0, invoke_1.renderTemplate)(step.prompt ?? '', {
                memory: ctx.memory,
                variables: ctx.variables,
            });
            const result = await this.invokeWithRetry(step, prompt, ctx);
            ctx.stepResults[stepId] = result;
            // persist output to memory if requested
            if (step.memoryWrite) {
                if (Array.isArray(step.memoryWrite)) {
                    for (const k of step.memoryWrite) {
                        ctx.memory[k] = result.output !== undefined ? result.output : null;
                    }
                }
                else {
                    ctx.memory[step.memoryWrite] = result.output !== undefined ? result.output : null;
                }
            }
            // Determine next index based on onSuccess/onFailure
            let nextIndex = index + 1;
            if (result.success) {
                if (step.onSuccess && step.onSuccess.length > 0) {
                    const target = step.onSuccess[0];
                    if (idToIndex.has(target))
                        nextIndex = idToIndex.get(target);
                    else
                        logger.warn(`onSuccess target not found for step ${stepId}: ${target}`);
                }
            }
            else {
                if (step.onFailure && step.onFailure.length > 0) {
                    const target = step.onFailure[0];
                    if (idToIndex.has(target))
                        nextIndex = idToIndex.get(target);
                    else
                        logger.warn(`onFailure target not found for step ${stepId}: ${target}`);
                }
            }
            index = nextIndex;
        }
        if (iterations >= maxIterations) {
            throw new Error(`Flow execution exceeded maximum iterations (${maxIterations}), possible infinite loop detected`);
        }
        await this.memoryStore.save(flow.id, ctx.memory);
        return ctx;
    }
    async invokeWithRetry(step, prompt, ctx) {
        const maxRetries = step.retries ?? 0;
        let attempt = 0;
        let backoff = step.backoffMs ?? 500;
        while (attempt <= maxRetries) {
            try {
                let output;
                if (step.model) {
                    output = await (0, invoke_1.invokeOllama)(step.model, prompt, step.system_prompt);
                }
                else if (step.tool) {
                    output = await (0, invoke_1.invokeTool)(step.tool, { prompt, memory: ctx.memory, variables: ctx.variables }, { timeoutMs: step.timeoutMs });
                }
                else {
                    throw new Error('Step missing model or tool');
                }
                return { stepId: step.id, success: true, output, attempts: attempt + 1 };
            }
            catch (_e) {
                attempt++;
                const message = _e instanceof Error ? _e.message : String(_e);
                if (attempt > maxRetries) {
                    return { stepId: step.id, success: false, error: message, attempts: attempt };
                }
                // backoff then retry
                await sleep(backoff);
                backoff = Math.min(backoff * 2, 60000);
            }
        }
        return { stepId: step.id, success: false, error: 'Unexpected error', attempts: 0 };
    }
    async runDAG(flow, ctx, maxConcurrency) {
        const total = flow.steps.length;
        const idToStep = new Map();
        const children = new Map();
        const indegree = new Map();
        for (const s of flow.steps) {
            const sid = s.id;
            idToStep.set(sid, s);
            children.set(sid, []);
            indegree.set(sid, 0);
        }
        // build edges from dependsOn / depends_on
        for (const s of flow.steps) {
            const sid = s.id;
            const rawDeps = s.dependsOn ?? s.depends_on;
            if (!rawDeps)
                continue;
            const deps = Array.isArray(rawDeps) ? rawDeps : [rawDeps];
            for (const d of deps) {
                if (!idToStep.has(d))
                    throw new Error(`Dependency ${d} for step ${sid} not found`);
                children.get(d).push(sid);
                indegree.set(sid, (indegree.get(sid) || 0) + 1);
            }
        }
        // cycle detection using Kahn
        const indegCopy = new Map(indegree);
        const q = [];
        for (const [k, v] of indegCopy.entries())
            if (!v)
                q.push(k);
        let cnt = 0;
        while (q.length > 0) {
            const n = q.shift();
            cnt++;
            for (const c of children.get(n) || []) {
                indegCopy.set(c, (indegCopy.get(c) || 0) - 1);
                if ((indegCopy.get(c) || 0) === 0)
                    q.push(c);
            }
        }
        if (cnt !== total)
            throw new Error('Cycle detected in flow dependencies');
        // scheduling
        const ready = [];
        for (const [k, v] of indegree.entries())
            if (!v)
                ready.push(k);
        const concurrency = maxConcurrency ?? Number(process.env.MCP_MAX_CONCURRENCY || 4);
        let processed = 0;
        const runTaskFnsWithLimit = async (taskFns, limit) => {
            const results = [];
            let idx = 0;
            let active = 0;
            return new Promise((resolve, _reject) => {
                const next = () => {
                    if (results.length === taskFns.length)
                        return resolve(results);
                    while (active < limit && idx < taskFns.length) {
                        const cur = idx++;
                        active++;
                        Promise.resolve()
                            .then(() => taskFns[cur]())
                            .then((res) => {
                            results.push(res);
                        })
                            .catch((err) => {
                            // convert to StepResult error
                            results.push({
                                id: 'unknown',
                                result: {
                                    stepId: 'unknown',
                                    success: false,
                                    error: err instanceof Error ? err.message : String(err),
                                },
                            });
                        })
                            .finally(() => {
                            active--;
                            next();
                        });
                    }
                };
                next();
            });
        };
        while (processed < total) {
            if (ready.length === 0)
                throw new Error('No ready nodes available but flow not complete (cycle?)');
            const currentLayer = ready.splice(0, ready.length);
            const taskFns = currentLayer.map((sid) => {
                return async () => {
                    const step = idToStep.get(sid);
                    // evaluate condition
                    if (step.condition) {
                        try {
                            const ok = (0, condition_1.evalCondition)(step.condition, {
                                memory: ctx.memory,
                                variables: ctx.variables,
                            });
                            if (!ok) {
                                const skippedRes = { stepId: sid, success: true, skipped: true };
                                ctx.stepResults[sid] = skippedRes;
                                return { id: sid, result: skippedRes };
                            }
                        }
                        catch (_e) {
                            const e = _e;
                            const errRes = {
                                stepId: sid,
                                success: false,
                                error: e.message,
                            };
                            ctx.stepResults[sid] = errRes;
                            return { id: sid, result: errRes };
                        }
                    }
                    const prompt = (0, invoke_1.renderTemplate)(step.prompt ?? '', {
                        memory: ctx.memory,
                        variables: ctx.variables,
                    });
                    const res = await this.invokeWithRetry(step, prompt, ctx);
                    ctx.stepResults[sid] = res;
                    // persist memory
                    if (step.memoryWrite) {
                        if (Array.isArray(step.memoryWrite)) {
                            for (const k of step.memoryWrite)
                                ctx.memory[k] = res.output !== undefined ? res.output : null;
                        }
                        else {
                            ctx.memory[step.memoryWrite] = res.output !== undefined ? res.output : null;
                        }
                    }
                    return { id: sid, result: res };
                };
            });
            const layerResults = await runTaskFnsWithLimit(taskFns, concurrency);
            // process results and update indegrees
            for (const r of layerResults) {
                const sid = r.id;
                processed++;
                for (const child of children.get(sid) || []) {
                    indegree.set(child, (indegree.get(child) || 0) - 1);
                    if ((indegree.get(child) || 0) === 0)
                        ready.push(child);
                }
            }
        }
    }
}
exports.FlowExecutor = FlowExecutor;
exports.default = FlowExecutor;
