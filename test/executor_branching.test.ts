import { describe, it, expect, beforeEach, vi } from 'vitest';
import axios from 'axios';
import { FlowExecutor } from '../src/executor';
import { InMemoryStore } from '../src/memory';

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('FlowExecutor branching', () => {
  it('follows onSuccess to skip intermediate steps', async () => {
    // axios returns response that echoes prompt
    (axios as any).post = vi.fn().mockImplementation((url: string, body: any) => {
      return Promise.resolve({ data: { response: `resp:${body.prompt}` } });
    });

    const mem = new InMemoryStore();
    const executor = new FlowExecutor(mem);

    const flow = {
      id: 'flow-branch-1',
      steps: [
        { id: 's1', model: 'm1', prompt: 'p1', memoryWrite: 'a', onSuccess: ['s3'] },
        { id: 's2', model: 'm1', prompt: 'p2', memoryWrite: 'b' },
        { id: 's3', model: 'm1', prompt: 'p3', memoryWrite: 'c' },
      ],
    };

    const ctx = await executor.run(flow as any);
    expect(ctx.stepResults['s1'].success).toBe(true);
    expect(ctx.stepResults['s2']).toBeUndefined();
    expect(ctx.stepResults['s3'].success).toBe(true);
    expect(ctx.memory['c']).toBe('resp:p3');
  });

  it('follows onFailure to run fallback step', async () => {
    (axios as any).post = vi.fn().mockImplementation((url: string, body: any) => {
      if (body.prompt === 'fail') return Promise.reject(new Error('boom'));
      return Promise.resolve({ data: { response: `resp:${body.prompt}` } });
    });

    const mem = new InMemoryStore();
    const executor = new FlowExecutor(mem);

    const flow = {
      id: 'flow-branch-2',
      steps: [
        { id: 's1', model: 'm1', prompt: 'fail', onFailure: ['s2'] },
        { id: 's2', model: 'm1', prompt: 'p2', memoryWrite: 'b' },
      ],
    };

    const ctx = await executor.run(flow as any);
    expect(ctx.stepResults['s1'].success).toBe(false);
    expect(ctx.stepResults['s2'].success).toBe(true);
    expect(ctx.memory['b']).toBe('resp:p2');
  });

  it('prevents infinite loops in branching', async () => {
    (axios as any).post = vi.fn().mockImplementation((url: string, body: any) => {
      return Promise.resolve({ data: { response: `resp:${body.prompt}` } });
    });

    const mem = new InMemoryStore();
    const executor = new FlowExecutor(mem);

    const flow = {
      id: 'flow-loop',
      steps: [
        { id: 's1', model: 'm1', prompt: 'p1', onSuccess: ['s2'] },
        { id: 's2', model: 'm1', prompt: 'p2', onSuccess: ['s1'] }, // cycle
      ],
    };

    await expect(executor.run(flow as any)).rejects.toThrow(
      'Flow execution exceeded maximum iterations'
    );
  });
});
