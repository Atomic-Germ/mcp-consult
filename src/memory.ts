import { MemoryData } from './types';

export interface MemoryStore {
  load(flowId: string): Promise<MemoryData>;
  save(flowId: string, data: MemoryData): Promise<void>;
}

export class InMemoryStore implements MemoryStore {
  private store = new Map<string, MemoryData>();

  async load(flowId: string): Promise<MemoryData> {
    const v = this.store.get(flowId);
    return v ? { ...v } : {};
  }

  async save(flowId: string, data: MemoryData): Promise<void> {
    this.store.set(flowId, { ...data });
  }
}

export default InMemoryStore;
