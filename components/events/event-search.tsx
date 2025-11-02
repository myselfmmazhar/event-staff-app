'use client';

import { Input } from '@/components/ui/input';
import { SearchIcon, XIcon } from '@/components/ui/icons';
import { useEffect, useState } from 'react';

interface EventSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function EventSearch({ value, onChange, placeholder = 'Search events...' }: EventSearchProps) {
  const [localValue, setLocalValue] = useState(value);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      onChange(localValue);
    }, 300);

    return () => clearTimeout(timer);
  }, [localValue, onChange]);

  // Sync with external value changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleClear = () => {
    setLocalValue('');
    onChange('');
  };

  return (
    <div className="relative">
      <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        type="text"
        placeholder={placeholder}
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        className="pl-9 pr-9"
      />
      {localValue && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          <XIcon className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
