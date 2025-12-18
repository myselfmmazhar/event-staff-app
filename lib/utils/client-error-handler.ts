import type { TRPCError, FieldError } from "@/lib/types/error-types";
import { extractFieldErrors, getErrorMessage } from "@/lib/types/error-types";

/**
 * Client module error handling utilities
 * Centralizes error handling logic to reduce duplication
 */

// Re-export BackendError as alias for FieldError for backwards compatibility
export type BackendError = FieldError;

export interface Toast {
  message: string;
  type: 'success' | 'error';
}

export interface ToastFn {
  (options: Toast): void;
}

/**
 * Handles mutation errors consistently across the clients module
 * Extracts field-specific errors and shows appropriate toast messages
 */
export const handleClientMutationError = (
  error: TRPCError,
  toast: ToastFn,
  setBackendErrors: (errors: FieldError[]) => void
): void => {
  const fieldErrors = extractFieldErrors(error);

  if (fieldErrors.length > 0) {
    setBackendErrors(fieldErrors);
    toast({
      message: 'Please check the form for errors',
      type: 'error',
    });
  } else {
    setBackendErrors([]);
    toast({
      message: getErrorMessage(error),
      type: 'error',
    });
  }
};
