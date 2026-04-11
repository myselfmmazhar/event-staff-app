'use client';

import { useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import type { SubNavItem } from './types';

export function useSidebarState() {
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [collapsedItems, setCollapsedItems] = useState<string[]>([]);

  const isActive = useCallback((href: string) => {
    return pathname === href;
  }, [pathname]);

  const hasActiveChild = useCallback((subItems?: SubNavItem[]): boolean => {
    if (!subItems) return false;
    return subItems.some(subItem => {
      if (subItem.href && isActive(subItem.href)) return true;
      if (subItem.subItems) return hasActiveChild(subItem.subItems);
      return false;
    });
  }, [isActive]);

  const isExpanded = useCallback((path: string, hasActiveChildFlag?: boolean) => {
    if (hasActiveChildFlag) {
      return !collapsedItems.includes(path);
    }
    return expandedItems.includes(path);
  }, [expandedItems, collapsedItems]);

  const toggle = useCallback((path: string, hasActiveChildFlag?: boolean) => {
    const isTopLevel = !path.includes('.');

    if (hasActiveChildFlag) {
      setCollapsedItems(prev => {
        const isClosing = !prev.includes(path);
        if (!isClosing && isTopLevel) {
          // If we are actually opening a top-level pod that has an active child
          return prev.filter(item => item === path); 
        }
        return prev.includes(path) ? prev.filter(item => item !== path) : [...prev, path];
      });
    } else {
      setExpandedItems(prev => {
        const isOpening = !prev.includes(path);
        if (isOpening && isTopLevel) {
          // Accordion behavior: close other top-level items when opening a new one
          return [path];
        }
        return prev.includes(path) ? prev.filter(item => item !== path) : [...prev, path];
      });
      // Also clear collapsed items if we are switching top-level focus
      if (!path.includes('.')) {
        setCollapsedItems([]);
      }
    }
  }, []);

  return {
    isActive,
    hasActiveChild,
    isExpanded,
    toggle,
  };
}
