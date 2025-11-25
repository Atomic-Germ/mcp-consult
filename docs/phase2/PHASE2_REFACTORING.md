# Phase 2: Core Handlers Refactoring

## Critical Issues Found

### handlers.ts Analysis

- **callToolHandler**: Cyclomatic Complexity: 126 (CRITICAL - should be <10)
- **tryCallMemoryServer**: Cyclomatic Complexity: 30 (CRITICAL - should be <10)
- Total: 820 lines, needs major decomposition

## Refactoring Strategy

### 1. Extract Handler Functions

Break down `callToolHandler` (complexity 126) into focused handlers:

- `ConsultOllamaHandler` - handle `consult_ollama` tool
- `ListModelsHandler` - handle `list_ollama_models` tool
- `CompareModelsHandler` - handle `compare_ollama_models` tool
- `RememberConsultHandler` - handle `remember_consult` tool
- `SequentialChainHandler` - handle `sequential_consultation_chain` tool

### 2. Extract Memory Service

Move memory operations from inline code into:

- `MemoryService` class with proper error handling
- Methods: `store()`, `retrieve()`, `isAvailable()`
- Proper timeout and retry logic

### 3. Extract Validation Logic

Create validator functions:

- `validateConsultantParams()` - validate consultant parameters
- `validateChainParams()` - validate chain parameters
- `validateTimeout()` - validate timeout values
- Return structured errors

### 4. Extract Business Logic

- `ModelAvailabilityChecker` - check if models are available
- `TimeoutCalculator` - calculate dynamic timeouts
- `ResponseFormatter` - format responses consistently

### 5. Update Tests

- Add unit tests for each new handler class
- Add integration tests for the refactored flow
- Maintain >80% coverage

## Implementation Plan

### Step 1: Create Handler Base Class (TDD)

```typescript
// src/handlers/BaseHandler.ts
export abstract class BaseHandler {
  abstract handle(params: unknown): Promise<unknown>;
  protected validateRequired(obj: any, fields: string[]): void;
  protected handleError(error: unknown): never;
}
```

### Step 2: Create Individual Handlers (TDD)

Each handler in its own file with tests:

- `src/handlers/ConsultOllamaHandler.ts` + tests
- `src/handlers/ListModelsHandler.ts` + tests
- `src/handlers/CompareModelsHandler.ts` + tests
- `src/handlers/RememberConsultHandler.ts` + tests
- `src/handlers/SequentialChainHandler.ts` + tests

### Step 3: Create Memory Service (TDD)

```typescript
// src/services/MemoryService.ts
export class MemoryService {
  async store(key: string, data: unknown): Promise<void>;
  async retrieve(key: string): Promise<unknown>;
  async isAvailable(): Promise<boolean>;
}
```

### Step 4: Create Handler Registry

```typescript
// src/handlers/HandlerRegistry.ts
export class HandlerRegistry {
  private handlers = new Map<string, BaseHandler>();

  register(toolName: string, handler: BaseHandler): void;
  async handle(toolName: string, params: unknown): Promise<unknown>;
}
```

### Step 5: Refactor Main handlers.ts

- Replace 820-line monolith with clean registry pattern
- Reduce to ~100 lines
- All logic delegated to specialized handlers

## Success Criteria

- ✅ All handlers have complexity < 10
- ✅ All functions have cognitive complexity < 15
- ✅ Test coverage remains > 80%
- ✅ All existing tests pass
- ✅ No breaking changes to API

## Estimated Impact

- **Complexity Reduction**: 126 → ~8 per handler
- **Maintainability**: Significantly improved
- **Testability**: Each handler independently testable
- **Lines**: 820 → ~100 (main) + ~600 (distributed handlers)
