import { useToast } from "@/components/ui/use-toast";
import type { TRPCError, FieldError } from "@/lib/types/error-types";
import { extractFieldErrors } from "@/lib/types/error-types";
import { useState } from "react";

interface MutationOptions<TData = unknown> {
  onSuccess?: (data?: TData) => void;
  onError?: (error: TRPCError) => void;
}

/**
 * Generic hook for handling CRUD mutations with consistent error handling
 * @returns Object containing backend errors state and mutation handlers
 */
export function useCrudMutations() {
  const { toast } = useToast();
  const [backendErrors, setBackendErrors] = useState<FieldError[]>([]);

  /**
   * Handle mutation success
   */
  const handleSuccess = (message: string): void => {
    toast({
      message,
      type: "success",
    });
    setBackendErrors([]);
  };

  /**
   * Handle mutation error with field validation support
   */
  const handleError = (error: TRPCError): void => {
    const fieldErrors = extractFieldErrors(error);

    if (fieldErrors.length > 0) {
      setBackendErrors(fieldErrors);
      toast({
        message: "Please check the form for errors",
        type: "error",
      });
    } else {
      setBackendErrors([]);
      toast({
        message: error.message ?? "An error occurred",
        type: "error",
      });
    }

  };

  /**
   * Create wrapper for create mutation
   */
  const createMutationOptions = <TData = unknown>(
    successMessage: string,
    options?: MutationOptions<TData>
  ) => ({
    onSuccess: (data?: TData) => {
      handleSuccess(successMessage);
      options?.onSuccess?.(data);
    },
    onError: (error: TRPCError) => {
      handleError(error);
      options?.onError?.(error);
    },
  });

  /**
   * Create wrapper for update mutation
   */
  const updateMutationOptions = <TData = unknown>(
    successMessage: string,
    options?: MutationOptions<TData>
  ) => ({
    onSuccess: (data?: TData) => {
      handleSuccess(successMessage);
      options?.onSuccess?.(data);
    },
    onError: (error: TRPCError) => {
      handleError(error);
      options?.onError?.(error);
    },
  });

  /**
   * Create wrapper for delete mutation
   */
  const deleteMutationOptions = <TData = unknown>(
    successMessage: string,
    options?: MutationOptions<TData>
  ) => ({
    onSuccess: (data?: TData) => {
      handleSuccess(successMessage);
      options?.onSuccess?.(data);
    },
    onError: (error: TRPCError) => {
      handleError(error);
      options?.onError?.(error);
    },
  });

  /**
   * Clear all backend errors
   */
  const clearErrors = (): void => setBackendErrors([]);

  return {
    backendErrors,
    setBackendErrors,
    clearErrors,
    handleSuccess,
    handleError,
    createMutationOptions,
    updateMutationOptions,
    deleteMutationOptions,
  };
}
