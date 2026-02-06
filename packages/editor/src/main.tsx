import React from 'react';
import { createRoot } from 'react-dom/client';
import { EditorShell } from './components/EditorShell.js';
import { createDemoProject } from './demoProject.js';
import { MockProvider } from '@ai-rpg-maker/shared';
import type { AIRawResponse } from '@ai-rpg-maker/shared';

const demoProject = createDemoProject();

// Default mock provider for development
const mockResponse: AIRawResponse = {
  success: true,
  rawText: '{}',
  parsedPatch: {
    patchVersion: 1,
    patchId: 'mock-patch-1',
    baseSchemaVersion: 1,
    ops: [],
  },
};

const mockProvider = new MockProvider({ responses: [mockResponse] });

const root = createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <EditorShell initialProject={demoProject} aiProvider={mockProvider} />
  </React.StrictMode>,
);
