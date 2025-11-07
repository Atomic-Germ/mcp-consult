export interface Step {
  id?: string;
  name?: string;
  model?: string; // Ollama model name
  tool?: string; // tool name registered in the runtime
  prompt?: string;
  system_prompt?: string;
  condition?: string;
  memoryWrite?: string | string[]; // key(s) to write the step output to
  retries?: number;
  backoffMs?: number;
  onSuccess?: string[];
  onFailure?: string[];
}

export interface Flow {
  id: string;
  name?: string;
  steps: Step[];
}

export interface StepResult {
  stepId: string;
  success: boolean;
  output?: any;
  error?: string;
  attempts?: number;
}

export interface ExecutionContext {
  flowId: string;
  stepResults: Record<string, StepResult>;
  memory: Record<string, any>;
  variables: Record<string, any>;
}

export type MemoryData = Record<string, any>;

export default {};
