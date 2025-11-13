/**
 * Client module error handling utilities
 * Centralizes error handling logic to reduce duplication
 */

export interface BackendError {
  field: string;
  message: string;
}

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
  error: any,
  toast: ToastFn,
  setBackendErrors: (errors: BackendError[]) => void
): void => {
  const fieldErrors =
    (error.data as { fieldErrors?: BackendError[] })?.fieldErrors || [];

  if (fieldErrors.length > 0) {
    setBackendErrors(fieldErrors);
    toast({
      message: 'Please check the form for errors',
      type: 'error',
    });
  } else {
    setBackendErrors([]);
    toast({
      message: error.message || 'An error occurred',
      type: 'error',
    });
  }
};
