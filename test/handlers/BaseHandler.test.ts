import { describe, it, expect } from 'vitest';
import { BaseHandler } from '../../src/handlers/BaseHandler';
import { ValidationError } from '../../src/types';

class TestHandler extends BaseHandler {
  async handle(params: any): Promise<any> {
    this.validateRequired(params, ['model', 'prompt']);
    return { success: true };
  }
}

describe('BaseHandler', () => {
  it('should validate required fields', async () => {
    const handler = new TestHandler();

    await expect(handler.handle({ model: 'test' })).rejects.toThrow(ValidationError);

    await expect(handler.handle({ prompt: 'test' })).rejects.toThrow(ValidationError);
  });

  it('should pass validation with all required fields', async () => {
    const handler = new TestHandler();

    const result = await handler.handle({ model: 'test', prompt: 'test' });
    expect(result).toEqual({ success: true });
  });

  it('should handle errors consistently', async () => {
    class ErrorHandler extends BaseHandler {
      async handle(): Promise<any> {
        try {
          throw new Error('Test error');
        } catch (error) {
          this.handleError(error);
        }
      }
    }

    const handler = new ErrorHandler();
    await expect(handler.handle({})).rejects.toThrow('Test error');
  });
});
