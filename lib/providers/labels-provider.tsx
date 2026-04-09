"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { trpc } from "@/lib/client/trpc";
import { type LabelsConfig, getDefaultLabels } from "@/lib/config/labels";

/**
 * Labels Context Value
 */
interface LabelsContextValue {
  labels: LabelsConfig;
  isLoading: boolean;
  error: Error | null;
  refreshLabels: () => Promise<void>;
}

/**
 * Create Labels Context
 */
const LabelsContext = createContext<LabelsContextValue | undefined>(undefined);

/**
 * Labels Provider Props
 */
interface LabelsProviderProps {
  children: React.ReactNode;
}

/**
 * Labels Provider Component
 *
 * Loads labels configuration from the database via tRPC on mount.
 * Falls back to default labels if database settings don't exist or on error.
 * Provides the labels config to all child components via context.
 *
 * @example
 * ```tsx
 * <LabelsProvider>
 *   <App />
 * </LabelsProvider>
 * ```
 */
export function LabelsProvider({ children }: LabelsProviderProps) {
  // Get default labels immediately (no flicker)
  const defaultLabels = getDefaultLabels();
  const [labels, setLabels] = useState<LabelsConfig>(defaultLabels);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch labels from tRPC
  const labelsQuery = trpc.settings.getLabels.useQuery(undefined, {
    // Fetch on mount
    refetchOnMount: true,
    // Don't refetch on window focus (labels rarely change)
    refetchOnWindowFocus: false,
    // Cache for 5 minutes
    staleTime: 5 * 60 * 1000,
    // Retry once on failure
    retry: 1,
  });

  // Update state when query resolves
  useEffect(() => {
    if (labelsQuery.data) {
      setLabels(labelsQuery.data);
      setIsLoading(false);
      setError(null);
    } else if (labelsQuery.error) {
      // On error, keep using default labels
      console.error("Failed to load labels from database, using defaults:", labelsQuery.error);
      setError(new Error(labelsQuery.error.message || "Failed to load labels"));
      setIsLoading(false);
    } else if (!labelsQuery.isLoading) {
      setIsLoading(false);
    }
  }, [labelsQuery.data, labelsQuery.error, labelsQuery.isLoading]);

  /**
   * Manually refresh labels from database
   * Useful after updating settings
   */
  const refreshLabels = async () => {
    setIsLoading(true);
    try {
      await labelsQuery.refetch();
    } catch (err) {
      console.error("Failed to refresh labels:", err);
      setError(err instanceof Error ? err : new Error("Failed to refresh labels"));
    } finally {
      setIsLoading(false);
    }
  };

  const value: LabelsContextValue = {
    labels,
    isLoading,
    error,
    refreshLabels,
  };

  return (
    <LabelsContext.Provider value={value}>
      {children}
    </LabelsContext.Provider>
  );
}

/**
 * Hook to access labels context
 * Must be used within a LabelsProvider
 *
 * @throws Error if used outside of LabelsProvider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { labels, isLoading } = useLabelsContext();
 *   return <button>{labels.global.actions.save}</button>;
 * }
 * ```
 */
export function useLabelsContext(): LabelsContextValue {
  const context = useContext(LabelsContext);

  if (context === undefined) {
    // During SSR, context might be undefined, return default values
    if (typeof window === 'undefined') {
      return {
        labels: getDefaultLabels(),
        isLoading: false,
        error: null,
        refreshLabels: async () => {},
      };
    }
    throw new Error(
      "useLabelsContext must be used within a LabelsProvider"
    );
  }

  return context;
}
