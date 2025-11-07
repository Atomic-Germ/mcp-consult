---
applyTo: '**'
description: Workspace-specific AI memory for this project
lastOptimized: '2025-11-07T22:29:57.593584+00:00'
entryCount: 1
optimizationVersion: 1
autoOptimize: true
sizeThreshold: 50000
entryThreshold: 20
timeThreshold: 7
---
# Workspace AI Memory
This file contains workspace-specific information for AI conversations.

## Personal Context (name, location, role, etc.)
- None recorded.

## Professional Context (team, goals, projects, etc.)
- None recorded.

## Technical Preferences (coding styles, tools, workflows)
- None recorded.

## Communication Preferences (style, feedback preferences)
- None recorded.

## Universal Laws (strict rules that must always be followed)
- None recorded.

## Policies (guidelines and standards)
- None recorded.

## Suggestions/Hints (recommendations and tips)
- None recorded.

## Memories/Facts (chronological events and information)
- **2025-11-07 14:29:** Decision Flow Orchestration — next-step plan (2025-11-07):
  - Prioritized immediate tasks:
    1. Implement FlowExecutor skeleton + TypeScript types (Flow, Step, ExecutionContext, StepResult).
    2. Add in-memory MemoryStore and MemoryStore interface.
    3. Implement invoke wrappers (invokeOllama) and a small template renderer.
    4. Implement condition evaluator and safe DSL.
    5. Implement orchestration runner with retries/backoff and memory writes.
    6. Add unit tests: evalCondition, FlowExecutor.run (single-step, conditional skip, retries).
  - Acceptance criteria: project compiles; FlowExecutor unit test runs and asserts step success and memory persisted.
  - Estimated immediate effort: 4–8 hours; full suite ~30 hours.