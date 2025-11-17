export function evalCondition(
  expr: string,
  ctx: { memory: Record<string, any>; variables: Record<string, any> }
): boolean {
  try {
    // Provide `memory` and `$` (variables accessor) only
    // Note: this intentionally limits the globals available to the expression.
    const fn = new Function('memory', '$', `return (${expr});`);
    const result = fn(ctx.memory, (k: string) => ctx.variables[k]);
    return Boolean(result);
  } catch (_e) {
    const e = _e;
    throw new Error(`Condition eval error: ${(e as Error).message}`);
  }
}

export default { evalCondition };
