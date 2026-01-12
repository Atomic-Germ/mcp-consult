import { ConfigManager } from '../config/ConfigManager';
import {
  OllamaModel,
  ConsultRequest,
  ConsultResponse,
  ComparisonResult,
  OllamaError,
  ValidationError,
} from '../types';

export class OllamaService {
  constructor(private config: ConfigManager) {}

  getConfig(): ConfigManager {
    return this.config;
  }

  async listModels(): Promise<OllamaModel[]> {
    try {
      const url = this.config.getApiUrl('/api/tags');

      const response = await fetch(url, {
        method: 'GET',
        signal: AbortSignal.timeout(this.config.getTimeout()),
      });

      if (!response.ok) {
        throw new OllamaError(
          `Failed to list models: ${response.statusText}`,
          'LIST_MODELS_FAILED',
          response.status
        );
      }

      const text = await response.text();
      const data = JSON.parse(text) as { models?: OllamaModel[] };
      return data.models || [];
    } catch (error) {
      if (error instanceof OllamaError) throw error;
      throw new OllamaError(
        `Failed to connect to Ollama: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'CONNECTION_FAILED'
      );
    }
  }

  async consult(request: ConsultRequest): Promise<ConsultResponse> {
    this.validateConsultRequest(request);

    try {
      const response = await this.makeRequest(
        '/api/generate',
        {
          model: request.model,
          prompt: request.prompt,
          system: request.systemPrompt,
          temperature: request.temperature,
          stream: request.stream,
        },
        request.timeout,
        request
      );

      return response as ConsultResponse;
    } catch (error) {
      if (error instanceof OllamaError || error instanceof ValidationError) throw error;
      throw new OllamaError(
        `Consultation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'CONSULT_FAILED'
      );
    }
  }

  async compareModels(
    models: string[],
    prompt: string,
    systemPrompt?: string,
    timeoutMs?: number
  ): Promise<ComparisonResult[]> {
    if (!models || models.length === 0) {
      throw new ValidationError('At least one model is required', 'models');
    }

    if (!prompt || prompt.trim().length === 0) {
      throw new ValidationError('Prompt cannot be empty', 'prompt');
    }

    const results = await Promise.allSettled(
      models.map(async (model) => {
        const startTime = Date.now();
        try {
          const response = await this.consult({
            model,
            prompt,
            systemPrompt,
            stream: true,
            timeout: timeoutMs,
          });
          return {
            model,
            response: response.response,
            duration: Date.now() - startTime,
          };
        } catch (error) {
          return {
            model,
            response: '',
            duration: Date.now() - startTime,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      })
    );

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      }
      return {
        model: models[index],
        response: '',
        error: 'Request failed',
      };
    });
  }

  private validateConsultRequest(request: ConsultRequest): void {
    if (!request.model || request.model.trim().length === 0) {
      throw new ValidationError('Model name is required', 'model');
    }

    if (!request.prompt || request.prompt.trim().length === 0) {
      throw new ValidationError('Prompt is required', 'prompt');
    }

    if (request.temperature !== undefined) {
      if (request.temperature < 0 || request.temperature > 2) {
        throw new ValidationError('Temperature must be between 0 and 2', 'temperature');
      }
    }
  }

  /**
   * makeRequest supports both non-streaming (JSON) responses and streaming responses
   * when the request body includes { stream: true }.
   * If the original request object includes an `onChunk?: (chunk:any)=>void` callback it
   * will be called for each parsed chunk/event.
   */
  private async makeRequest(
    endpoint: string,
    body: any,
    timeoutMs?: number,
    requestContext?: any
  ): Promise<any> {
    let lastError: Error | null = null;
    const timeout = timeoutMs || this.config.getTimeout();

    for (let attempt = 0; attempt <= this.config.getMaxRetries(); attempt++) {
      try {
        const response = await fetch(this.config.getApiUrl(endpoint), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(timeout),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new OllamaError(`Ollama API error: ${errorText}`, 'API_ERROR', response.status);
        }

        // Handle streaming responses when requested
        if (body && body.stream && response.body) {
          const decoder = new TextDecoder();
          let buffer = '';
          let accumulated = '';

          // Helper to process a text chunk (may include one or more newline-delimited JSON objects)
          const processText = (text: string) => {
            buffer += text;
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed) continue;

              try {
                // Support SSE-like 'data: {...}' framed lines by stripping prefix
                let payload = trimmed;
                if (payload.startsWith('data:')) payload = payload.replace(/^data:\s*/, '');
                if (payload === '[DONE]' || payload === 'DONE') continue;

                const obj = JSON.parse(payload);
                // Prefer explicit response content
                if (typeof obj.response === 'string') {
                  accumulated += obj.response;
                } else if (obj.choices && obj.choices[0] && obj.choices[0].delta) {
                  accumulated += obj.choices[0].delta.content || '';
                } else if (typeof obj.text === 'string') {
                  accumulated += obj.text;
                } else {
                  // Fallback to raw stringified object
                  accumulated += JSON.stringify(obj);
                }

                if (requestContext && typeof requestContext.onChunk === 'function') {
                  try {
                    requestContext.onChunk(obj);
                  } catch (e) {
                    // ignore callback errors
                  }
                }
              } catch (e) {
                // Not JSON — append raw line
                accumulated += line;
                if (requestContext && typeof requestContext.onChunk === 'function') {
                  try {
                    requestContext.onChunk({ text: line });
                  } catch (err) {}
                }
              }
            }
          };

          // Support both Web ReadableStream (getReader) and async iterable streams
          const bodyStream: any = (response as any).body;

          if (typeof bodyStream.getReader === 'function') {
            const reader = bodyStream.getReader();
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              processText(decoder.decode(value, { stream: true }));
            }
          } else if (Symbol.asyncIterator in bodyStream) {
            for await (const chunk of bodyStream as any) {
              const chunkText = typeof chunk === 'string' ? chunk : decoder.decode(chunk);
              processText(chunkText);
            }
          } else {
            // Last resort: try to read as text
            const text = await response.text();
            processText(text);
          }

          // Process any remaining buffer
          if (buffer.trim().length > 0) {
            try {
              const obj = JSON.parse(buffer);
              if (typeof obj.response === 'string') accumulated += obj.response;
              else if (obj.text) accumulated += obj.text;
              else accumulated += JSON.stringify(obj);
            } catch (e) {
              accumulated += buffer;
            }
          }

          return {
            model: body.model || '',
            response: accumulated,
            done: true,
          };
        }

        // Non-streaming default behavior
        return await response.json();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');

        if (error instanceof OllamaError) throw error;

        if (attempt < this.config.getMaxRetries()) {
          await this.delay(1000 * Math.pow(2, attempt));
        }
      }
    }

    throw new OllamaError(
      `Failed after ${this.config.getMaxRetries()} retries: ${lastError?.message}`,
      'MAX_RETRIES_EXCEEDED'
    );
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Async-iterator view over a streaming consult. Yields parsed chunks as they arrive and
   * returns the final ConsultResponse when the stream completes.
   */
  async *consultStream(request: ConsultRequest): AsyncGenerator<any, ConsultResponse, void> {
    this.validateConsultRequest(request);

    const timeout = request.timeout || this.config.getTimeout();

    const response = await fetch(this.config.getApiUrl('/api/generate'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: request.model,
        prompt: request.prompt,
        system: request.systemPrompt,
        temperature: request.temperature,
        stream: true,
      }),
      signal: AbortSignal.timeout(timeout),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new OllamaError(`Ollama API error: ${errorText}`, 'API_ERROR', response.status);
    }

    // If there's no streaming body, fallback to JSON
    if (!response.body) {
      const json = (await response.json()) as ConsultResponse;
      return json;
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let accumulated = '';

    const processText = (text: string): any[] => {
      buffer += text;
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      const out: any[] = [];

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        // Support SSE-like 'data: {...}' framed lines by stripping prefix
        let payload = trimmed;
        if (payload.startsWith('data:')) payload = payload.replace(/^data:\s*/, '');
        if (payload === '[DONE]' || payload === 'DONE') continue;

        try {
          const obj = JSON.parse(payload);
          // Also extract text-like fields to make simple consumption easy
          let text = '';
          if (typeof obj.response === 'string') text = obj.response;
          else if (obj.choices && obj.choices[0] && obj.choices[0].delta) text = obj.choices[0].delta.content || '';
          else if (typeof obj.text === 'string') text = obj.text;

          if (text) accumulated += text;
          // Push a normalized chunk
          out.push({ response: obj.response, text, raw: obj });
        } catch (e) {
          // Not JSON — emit raw line as text
          accumulated += line;
          out.push({ text: line, raw: line });
        }
      }

      return out;
    };

    // Support both Web ReadableStream (getReader) and async iterable streams
    const bodyStream: any = (response as any).body;

    if (typeof bodyStream.getReader === 'function') {
      const reader = bodyStream.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const parsed = processText(decoder.decode(value, { stream: true }));
        for (const p of parsed) {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          yield p;
        }
      }
    } else if (Symbol.asyncIterator in bodyStream) {
      for await (const chunk of bodyStream as any) {
        const chunkText = typeof chunk === 'string' ? chunk : decoder.decode(chunk);
        const parsed = processText(chunkText);
        for (const p of parsed) {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          yield p;
        }
      }
    } else {
      const text = await response.text();
      const parsed = processText(text);
      for (const p of parsed) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        yield p;
      }
    }

    // Finalize remaining buffer
    if (buffer.trim().length > 0) {
      try {
        const obj = JSON.parse(buffer);
        let text = '';
        if (typeof obj.response === 'string') text = obj.response;
        else if (obj.text) text = obj.text;
        else text = JSON.stringify(obj);
        accumulated += text;
      } catch (e) {
        accumulated += buffer;
      }
    }

    // Return final response object
    return {
      model: request.model || '',
      response: accumulated,
      done: true,
    };
  }
}
