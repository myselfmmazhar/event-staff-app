/**
 * Error Handler Utilities
 * Centralized error handling and mapping
 */

import { TRPCError } from '@trpc/server';
import { ZodError } from 'zod';
import { getErrorMessage, extractFieldFromPath } from './error-messages';

/**
 * Field-level error format
 */
export interface FieldError {
  field: string;
  message: string;
}

/**
 * Structured error response
 */
export interface ErrorResponse {
  code: string;
  message: string;
  fieldErrors?: FieldError[];
}

/**
 * Extract field-level errors from Zod validation errors
 */
export function extractZodFieldErrors(error: ZodError): FieldError[] {
  return error.issues.map((err) => ({
    field: extractFieldFromPath(err.path as (string | number)[]),
    message: err.message,
  }));
}

/**
 * Map Prisma errors to user-friendly messages
 */
export function mapPrismaError(error: unknown): TRPCError {
  const prismaError = error as { code?: string; meta?: { target?: string[] } };
  // Prisma unique constraint violation
  if (prismaError.code === 'P2002') {
    const field = prismaError.meta?.target?.[0] || 'field';
    return new TRPCError({
      code: 'CONFLICT',
      message: field === 'email' 
        ? 'A user with this email address already exists'
        : `This ${field} is already in use`,
    });
  }

  // Prisma foreign key constraint violation
  if (prismaError.code === 'P2003') {
    return new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Invalid reference to related record',
    });
  }

  // Prisma record not found
  if (prismaError.code === 'P2025') {
    return new TRPCError({
      code: 'NOT_FOUND',
      message: 'Record not found',
    });
  }

  // Default Prisma error
  if (prismaError.code && prismaError.code.startsWith('P')) {
    return new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Database error occurred',
    });
  }

  // Generic error
  return new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message: 'An unexpected error occurred',
  });
}

/**
 * Format tRPC error for client consumption
 */
export function formatTRPCError(error: unknown): ErrorResponse {
  // Handle TRPCError
  if (error instanceof TRPCError) {
    return {
      code: error.code,
      message: error.message || getErrorMessage(error.code),
    };
  }

  // Handle ZodError
  if (error instanceof ZodError) {
    return {
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      fieldErrors: extractZodFieldErrors(error),
    };
  }

  // Handle Prisma errors
  const prismaError = error as { code?: string };
  if (prismaError.code && prismaError.code.startsWith('P')) {
    const mappedError = mapPrismaError(error);
    return {
      code: mappedError.code,
      message: mappedError.message,
    };
  }

  // Generic error
  return {
    code: 'INTERNAL_SERVER_ERROR',
    message: 'An unexpected error occurred',
  };
}

/**
 * Safe error logging (don't log sensitive data)
 */
export function logError(error: unknown, context?: string) {
  const logData: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    context,
  };

  if (error instanceof TRPCError) {
    logData.code = error.code;
    logData.message = error.message;
  } else if (error instanceof ZodError) {
    logData.code = 'VALIDATION_ERROR';
    logData.errors = error.errors.map(e => ({
      path: e.path.join('.'),
      message: e.message,
    }));
  } else {
    const prismaError = error as { code?: string };
    if (prismaError.code && prismaError.code.startsWith('P')) {
      logData.code = prismaError.code;
      logData.message = 'Prisma error';
    } else {
      const genericError = error as { message?: string };
      logData.error = genericError.message || 'Unknown error';
    }
  }

  console.error('Error:', JSON.stringify(logData, null, 2));
}

/**
 * Create a consistent error response
 */
export function createErrorResponse(
  code: string,
  message?: string,
  fieldErrors?: FieldError[]
): ErrorResponse {
  return {
    code,
    message: message || getErrorMessage(code),
    fieldErrors,
  };
}

