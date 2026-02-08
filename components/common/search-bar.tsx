'use client';

import { Input } from '@/components/ui/input';
import { SearchIcon, XIcon } from '@/components/ui/icons';
import { useEffect, useState } from 'react';
import { useSearchLabels } from '@/lib/hooks/use-labels';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounce?: number;
  className?: string;
}

export function SearchBar({
  value,
  onChange,
  placeholder,
  debounce = 300,
  className
}: SearchBarProps) {
  const searchLabels = useSearchLabels();
  const [localValue, setLocalValue] = useState(value || '');

  // Use provided placeholder or fallback to global label
  const searchPlaceholder = placeholder ?? searchLabels.placeholder;

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      onChange(localValue);
    }, debounce);

    return () => clearTimeout(timer);
  }, [localValue, onChange, debounce]);

  // Sync with external value changes
  useEffect(() => {
    setLocalValue(value || '');
  }, [value]);

  const handleClear = () => {
    setLocalValue('');
    onChange('');
  };

  return (
    <div className={className}>
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder={searchPlaceholder}
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          className="pl-9 pr-9"
        />
        {localValue && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label={searchLabels.clearSearch}
          >
            <XIcon className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
