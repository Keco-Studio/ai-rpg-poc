# Quick Start: AI Orchestration Integration

**Feature**: AI Orchestration v1  
**Date**: 2026-02-05  
**Audience**: Developers integrating AI-assisted editing into the editor

---

## Overview

This guide shows how to integrate AI orchestration into the editor UI and implement custom AI providers.

---

## Basic Usage

### 1. Propose a Patch

```typescript
import { proposePatchWithRepair } from '@project/ai';
import { openAIProvider } from './ai-providers';

async function handleAIProposal(project: Project, userGoal: string) {
  const result = await proposePatchWithRepair(
    project,
    userGoal,
    openAIProvider,
    {
      maxRepairAttempts: 2,
      guardrails: {
        maxOps: 40,
        maxTileEdits: 20000,
        allowDestructive: false
      }
    }
  );

  // Handle result based on status
  switch (result.status) {
    case 'success':
      // Show patch summary for user review
      showPatchPreview(result.patch, result.summary);
      break;
      
    case 'validation_failed':
      // All repair attempts exhausted
      showError('AI could not generate a valid patch', result.errors);
      break;
      
    case 'parse_failed':
      // AI returned non-JSON or malformed response
      showError('AI response was not valid JSON', result.message);
      break;
      
    case 'provider_error':
      // Network or provider error
      showError('AI service unavailable', result.message);
      break;
      
    case 'guardrail_blocked':
      // Patch exceeded safety thresholds
      showWarning(result.message, result.warnings);
      if (result.requiresConfirmation) {
        // Allow user to override
        const confirmed = await confirmLargeChange(result);
        if (confirmed) {
          // Retry with relaxed guardrails
        }
      }
      break;
  }
}
```

### 2. Apply a Patch

```typescript
import { applyProposedPatch } from '@project/ai';

async function handleApply(project: Project, patch: PatchV1) {
  try {
    await applyProposedPatch(project, patch, {
      description: 'AI-generated: ' + patch.description
    });
    
    // Patch applied successfully
    showSuccess('Changes applied');
    refreshEditor();
  } catch (error) {
    // Apply failed (should be rare - patch was already validated)
    showError('Failed to apply patch', error.message);
  }
}
```

### 3. Undo with Conflict Detection

```typescript
import { checkUndoConflicts, undoAIPatch } from '@project/ai';

async function handleUndo(project: Project, patchId: string) {
  // Check for conflicts
  const conflicts = await checkUndoConflicts(project, patchId);
  
  if (conflicts.hasConflicts) {
    // Show conflict resolution dialog
    const resolution = await showConflictDialog(conflicts);
    
    switch (resolution) {
      case 'cancel':
        // User cancelled, do nothing
        return;
        
      case 'partial':
        // Undo non-conflicting parts only
        await undoAIPatch(project, patchId, { autoResolve: 'partial' });
        showInfo(`Undone ${conflicts.safeHunks.length} changes, skipped ${conflicts.conflicts.length} conflicting changes`);
        break;
        
      case 'force':
        // Force undo, lose manual edits
        const confirmed = await confirmDataLoss(conflicts);
        if (confirmed) {
          await undoAIPatch(project, patchId, { autoResolve: 'force' });
          showWarning('Undo forced - some manual edits were lost');
        }
        break;
    }
  } else {
    // No conflicts, safe to undo
    await undoAIPatch(project, patchId);
    showSuccess('Changes undone');
  }
}
```

---

## Implementing a Custom AI Provider

### Example: OpenAI GPT-4 Provider

```typescript
import { AIProvider, AIInput, AIRawResponse, createProviderError } from '@project/ai';
import { OpenAI } from 'openai';

export class OpenAIProvider implements AIProvider {
  readonly name = 'OpenAI';
  readonly version = '1.0.0';
  readonly modelId: string;
  
  private client: OpenAI;
  private timeout: number;

  constructor(config: { apiKey: string; model?: string; timeout?: number }) {
    this.client = new OpenAI({ apiKey: config.apiKey });
    this.modelId = config.model || 'gpt-4-turbo-preview';
    this.timeout = config.timeout || 30000;
  }

  async proposePatch(input: AIInput): Promise<AIRawResponse> {
    try {
      // Build messages
      const messages = [
        { role: 'system', content: input.systemPrompt },
        { 
          role: 'user', 
          content: this.buildUserContent(input) 
        }
      ];

      // Call OpenAI with timeout
      const completion = await Promise.race([
        this.client.chat.completions.create({
          model: this.modelId,
          messages,
          temperature: 0.7,
          max_tokens: 4000,
          response_format: { type: 'json_object' }  // JSON mode
        }),
        this.createTimeout()
      ]);

      // Extract response
      const rawText = completion.choices[0]?.message?.content;
      
      if (!rawText) {
        return createProviderError('provider_error', 'Empty response from OpenAI');
      }

      // Attempt to parse as PatchV1
      let parsedPatch;
      try {
        parsedPatch = JSON.parse(rawText);
      } catch {
        // Not valid JSON, but still return raw text for parse module
      }

      return {
        success: true,
        rawText,
        parsedPatch
      };
      
    } catch (error: any) {
      // Handle specific error types
      if (error.name === 'TimeoutError') {
        return createProviderError('timeout_error', 'OpenAI request timed out');
      }
      
      if (error.status === 401) {
        return createProviderError('auth_error', 'Invalid OpenAI API key');
      }
      
      if (error.status === 429) {
        return createProviderError('rate_limit_error', 'OpenAI rate limit exceeded');
      }
      
      // Generic error
      return createProviderError('provider_error', error.message || 'Unknown OpenAI error');
    }
  }

  private buildUserContent(input: AIInput): string {
    // Combine project summary and user prompt
    let content = `Project Summary:\n${JSON.stringify(input.projectSummary, null, 2)}\n\n`;
    content += `User Request: ${input.userPrompt}\n\n`;
    
    // Add repair context if present
    if (input.repairContext) {
      content += `Previous Attempt Failed (Attempt ${input.repairContext.attemptNumber}/${input.repairContext.maxAttempts}):\n`;
      content += `Errors:\n${JSON.stringify(input.repairContext.errors, null, 2)}\n\n`;
      content += `${input.repairContext.instruction}\n`;
    } else {
      content += 'Generate a PatchV1 JSON patch to fulfill this request.';
    }
    
    return content;
  }

  private createTimeout(): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        const error = new Error('Request timeout');
        error.name = 'TimeoutError';
        reject(error);
      }, this.timeout);
    });
  }
}

// Factory function
export function createOpenAIProvider(apiKey: string): AIProvider {
  return new OpenAIProvider({ apiKey });
}
```

### Example: Anthropic Claude Provider

```typescript
import { AIProvider, AIInput, AIRawResponse, createProviderError } from '@project/ai';
import Anthropic from '@anthropic-ai/sdk';

export class AnthropicProvider implements AIProvider {
  readonly name = 'Anthropic';
  readonly version = '1.0.0';
  readonly modelId: string;
  
  private client: Anthropic;
  private timeout: number;

  constructor(config: { apiKey: string; model?: string; timeout?: number }) {
    this.client = new Anthropic({ apiKey: config.apiKey });
    this.modelId = config.model || 'claude-3-opus-20240229';
    this.timeout = config.timeout || 30000;
  }

  async proposePatch(input: AIInput): Promise<AIRawResponse> {
    try {
      const message = await Promise.race([
        this.client.messages.create({
          model: this.modelId,
          max_tokens: 4000,
          system: input.systemPrompt,
          messages: [{
            role: 'user',
            content: this.buildUserContent(input)
          }]
        }),
        this.createTimeout()
      ]);

      const rawText = message.content[0]?.text;
      
      if (!rawText) {
        return createProviderError('provider_error', 'Empty response from Anthropic');
      }

      // Attempt to parse
      let parsedPatch;
      try {
        parsedPatch = JSON.parse(rawText);
      } catch {
        // Not valid JSON
      }

      return {
        success: true,
        rawText,
        parsedPatch
      };
      
    } catch (error: any) {
      if (error.name === 'TimeoutError') {
        return createProviderError('timeout_error', 'Anthropic request timed out');
      }
      
      if (error.status === 401) {
        return createProviderError('auth_error', 'Invalid Anthropic API key');
      }
      
      if (error.status === 429) {
        return createProviderError('rate_limit_error', 'Anthropic rate limit exceeded');
      }
      
      return createProviderError('provider_error', error.message || 'Unknown Anthropic error');
    }
  }

  private buildUserContent(input: AIInput): string {
    // Same as OpenAI example
    let content = `Project Summary:\n${JSON.stringify(input.projectSummary, null, 2)}\n\n`;
    content += `User Request: ${input.userPrompt}\n\n`;
    
    if (input.repairContext) {
      content += `Previous Attempt Failed (Attempt ${input.repairContext.attemptNumber}/${input.repairContext.maxAttempts}):\n`;
      content += `Errors:\n${JSON.stringify(input.repairContext.errors, null, 2)}\n\n`;
      content += `${input.repairContext.instruction}\n`;
    } else {
      content += 'Generate a PatchV1 JSON patch to fulfill this request.';
    }
    
    return content;
  }

  private createTimeout(): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        const error = new Error('Request timeout');
        error.name = 'TimeoutError';
        reject(error);
      }, this.timeout);
    });
  }
}

export function createAnthropicProvider(apiKey: string): AIProvider {
  return new AnthropicProvider({ apiKey });
}
```

---

## Testing with MockProvider

```typescript
import { MockProvider, proposePatchWithRepair } from '@project/ai';

describe('AI Orchestration', () => {
  it('should handle repair loop', async () => {
    // Configure mock to fail first, succeed second
    const provider = new MockProvider({
      responses: [
        {
          success: true,
          rawText: '{ "invalid": "patch" }',  // Missing required fields
          parsedPatch: { invalid: 'patch' }
        },
        {
          success: true,
          rawText: JSON.stringify(validPatch),
          parsedPatch: validPatch
        }
      ]
    });

    const result = await proposePatchWithRepair(
      testProject,
      'Create a map',
      provider,
      { maxRepairAttempts: 2 }
    );

    expect(result.status).toBe('success');
    expect(result.repairAttempts).toBe(1);  // One repair
    expect(provider.getCallCount()).toBe(2);  // Two total calls
  });

  it('should exhaust repair attempts', async () => {
    // Configure mock to always return invalid
    const provider = new MockProvider({
      responses: [
        {
          success: true,
          rawText: 'invalid json',
        }
      ]
    });

    const result = await proposePatchWithRepair(
      testProject,
      'Create a map',
      provider,
      { maxRepairAttempts: 2 }
    );

    expect(result.status).toBe('parse_failed');
    expect(provider.getCallCount()).toBe(3);  // Initial + 2 repairs
  });
});
```

---

## Editor UI Integration Example

```typescript
// AiPanel.tsx
import React, { useState } from 'react';
import { proposePatchWithRepair, applyProposedPatch } from '@project/ai';

export function AiPanel({ project, provider }: AiPanelProps) {
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState<ProposedPatchResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handlePropose = async () => {
    setLoading(true);
    try {
      const proposalResult = await proposePatchWithRepair(
        project,
        prompt,
        provider
      );
      setResult(proposalResult);
    } catch (error) {
      console.error('Proposal error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    if (!result?.patch) return;
    
    try {
      await applyProposedPatch(project, result.patch);
      setResult(null);
      setPrompt('');
    } catch (error) {
      console.error('Apply error:', error);
    }
  };

  const handleReject = () => {
    setResult(null);
  };

  return (
    <div className="ai-panel">
      <h3>AI Assistant</h3>
      
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Describe what you want to create or modify..."
        disabled={loading}
      />
      
      <button onClick={handlePropose} disabled={loading || !prompt}>
        {loading ? 'Generating...' : 'Propose Changes'}
      </button>

      {result && (
        <div className="proposal-result">
          {result.status === 'success' ? (
            <div className="success">
              <h4>Proposed Changes</h4>
              <PatchSummaryDisplay summary={result.summary!} />
              
              {result.warnings.length > 0 && (
                <div className="warnings">
                  {result.warnings.map((w, i) => <p key={i}>{w}</p>)}
                </div>
              )}
              
              <div className="actions">
                <button onClick={handleApply}>Apply</button>
                <button onClick={handleReject}>Reject</button>
              </div>
            </div>
          ) : (
            <div className="error">
              <h4>Proposal Failed</h4>
              <p>{result.message}</p>
              {result.errors && (
                <ul>
                  {result.errors.map((e, i) => (
                    <li key={i}>{e.message}</li>
                  ))}
                </ul>
              )}
              <button onClick={handlePropose}>Try Again</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

---

## Configuration Best Practices

### Guardrails

- **Development**: Relax guardrails for faster iteration
  ```typescript
  guardrails: {
    maxOps: 100,
    maxTileEdits: 50000,
    allowDestructive: true
  }
  ```

- **Production**: Use conservative defaults
  ```typescript
  guardrails: {
    maxOps: 40,
    maxTileEdits: 20000,
    allowDestructive: false
  }
  ```

### Repair Attempts

- Start with 2 (default) for balance of reliability and latency
- Increase to 3 for complex prompts if AI frequently fails on second attempt
- Decrease to 1 if AI provider is expensive and success rate is high

### Timeouts

- Default 30s is reasonable for most providers
- Increase to 60s for complex prompts or slow providers
- Decrease to 15s for fast local models

---

## Common Patterns

### Goal-Directed Summarization

```typescript
const summary = buildProjectSummary(project, {
  userPrompt: "edit the town map",  // Filters to include only town map details
  maxTokens: 4000
});
```

### Custom Prompt Templates

```typescript
// Override system prompt for specialized behavior
const systemPrompt = buildSystemPrompt(guardrails) + `\n\nAdditional Rule: Always name maps with "map_" prefix.`;
```

### Batch Operations

```typescript
// Process multiple prompts in sequence
for (const userGoal of goals) {
  const result = await proposePatchWithRepair(project, userGoal, provider);
  if (result.status === 'success') {
    await applyProposedPatch(project, result.patch);
  }
}
```

---

## Troubleshooting

### "Validation failed on every repair attempt"

**Cause**: AI model is not familiar with PatchV1 format  
**Solution**: Use a more capable model (GPT-4 instead of GPT-3.5), or add few-shot examples to system prompt

### "Guardrail blocked - patch too large"

**Cause**: User prompt is too ambitious  
**Solution**: Guide user to break down request, or increase guardrail thresholds

### "Parse failed - non-JSON response"

**Cause**: AI returned explanatory text mixed with JSON  
**Solution**: Enable JSON mode if provider supports it (OpenAI response_format, Claude prefill)

### "Undo conflicts detected frequently"

**Cause**: Users editing same areas as AI patches  
**Solution**: Expected behavior; conflict dialog is working correctly. Consider partial undo as default resolution.

---

## Performance Tips

1. **Cache ProjectSummary**: Regenerate only when project changes
2. **Debounce propose calls**: Avoid rapid-fire requests on prompt changes
3. **Stream responses**: Use streaming APIs if provider supports (future enhancement)
4. **Lazy load conflicts**: Only check conflicts when undo is requested, not preemptively

---

## Next Steps

- Implement your own AI provider following the examples above
- Integrate `AiPanel` component into editor UI
- Configure guardrails based on your user base and use cases
- Collect telemetry on repair success rates and iterate on prompts
