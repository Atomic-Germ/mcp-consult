export interface ParsedModelInfo {
  family: string;
  size: string;
  quantization: string;
  variant: string;
  version: string;
  isCloud: boolean;
}

export interface SuggestedConsultSettings {
  temperature: number;
  timeoutMs: number;
  reasoning: string;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function looksLikeCloudModel(name: string): boolean {
  return Boolean(name) && (name.includes(':cloud') || name.includes('-cloud'));
}

/**
 * Best-effort model name parsing.
 *
 * This is intentionally heuristic (mirrors the StandardLlama “autonomy” diff idea):
 * infer rough family/size/quantization/variant/version from the model name so we can
 * pick sane default settings when the caller doesn't specify them.
 */
export function parseModelName(modelName: string): ParsedModelInfo {
  const lowerName = (modelName || '').toLowerCase();

  const info: ParsedModelInfo = {
    family: 'unknown',
    size: 'unknown',
    quantization: 'unknown',
    variant: 'unknown',
    version: 'unknown',
    isCloud: looksLikeCloudModel(modelName || ''),
  };

  if (lowerName.includes('gpt') || lowerName.includes('chatgpt')) {
    info.family = 'gpt';
  } else if (
    lowerName.includes('llama') ||
    lowerName.includes('llama2') ||
    lowerName.includes('llama3')
  ) {
    info.family = 'llama';
  } else if (lowerName.includes('mistral') || lowerName.includes('dolphin-mistral')) {
    info.family = 'mistral';
  } else if (
    lowerName.includes('qwen') ||
    lowerName.includes('deepseek') ||
    lowerName.includes('qwq')
  ) {
    info.family = 'qwen';
  } else if (
    lowerName.includes('codellama') ||
    lowerName.includes('code-llama') ||
    lowerName.includes('codeqwen')
  ) {
    info.family = 'codellama';
  } else if (lowerName.includes('gemma') || lowerName.includes('gemma3')) {
    info.family = 'gemma';
  } else if (lowerName.includes('phi') || lowerName.includes('phi3')) {
    info.family = 'phi';
  } else if (lowerName.includes('claude') || lowerName.includes('anthropic')) {
    info.family = 'claude';
  } else if (lowerName.includes('falcon')) {
    info.family = 'falcon';
  } else if (lowerName.includes('starcoder') || lowerName.includes('starchat')) {
    info.family = 'starcoder';
  }

  // Size: accept “7b”, “1.5b”, etc.
  const sizeMatch = (modelName || '').match(/(\d+(?:\.\d+)?)\s*(b|k|m|t|kb|mb|gb|tb)/i);
  if (sizeMatch) {
    const num = sizeMatch[1];
    const unit = sizeMatch[2].toLowerCase();

    // Normalize to “B” (billions) where possible
    if (unit === 'k' || unit === 'kb') {
      info.size = `${parseFloat(num) / 1000}B`;
    } else if (unit === 'm' || unit === 'mb') {
      info.size = `${parseFloat(num) / 1_000_000}B`;
    } else if (unit === 'g' || unit === 'gb') {
      info.size = `${parseFloat(num) / 1_000_000_000}B`;
    } else if (unit === 't' || unit === 'tb') {
      info.size = `${parseFloat(num) / 1_000_000_000_000}B`;
    } else {
      info.size = `${num}${unit.toUpperCase()}`;
    }
  }

  // Quantization: Q2..Q8 family
  const quantMatch = (modelName || '').match(/(q[2-8](?:_[kmf01]+)*)/i);
  if (quantMatch) info.quantization = quantMatch[1].toUpperCase();

  // Version: “v3”, “3.1”, etc.
  const versionMatch = (modelName || '').match(/(?:^|[^a-zA-Z0-9])v?(\d+(?:\.\d+)?)(?:$|[^0-9])/i);
  if (versionMatch) info.version = versionMatch[1];

  // Variant
  if (
    lowerName.includes('instruct') ||
    lowerName.includes('chat') ||
    lowerName.includes('conversational')
  ) {
    info.variant = 'instruct';
  } else if (lowerName.includes('base') || lowerName.includes('pretrained')) {
    info.variant = 'base';
  } else if (
    lowerName.includes('code') ||
    lowerName.includes('coder') ||
    lowerName.includes('programming')
  ) {
    info.variant = 'code';
  } else if (lowerName.includes('math') || lowerName.includes('mathematics')) {
    info.variant = 'math';
  } else if (lowerName.includes('vision') || lowerName.includes('visual')) {
    info.variant = 'vision';
  }

  return info;
}

function sizeToNumberBillions(size: string): number | null {
  if (!size || size === 'unknown') return null;
  const m = size.match(/(\d+(?:\.\d+)?)/);
  if (!m) return null;
  const n = parseFloat(m[1]);
  return Number.isFinite(n) ? n : null;
}

/**
 * Suggest defaults for this MCP server (temperature + timeout).
 *
 * Note: This server currently only sends `temperature` and uses request-level timeouts.
 * We don't attempt to set Ollama options like context window / max tokens here.
 */
export function suggestConsultSettings(args: {
  modelName: string;
  prompt: string;
  hasSystemPrompt?: boolean;
  baseTimeoutMs: number;
}): SuggestedConsultSettings {
  const parsed = parseModelName(args.modelName);
  const promptLen = (args.prompt || '').length;
  const sizeB = sizeToNumberBillions(parsed.size);

  let temperature = 0.7;
  const reasons: string[] = [];

  if (parsed.variant === 'code' || parsed.family === 'codellama' || parsed.family === 'starcoder') {
    temperature = 0.3;
    reasons.push('code model → lower temperature');
  } else if (parsed.variant === 'math') {
    temperature = 0.2;
    reasons.push('math model → very low temperature');
  } else if (sizeB !== null && sizeB <= 3) {
    temperature = 0.8;
    reasons.push('small model → slightly higher temperature');
  } else if (sizeB !== null && sizeB > 70) {
    temperature = 0.6;
    reasons.push('very large model → slightly lower temperature');
  }

  temperature = clamp(temperature, 0, 2);

  let timeoutMs = args.baseTimeoutMs;

  if (promptLen > 1200) {
    timeoutMs = Math.round(timeoutMs * 1.5);
    reasons.push('long prompt → higher timeout');
  } else if (promptLen > 3000) {
    timeoutMs = Math.round(timeoutMs * 2.0);
    reasons.push('very long prompt → higher timeout');
  }

  if (args.hasSystemPrompt) {
    timeoutMs = Math.round(timeoutMs * 1.5);
    reasons.push('system prompt → higher timeout');
  }

  if (sizeB !== null && sizeB >= 30) {
    timeoutMs = Math.round(timeoutMs * 1.5);
    reasons.push('large model → higher timeout');
  }

  if (parsed.isCloud) {
    timeoutMs = Math.round(timeoutMs * 1.2);
    reasons.push('cloud model → higher timeout');
  }

  timeoutMs = clamp(timeoutMs, 1000, 600_000);

  const reasoning =
    reasons.length > 0
      ? `Auto settings applied (${reasons.join(', ')}).`
      : 'Auto settings applied (no special heuristics triggered).';

  return { temperature, timeoutMs, reasoning };
}

export function shouldAutoModelSettings(params: Record<string, unknown>): boolean {
  const localFlag = params.auto_settings;
  if (typeof localFlag === 'boolean') return localFlag;

  const env = (process.env.MCP_AUTO_MODEL_SETTINGS || process.env.MCP_AUTO_SETTINGS || '')
    .trim()
    .toLowerCase();
  if (!env) return false;
  return env === '1' || env === 'true' || env === 'yes' || env === 'on';
}
