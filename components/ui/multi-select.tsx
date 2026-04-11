'use client';

import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { Checkbox } from './checkbox';
import { ChevronDownIcon } from './icons';
import { Input } from './input';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

export interface MultiSelectOption<T extends string = string> {
  value: T;
  label: string;
}

export interface MultiSelectProps<T extends string = string> {
  options: MultiSelectOption<T>[];
  value: T[];
  onChange: (value: T[]) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  error?: boolean;
  showSelectAll?: boolean;
  /** Show search field inside the dropdown (filters options by label) */
  searchable?: boolean;
  searchPlaceholder?: string;
  /** Associates with a `<Label htmlFor>` */
  id?: string;
}

export function MultiSelect<T extends string = string>({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  className,
  disabled = false,
  error = false,
  showSelectAll = false,
  searchable = false,
  searchPlaceholder = 'Search...',
  id,
}: MultiSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filteredOptions = useMemo(() => {
    if (!searchable || !search.trim()) return options;
    const q = search.toLowerCase().trim();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, search, searchable]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) setSearch('');
  };

  const handleToggle = (optionValue: T) => {
    if (value.includes(optionValue)) {
      onChange(value.filter((v) => v !== optionValue));
    } else {
      onChange([...value, optionValue]);
    }
  };

  const handleToggleAll = () => {
    const pool = searchable ? filteredOptions : options;
    const poolValues = pool.map((o) => o.value);
    const allSelected = poolValues.length > 0 && poolValues.every((v) => value.includes(v));
    if (allSelected) {
      onChange(value.filter((v) => !poolValues.includes(v)));
    } else {
      const set = new Set([...value, ...poolValues]);
      onChange([...set] as T[]);
    }
  };

  const getDisplayText = () => {
    if (value.length === 0) {
      return placeholder;
    }
    if (value.length === 1) {
      const option = options.find((o) => o.value === value[0]);
      if (!option && options.length === 0) return 'Loading...';
      return option?.label || value[0];
    }
    return `${value.length} selected`;
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange} modal={false}>
      <PopoverTrigger asChild>
        <button
          type="button"
          id={id}
          disabled={disabled}
          className={cn(
            'flex h-9 w-full min-w-0 items-center justify-between rounded-md border bg-background px-3 text-sm shadow-sm transition-all duration-200',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-0',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error
              ? 'border-destructive bg-destructive/5 focus-visible:border-destructive focus-visible:ring-destructive/20'
              : 'border-input focus-visible:border-primary focus-visible:ring-primary/20',
            value.length === 0 ? 'text-muted-foreground' : 'text-foreground'
          )}
        >
          <span className="truncate text-left">{getDisplayText()}</span>
          <ChevronDownIcon
            className={cn(
              'h-4 w-4 shrink-0 opacity-50 transition-transform duration-200',
              open && 'rotate-180'
            )}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] min-w-[280px] max-w-[min(100vw-2rem,28rem)] p-0 z-[200]"
        align="start"
        sideOffset={4}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {searchable && (
          <div className="border-b border-border p-2">
            <Input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="h-8 text-sm"
              autoComplete="off"
            />
          </div>
        )}
        <div className="max-h-60 overflow-y-auto p-1">
          {showSelectAll && filteredOptions.length > 0 && (
            <label className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm font-medium hover:bg-accent hover:text-accent-foreground border-b border-border mb-1 pb-2">
              <Checkbox
                checked={
                  filteredOptions.length > 0 &&
                  filteredOptions.every((o) => value.includes(o.value))
                }
                onChange={handleToggleAll}
              />
              <span>Select all {searchable && search.trim() ? 'matching' : ''}</span>
            </label>
          )}
          {filteredOptions.length === 0 ? (
            <p className="px-2 py-3 text-sm text-muted-foreground text-center">
              {searchable && search.trim() ? 'No services match your search.' : 'No options available.'}
            </p>
          ) : (
            filteredOptions.map((option) => (
              <label
                key={option.value}
                className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
              >
                <Checkbox
                  checked={value.includes(option.value)}
                  onChange={() => handleToggle(option.value)}
                />
                <span className="break-words">{option.label}</span>
              </label>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
