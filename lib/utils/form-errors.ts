import { UseFormSetError, FieldValues, Path } from "react-hook-form";
import type { TRPCError, FieldError } from "@/lib/types/error-types";
import { extractFieldErrors as extractErrors, hasFieldErrors as checkHasFieldErrors } from "@/lib/types/error-types";

// Re-export FieldError type for backwards compatibility
export type { FieldError };

/**
 * Map backend field errors to react-hook-form errors
 * @param errors - Array of field errors from backend
 * @param setError - react-hook-form setError function
 */
export function mapBackendErrors<T extends FieldValues>(
  errors: FieldError[],
  setError: UseFormSetError<T>
): void {
  errors.forEach((error) => {
    setError(error.field as Path<T>, {
      type: "manual",
      message: error.message,
    });
  });
}

/**
 * Extract field errors from tRPC error response
 * @param error - tRPC error object
 * @returns Array of field errors
 */
export function extractFieldErrors(error: TRPCError): FieldError[] {
  return extractErrors(error);
}

/**
 * Check if error has field validation errors
 * @param error - tRPC error object
 * @returns True if error contains field errors
 */
export function hasFieldErrors(error: TRPCError): boolean {
  return checkHasFieldErrors(error);
}
