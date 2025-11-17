import { ValidationError } from '../types';

/**
 * Base class for all tool handlers.
 * Provides common functionality for validation and error handling.
 */
export abstract class BaseHandler {
  /**
   * Handle the tool invocation with given parameters.
   * Subclasses must implement this method.
   */
  abstract handle(params: unknown): Promise<unknown>;

  /**
   * Validate that required fields are present in the object.
   * @throws ValidationError if any required field is missing or empty
   */
  protected validateRequired(obj: any, fields: string[]): void {
    if (!obj || typeof obj !== 'object') {
      throw new ValidationError('Invalid parameters object', 'params');
    }

    for (const field of fields) {
      const value = obj[field];
      if (value === undefined || value === null || value === '') {
        throw new ValidationError(
          `Required field '${field}' is missing or empty`,
          field
        );
      }
    }
  }

  /**
   * Handle errors consistently across all handlers.
   * Rethrows known error types, wraps unknown errors.
   */
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
