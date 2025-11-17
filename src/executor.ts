import { Flow, Step, StepResult, ExecutionContext } from './types';
import { MemoryStore } from './memory';
import { invokeOllama, invokeTool, renderTemplate } from './invoke';
import { evalCondition } from './condition';
import * as logger from './logger';

function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

export class FlowExecutor {
  constructor(private memoryStore: MemoryStore) {}

  async run(
    flow: Flow,
    variables?: Record<string, any>,
    options?: { maxConcurrency?: number }
  ): Promise<ExecutionContext> {
    const memory = await this.memoryStore.load(flow.id);

    const ctx: ExecutionContext = {
      flowId: flow.id,
      stepResults: {},
      memory: memory ?? {},
      variables: variables ?? {},
    };

    // Detect DAG usage: if any step has dependsOn/depends_on, use DAG executor
    const usesDag = flow.steps.some((s) => Boolean((s as any).dependsOn || (s as any).depends_on));
    if (usesDag) {
      await this.runDAG(flow, ctx, options?.maxConcurrency);
      await this.memoryStore.save(flow.id, ctx.memory);
      return ctx;
    }

    // Sequential/branching fallback (existing behavior)
    // Build id->index map and ensure ids exist
    const idToIndex = new Map<string, number>();
    for (let i = 0; i < flow.steps.length; i++) {
      if (!flow.steps[i].id) flow.steps[i].id = `step-${i}`;
      idToIndex.set(flow.steps[i].id as string, i);
    }

    let index = 0;
    while (index < flow.steps.length) {
      const original = flow.steps[index];
      const step: Step = { ...original };
      const stepId = step.id as string;

      // Evaluate condition if present
      if (step.condition) {
        let ok = false;
        try {
          ok = evalCondition(step.condition, { memory: ctx.memory, variables: ctx.variables });
        } catch (_e) {
          const e = _e;
          // Record condition error and skip to next
          ctx.stepResults[stepId] = {
            stepId,
            success: false,
            error: `Condition error: ${(e as Error).message}`,
          };
          index = index + 1;
          continue;
        }
        if (!ok) {
          index = index + 1;
          continue;
        }
      }

      const prompt = renderTemplate(step.prompt ?? '', {
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
        } else {
          ctx.memory[step.memoryWrite] = result.output !== undefined ? result.output : null;
        }
      }

      // Determine next index based on onSuccess/onFailure
      let nextIndex = index + 1;
      if (result.success) {
        if (step.onSuccess && step.onSuccess.length > 0) {
          const target = step.onSuccess[0];
          if (idToIndex.has(target)) nextIndex = idToIndex.get(target)!;
          else logger.warn(`onSuccess target not found for step ${stepId}: ${target}`);
        }
      } else {
        if (step.onFailure && step.onFailure.length > 0) {
          const target = step.onFailure[0];
          if (idToIndex.has(target)) nextIndex = idToIndex.get(target)!;
          else logger.warn(`onFailure target not found for step ${stepId}: ${target}`);
        }
      }

      index = nextIndex;
    }

    await this.memoryStore.save(flow.id, ctx.memory);

    return ctx;
  }

  private async invokeWithRetry(
    step: Step,
    prompt: string,
    ctx: ExecutionContext
  ): Promise<StepResult> {
    const maxRetries = step.retries ?? 0;
    let attempt = 0;
    let backoff = step.backoffMs ?? 500;

    while (attempt <= maxRetries) {
      try {
        let output: any;
        if (step.model) {
          output = await invokeOllama(step.model, prompt, step.system_prompt);
        } else if (step.tool) {
          output = await invokeTool(
            step.tool,
            { prompt, memory: ctx.memory, variables: ctx.variables },
            { timeoutMs: step.timeoutMs }
          );
        } else {
          throw new Error('Step missing model or tool');
        }

        return { stepId: step.id!, success: true, output, attempts: attempt + 1 };
      } catch (_e) {
        const e = _e;
        attempt++;
        const message = _e instanceof Error ? _e.message : String(_e);
        if (attempt > maxRetries) {
          return { stepId: step.id!, success: false, error: message, attempts: attempt };
        }
        // backoff then retry
        await sleep(backoff);
        backoff = Math.min(backoff * 2, 60_000);
      }
    }

    return { stepId: step.id!, success: false, error: 'Unexpected error', attempts: 0 };
  }

  private async runDAG(flow: Flow, ctx: ExecutionContext, maxConcurrency?: number): Promise<void> {
    const total = flow.steps.length;
    const idToStep = new Map<string, Step>();
    const children = new Map<string, string[]>();
    const indegree = new Map<string, number>();

    for (const s of flow.steps) {
      const sid = s.id as string;
      idToStep.set(sid, s);
      children.set(sid, []);
      indegree.set(sid, 0);
    }

    // build edges from dependsOn / depends_on
    for (const s of flow.steps) {
      const sid = s.id as string;
      const rawDeps = (s as any).dependsOn ?? (s as any).depends_on;
      if (!rawDeps) continue;
      const deps = Array.isArray(rawDeps) ? rawDeps : [rawDeps];
      for (const d of deps) {
        if (!idToStep.has(d)) throw new Error(`Dependency ${d} for step ${sid} not found`);
        children.get(d)!.push(sid);
        indegree.set(sid, (indegree.get(sid) || 0) + 1);
      }
    }

    // cycle detection using Kahn
    const indegCopy = new Map(indegree);
    const q: string[] = [];
    for (const [k, v] of indegCopy.entries()) if (!v) q.push(k);
    let cnt = 0;
    while (q.length > 0) {
      const n = q.shift()!;
      cnt++;
      for (const c of children.get(n) || []) {
        indegCopy.set(c, (indegCopy.get(c) || 0) - 1);
        if ((indegCopy.get(c) || 0) === 0) q.push(c);
      }
    }
    if (cnt !== total) throw new Error('Cycle detected in flow dependencies');

    // scheduling
    const ready: string[] = [];
    for (const [k, v] of indegree.entries()) if (!v) ready.push(k);

    const concurrency = maxConcurrency ?? Number(process.env.MCP_MAX_CONCURRENCY || 4);

    let processed = 0;

    const runTaskFnsWithLimit = async (
      taskFns: Array<() => Promise<{ id: string; result: StepResult }>>,
      limit: number
    ) => {
      const results: Array<{ id: string; result: StepResult }> = [];
      let idx = 0;
      let active = 0;

      return new Promise<typeof results>((resolve, _reject) => {
        const next = () => {
          if (results.length === taskFns.length) return resolve(results);
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
                  } as StepResult,
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
      const taskFns: Array<() => Promise<{ id: string; result: StepResult }>> = currentLayer.map(
        (sid) => {
          return async () => {
            const step = idToStep.get(sid)!;
            // evaluate condition
            if (step.condition) {
              try {
                const ok = evalCondition(step.condition, {
                  memory: ctx.memory,
                  variables: ctx.variables,
                });
                if (!ok) {
                  const skippedRes: StepResult = { stepId: sid, success: true, skipped: true };
                  ctx.stepResults[sid] = skippedRes;
                  return { id: sid, result: skippedRes };
                }
              } catch (_e) {
                const e = _e;
                const errRes: StepResult = {
                  stepId: sid,
                  success: false,
                  error: (e as Error).message,
                };
                ctx.stepResults[sid] = errRes;
                return { id: sid, result: errRes };
              }
            }

            const prompt = renderTemplate(step.prompt ?? '', {
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
              } else {
                ctx.memory[step.memoryWrite] = res.output !== undefined ? res.output : null;
              }
            }

            return { id: sid, result: res };
          };
        }
      );

      const layerResults = await runTaskFnsWithLimit(taskFns, concurrency);

      // process results and update indegrees
      for (const r of layerResults) {
        const sid = r.id;
        processed++;
        for (const child of children.get(sid) || []) {
          indegree.set(child, (indegree.get(child) || 0) - 1);
          if ((indegree.get(child) || 0) === 0) ready.push(child);
        }
      }
    }
  }
}

export default FlowExecutor;
