import { registerTool } from './invoke';
import { listTools, callToolHandler } from './legacy-handlers';
import * as logger from './logger';
import { getAllowedTools } from './config';

function minimalForSchema(propSchema: any): any {
  if (!propSchema) return 'test';
  const t = propSchema.type;
  if (!t) return 'test';
  if (Array.isArray(t)) {
    if (t.includes('string')) return 'test';
    if (t.includes('object')) return {};
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

function mapArgsFromSchema(name: string, schema: any, invokeArgs: any): any {
  const props = (schema && schema.properties) || {};
  const callArgs: any = {};

  for (const propName of Object.keys(props)) {
    // Prefer explicit arg if provided
    if (invokeArgs && Object.prototype.hasOwnProperty.call(invokeArgs, propName)) {
      callArgs[propName] = invokeArgs[propName];
      continue;
    }

    // Common mappings
    if (['prompt', 'text', 'message', 'query'].includes(propName)) {
      if (invokeArgs && invokeArgs.prompt) callArgs[propName] = invokeArgs.prompt;
      continue;
    }

    if (['response', 'value', 'content'].includes(propName)) {
      if (invokeArgs && invokeArgs.response) callArgs[propName] = invokeArgs.response;
      else if (invokeArgs && invokeArgs.result) callArgs[propName] = invokeArgs.result;
      else if (invokeArgs && invokeArgs.prompt) callArgs[propName] = invokeArgs.prompt;
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
    if (
      invokeArgs &&
      invokeArgs.memory &&
      Object.prototype.hasOwnProperty.call(invokeArgs.memory, propName)
    ) {
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
export async function registerMcpTools(
  healthCheck = false,
  allowedTools?: string[]
): Promise<string[]> {
  const res = listTools();
  const tools = res.tools || [];
  const names: string[] = [];
  const registered = new Set<string>();
  // Determine allowed tools: function argument takes precedence, then env/file config
  let allowedSet: Set<string> | undefined;
  if (Array.isArray(allowedTools) && allowedTools.length > 0) {
    allowedSet = new Set(allowedTools.map((s) => String(s)));
  } else {
    const cfg = getAllowedTools();
    if (Array.isArray(cfg) && cfg.length > 0) allowedSet = new Set(cfg.map((s) => String(s)));
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
      } else if (inputSchema && inputSchema !== undefined) {
        logger.warn(`Tool ${name} has non-object inputSchema; skipping`);
        continue;
      }

      // Register safe wrapper
      registerTool(name, async (args: any) => {
        try {
          const callArgs = mapArgsFromSchema(name, inputSchema, args || {});
          const resp = await callToolHandler({ name, arguments: callArgs });
          return resp;
        } catch (_e) { const e = _e;
          logger.error(
            `Tool invocation failed: ${name}`,
            e instanceof Error ? e.message : String(e)
          );
          // Standardized error object
          return { isError: true, error: e instanceof Error ? e.message : String(e) };
        }
      });

      names.push(name);
      registered.add(name);

      logger.info(`Registered tool: ${name}`);

      if (healthCheck) {
        try {
          const required: string[] = (inputSchema && inputSchema.required) || [];
          const sampleArgs: any = {};
          for (const r of required) {
            const propSchema = ((inputSchema.properties || {}) as any)[r];
            sampleArgs[r] = minimalForSchema(propSchema);
          }
          // Try call with sample args; ignore result but log errors
          await callToolHandler({ name, arguments: sampleArgs }).catch((e) => {
            logger.warn(`Health check failed for ${name}: ${(e as Error).message}`);
          });
        } catch (_e) { const e = _e;
          logger.warn(`Health check exception for ${name}: ${(e as Error).message}`);
        }
      }
    } catch (_e) { const e = _e;
      logger.error(`Failed to register tool ${name}:`, e instanceof Error ? e.message : String(e));
      continue;
    }
  }

  return names;
}

export default { registerMcpTools };
