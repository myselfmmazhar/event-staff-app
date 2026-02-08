"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { trpc } from "@/lib/client/trpc";
import { type TerminologyConfig, getDefaultTerminology } from "@/lib/config/terminology";

/**
 * Terminology Context Value
 */
interface TerminologyContextValue {
  terminology: TerminologyConfig;
  isLoading: boolean;
  error: Error | null;
  refreshTerminology: () => Promise<void>;
}

/**
 * Create Terminology Context
 */
const TerminologyContext = createContext<TerminologyContextValue | undefined>(undefined);

/**
 * Terminology Provider Props
 */
interface TerminologyProviderProps {
  children: React.ReactNode;
}

/**
 * Terminology Provider Component
 *
 * Loads terminology configuration from the database via tRPC on mount.
 * Falls back to environment variables if database settings don't exist or on error.
 * Provides the terminology config to all child components via context.
 *
 * @example
 * ```tsx
 * <TerminologyProvider>
 *   <App />
 * </TerminologyProvider>
 * ```
 */
export function TerminologyProvider({ children }: TerminologyProviderProps) {
  // Get default terminology immediately (no flicker)
  const defaultTerminology = getDefaultTerminology();
  const [terminology, setTerminology] = useState<TerminologyConfig>(defaultTerminology);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Set initial cookie with default terminology
  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.cookie = `terminology=${JSON.stringify({
        staff: { route: defaultTerminology.staff.route },
        event: { route: defaultTerminology.event.route }
      })}; path=/; max-age=31536000; SameSite=Lax`;
    }
  }, []); // Only run once on mount

  // Fetch terminology from tRPC
  const terminologyQuery = trpc.settings.getTerminology.useQuery(undefined, {
    // Fetch on mount
    refetchOnMount: true,
    // Don't refetch on window focus (terminology rarely changes)
    refetchOnWindowFocus: false,
    // Cache for 5 minutes
    staleTime: 5 * 60 * 1000,
    // Retry once on failure
    retry: 1,
  });

  // Update state when query resolves
  useEffect(() => {
    if (terminologyQuery.data) {
      setTerminology(terminologyQuery.data);
      setIsLoading(false);
      setError(null);

      // Set cookie for middleware to access terminology routes
      // Cookie expires in 1 year
      if (typeof window !== 'undefined') {
        document.cookie = `terminology=${JSON.stringify({
          staff: { route: terminologyQuery.data.staff.route },
          event: { route: terminologyQuery.data.event.route }
        })}; path=/; max-age=31536000; SameSite=Lax`;
      }
    } else if (terminologyQuery.error) {
      // On error, keep using default terminology
      console.error("Failed to load terminology from database, using defaults:", terminologyQuery.error);
      setError(new Error(terminologyQuery.error.message || "Failed to load terminology"));
      setIsLoading(false);
    } else if (!terminologyQuery.isLoading) {
      setIsLoading(false);
    }
  }, [terminologyQuery.data, terminologyQuery.error, terminologyQuery.isLoading]);

  /**
   * Manually refresh terminology from database
   * Useful after updating settings
   */
  const refreshTerminology = async () => {
    setIsLoading(true);
    try {
      await terminologyQuery.refetch();
    } catch (err) {
      console.error("Failed to refresh terminology:", err);
      setError(err instanceof Error ? err : new Error("Failed to refresh terminology"));
    } finally {
      setIsLoading(false);
    }
  };

  const value: TerminologyContextValue = {
    terminology,
    isLoading,
    error,
    refreshTerminology,
  };

  return (
    <TerminologyContext.Provider value={value}>
      {children}
    </TerminologyContext.Provider>
  );
}

/**
 * Hook to access terminology context
 * Must be used within a TerminologyProvider
 *
 * @throws Error if used outside of TerminologyProvider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { terminology, isLoading } = useTerminologyContext();
 *   return <h1>{terminology.staff.plural}</h1>;
 * }
 * ```
 */
export function useTerminologyContext(): TerminologyContextValue {
  const context = useContext(TerminologyContext);

  if (context === undefined) {
    throw new Error(
      "useTerminologyContext must be used within a TerminologyProvider"
    );
  }

  return context;
}
