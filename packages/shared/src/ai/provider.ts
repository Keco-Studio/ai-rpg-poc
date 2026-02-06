/**
 * AI Provider Interface and Mock Implementation
 *
 * Abstraction for AI services that generate PatchV1 proposals.
 * Implementations may use different vendors (OpenAI, Anthropic, local models)
 * without requiring changes to orchestrator logic.
 */

import type { AIInput, AIRawResponse } from './types.js';

// ============================================================================
// AI Provider Interface
// ============================================================================

/**
 * AI Provider interface for patch proposal generation.
 *
 * Implementations must:
 * - Accept AIInput with system/user prompts and project summary
 * - Return AIRawResponse with either raw text or error
 * - Handle network errors gracefully (return error, don't throw)
 * - Respect timeout settings
 */
export interface AIProvider {
  /**
   * Propose a patch based on user intent and project context.
   *
   * @param input - Complete input including prompts, summary, and optional repair context
   * @returns Promise resolving to raw AI response (success or error)
   *
   * @remarks
   * - This method should NOT throw errors; return AIRawResponse with error field
   * - Timeout handling is implementation responsibility
   * - Repair context (if present) indicates this is a correction attempt
   */
  proposePatch(input: AIInput): Promise<AIRawResponse>;

  /** Provider metadata (optional, for debugging and telemetry) */
  readonly name?: string;
  readonly version?: string;
  readonly modelId?: string;
}

// ============================================================================
// Provider Configuration
// ============================================================================

/** Provider configuration (vendor-specific). */
export interface ProviderConfig {
  endpoint?: string;
  apiKey?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
  [key: string]: unknown;
}

/** Provider factory function type. */
export type ProviderFactory<TConfig extends ProviderConfig = ProviderConfig> = (
  config: TConfig,
) => AIProvider;

// ============================================================================
// Mock Provider (for testing)
// ============================================================================

/** Mock provider configuration for deterministic testing. */
export interface MockProviderConfig {
  /** Sequence of responses to return (cycles if exhausted) */
  responses: AIRawResponse[];
  /** Simulate delay (ms) before returning response */
  delay?: number;
  /** Simulate failure after N successful calls */
  failAfter?: number;
}

/**
 * Mock AI Provider for testing.
 *
 * Returns pre-configured responses in sequence for deterministic tests.
 *
 * @example
 * ```typescript
 * const provider = new MockProvider({
 *   responses: [
 *     { success: false, rawText: "invalid", error: "Parse error" },
 *     { success: true, rawText: "{...}", parsedPatch: validPatch }
 *   ]
 * });
 * ```
 */
export class MockProvider implements AIProvider {
  readonly name = 'MockProvider';
  readonly version = '1.0.0';

  private callCount = 0;
  private config: MockProviderConfig;
  private receivedInputs: AIInput[] = [];

  constructor(config: MockProviderConfig) {
    this.config = config;
  }

  async proposePatch(input: AIInput): Promise<AIRawResponse> {
    this.receivedInputs.push(input);

    // Simulate delay if configured
    if (this.config.delay !== undefined && this.config.delay > 0) {
      const ms = this.config.delay;
      await new Promise<void>((resolve) =>
        (globalThis as unknown as { setTimeout: (fn: () => void, ms: number) => void })
          .setTimeout(resolve, ms),
      );
    }

    // Check if should fail
    if (
      this.config.failAfter !== undefined &&
      this.callCount >= this.config.failAfter
    ) {
      this.callCount++;
      return {
        success: false,
        error: 'Mock provider configured to fail after N calls',
      };
    }

    // Return next response in sequence (cycle if exhausted)
    const response =
      this.config.responses[this.callCount % this.config.responses.length];
    this.callCount++;

    return response;
  }

  /** Reset call count and captured inputs (for test cleanup). */
  reset(): void {
    this.callCount = 0;
    this.receivedInputs = [];
  }

  /** Get current call count (for test assertions). */
  getCallCount(): number {
    return this.callCount;
  }

  /** Get all captured inputs (for test assertions). */
  getReceivedInputs(): AIInput[] {
    return this.receivedInputs;
  }

  /** Get the most recent input (for test assertions). */
  getLastInput(): AIInput | undefined {
    return this.receivedInputs[this.receivedInputs.length - 1];
  }
}

// ============================================================================
// Provider Error Types
// ============================================================================

/** Standard error types for provider implementations. */
export const ProviderErrorType = {
  NETWORK: 'network_error',
  AUTH: 'auth_error',
  RATE_LIMIT: 'rate_limit_error',
  TIMEOUT: 'timeout_error',
  INVALID_REQUEST: 'invalid_request_error',
  PROVIDER_ERROR: 'provider_error',
  UNKNOWN: 'unknown_error',
} as const;

export type ProviderErrorType =
  (typeof ProviderErrorType)[keyof typeof ProviderErrorType];

/** Helper to create error AIRawResponse. */
export function createProviderError(
  type: ProviderErrorType,
  message: string,
): AIRawResponse {
  return {
    success: false,
    error: `[${type}] ${message}`,
  };
}
