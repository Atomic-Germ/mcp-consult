import { Flow, Step, StepResult, ExecutionContext } from "./types";
import { MemoryStore } from "./memory";
import { invokeOllama, invokeTool, renderTemplate } from "./invoke";
import { evalCondition } from "./condition";

function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

export class FlowExecutor {
  constructor(private memoryStore: MemoryStore) {}

  async run(flow: Flow, variables?: Record<string, any>): Promise<ExecutionContext> {
    const memory = await this.memoryStore.load(flow.id);

    const ctx: ExecutionContext = {
      flowId: flow.id,
      stepResults: {},
      memory: memory ?? {},
      variables: variables ?? {},
    };

    for (let i = 0; i < flow.steps.length; i++) {
      const original = flow.steps[i];
      const step: Step = { ...original };
      if (!step.id) step.id = `step-${i}`;

      // Evaluate condition if present
      if (step.condition) {
        let ok = false;
        try {
          ok = evalCondition(step.condition, { memory: ctx.memory, variables: ctx.variables });
        } catch (e) {
          // Record condition error and skip
          ctx.stepResults[step.id] = {
            stepId: step.id,
            success: false,
            error: `Condition error: ${(e as Error).message}`,
          };
          continue;
        }
        if (!ok) continue;
      }

      const prompt = renderTemplate(step.prompt ?? "", { memory: ctx.memory, variables: ctx.variables });

      const result = await this.invokeWithRetry(step, prompt, ctx);
      ctx.stepResults[step.id] = result;

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
    }

    await this.memoryStore.save(flow.id, ctx.memory);

    return ctx;
  }

  private async invokeWithRetry(step: Step, prompt: string, ctx: ExecutionContext): Promise<StepResult> {
    const maxRetries = step.retries ?? 0;
    let attempt = 0;
    let backoff = step.backoffMs ?? 500;

    while (attempt <= maxRetries) {
      try {
        let output: any;
        if (step.model) {
          output = await invokeOllama(step.model, prompt, step.system_prompt);
        } else if (step.tool) {
          output = await invokeTool(step.tool, { prompt, memory: ctx.memory, variables: ctx.variables });
        } else {
          throw new Error("Step missing model or tool");
        }

        return { stepId: step.id!, success: true, output, attempts: attempt + 1 };
      } catch (e) {
        attempt++;
        const message = e instanceof Error ? e.message : String(e);
        if (attempt > maxRetries) {
          return { stepId: step.id!, success: false, error: message, attempts: attempt };
        }
        // backoff then retry
        await sleep(backoff);
        backoff = Math.min(backoff * 2, 60_000);
      }
    }

    return { stepId: step.id!, success: false, error: "Unexpected error", attempts: 0 };
  }
}

export default FlowExecutor;
