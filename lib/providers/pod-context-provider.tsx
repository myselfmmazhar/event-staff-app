"use client";

import { createContext, useContext, useMemo } from "react";
import { usePathname } from "next/navigation";
import { POD_IDS, type PodId } from "@/lib/config/labels";
import { useTerminology } from "@/lib/hooks/use-terminology";

/**
 * Pod Context
 *
 * Holds the pod id (task / talent / time) for the current route, or null when the
 * route does not belong to any pod. Label hooks read this to layer pod overrides
 * on top of the global labels.
 *
 * The context is purely additive: if no provider is mounted, consumers see `null`
 * and the existing global-only behaviour is preserved (matches pre-migration
 * behaviour exactly).
 */
const PodContext = createContext<PodId | null>(null);

/**
 * Route prefixes per pod. Order is not important — each path is matched against
 * the most specific prefix list. Settings and finance manager subtabs live
 * in the Time Pod / Task Pod nav, mirroring components/layout/sidebar/nav-data.ts.
 */
function getStaticPodPrefixes(): Record<PodId, readonly string[]> {
  return {
    task: ["/events", "/event-requests", "/clients", "/assignments"],
    talent: ["/catalog"],
    time: ["/timesheet", "/bills", "/estimates", "/invoices"],
  };
}

function matchPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(prefix + "/");
}

/**
 * Resolve the pod for a pathname.
 *
 * Pulls the staff/talent route from terminology (it's customisable, e.g. /staff,
 * /talent, /performers) and falls back to the staff/talent canonical prefixes.
 */
export function resolvePodForPath(
  pathname: string | null,
  staffRoute: string | undefined
): PodId | null {
  if (!pathname) return null;
  const prefixes = getStaticPodPrefixes();
  const talentRoute = staffRoute ? `/${staffRoute}` : "/staff";

  if (matchPrefix(pathname, talentRoute)) return "talent";
  // Always also honour the canonical staff prefix in case terminology changes mid-session.
  if (matchPrefix(pathname, "/staff")) return "talent";

  for (const pod of POD_IDS) {
    for (const prefix of prefixes[pod]) {
      if (matchPrefix(pathname, prefix)) return pod;
    }
  }

  return null;
}

interface PodContextProviderProps {
  children: React.ReactNode;
  /**
   * Override the auto-detected pod. Useful for testing or for routes that should
   * inherit a different pod scope than their pathname suggests.
   */
  pod?: PodId | null;
}

export function PodContextProvider({ children, pod }: PodContextProviderProps) {
  const pathname = usePathname();
  const { terminology } = useTerminology();

  const detected = useMemo<PodId | null>(() => {
    if (pod !== undefined) return pod;
    return resolvePodForPath(pathname, terminology?.staff?.route);
  }, [pod, pathname, terminology?.staff?.route]);

  return <PodContext.Provider value={detected}>{children}</PodContext.Provider>;
}

/**
 * Get the active pod id for the current subtree, or null if not inside a pod.
 *
 * Safe outside any provider — returns null.
 */
export function usePodContext(): PodId | null {
  return useContext(PodContext);
}
