/**
 * useEditorStore — React hook wrapping useReducer + Context
 *
 * Provides EditorState + dispatch to all children.
 */

import React, { createContext, useContext, useReducer, type Dispatch } from 'react';
import type { EditorState, EditorAction } from '../state/types.js';
import { editorReducer, initialEditorState } from '../state/editorStore.js';
import type { Project } from '@ai-rpg-maker/shared';

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface EditorContextValue {
  state: EditorState;
  dispatch: Dispatch<EditorAction>;
}

const EditorContext = createContext<EditorContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export interface EditorProviderProps {
  initialProject: Project;
  children: React.ReactNode;
}

export function EditorProvider({ initialProject, children }: EditorProviderProps) {
  const [state, dispatch] = useReducer(
    editorReducer,
    initialProject,
    initialEditorState,
  );

  const value = React.useMemo(() => ({ state, dispatch }), [state]);

  return React.createElement(
    EditorContext.Provider,
    { value },
    children,
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Access the editor state and dispatch from any child component.
 * Must be called within an <EditorProvider>.
 */
export function useEditorStore(): EditorContextValue {
  const ctx = useContext(EditorContext);
  if (!ctx) {
    throw new Error('useEditorStore must be used within an <EditorProvider>');
  }
  return ctx;
}
