'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface TableColumnResizeHandleProps {
  onMouseDown: (e: React.MouseEvent) => void;
  className?: string;
}

export function TableColumnResizeHandle({ onMouseDown, className }: TableColumnResizeHandleProps) {
  return (
    <div
      data-column-resize
      onMouseDown={(e) => {
        e.stopPropagation();
        onMouseDown(e);
      }}
      onClick={(e) => e.stopPropagation()}
      className={cn(
        "absolute right-0 top-0 bottom-0 z-20 w-2 cursor-col-resize hover:bg-primary/40 transition-colors",
        "after:content-[''] after:absolute after:right-0 after:top-1/4 after:bottom-1/4 after:w-[1px] after:bg-border group-hover:after:bg-primary/30",
        className
      )}
    />
  );
}
