'use client';

import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { XIcon } from '@/components/ui/icons';

interface FilterBarProps {
  children: ReactNode;
  onClearAll?: () => void;
  showClearAll?: boolean;
  className?: string;
}

export function FilterBar({
  children,
  onClearAll,
  showClearAll = true,
  className = '',
}: FilterBarProps) {
  return (
    <div className={`flex items-center gap-3 flex-wrap ${className}`}>
      {children}
      {showClearAll && onClearAll && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearAll}
          className="text-muted-foreground hover:text-foreground"
        >
          <XIcon className="h-4 w-4 mr-1" />
          Clear all
        </Button>
      )}
    </div>
  );
}
