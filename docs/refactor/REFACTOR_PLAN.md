# MCP-Consult Massive Overhaul Plan

## 🔍 Analysis Summary

### Critical Issues Found

**handlers.ts Analysis:**

- ❌ **Cyclomatic Complexity: 126** (callToolHandler) - Max recommended: 10
- ❌ **Cognitive Complexity: 140** - Makes code hard to understand
- ❌ **Nesting Depth: 5 levels** - Should be max 3
- ⚠️ **Nested Loops: O(n²) complexity** at line 594
- ⚠️ **String Concatenation in Loops** - Memory inefficient
- ❌ **tryCallMemoryServer: Complexity 30** - Needs breakdown

### Current State

✅ 16 tests passing (Vitest)  
✅ 5 MCP tools working  
✅ Good documentation  
✅ GitHub Actions CI  
⚠️ No linting configured  
⚠️ No formatting standards  
⚠️ No coverage tracking  
⚠️ Monolithic architecture

## 🎯 Refactoring Goals

1. **Reduce Complexity**: Break down 126-complexity function to <10 per function
2. **Improve Performance**: Eliminate O(n²) operations
3. **Add Quality Tools**: ESLint, Prettier, coverage thresholds
4. **Modularize**: Separate concerns into focused modules
5. **Enhance Testing**: Achieve 80%+ coverage
6. **Document**: Add comprehensive guides like mcp-optimist

## 📋 Phase 1: Foundation & Tooling (Day 1)

### 1.1 Add Development Tools

- [ ] Install ESLint + TypeScript rules
- [ ] Install Prettier for code formatting
- [ ] Configure Jest or maintain Vitest with coverage
- [ ] Add coverage thresholds (60%+ branches, 80%+ lines)
- [ ] Create `.prettierrc` and `.eslintrc.json`

### 1.2 Set Up TDD Infrastructure

- [ ] Ensure all existing tests pass
- [ ] Add test coverage reporting
- [ ] Document test structure
- [ ] Create test utilities/helpers

### 1.3 Documentation Improvements

- [ ] Create CONTRIBUTING.md
- [ ] Add ARCHITECTURE.md
- [ ] Create detailed API documentation
- [ ] Add examples for each tool

### Deliverables

- ✅ All tools configured
- ✅ Tests passing with coverage
- ✅ Documentation structure

## 📋 Phase 2: Handler Refactoring (Days 2-3)

### 2.1 Break Down callToolHandler (Complexity: 126 → <10)

**Current Structure:**

```typescript
async function callToolHandler(name: string, args: any) {
  // 500+ lines of switch/case logic
  // All 5 tools in one function
  // Deep nesting and complexity
}
```

**Target Architecture:**

```typescript
// Handler Registry Pattern
interface ToolHandler {
  validate(args: any): boolean;
  execute(args: any): Promise<any>;
}

class ConsultHandler implements ToolHandler {}
class ListModelsHandler implements ToolHandler {}
class CompareHandler implements ToolHandler {}
class RememberHandler implements ToolHandler {}
class SequentialChainHandler implements ToolHandler {}

// Main router (complexity: ~5)
async function callToolHandler(name: string, args: any) {
  const handler = handlerRegistry.get(name);
  if (!handler) throw new Error(`Unknown tool: ${name}`);

  if (!handler.validate(args)) {
    throw new Error('Invalid arguments');
  }

  return handler.execute(args);
}
```

### 2.2 Extract Individual Handlers

Each handler should be in its own file with:

- Input validation
- Business logic
- Error handling
- ~50-100 lines max
- Complexity < 10

**File Structure:**

```
src/
  handlers/
    base/
      ToolHandler.ts         (interface)
      BaseHandler.ts         (shared logic)
    ConsultHandler.ts
    ListModelsHandler.ts
    CompareModelsHandler.ts
    RememberHandler.ts
    SequentialChainHandler.ts
  registry/
    HandlerRegistry.ts
```

### 2.3 Refactor tryCallMemoryServer (Complexity: 30 → <10)

Break into:

1. `ConfigLoader.ts` - Load memory config
2. `MemoryClientFactory.ts` - Create client
3. `MemoryStorageAdapter.ts` - Abstract storage
4. `LocalFileStorage.ts` - File fallback
5. `McpMemoryClient.ts` - MCP memory client

### Deliverables

- ✅ All handlers < 10 complexity
- ✅ Tests updated and passing
- ✅ No functionality lost
- ✅ Improved maintainability

## 📋 Phase 3: Performance Optimizations (Day 4)

### 3.1 Fix Nested Loop (Line 594)

**Issue:** O(n²) complexity in conversation context building

**Before:**

```typescript
while (condition) {
  for (const item of items) {
    // O(n²) operation
  }
}
```

**After:**

```typescript
// Use Map for O(1) lookups
const itemMap = new Map(items.map((i) => [i.id, i]));
while (condition) {
  const item = itemMap.get(id); // O(1)
}
```

### 3.2 Fix String Concatenation (Lines 618, 649)

**Issue:** String concatenation in loops creates new strings each iteration

**Before:**

```typescript
let context = '';
for (const msg of messages) {
  context += msg.content; // Creates new string each time
}
```

**After:**

```typescript
const parts: string[] = [];
for (const msg of messages) {
  parts.push(msg.content);
}
const context = parts.join(''); // Single allocation
```

### 3.3 Add Performance Testing

- [ ] Add benchmarks for critical paths
- [ ] Test with large datasets (1000+ messages)
- [ ] Profile memory usage
- [ ] Document performance characteristics

### Deliverables

- ✅ All O(n²) operations eliminated
- ✅ String operations optimized
- ✅ Performance tests added
- ✅ Benchmarks documented

## 📋 Phase 4: Testing & Coverage (Day 5)

### 4.1 Increase Test Coverage

- [ ] Add tests for each new handler class
- [ ] Test error paths and edge cases
- [ ] Test performance optimizations
- [ ] Add integration tests

**Target Coverage:**

- Statements: 85%+
- Branches: 70%+
- Functions: 90%+
- Lines: 85%+

### 4.2 Add Test Utilities

- [ ] Mock factory for Ollama responses
- [ ] Test fixtures for common scenarios
- [ ] Helper functions for assertions
- [ ] Performance testing utilities

### Deliverables

- ✅ Coverage thresholds met
- ✅ All edge cases tested
- ✅ Test utilities documented

## 📋 Phase 5: CI/CD Enhancement (Day 6)

### 5.1 Improve GitHub Actions Workflow

- [ ] Add lint job (runs first)
- [ ] Add test job with coverage
- [ ] Add build job
- [ ] Add release automation (tags)
- [ ] Cache dependencies for speed

### 5.2 Release Automation

- [ ] Auto-generate release notes
- [ ] Publish to npm on tags
- [ ] Create GitHub releases
- [ ] Attach build artifacts

### 5.3 Add Quality Gates

- [ ] Require tests to pass
- [ ] Enforce coverage thresholds
- [ ] Require lint to pass
- [ ] Block PRs that fail checks

### Deliverables

- ✅ Full CI/CD pipeline
- ✅ Automated releases
- ✅ Quality gates enforced

## 📋 Phase 6: Documentation & Polish (Day 7)

### 6.1 Comprehensive Documentation

- [ ] ARCHITECTURE.md - System design
- [ ] CONTRIBUTING.md - How to contribute
- [ ] API_REFERENCE.md - All tools documented
- [ ] EXAMPLES.md - Code examples
- [ ] PERFORMANCE.md - Benchmarks and tips
- [ ] RELEASE.md - Release process

### 6.2 Code Documentation

- [ ] Add JSDoc comments to all public APIs
- [ ] Document complex algorithms
- [ ] Add inline comments for tricky code
- [ ] Generate API docs (TypeDoc)

### 6.3 Polish

- [ ] Clean up all TODOs
- [ ] Remove unused code
- [ ] Consistent naming conventions
- [ ] Update package.json metadata

### Deliverables

- ✅ Professional documentation
- ✅ API docs generated
- ✅ Polished codebase

## 🎯 Success Metrics

### Before Refactoring

- Complexity: 126 (critical)
- Nesting: 5 levels
- Performance: O(n²) operations
- Coverage: Unknown
- Lint: None
- Format: Inconsistent

### After Refactoring

- Complexity: <10 per function ✅
- Nesting: ≤3 levels ✅
- Performance: O(n) or better ✅
- Coverage: 80%+ ✅
- Lint: 0 errors ✅
- Format: Consistent (Prettier) ✅

## 🚀 Implementation Strategy

### TDD Approach

1. **RED**: Write failing test for new handler
2. **GREEN**: Implement minimal code to pass
3. **REFACTOR**: Improve code quality
4. **REPEAT**: For each handler

### Migration Path

1. Keep old `callToolHandler` working
2. Build new handlers alongside
3. Add feature flags to test new code
4. Migrate one tool at a time
5. Remove old code when all tests pass
6. Deploy incrementally

### Risk Mitigation

- ✅ Never break existing tests
- ✅ Keep all functionality working
- ✅ Deploy to staging first
- ✅ Monitor for errors
- ✅ Have rollback plan

## 📊 Timeline

| Phase | Duration | Focus                |
| ----- | -------- | -------------------- |
| 1     | 1 day    | Foundation & Tooling |
| 2     | 2 days   | Handler Refactoring  |
| 3     | 1 day    | Performance          |
| 4     | 1 day    | Testing              |
| 5     | 1 day    | CI/CD                |
| 6     | 1 day    | Documentation        |

**Total: 7 days** (1 week sprint)

## 🎉 Expected Outcomes

1. **Maintainability**: Code is easy to understand and modify
2. **Performance**: 10-100x faster for large inputs
3. **Quality**: High test coverage, no lint errors
4. **Reliability**: Comprehensive error handling
5. **Documentation**: Professional-grade docs
6. **Automation**: Full CI/CD pipeline
7. **Scalability**: Easy to add new tools

## 📝 Notes

- This plan follows the successful patterns used in mcp-optimist
- Each phase is independent and can be reviewed
- Tests must pass after each phase
- Documentation is updated continuously
- Performance is measured and tracked

---

**Status**: Ready to begin Phase 1
**Last Updated**: 2024-11-17
**Estimated Completion**: 7 days
