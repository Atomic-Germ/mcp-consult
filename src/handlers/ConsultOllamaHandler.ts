import { BaseHandler } from './BaseHandler.js';
import { OllamaService } from '../services/OllamaService.js';
import { ModelValidator } from '../services/ModelValidator.js';
import { ConsultRequest } from '../types/index.js';
import { shouldAutoModelSettings, suggestConsultSettings } from '../modelSettings.js';

interface MCPResponse {
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
}

export class ConsultOllamaHandler extends BaseHandler {
  private modelValidator: ModelValidator;

  constructor(
    private ollamaService: OllamaService,
    modelValidator?: ModelValidator
  ) {
    super();
    this.modelValidator = modelValidator || new ModelValidator(this.ollamaService.getConfig());
  }

  async handle(params: unknown, reporters?: { reportProgress?: (p: {progress:number; total?:number})=>Promise<void>; reportMessage?: (text:string)=>Promise<void> }): Promise<MCPResponse> {
    // Validate and cast parameters
    const typedParams = params as Record<string, unknown>;

    try {
      // Validate required parameters
      this.validateRequired(typedParams, ['prompt']);

      let model = (typedParams.model as string) || '';
      const consultationType = typedParams.consultation_type as string | undefined;

      // Auto-select model based on consultation type
      if (consultationType === 'thinking') {
        model = 'kimi-k2-thinking:cloud';
      } else if (consultationType === 'instruction') {
        model = 'qwen3-vl:235b-instruct-cloud';
      } else if (!model) {
        // If no model specified and no consultation type, use default
        model = await this.modelValidator.getDefaultModel();
      }

      // Validate model availability
      if (model) {
        const isAvailable = await this.modelValidator.isModelAvailable(model);
        if (!isAvailable) {
          const suggestions = await this.modelValidator.getSuggestions(3);
          const typeInfo = consultationType
            ? ` (auto-selected for ${consultationType} consultation)`
            : '';
          return {
            content: [
              {
                type: 'text',
                text: `Model '${model}'${typeInfo} is not available. Available models: ${suggestions.join(', ')}. Please install the model or choose an available one.`,
              },
            ],
            isError: true,
          };
        }
      }

      // Build consult request
      const request: ConsultRequest = {
        model,
        prompt: typedParams.prompt as string,
        stream: true,
      };

      // Include system prompt if provided
      if (typedParams.system_prompt) {
        request.systemPrompt = typedParams.system_prompt as string;
      }

      // Include temperature if provided
      if (typeof typedParams.temperature === 'number') {
        request.temperature = typedParams.temperature;
      }

      // Include timeout if provided
      if (typeof typedParams.timeout_ms === 'number') {
        request.timeout = typedParams.timeout_ms;
      }

      // Optional: auto-suggest temperature/timeout based on model + prompt heuristics
      // Inspired by the StandardLlama “autonomy” branch: best-effort defaults rather than strict config.
      if (shouldAutoModelSettings(typedParams)) {
        const hasSystemPrompt = Boolean(typedParams.system_prompt);
        const cfg = this.ollamaService.getConfig && typeof this.ollamaService.getConfig === 'function' ? this.ollamaService.getConfig() : undefined;
        const baseTimeoutMs = (cfg && typeof cfg.getTimeout === 'function') ? cfg.getTimeout() : 30000;
        const suggested = suggestConsultSettings({
          modelName: model,
          prompt: request.prompt,
          hasSystemPrompt,
          baseTimeoutMs,
        });

        if (request.temperature === undefined) request.temperature = suggested.temperature;
        if (request.timeout === undefined) request.timeout = suggested.timeoutMs;
      }

      // If streaming was requested, optionally inject a default system prompt hint to encourage streaming-friendly output
      const disableHint = typedParams.disable_stream_hint === true || process.env.MCP_DISABLE_STREAM_HINT === '1';
      if (request.stream && !disableHint) {
        const defaultHint = process.env.MCP_STREAMING_SYSTEM_HINT ||
          'Please stream intermediate outputs as newline-delimited JSON objects like {"response":"..."}. Send [DONE] (or [DONE]) when complete. Provide small progress messages occasionally if possible.';
        if (request.systemPrompt) {
          request.systemPrompt = `${defaultHint}\n\n${request.systemPrompt}`;
        } else {
          request.systemPrompt = defaultHint;
        }
      }

      // If the client requested progress, prefer consuming the async iterator from consultStream
      if (reporters && (reporters.reportMessage || reporters.reportProgress)) {
        const enableAdvancedStreaming = process.env.MCP_ENABLE_ADVANCED_STREAMING === '1';
        // If advanced streaming is enabled and the service exposes consultStream, consume it and report partials
        if (enableAdvancedStreaming && typeof (this.ollamaService as any).consultStream === 'function') {
          const iterable = (this.ollamaService as any).consultStream(request);
          const iterator = iterable && typeof iterable[Symbol.asyncIterator] === 'function' ? iterable[Symbol.asyncIterator]() : iterable;
          let accumulatedChars = 0;
          let finalResponse: any | undefined = undefined;

          // Heartbeat / keepalive to provide visible activity when no chunks arrive for a while
          const HEARTBEAT_MS = parseInt(process.env.MCP_HEARTBEAT_INTERVAL_MS || '15000', 10);
          let lastChunkAt = Date.now();
          // Schedule a single heartbeat timeout; it will be cleared when the stream completes or a real chunk arrives.
          let heartbeatTimer: ReturnType<typeof setTimeout> | undefined = undefined;
          heartbeatTimer = setTimeout(() => {
            try {
              if (reporters.reportMessage) {
                void reporters.reportMessage('[Still working — no output yet]');
              }
            } catch (e) {}
          }, HEARTBEAT_MS);

          try {
            while (true) {
              const { value, done } = await iterator.next();
              if (done) {
                finalResponse = value;
                break;
              }

              const chunk = value;
              lastChunkAt = Date.now();
              if (typeof heartbeatTimer !== 'undefined') { clearTimeout(heartbeatTimer); heartbeatTimer = undefined; }
              const text = (chunk && (chunk.response || chunk.text)) || '';

              if (text && reporters.reportMessage) {
                try {
                  void reporters.reportMessage(text);
                } catch (e) {}
              }

              if (text && reporters.reportProgress) {
                accumulatedChars += text.length;
                try {
                  void reporters.reportProgress({ progress: accumulatedChars });
                } catch (e) {}
              }
            }
          } finally {
            if (typeof heartbeatTimer !== 'undefined') clearTimeout(heartbeatTimer);
          }

          // Use finalResponse as the consult result
          const response = finalResponse as any;

          // Ensure we surface the final response as a partial too so clients always see at least one message
          if (response?.response && reporters.reportMessage) {
            try {
              void reporters.reportMessage(response.response);
            } catch (e) {}
          }
          if (accumulatedChars && reporters.reportProgress) {
            try {
              void reporters.reportProgress({ progress: accumulatedChars });
            } catch (e) {}
          }

          return {
            content: [
              {
                type: 'text',
                text: response?.response || '',
              },
            ],
          };
        }

        // Fallback: attach onChunk and use consult()
        let accumulatedChars = 0;
        (request as any).onChunk = (chunk: any) => {
          const text = (chunk && (chunk.response || chunk.text)) ||
            (chunk && chunk.choices && chunk.choices[0] && chunk.choices[0].delta && chunk.choices[0].delta.content) ||
            '';

          if (text && reporters.reportMessage) {
            try {
              void reporters.reportMessage(text);
            } catch (e) {}
          }

          if (text && reporters.reportProgress) {
            accumulatedChars += text.length;
            try {
              void reporters.reportProgress({ progress: accumulatedChars });
            } catch (e) {}
          }
        };
      }

      // Call Ollama service
      const response = await this.ollamaService.consult(request);

      // Return formatted response
      return {
        content: [
          {
            type: 'text',
            text: response.response,
          },
        ],
      };
    } catch (error) {
      // Handle errors with consistent formatting
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        content: [
          {
            type: 'text',
            text: `Error consulting Ollama: ${message}`,
          },
        ],
        isError: true,
      };
    }
  }
}
