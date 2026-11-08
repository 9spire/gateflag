import { AlreadyExistsError, NotFoundError, VersionConflictError } from '../repository/errors.js';
import { BusinessRuleError, ValidationAppError } from '../services/errors.js';
import type { CoreResponse } from './types.js';

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'ALREADY_EXISTS'
  | 'VERSION_CONFLICT'
  | 'BUSINESS_RULE'
  | 'RATE_LIMITED'
  | 'INTERNAL';

export function errorBody(
  code: ErrorCode,
  message: string,
  details: unknown[] = [],
): { error: { code: ErrorCode; message: string; details: unknown[] } } {
  return { error: { code, message, details } };
}

export function mapError(error: unknown): CoreResponse {
  if (error instanceof ValidationAppError) {
    return {
      status: 400,
      body: errorBody('VALIDATION_ERROR', error.message, error.details),
    };
  }
  if (error instanceof NotFoundError) {
    return {
      status: 404,
      body: errorBody('NOT_FOUND', error.message),
    };
  }
  if (error instanceof AlreadyExistsError) {
    return {
      status: 409,
      body: errorBody('ALREADY_EXISTS', error.message),
    };
  }
  if (error instanceof VersionConflictError) {
    return {
      status: 409,
      body: errorBody('VERSION_CONFLICT', error.message),
    };
  }
  if (error instanceof BusinessRuleError) {
    return {
      status: 422,
      body: errorBody('BUSINESS_RULE', error.message),
    };
  }
  return {
    status: 500,
    body: errorBody('INTERNAL', 'Internal server error'),
  };
}

export function unauthenticated(): CoreResponse {
  return {
    status: 401,
    body: errorBody('UNAUTHENTICATED', 'Missing or unknown demo user'),
  };
}

export function forbidden(): CoreResponse {
  return {
    status: 403,
    body: errorBody('FORBIDDEN', 'Admin privileges required'),
  };
}
