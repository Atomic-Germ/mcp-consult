"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryStore = void 0;
class InMemoryStore {
    constructor() {
        this.store = new Map();
    }
    async load(flowId) {
        const v = this.store.get(flowId);
        return v ? { ...v } : {};
    }
    async save(flowId, data) {
        this.store.set(flowId, { ...data });
    }
}
exports.InMemoryStore = InMemoryStore;
exports.default = InMemoryStore;
