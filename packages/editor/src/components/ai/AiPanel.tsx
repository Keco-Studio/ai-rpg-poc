/**
 * AI Panel Component (Refactored for Editor UX v1)
 *
 * Accepts AiPanelProps from contracts with onApply callback
 * that receives ProposedPatchResult.
 * Integrates PatchPreview for proposal display.
 */

import React, { useState, useCallback } from 'react';
import type {
  ProposedPatchResult,
  AIProvider,
  AIPatchError,
} from '@ai-rpg-maker/shared';
import type { Project } from '@ai-rpg-maker/shared';
import { proposePatchWithRepair } from '@ai-rpg-maker/shared';
import { PatchPreview } from './PatchPreview.js';
import type { AiPanelProps } from '../types.js';

interface AiPanelState {
  prompt: string;
  loading: boolean;
  loadingMessage: string;
  result: ProposedPatchResult | null;
  applied: boolean;
  regenerateCount: number;
}

/**
 * AI Panel — prompt input, proposal display, apply/reject/regenerate.
 */
export function AiPanel({
  project,
  provider,
  onApply,
  onError,
}: AiPanelProps) {
  const [state, setState] = useState<AiPanelState>({
    prompt: '',
    loading: false,
    loadingMessage: '',
    result: null,
    applied: false,
    regenerateCount: 0,
  });

  const handlePropose = useCallback(async () => {
    if (!state.prompt.trim() || state.loading) return;

    setState((prev) => ({
      ...prev,
      loading: true,
      loadingMessage: 'Generating proposal...',
      result: null,
      applied: false,
    }));

    try {
      const proposalResult = await proposePatchWithRepair(
        project,
        state.prompt,
        provider,
      );

      setState((prev) => ({
        ...prev,
        loading: false,
        loadingMessage: '',
        result: proposalResult,
      }));
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      onError?.(msg);
      setState((prev) => ({
        ...prev,
        loading: false,
        loadingMessage: '',
      }));
    }
  }, [state.prompt, state.loading, project, provider, onError]);

  const handleApply = useCallback(() => {
    if (!state.result?.patch) return;
    onApply(state.result);
    setState((prev) => ({
      ...prev,
      result: null,
      prompt: '',
      applied: true,
    }));
  }, [state.result, onApply]);

  const handleReject = useCallback(() => {
    setState((prev) => ({ ...prev, result: null }));
  }, []);

  const handleRegenerate = useCallback(async () => {
    setState((prev) => ({
      ...prev,
      result: null,
      regenerateCount: prev.regenerateCount + 1,
    }));
    await handlePropose();
  }, [handlePropose]);

  return (
    <div
      data-testid="ai-panel"
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
        padding: 8,
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 600, color: '#a6adc8', textTransform: 'uppercase', marginBottom: 6 }}>
        AI Assistant
      </div>

      {/* Prompt Input */}
      <textarea
        data-testid="ai-prompt-input"
        value={state.prompt}
        onChange={(e) => setState((prev) => ({ ...prev, prompt: e.target.value }))}
        placeholder="Describe what to create or modify..."
        disabled={state.loading}
        rows={3}
        style={{
          width: '100%',
          background: '#313244',
          color: '#cdd6f4',
          border: '1px solid #45475a',
          borderRadius: 4,
          padding: 6,
          fontSize: 12,
          resize: 'vertical',
          fontFamily: 'inherit',
        }}
      />

      <button
        data-action="propose"
        onClick={handlePropose}
        disabled={state.loading || !state.prompt.trim()}
        style={{
          marginTop: 6,
          padding: '6px 12px',
          background: state.loading || !state.prompt.trim() ? '#45475a' : '#89b4fa',
          color: state.loading || !state.prompt.trim() ? '#6c7086' : '#1e1e2e',
          border: 'none',
          borderRadius: 4,
          cursor: state.loading || !state.prompt.trim() ? 'default' : 'pointer',
          fontSize: 12,
          fontWeight: 600,
        }}
      >
        {state.loading ? state.loadingMessage : 'Propose Changes'}
      </button>

      {/* Applied success */}
      {state.applied && !state.result && (
        <div style={{ color: '#a6e3a1', fontSize: 12, marginTop: 8 }}>
          Changes applied successfully!
        </div>
      )}

      {/* Result */}
      {state.result && (
        <div style={{ marginTop: 8, overflow: 'auto', flex: 1 }}>
          {state.result.status === 'success' ? (
            <PatchPreview
              result={state.result}
              onApply={handleApply}
              onReject={handleReject}
              onRegenerate={handleRegenerate}
            />
          ) : (
            <div style={{ fontSize: 12 }}>
              <div style={{ color: '#f38ba8', fontWeight: 600 }}>Proposal Failed</div>
              <p style={{ color: '#a6adc8', margin: '4px 0' }}>{state.result.message}</p>
              {state.result.errors && state.result.errors.length > 0 && (
                <details style={{ fontSize: 11, color: '#6c7086' }}>
                  <summary>{state.result.errors.length} error(s)</summary>
                  <ul style={{ paddingLeft: 16 }}>
                    {state.result.errors.map((e: AIPatchError, i: number) => (
                      <li key={i}>[{e.errorType}] {e.message}</li>
                    ))}
                  </ul>
                </details>
              )}
              <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
                <button
                  onClick={handlePropose}
                  style={{
                    padding: '4px 10px',
                    background: '#313244',
                    color: '#cdd6f4',
                    border: 'none',
                    borderRadius: 3,
                    cursor: 'pointer',
                    fontSize: 11,
                  }}
                >
                  Try Again
                </button>
                <button
                  onClick={handleReject}
                  style={{
                    padding: '4px 10px',
                    background: '#313244',
                    color: '#cdd6f4',
                    border: 'none',
                    borderRadius: 3,
                    cursor: 'pointer',
                    fontSize: 11,
                  }}
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
