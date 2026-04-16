'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';

type UseTableResizeOptions = {
  lockedColumns?: string[];
};

function areWidthsEqual(a: Record<string, number>, b: Record<string, number>) {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);

  if (aKeys.length !== bKeys.length) return false;

  for (const key of aKeys) {
    if (a[key] !== b[key]) return false;
  }

  return true;
}

export function useTableResize(
  tableId?: string,
  initialWidths: Record<string, number> = {},
  options: UseTableResizeOptions = {}
) {
  const lockedColumns = useMemo(() => new Set(options.lockedColumns ?? []), [options.lockedColumns]);
  const applyLockedWidths = useCallback(
    (widths: Record<string, number>) => {
      if (lockedColumns.size === 0) return widths;

      const next = { ...widths };
      lockedColumns.forEach((columnKey) => {
        if (initialWidths[columnKey] !== undefined) {
          next[columnKey] = initialWidths[columnKey];
        } else {
          delete next[columnKey];
        }
      });
      return next;
    },
    [initialWidths, lockedColumns]
  );

  // Load initial widths from localStorage if tableId is provided
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
    if (typeof window !== 'undefined' && tableId) {
      const saved = localStorage.getItem(`table-widths-${tableId}`);
      if (saved) {
        try {
          return applyLockedWidths({ ...initialWidths, ...JSON.parse(saved) });
        } catch (e) {
          console.error('Error loading table widths', e);
        }
      }
    }
    return applyLockedWidths(initialWidths);
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
    if (lockedColumns.has(columnKey)) return;

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
  }, [columnWidths, lockedColumns]);

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!resizingColumn.current) return;

    const deltaX = e.pageX - startX.current;
    const newWidth = Math.max(50, startWidth.current + deltaX);

    setColumnWidths((prev) => applyLockedWidths({
      ...prev,
      [resizingColumn.current!]: newWidth,
    }));
  }, [applyLockedWidths]);

  useEffect(() => {
    setColumnWidths((prev) => {
      const next = applyLockedWidths({ ...initialWidths, ...prev });
      return areWidthsEqual(prev, next) ? prev : next;
    });
  }, [initialWidths, applyLockedWidths]);

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
