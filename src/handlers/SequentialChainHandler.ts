import { BaseHandler } from './BaseHandler.js';
import { OllamaService } from '../services/OllamaService.js';
import { ModelValidator } from '../services/ModelValidator.js';
import {
  SequentialChainRequest,
  SequentialChainRequestSchema,
  ChainStep,
  SequentialChainResult,
  ConversationMessage,
} from '../types/index.js';

export class SequentialChainHandler extends BaseHandler {
  private modelValidator: ModelValidator;

  constructor(
    private ollamaService: OllamaService,
    modelValidator?: ModelValidator
  ) {
    super();
    this.modelValidator = modelValidator || new ModelValidator(this.ollamaService.getConfig());
  }

  async handle(params: unknown): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
    // Validate parameters using Zod schema
    const parseResult = SequentialChainRequestSchema.safeParse(params);
    if (!parseResult.success) {
      return {
        content: [
          {
            type: 'text',
            text: `Invalid parameters: ${parseResult.error.message}`,
          },
        ],
        isError: true,
      };
    }

    const consultants = parseResult.data.consultants;
    const context = parseResult.data.context || { passThrough: true };
    const flowControl = parseResult.data.flowControl || { maxRetries: 0, retryDelayMs: 1000, continueOnError: false };
    const memory = parseResult.data.memory || { storeConversation: false };

    try {
      const conversationId = `chain-${Date.now()}`;
      const startTime = Date.now();
      const steps: ChainStep[] = [];
      const messages: ConversationMessage[] = [];
      let conversationContext = '';
      const consultantResponses: Record<string, string> = {};

      // Add system prompt if provided
      if (context.systemPrompt) {
        conversationContext += `System: ${context.systemPrompt}\n\n`;
      }

      for (let i = 0; i < consultants.length; i++) {
        const consultant = consultants[i];
        const stepStartTime = Date.now();
        let retryCount = 0;
        let stepSuccess = false;
        let stepResponse = '';
        let stepError: string | undefined;

        // Replace placeholders in prompt with previous responses
        let finalPrompt = consultant.prompt;
        for (const [id, response] of Object.entries(consultantResponses)) {
          finalPrompt = finalPrompt.replace(new RegExp(`\\{${id}\\}`, 'g'), response);
        }

        // Build prompt with conversation context if passThrough is enabled
        if (context.passThrough && conversationContext) {
          finalPrompt = `${conversationContext}${consultant.id}: ${finalPrompt}`;
        }

        while (!stepSuccess && retryCount <= (flowControl.maxRetries || 0)) {
          try {
            // Check model availability
            const isAvailable = await this.modelValidator.isModelAvailable(consultant.model);
            if (!isAvailable) {
              // Try to find a fallback or just fail
              // For now, we'll just fail if the specific model isn't available, 
              // but we could add auto-selection logic here similar to ConsultOllamaHandler
              throw new Error(`Model '${consultant.model}' is not available`);
            }

            // Make the consultation call
            const response = await this.ollamaService.consult({
              model: consultant.model,
              prompt: finalPrompt,
              systemPrompt: consultant.systemPrompt || context.systemPrompt,
              temperature: consultant.temperature,
              timeout: consultant.timeoutMs,
              stream: true,
            });

            stepResponse = response.response;
            stepSuccess = true;

            // Store response for placeholder replacement
            consultantResponses[consultant.id] = stepResponse;

            // Add to conversation context for next consultant
            if (context.passThrough) {
              conversationContext += `${consultant.id}: ${consultant.prompt}\nResponse: ${stepResponse}\n\n`;
            }

            // Create message record
            const message: ConversationMessage = {
              consultantId: consultant.id,
              role: 'assistant',
              content: stepResponse,
              timestamp: new Date(),
              metadata: {
                model: consultant.model,
                temperature: consultant.temperature,
                duration: Date.now() - stepStartTime,
              },
            };
            messages.push(message);
          } catch (error) {
            retryCount++;
            stepError = error instanceof Error ? error.message : 'Unknown error';

            if (retryCount <= (flowControl.maxRetries || 0)) {
              // Wait before retry
              if (flowControl.retryDelayMs) {
                await new Promise((resolve) => setTimeout(resolve, flowControl.retryDelayMs));
              }
            } else {
              // Max retries reached
              if (flowControl.continueOnError) {
                stepResponse = `[Error after ${retryCount} retries: ${stepError}]`;
                consultantResponses[consultant.id] = stepResponse;
                if (context.passThrough) {
                  conversationContext += `${consultant.id}: ${consultant.prompt}\nError: ${stepError}\n\n`;
                }
              } else {
                // Fail the entire chain
                return {
                  content: [
                    {
                      type: 'text',
                      text: `Sequential chain failed at step ${i + 1} (${consultant.id}): ${stepError}`,
                    },
                  ],
                  isError: true,
                };
              }
            }
          }
        }

        // Record the step
        const step: ChainStep = {
          step: i + 1,
          consultantId: consultant.id,
          model: consultant.model,
          prompt: consultant.prompt,
          response: stepResponse,
          duration: Date.now() - stepStartTime,
          error: stepError,
          retryCount: retryCount,
        };
        steps.push(step);
      }

      const totalDuration = Date.now() - startTime;
      const completedSteps = steps.filter((s) => !s.error).length;

      const result: SequentialChainResult = {
        conversationId,
        status: completedSteps === consultants.length ? 'completed' : 'partial',
        completedSteps,
        totalSteps: consultants.length,
        duration: totalDuration,
        steps,
      };

      // TODO: Handle memory storage if requested
      // For now, we'll skip the memory part or return it in the response for the client to handle
      // Ideally, we should inject a persistence service

      // Format the output
      const formattedSteps = steps
        .map((step) => {
          const status = step.error
            ? `❌ Failed${step.retryCount ? ` (${step.retryCount} retries)` : ''}`
            : '✅ Success';
          return (
            `**Step ${step.step}: ${step.consultantId}** (${step.model}) ${status}\n` +
            `Duration: ${step.duration}ms\n` +
            `Prompt: ${step.prompt}\n` +
            `Response: ${step.response}${step.error ? `\nError: ${step.error}` : ''}\n`
          );
        })
        .join('\n---\n');

      const summary =
        `# Sequential Consultation Chain Results\n\n` +
        `**Status**: ${result.status}\n` +
        `**Completed Steps**: ${completedSteps}/${consultants.length}\n` +
        `**Total Duration**: ${totalDuration}ms\n` +
        `**Conversation ID**: ${conversationId}\n\n` +
        `## Consultation Steps\n\n${formattedSteps}\n\n` +
        `## Final Context\n${conversationContext}`;

      return {
        content: [
          {
            type: 'text',
            text: summary,
          },
        ],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        content: [
          {
            type: 'text',
            text: `Error in sequential consultation chain: ${message}`,
          },
        ],
        isError: true,
      };
    }
  }
}
