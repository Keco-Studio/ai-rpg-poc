/**
 * AI Provider Interface
 * 
 * Abstraction for AI services that generate PatchV1 proposals.
 * Implementations may use different vendors (OpenAI, Anthropic, local models)
 * without requiring changes to orchestrator logic.
 */

import type { AIInput, AIRawResponse } from './types';

/**
 * AI Provider interface for patch proposal generation
 * 
 * Implementations must:
 * - Accept AIInput with system/user prompts and project summary
 * - Return AIRawResponse with either patch or error
 * - Handle network errors gracefully (return error, don't throw)
 * - Respect timeout settings from AIInput metadata
 */
export interface AIProvider {
  /**
   * Propose a patch based on user intent and project context
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

  /**
   * Provider metadata (optional, for debugging and telemetry)
   */
  readonly name?: string;
  readonly version?: string;
  readonly modelId?: string;
}

/**
 * Provider configuration (vendor-specific)
 * 
 * Each provider implementation defines its own config type.
 * Common fields included here as guidance.
 */
export interface ProviderConfig {
  /** API endpoint (if applicable) */
  endpoint?: string;
  
  /** API key or authentication token (if applicable) */
  apiKey?: string;
  
  /** Model identifier (e.g., "gpt-4", "claude-3-opus") */
  model?: string;
  
  /** Temperature for generation (0.0-1.0) */
  temperature?: number;
  
  /** Maximum tokens for response */
  maxTokens?: number;
  
  /** Request timeout in milliseconds */
  timeout?: number;
  
  /** Additional vendor-specific options */
  [key: string]: any;
}

/**
 * Provider factory function type
 * 
 * Implementations export a factory that creates configured provider instances.
 */
export type ProviderFactory<TConfig extends ProviderConfig = ProviderConfig> = 
  (config: TConfig) => AIProvider;

// ============================================================================
// Mock Provider (for testing)
// ============================================================================

/**
 * Mock provider configuration
 * 
 * Allows deterministic testing by pre-configuring response sequences.
 */
export interface MockProviderConfig {
  /** Sequence of responses to return (cycles if exhausted) */
  responses: AIRawResponse[];
  
  /** Simulate delay (ms) before returning response */
  delay?: number;
  
  /** Simulate failure after N successful calls */
  failAfter?: number;
}

/**
 * Mock AI Provider for testing
 * 
 * Returns pre-configured responses in sequence for deterministic tests.
 * 
 * @example
 * ```typescript
 * const provider = new MockProvider({
 *   responses: [
 *     { success: false, rawText: "invalid", error: "Parse error" },  // First call fails
 *     { success: true, rawText: "{...}", parsedPatch: {...} }        // Second call succeeds
 *   ]
 * });
 * ```
 */
export class MockProvider implements AIProvider {
  readonly name = 'MockProvider';
  readonly version = '1.0.0';
  
  private callCount = 0;
  private config: MockProviderConfig;

  constructor(config: MockProviderConfig) {
    this.config = config;
  }

  async proposePatch(input: AIInput): Promise<AIRawResponse> {
    // Simulate delay if configured
    if (this.config.delay) {
      await new Promise(resolve => setTimeout(resolve, this.config.delay));
    }

    // Check if should fail
    if (this.config.failAfter && this.callCount >= this.config.failAfter) {
      return {
        success: false,
        error: 'Mock provider configured to fail after N calls'
      };
    }

    // Return next response in sequence (cycle if exhausted)
    const response = this.config.responses[this.callCount % this.config.responses.length];
    this.callCount++;
    
    return response;
  }

  /** Reset call count (for test cleanup) */
  reset(): void {
    this.callCount = 0;
  }

  /** Get current call count (for test assertions) */
  getCallCount(): number {
    return this.callCount;
  }
}

// ============================================================================
// Provider Error Types
// ============================================================================

/**
 * Standard error types for provider implementations
 */
export const ProviderErrorType = {
  NETWORK: 'network_error',
  AUTH: 'auth_error',
  RATE_LIMIT: 'rate_limit_error',
  TIMEOUT: 'timeout_error',
  INVALID_REQUEST: 'invalid_request_error',
  PROVIDER_ERROR: 'provider_error',  // Generic provider-side error
  UNKNOWN: 'unknown_error'
} as const;

export type ProviderErrorType = typeof ProviderErrorType[keyof typeof ProviderErrorType];

/**
 * Helper to create error AIRawResponse
 */
export function createProviderError(
  type: ProviderErrorType, 
  message: string
): AIRawResponse {
  return {
    success: false,
    error: `[${type}] ${message}`
  };
}
