# Contributing to MCP-Consult

Thank you for your interest in contributing to MCP-Consult! This document provides guidelines and instructions for contributing.

## 🎯 Project Goals

MCP-Consult aims to provide a high-quality MCP server for consulting with Ollama models, featuring:
- Clean, maintainable code (complexity < 10 per function)
- Comprehensive test coverage (70%+ target)
- Professional documentation
- Reliable CI/CD pipeline
- Performance-optimized implementations

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- pnpm (recommended) or npm
- Ollama running locally (for testing)
- Git

### Setup Development Environment

```bash
# Clone the repository
git clone https://github.com/yourusername/mcp-consult.git
cd mcp-consult

# Install dependencies
pnpm install

# Build the project
pnpm build

# Run tests
pnpm test

# Run with coverage
pnpm test:coverage

# Start in development mode
pnpm dev
```

## 📋 Development Workflow

### 1. Create a Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

### 2. Make Your Changes

Follow our coding standards:
- **Complexity**: Keep functions under 10 cyclomatic complexity
- **Formatting**: Use Prettier (`pnpm format`)
- **Linting**: Follow ESLint rules (`pnpm lint`)
- **Testing**: Write tests for new features

### 3. Test Your Changes

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Check coverage
pnpm test:coverage

# Lint your code
pnpm lint

# Format your code
pnpm format
```

### 4. Commit Your Changes

We follow conventional commits:

```bash
git commit -m "feat: add new consultation feature"
git commit -m "fix: resolve timeout issue"
git commit -m "refactor: simplify handler logic"
git commit -m "docs: update API documentation"
git commit -m "test: add handler tests"
```

**Commit Types:**
- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code refactoring
- `docs`: Documentation changes
- `test`: Adding or updating tests
- `chore`: Maintenance tasks
- `perf`: Performance improvements
- `style`: Code style changes

### 5. Push and Create PR

```bash
git push origin feature/your-feature-name
```

Then create a Pull Request on GitHub with:
- Clear description of changes
- Link to related issues
- Screenshots (if applicable)
- Test results

## 🧪 Testing Guidelines

### Writing Tests

Place tests in the `test/` directory:

```typescript
// test/yourFeature.test.ts
import { describe, it, expect } from 'vitest';
import { yourFunction } from '../src/yourModule';

describe('yourFunction', () => {
  it('should do something', () => {
    const result = yourFunction('input');
    expect(result).toBe('expected');
  });

  it('should handle errors', () => {
    expect(() => yourFunction(null)).toThrow();
  });
});
```

### Test Coverage Requirements

Minimum coverage thresholds:
- **Branches**: 30% (current), 60% (target)
- **Functions**: 45% (current), 70% (target)
- **Lines**: 40% (current), 70% (target)
- **Statements**: 40% (current), 70% (target)

### Running Tests

```bash
# All tests
pnpm test

# Watch mode
pnpm test:watch

# With coverage
pnpm test:coverage

# Specific test file
pnpm test handlers.test.ts
```

## 🎨 Code Style

### Formatting

We use Prettier for consistent formatting:

```bash
# Format all files
pnpm format

# Check formatting
pnpm format:check
```

### Linting

We use ESLint for code quality:

```bash
# Lint all files
pnpm lint

# Fix auto-fixable issues
pnpm lint:fix
```

### TypeScript

- Use TypeScript for all new code
- Avoid `any` types when possible
- Document complex types with comments
- Use interfaces for public APIs

### Complexity

- Keep cyclomatic complexity < 10
- Maximum nesting depth: 3 levels
- Extract complex logic into separate functions
- Use early returns to reduce nesting

**Example:**

```typescript
// ❌ Bad: High complexity, deep nesting
function processData(data: any) {
  if (data) {
    if (data.items) {
      for (const item of data.items) {
        if (item.valid) {
          // ... lots of code
        }
      }
    }
  }
}

// ✅ Good: Low complexity, early returns
function processData(data: Data): Result {
  if (!data?.items) return emptyResult();
  
  const validItems = data.items.filter(item => item.valid);
  return processValidItems(validItems);
}

function processValidItems(items: Item[]): Result {
  // Focused logic
}
```

## 🏗️ Architecture

### Project Structure

```
mcp-consult/
├── src/
│   ├── handlers/          # Tool handlers (Phase 2 refactor)
│   │   ├── base/         # Base classes and interfaces
│   │   ├── ConsultHandler.ts
│   │   ├── ListModelsHandler.ts
│   │   └── ...
│   ├── config.ts         # Configuration
│   ├── handlers.ts       # Current monolithic handlers (to refactor)
│   ├── index.ts          # Main entry point
│   ├── invoke.ts         # Ollama invocation
│   └── types.ts          # Type definitions
├── test/                 # Test files
├── .github/
│   └── workflows/        # CI/CD pipelines
└── docs/                 # Documentation
```

### Adding New Handlers

When adding a new tool handler:

1. **Create interface** (if using new pattern):
```typescript
// src/handlers/base/ToolHandler.ts
export interface ToolHandler {
  validate(args: any): boolean;
  execute(args: any): Promise<any>;
}
```

2. **Implement handler**:
```typescript
// src/handlers/YourHandler.ts
export class YourHandler implements ToolHandler {
  validate(args: any): boolean {
    // Validation logic
    return true;
  }

  async execute(args: any): Promise<any> {
    // Implementation
  }
}
```

3. **Add tests**:
```typescript
// test/yourHandler.test.ts
describe('YourHandler', () => {
  it('should validate correctly', () => {
    const handler = new YourHandler();
    expect(handler.validate(validArgs)).toBe(true);
  });
});
```

4. **Register handler**:
```typescript
// src/registry/HandlerRegistry.ts
registry.set('your_tool', new YourHandler());
```

## 📊 Performance Guidelines

### Avoid Common Pitfalls

**1. Nested Loops (O(n²))**
```typescript
// ❌ Bad: O(n²)
for (const item of items) {
  for (const other of items) {
    if (item.id === other.ref) { /* ... */ }
  }
}

// ✅ Good: O(n)
const itemMap = new Map(items.map(i => [i.id, i]));
for (const item of items) {
  const referenced = itemMap.get(item.ref);
}
```

**2. String Concatenation in Loops**
```typescript
// ❌ Bad: Creates new string each iteration
let result = '';
for (const item of items) {
  result += item.text;
}

// ✅ Good: Single allocation
const parts = items.map(i => i.text);
const result = parts.join('');
```

**3. Inefficient Array Operations**
```typescript
// ❌ Bad: Multiple passes
const filtered = items.filter(i => i.active);
const mapped = filtered.map(i => i.value);
const result = mapped.join(',');

// ✅ Good: Single pass
const result = items
  .filter(i => i.active)
  .map(i => i.value)
  .join(',');
```

## 🐛 Debugging

### Local Development

```bash
# Run with debugging
NODE_OPTIONS='--inspect' pnpm dev

# Or use VS Code debugger with launch.json
```

### Testing Specific Tools

```bash
# Run demo client
pnpm demo

# Test specific tool
node dist/demo-client.js consult "your question"
```

## 📖 Documentation

### Code Documentation

Use JSDoc for public APIs:

```typescript
/**
 * Consults an Ollama model with a prompt.
 * 
 * @param model - The Ollama model to use
 * @param prompt - The prompt to send
 * @param systemPrompt - Optional system prompt
 * @returns The model's response
 * @throws {Error} If the request fails
 * 
 * @example
 * ```typescript
 * const response = await consultOllama('llama2', 'Hello!');
 * console.log(response);
 * ```
 */
export async function consultOllama(
  model: string,
  prompt: string,
  systemPrompt?: string
): Promise<string> {
  // Implementation
}
```

### README Updates

When adding features:
1. Update feature list
2. Add usage examples
3. Update configuration docs
4. Add to API reference

## 🚢 Release Process

Releases are automated via GitHub Actions:

1. Update version in `package.json`
2. Commit changes
3. Create and push tag:

```bash
git tag -a v1.1.0 -m "Release v1.1.0: Feature description"
git push origin v1.1.0
```

The CI/CD pipeline will:
- Run lint, tests, and build
- Create GitHub release
- Publish to npm (if configured)

## 🔍 Code Review

### What We Look For

- ✅ Code follows style guidelines
- ✅ Tests pass and coverage increases
- ✅ Complexity remains low (<10)
- ✅ Documentation is updated
- ✅ No breaking changes (or documented)
- ✅ Performance is maintained or improved

### Getting Your PR Merged

1. **All CI checks must pass**
2. **Code review approval** required
3. **Conflicts resolved** with main branch
4. **Documentation updated** if needed

## 🤝 Community

### Getting Help

- Open an issue for bugs or feature requests
- Discuss in pull requests
- Check existing issues and PRs first

### Code of Conduct

Be respectful, constructive, and professional. We're all here to build something great together.

## 📝 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for contributing to MCP-Consult!** 🎉

For questions, open an issue or reach out to the maintainers.
