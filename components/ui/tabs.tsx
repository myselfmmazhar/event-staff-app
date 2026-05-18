'use client';

import { createContext, useContext, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** Walk up from `el` and scroll the first vertically-scrollable ancestor to top. */
function scrollNearestScrollableToTop(el: HTMLElement | null) {
  let node: HTMLElement | null = el?.parentElement ?? null;
  while (node) {
    const style = window.getComputedStyle(node);
    const overflowY = style.overflowY;
    if ((overflowY === 'auto' || overflowY === 'scroll') && node.scrollHeight > node.clientHeight) {
      node.scrollTo({ top: 0, behavior: 'auto' });
      return;
    }
    node = node.parentElement;
  }
  window.scrollTo({ top: 0, behavior: 'auto' });
}

interface TabsContextValue {
  value: string;
  onValueChange: (value: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext() {
  const context = useContext(TabsContext);
  if (!context) {
    // During SSR, context might be null, return default values
    if (typeof window === 'undefined') {
      return {
        value: '',
        onValueChange: () => {}
      };
    }
    throw new Error('Tabs components must be used within a Tabs provider');
  }
  return context;
}

interface TabsProps {
  children: ReactNode;
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
  /**
   * When true, switching tabs scrolls the nearest scrollable ancestor (e.g.
   * the page's <main> container) back to the top. Use for full-page tabbed
   * views; leave off for small embedded tab widgets.
   */
  scrollToTopOnChange?: boolean;
}

export function Tabs({
  children,
  defaultValue,
  value: controlledValue,
  onValueChange,
  className,
  scrollToTopOnChange,
}: TabsProps) {
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue || '');
  const rootRef = useRef<HTMLDivElement>(null);

  const value = controlledValue !== undefined ? controlledValue : uncontrolledValue;
  const baseSetValue = onValueChange || setUncontrolledValue;
  const setValue = scrollToTopOnChange
    ? (next: string) => {
        baseSetValue(next);
        scrollNearestScrollableToTop(rootRef.current);
      }
    : baseSetValue;

  return (
    <TabsContext.Provider value={{ value, onValueChange: setValue }}>
      <div ref={rootRef} className={cn('w-full', className)}>{children}</div>
    </TabsContext.Provider>
  );
}

interface TabsListProps {
  children: ReactNode;
  className?: string;
}

export function TabsList({ children, className }: TabsListProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 rounded-lg bg-muted p-1',
        className
      )}
    >
      {children}
    </div>
  );
}

interface TabsTriggerProps {
  children: ReactNode;
  value: string;
  className?: string;
  disabled?: boolean;
}

export function TabsTrigger({
  children,
  value,
  className,
  disabled,
}: TabsTriggerProps) {
  const { value: selectedValue, onValueChange } = useTabsContext();
  const isSelected = value === selectedValue;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isSelected}
      data-state={isSelected ? 'active' : 'inactive'}
      disabled={disabled}
      onClick={() => onValueChange(value)}
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-all',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
        'disabled:pointer-events-none disabled:opacity-50',
        isSelected
          ? 'bg-background text-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground',
        className
      )}
    >
      {children}
    </button>
  );
}

interface TabsContentProps {
  children: ReactNode;
  value: string;
  className?: string;
}

export function TabsContent({ children, value, className }: TabsContentProps) {
  const { value: selectedValue } = useTabsContext();

  if (value !== selectedValue) {
    return null;
  }

  return (
    <div
      role="tabpanel"
      className={cn('mt-2 focus-visible:outline-none', className)}
    >
      {children}
    </div>
  );
}
