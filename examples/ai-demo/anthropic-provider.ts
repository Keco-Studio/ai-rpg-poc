/**
 * Anthropic Claude AI Provider
 *
 * Real AIProvider implementation that calls the Anthropic Messages API
 * to generate PatchV1 proposals from natural language.
 */

import Anthropic from '@anthropic-ai/sdk';
import type { AIProvider } from '@ai-rpg-maker/shared';
import type { AIInput, AIRawResponse } from '@ai-rpg-maker/shared';
import { createProviderError } from '@ai-rpg-maker/shared';

export interface AnthropicProviderConfig {
  apiKey: string;
  model?: string;
  maxTokens?: number;
  timeout?: number;
}

export class AnthropicProvider implements AIProvider {
  readonly name = 'Anthropic';
  readonly version = '1.0.0';
  readonly modelId: string;

  private client: Anthropic;
  private maxTokens: number;
  private timeout: number;

  constructor(config: AnthropicProviderConfig) {
    this.client = new Anthropic({ apiKey: config.apiKey });
    this.modelId = config.model ?? 'claude-sonnet-4-20250514';
    this.maxTokens = config.maxTokens ?? 4096;
    this.timeout = config.timeout ?? 30000;
  }

  async proposePatch(input: AIInput): Promise<AIRawResponse> {
    try {
      const message = await Promise.race([
        this.client.messages.create({
          model: this.modelId,
          max_tokens: this.maxTokens,
          system: input.systemPrompt,
          messages: [
            {
              role: 'user',
              content: this.buildUserContent(input),
            },
          ],
        }),
        this.createTimeout(),
      ]);

      // Extract text from first content block
      const firstBlock = message.content[0];
      const rawText =
        firstBlock && firstBlock.type === 'text' ? firstBlock.text : undefined;

      if (!rawText) {
        return createProviderError('provider_error', 'Empty response from Anthropic');
      }

      // Attempt to pre-parse JSON (orchestrator will do strict parsing too)
      let parsedPatch;
      try {
        parsedPatch = JSON.parse(rawText);
      } catch {
        // Not valid JSON on its own - orchestrator's parseAIResponse will
        // try to extract JSON from mixed content
      }

      return {
        success: true,
        rawText,
        parsedPatch,
      };
    } catch (error: unknown) {
      return this.handleError(error);
    }
  }

  private buildUserContent(input: AIInput): string {
    let content = `Project Summary:\n${JSON.stringify(input.projectSummary, null, 2)}\n\n`;
    content += `User Request: ${input.userPrompt}\n\n`;

    if (input.repairContext) {
      content += `Previous Attempt Failed (Attempt ${input.repairContext.attemptNumber}/${input.repairContext.maxAttempts}):\n`;
      content += `Errors:\n${JSON.stringify(input.repairContext.errors, null, 2)}\n\n`;
      content += `${input.repairContext.instruction}\n`;
    } else {
      content += 'Generate a PatchV1 JSON patch to fulfill this request. Return ONLY the JSON object, no explanation.';
    }

    return content;
  }

  private createTimeout(): Promise<never> {
    return new Promise((_, reject) => {
      const timer = setTimeout(() => {
        const error = new Error('Request timeout');
        error.name = 'TimeoutError';
        reject(error);
      }, this.timeout);
      // Unref so it doesn't keep the process alive
      if (typeof timer === 'object' && 'unref' in timer) {
        (timer as { unref: () => void }).unref();
      }
    });
  }

  private handleError(error: unknown): AIRawResponse {
    if (error instanceof Error && error.name === 'TimeoutError') {
      return createProviderError('timeout_error', `Anthropic request timed out after ${this.timeout}ms`);
    }

    // Anthropic SDK errors have a status property
    const apiError = error as { status?: number; message?: string };

    if (apiError.status === 401) {
      return createProviderError('auth_error', 'Invalid Anthropic API key');
    }

    if (apiError.status === 429) {
      return createProviderError('rate_limit_error', 'Anthropic rate limit exceeded');
    }

    if (apiError.status === 400) {
      return createProviderError(
        'invalid_request_error',
        apiError.message ?? 'Bad request to Anthropic API',
      );
    }

    const msg =
      error instanceof Error ? error.message : 'Unknown Anthropic error';
    return createProviderError('provider_error', msg);
  }
}

/** Convenience factory function. */
export function createAnthropicProvider(
  apiKey: string,
  model?: string,
): AnthropicProvider {
  return new AnthropicProvider({ apiKey, model });
}
