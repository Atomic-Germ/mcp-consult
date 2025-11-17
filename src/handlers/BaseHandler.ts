import { ValidationError } from '../types/index.js';

export abstract class BaseHandler {
  abstract handle(params: unknown): Promise<unknown>;

  protected validateRequired(obj: unknown, fields: string[]): void {
    if (!obj || typeof obj !== 'object') {
      throw new ValidationError('Invalid parameters object', 'params');
    }

    const objRecord = obj as Record<string, unknown>;
    for (const field of fields) {
      const value = objRecord[field];
      if (value === undefined || value === null || value === '') {
        throw new ValidationError(`Required field '${field}' is missing or empty`, field);
      }
    }
  }

  protected handleError(error: unknown): never {
    if (error instanceof ValidationError) {
      throw error;
    }

    if (error instanceof Error) {
      throw error;
    }

    throw new Error(String(error));
  }
}
