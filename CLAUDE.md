# ai-rpg Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-02-05

## Active Technologies
- TypeScript (ES2020+), Node 18+ + Existing `packages/shared/src/schema` validator (Spec 001) (002-ai-patch-engine)
- N/A (pure in-memory operations, no IO) (002-ai-patch-engine)
- TypeScript 5.3+ (ES2022 target), Node.js 20+ + React 19, ExcaliburJS 0.29+, `@ai-rpg-maker/shared` (Zod 3.22+, patch engine, AI orchestrator) (004-editor-ux)
- In-memory Project state (no persistence layer in v1) (004-editor-ux)

- TypeScript 5.3+ (ES2022 target), Node.js 20+ for build tools + ExcaliburJS 0.29+, Zod 3.22+ (schema validation), Vite 5+ (build/dev server) (001-schema-runtime-v1)

## Project Structure

```text
src/
tests/
```

## Commands

npm test && npm run lint

## Code Style

TypeScript 5.3+ (ES2022 target), Node.js 20+ for build tools: Follow standard conventions

## Recent Changes
- 004-editor-ux: Added TypeScript 5.3+ (ES2022 target), Node.js 20+ + React 19, ExcaliburJS 0.29+, `@ai-rpg-maker/shared` (Zod 3.22+, patch engine, AI orchestrator)
- 003-ai-orchestration: Added [if applicable, e.g., PostgreSQL, CoreData, files or N/A]
- 002-ai-patch-engine: Added TypeScript (ES2020+), Node 18+ + Existing `packages/shared/src/schema` validator (Spec 001)


<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
