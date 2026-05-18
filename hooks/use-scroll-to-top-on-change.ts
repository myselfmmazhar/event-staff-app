'use client';

import { useEffect, useRef } from 'react';

/**
 * Returns a ref to attach to a scrollable element. Whenever `dep` changes
 * (e.g. the active wizard step / tab), the element is scrolled back to the top.
 *
 * Use this for multi-step modals and tabbed views so the user doesn't land
 * mid-content after moving to the next step.
 */
export function useScrollToTopOnChange<T extends HTMLElement>(dep: unknown) {
  const ref = useRef<T>(null);
  useEffect(() => {
    ref.current?.scrollTo({ top: 0, behavior: 'auto' });
  }, [dep]);
  return ref;
}
