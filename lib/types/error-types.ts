import type { TRPCClientErrorLike } from '@trpc/client';
import type { AppRouter } from '@/server/routers/_app';

/**
 * Error Type Utilities
 *
 * This file defines properly-typed error handling utilities for tRPC errors.
 * Eliminates the need for 'any' types in error handling throughout the application.
 */

/**
 * Properly typed tRPC error from client-side
 */
export type TRPCError = TRPCClientErrorLike<AppRouter>;

/**
 * tRPC Error Data Structure
 * Contains field errors from Zod validation and other error metadata
 */
export interface TRPCErrorData {
  fieldErrors?: FieldError[];
  zodError?: unknown;
  prismaCode?: string;
}

/**
 * Individual field error structure
 * Used for form validation errors from the backend
 */
export interface FieldError {
  field: string;
  message: string;
}

/**
 * Type guard to check if an error is a tRPC error with field errors
 *
 * @param error - Unknown error object
 * @returns True if error has field errors structure
 *
 * @example
 * try {
 *   await mutation.mutateAsync(data);
 * } catch (error) {
 *   if (hasTRPCFieldErrors(error)) {
 *     // error.data.fieldErrors is now typed
 *     const fieldErrors = error.data?.fieldErrors ?? [];
 *   }
 * }
 */
export function hasTRPCFieldErrors(error: unknown): error is TRPCError & {
  data?: TRPCErrorData;
} {
  return (
    typeof error === 'object' &&
    error !== null &&
    'data' in error &&
    typeof error.data === 'object' &&
    error.data !== null &&
    'fieldErrors' in error.data &&
    Array.isArray((error.data as TRPCErrorData).fieldErrors)
  );
}

/**
 * Extract field errors from a tRPC error
 *
 * @param error - Unknown error object (typically from catch block)
 * @returns Array of field errors, or empty array if none found
 *
 * @example
 * try {
 *   await mutation.mutateAsync(data);
 * } catch (error) {
 *   const fieldErrors = extractFieldErrors(error);
 *   fieldErrors.forEach(err => {
 *     console.log(`${err.field}: ${err.message}`);
 *   });
 * }
 */
export function extractFieldErrors(error: unknown): FieldError[] {
  if (!hasTRPCFieldErrors(error)) {
    return [];
  }
  return error.data?.fieldErrors ?? [];
}

/**
 * Check if an error has field validation errors
 *
 * @param error - Unknown error object
 * @returns True if error contains field errors
 */
export function hasFieldErrors(error: unknown): boolean {
  return extractFieldErrors(error).length > 0;
}

/**
 * Get error message from tRPC error or unknown error
 *
 * @param error - Unknown error object
 * @param defaultMessage - Default message if error has no message
 * @returns Error message string
 */
export function getErrorMessage(
  error: unknown,
  defaultMessage = 'An error occurred'
): string {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return typeof error.message === 'string' ? error.message : defaultMessage;
  }
  return defaultMessage;
}
