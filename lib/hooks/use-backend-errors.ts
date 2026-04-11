import { useEffect } from 'react';
import { UseFormSetError, FieldValues, Path } from 'react-hook-form';

export interface BackendError {
  field: string;
  message: string;
}

/**
 * Hook to map backend validation errors to react-hook-form fields
 *
 * @param backendErrors - Array of backend errors with field and message
 * @param setError - react-hook-form's setError function
 *
 * @example
 * const { setError } = useForm<FormData>();
 * const backendErrors = [{ field: 'email', message: 'Email already exists' }];
 *
 * useBackendErrors(backendErrors, setError);
 * // This will set the error on the 'email' field
 */
export function useBackendErrors<T extends FieldValues>(
  backendErrors: BackendError[] | undefined,
  setError: UseFormSetError<T>
): void {
  useEffect(() => {
    if (backendErrors && backendErrors.length > 0) {
      backendErrors.forEach((error) => {
        setError(error.field as Path<T>, {
          type: 'manual',
          message: error.message,
        });
      });
    }
  }, [backendErrors, setError]);
}

/**
 * Type helper for backend error props in form modals
 */
export interface WithBackendErrors {
  backendErrors?: BackendError[];
}
