"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseHandler = void 0;
const index_js_1 = require("../types/index.js");
class BaseHandler {
    validateRequired(obj, fields) {
        if (!obj || typeof obj !== 'object') {
            throw new index_js_1.ValidationError('Invalid parameters object', 'params');
        }
        const objRecord = obj;
        for (const field of fields) {
            const value = objRecord[field];
            if (value === undefined || value === null || value === '') {
                throw new index_js_1.ValidationError(`Required field '${field}' is missing or empty`, field);
            }
        }
    }
    handleError(error) {
        if (error instanceof index_js_1.ValidationError) {
            throw error;
        }
        if (error instanceof Error) {
            throw error;
        }
        throw new Error(String(error));
    }
}
exports.BaseHandler = BaseHandler;
