/**
 * AI Panel Component
 *
 * Main UI for AI-assisted editing.
 * Provides prompt input, proposal display, and action buttons.
 *
 * Flow: Input prompt → Propose → Review summary → Apply/Reject
 */

import React, { useState, useCallback } from 'react';
import type {
  ProposedPatchResult,
  AIProvider,
  ProposeOptions,
  AIPatchError,
  PatchSummary,
  ResourceSummary,
  TileEditSummary,
  CollisionEditSummary,
} from '@ai-rpg-maker/shared';
import type { Project, PatchV1 } from '@ai-rpg-maker/shared';
import {
  proposePatchWithRepair,
  applyPatch,
  HistoryStack,
} from '@ai-rpg-maker/shared';

/**
 * Props for AiPanel component.
 */
export interface AiPanelProps {
  /** Current project state */
  project: Project;
  /** AI provider implementation */
  provider: AIProvider;
  /** Optional configuration */
  options?: ProposeOptions;
  /** Callback when patch is applied */
  onApply?: (project: Project) => void;
  /** Callback for error reporting */
  onError?: (error: string) => void;
}

/**
 * Internal state for the AI panel.
 */
interface AiPanelState {
  prompt: string;
  loading: boolean;
  loadingMessage: string;
  result: ProposedPatchResult | null;
  applied: boolean;
  regenerateCount: number;
}

/**
 * AI Panel - Main UI component for AI-assisted editing.
 *
 * Supports the full propose → review → apply/reject workflow:
 * - Text area for entering natural language prompts
 * - "Propose" button to generate patch proposals
 * - Patch summary display showing what will change
 * - "Apply" / "Reject" / "Regenerate" action buttons
 * - Error and warning display
 * - Loading state with repair status
 */
export function AiPanel({
  project,
  provider,
  options,
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

  // ─── Propose Handler ──────────────────────────────────────────────
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
        {
          ...options,
          // Hook into repair status (future: onRepairAttempt callback)
        },
      );

      setState((prev) => ({
        ...prev,
        loading: false,
        loadingMessage: '',
        result: proposalResult,
      }));
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : 'Unknown error occurred';
      onError?.(msg);
      setState((prev) => ({
        ...prev,
        loading: false,
        loadingMessage: '',
      }));
    }
  }, [state.prompt, state.loading, project, provider, options, onError]);

  // ─── Apply Handler ────────────────────────────────────────────────
  const handleApply = useCallback(async () => {
    if (!state.result?.patch) return;

    try {
      // Apply using history stack for undo support
      const history = new HistoryStack();
      const applyResult = history.applyAndPush(project, state.result.patch);

      if (applyResult) {
        onApply?.(applyResult.project);
        setState((prev) => ({
          ...prev,
          result: null,
          prompt: '',
          applied: true,
        }));
      } else {
        onError?.('Failed to apply patch - validation error');
      }
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : 'Failed to apply patch';
      onError?.(msg);
    }
  }, [state.result, project, onApply, onError]);

  // ─── Reject Handler ───────────────────────────────────────────────
  const handleReject = useCallback(() => {
    setState((prev) => ({
      ...prev,
      result: null,
      // Keep prompt text for refinement (T055)
    }));
  }, []);

  // ─── Regenerate Handler ───────────────────────────────────────────
  const handleRegenerate = useCallback(async () => {
    setState((prev) => ({
      ...prev,
      result: null,
      regenerateCount: prev.regenerateCount + 1,
    }));
    // Re-trigger proposal
    await handlePropose();
  }, [handlePropose]);

  // ─── Render ───────────────────────────────────────────────────────
  return (
    <div className="ai-panel">
      <h3>AI Assistant</h3>

      {/* Prompt Input */}
      <div className="ai-panel__input">
        <textarea
          value={state.prompt}
          onChange={(e) =>
            setState((prev) => ({ ...prev, prompt: e.target.value }))
          }
          placeholder="Describe what you want to create or modify..."
          disabled={state.loading}
          rows={3}
        />
        <button
          onClick={handlePropose}
          disabled={state.loading || !state.prompt.trim()}
        >
          {state.loading ? state.loadingMessage : 'Propose Changes'}
        </button>
      </div>

      {/* Applied success message */}
      {state.applied && !state.result && (
        <div className="ai-panel__success">
          <p>Changes applied successfully!</p>
        </div>
      )}

      {/* Proposal Result */}
      {state.result && (
        <div className="ai-panel__result">
          {state.result.status === 'success' ? (
            <SuccessView
              result={state.result}
              prompt={state.prompt}
              regenerateCount={state.regenerateCount}
              onApply={handleApply}
              onReject={handleReject}
              onRegenerate={handleRegenerate}
            />
          ) : (
            <ErrorView
              result={state.result}
              onRetry={handlePropose}
              onDismiss={handleReject}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

interface SuccessViewProps {
  result: ProposedPatchResult;
  prompt: string;
  regenerateCount: number;
  onApply: () => void;
  onReject: () => void;
  onRegenerate: () => void;
}

function SuccessView({
  result,
  prompt,
  regenerateCount,
  onApply,
  onReject,
  onRegenerate,
}: SuccessViewProps) {
  return (
    <div className="ai-panel__success-view">
      <h4>Proposed Changes</h4>

      {/* Original prompt for context */}
      <div className="ai-panel__context">
        <small>Prompt: {prompt}</small>
        {regenerateCount > 0 && (
          <small> (regenerated {regenerateCount} time{regenerateCount !== 1 ? 's' : ''})</small>
        )}
      </div>

      {/* Patch Summary */}
      {result.summary && <PatchSummaryDisplay summary={result.summary} />}

      {/* Warnings */}
      {result.warnings.length > 0 && (
        <div className="ai-panel__warnings">
          {result.warnings.map((w: string, i: number) => (
            <p key={i} className="ai-panel__warning">
              {w}
            </p>
          ))}
        </div>
      )}

      {/* Action Buttons */}
      <div className="ai-panel__actions">
        <button onClick={onApply} className="ai-panel__apply">
          Apply
        </button>
        <button onClick={onReject} className="ai-panel__reject">
          Reject
        </button>
        <button onClick={onRegenerate} className="ai-panel__regenerate">
          Regenerate
        </button>
      </div>
    </div>
  );
}

interface ErrorViewProps {
  result: ProposedPatchResult;
  onRetry: () => void;
  onDismiss: () => void;
}

function ErrorView({ result, onRetry, onDismiss }: ErrorViewProps) {
  return (
    <div className="ai-panel__error-view">
      <h4>Proposal Failed</h4>
      <p className="ai-panel__error-message">{result.message}</p>

      {result.status === 'guardrail_blocked' && (
        <p className="ai-panel__suggestion">
          Try reducing the scope of your request, or break it into smaller steps.
        </p>
      )}

      {result.errors && result.errors.length > 0 && (
        <details className="ai-panel__error-details">
          <summary>
            {result.errors.length} error{result.errors.length !== 1 ? 's' : ''}
          </summary>
          <ul>
            {result.errors.map((e: AIPatchError, i: number) => (
              <li key={i}>
                [{e.errorType}] {e.message}
              </li>
            ))}
          </ul>
        </details>
      )}

      <div className="ai-panel__actions">
        <button onClick={onRetry}>Try Again</button>
        <button onClick={onDismiss}>Dismiss</button>
      </div>
    </div>
  );
}

// ============================================================================
// Patch Summary Display
// ============================================================================

interface PatchSummaryDisplayProps {
  summary: PatchSummary;
}

function PatchSummaryDisplay({ summary }: PatchSummaryDisplayProps) {
  const hasCreated =
    summary.created.maps.length > 0 ||
    summary.created.entities.length > 0 ||
    summary.created.dialogues.length > 0 ||
    summary.created.quests.length > 0 ||
    summary.created.triggers.length > 0;

  const hasModified =
    summary.modified.maps.length > 0 ||
    summary.modified.entities.length > 0 ||
    summary.modified.dialogues.length > 0 ||
    summary.modified.quests.length > 0 ||
    summary.modified.triggers.length > 0;

  const hasDeleted =
    summary.deleted.maps.length > 0 ||
    summary.deleted.entities.length > 0 ||
    summary.deleted.dialogues.length > 0 ||
    summary.deleted.quests.length > 0 ||
    summary.deleted.triggers.length > 0;

  return (
    <div className="ai-panel__summary">
      {hasCreated && (
        <details open>
          <summary>Created</summary>
          <ResourceList resources={summary.created} />
        </details>
      )}

      {hasModified && (
        <details open>
          <summary>Modified</summary>
          <ResourceList resources={summary.modified} />
        </details>
      )}

      {hasDeleted && (
        <details open>
          <summary>Deleted</summary>
          <ResourceList resources={summary.deleted} />
        </details>
      )}

      {summary.tileEdits && summary.tileEdits.length > 0 && (
        <details>
          <summary>
            Tile edits ({summary.tileEdits.reduce((sum: number, e: TileEditSummary) => sum + e.changedCells, 0)} cells)
          </summary>
          <ul>
            {summary.tileEdits.map((e: TileEditSummary, i: number) => (
              <li key={i}>
                {e.mapId}/{e.layerId}: {e.changedCells} cells
              </li>
            ))}
          </ul>
        </details>
      )}

      {summary.collisionEdits && summary.collisionEdits.length > 0 && (
        <details>
          <summary>
            Collision edits ({summary.collisionEdits.reduce((sum: number, e: CollisionEditSummary) => sum + e.changedCells, 0)} cells)
          </summary>
          <ul>
            {summary.collisionEdits.map((e: CollisionEditSummary, i: number) => (
              <li key={i}>
                {e.mapId}: {e.changedCells} cells
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

interface ResourceListProps {
  resources: {
    maps: string[];
    entities: string[];
    dialogues: string[];
    quests: string[];
    triggers: string[];
  };
}

function ResourceList({ resources }: ResourceListProps) {
  return (
    <ul>
      {resources.maps.map((id) => (
        <li key={`map-${id}`}>Map: {id}</li>
      ))}
      {resources.entities.map((id) => (
        <li key={`entity-${id}`}>Entity: {id}</li>
      ))}
      {resources.dialogues.map((id) => (
        <li key={`dialogue-${id}`}>Dialogue: {id}</li>
      ))}
      {resources.quests.map((id) => (
        <li key={`quest-${id}`}>Quest: {id}</li>
      ))}
      {resources.triggers.map((id) => (
        <li key={`trigger-${id}`}>Trigger: {id}</li>
      ))}
    </ul>
  );
}
