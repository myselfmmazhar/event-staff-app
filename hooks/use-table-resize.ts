'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

export function useTableResize(tableId?: string, initialWidths: Record<string, number> = {}) {
  // Load initial widths from localStorage if tableId is provided
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
    if (typeof window !== 'undefined' && tableId) {
      const saved = localStorage.getItem(`table-widths-${tableId}`);
      if (saved) {
        try {
          return { ...initialWidths, ...JSON.parse(saved) };
        } catch (e) {
          console.error('Error loading table widths', e);
        }
      }
    }
    return initialWidths;
  });

  const resizingColumn = useRef<string | null>(null);
  const startX = useRef<number>(0);
  const startWidth = useRef<number>(0);

  // Save to localStorage when widths change
  useEffect(() => {
    if (tableId && Object.keys(columnWidths).length > 0) {
      localStorage.setItem(`table-widths-${tableId}`, JSON.stringify(columnWidths));
    }
  }, [tableId, columnWidths]);

  const onMouseDown = useCallback((columnKey: string, e: React.MouseEvent) => {
    resizingColumn.current = columnKey;
    startX.current = e.pageX;
    
    // Find the th element to get current width if not set
    const th = (e.target as HTMLElement).closest('th');
    if (th) {
      startWidth.current = th.offsetWidth;
    } else {
      startWidth.current = columnWidths[columnKey] || 150;
    }

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [columnWidths]);

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!resizingColumn.current) return;

    const deltaX = e.pageX - startX.current;
    const newWidth = Math.max(50, startWidth.current + deltaX);

    setColumnWidths((prev) => ({
      ...prev,
      [resizingColumn.current!]: newWidth,
    }));
  }, []);

  const onMouseUp = useCallback(() => {
    resizingColumn.current = null;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  const getTableStyle = useCallback(() => {
    const style: Record<string, string> = {};
    Object.entries(columnWidths).forEach(([key, width]) => {
      style[`--col-${key}`] = `${width}px`;
    });
    return style;
  }, [columnWidths]);

  useEffect(() => {
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, [onMouseMove, onMouseUp]);

  return { columnWidths, onMouseDown, getTableStyle };
}
