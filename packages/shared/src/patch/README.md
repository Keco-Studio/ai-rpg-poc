# Patch Engine Module

Core patch engine for validated, atomic project modifications with undo support.

## Module Structure

```
patch/
├── types.ts      # PatchV1, PatchOp unions, PatchSummary, ApplyResult
├── errors.ts     # PatchError, error codes, helper functions
├── validate.ts   # validatePatch(), validatePatchStructure()
├── apply.ts      # applyPatch() - pure function returning new Project
├── summary.ts    # summarizePatch() - before/after comparison
└── index.ts      # Public API exports
```

## Architecture

**Pure Functional Pipeline**: Parse → Validate → Apply

- **No side effects**: All functions are pure, no global state or IO
- **Immutable operations**: Input project is never mutated; new objects returned via structural sharing
- **Deterministic**: Same input always produces same output
- **Two-phase validation**: Structural (shape checks) then Semantic (references, bounds)

## Key APIs

```typescript
validatePatch(project: Project, patch: PatchV1): PatchValidationResult
applyPatch(project: Project, patch: PatchV1): ApplyResult
summarizePatch(before: Project, after: Project): PatchSummary
```

## See Also

- [Spec Documentation](../../../specs/002-ai-patch-engine/)
- [PATCH_FORMAT.md](../../../specs/002-ai-patch-engine/PATCH_FORMAT.md)
- [PATCHING_GUIDE.md](../../../specs/002-ai-patch-engine/PATCHING_GUIDE.md)
