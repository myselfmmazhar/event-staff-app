import { useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";

/**
 * Valid filter value types (including arrays)
 */
type FilterValue = string | number | boolean | null | undefined | string[];

/**
 * Type constraint for filter defaults object
 */
type FilterDefaults<T> = {
  [K in keyof T]: FilterValue;
};

interface UseUrlSyncOptions<TKey extends string> {
  /** Keys to sync with URL params */
  keys: TKey[];
  /** Transform function for values before setting in URL */
  transform?: (key: TKey, value: FilterValue) => string | null;
  /** Preserve these existing URL params (not owned by the store) */
  preserve?: string[];
}

/**
 * Syncs store state with URL query parameters
 * Generic type preserves the exact shape of the filter state for type safety
 * @param store - Zustand store state
 * @param options - Configuration options
 */
export function useUrlSync<TStore, TKey extends keyof TStore & string>(
  store: TStore,
  options: UseUrlSyncOptions<TKey>
) {
  const router = useRouter();
  const pathname = usePathname();
  const previousUrlRef = useRef<string>("");

  useEffect(() => {
    const params = new URLSearchParams();

    // Preserve requested params from current URL (e.g. view mode toggles)
    if (options.preserve && options.preserve.length > 0 && typeof window !== "undefined") {
      const currentParams = new URLSearchParams(window.location.search);
      options.preserve.forEach((key) => {
        const value = currentParams.get(key);
        if (value !== null && value !== "") {
          params.set(key, value);
        }
      });
    }

    // Build URL params from store state
    options.keys.forEach((key) => {
      const value = store[key];

      if (!isFilterValue(value)) {
        return;
      }

      // Apply custom transform if provided
      const transformedValue = options.transform
        ? options.transform(key, value)
        : defaultTransform(value);

      if (transformedValue !== null && transformedValue !== "") {
        params.set(key, transformedValue);
      }
    });

    const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;

    // Only update if URL has actually changed
    if (newUrl !== previousUrlRef.current) {
      previousUrlRef.current = newUrl;
      router.replace(newUrl, { scroll: false });
    }
  }, [router, pathname, store, options.keys, options.transform, options.preserve]);
}

/**
 * Default transform function for common value types
 */
function defaultTransform(value: FilterValue): string | null {
  // Skip default/empty values
  if (value === undefined || value === null || value === "" || value === "ALL" || value === "all") {
    return null;
  }

  // Handle arrays - join with commas
  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(",") : null;
  }

  // Convert booleans to strings
  if (typeof value === "boolean") {
    return value.toString();
  }

  // Convert numbers to strings
  if (typeof value === "number") {
    return value.toString();
  }

  // Return strings as-is
  if (typeof value === "string") {
    return value;
  }

  // This should never happen with FilterValue type
  return null;
}

/**
 * Initialize store from URL search params
 * Generic type preserves the exact shape of the defaults for type safety
 * @param searchParams - Next.js searchParams object
 * @param defaults - Default values for store
 */
export function initFromSearchParams<
  TDefaults extends FilterDefaults<TDefaults>,
  TKey extends keyof TDefaults & string = keyof TDefaults & string
>(searchParams: URLSearchParams, defaults: TDefaults): Partial<TDefaults> {
  const state: Partial<TDefaults> = {};

  (Object.keys(defaults) as TKey[]).forEach((key) => {
    const urlValue = searchParams.get(key);
    const defaultValue = defaults[key];

    if (urlValue !== null) {
      const parsedValue = parseUrlValue(
        urlValue,
        defaultValue as FilterValue
      );
      state[key as keyof TDefaults] = parsedValue as TDefaults[keyof TDefaults];
    }
  });

  return state;
}

/**
 * Parse URL value based on the type of the default value
 */
function parseUrlValue(urlValue: string, defaultValue: FilterValue): FilterValue {
  // Boolean values
  if (typeof defaultValue === "boolean") {
    return urlValue === "true";
  }

  // Number values
  if (typeof defaultValue === "number") {
    const num = Number(urlValue);
    return isNaN(num) ? defaultValue : num;
  }

  // String values (including special cases like "ALL")
  return urlValue;
}

function isFilterValue(value: unknown): value is FilterValue {
  return (
    value === null ||
    value === undefined ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    (Array.isArray(value) && value.every((v) => typeof v === "string"))
  );
}
