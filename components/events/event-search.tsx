'use client';

import { SearchBar } from '@/components/common/search-bar';
import { useEventTerm } from '@/lib/hooks/use-terminology';

interface EventSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function EventSearch({ value, onChange, placeholder }: EventSearchProps) {
  const eventTerm = useEventTerm();
  const defaultPlaceholder = `Search ${eventTerm.lowerPlural}...`;

  return (
    <SearchBar
      value={value}
      onChange={onChange}
      placeholder={placeholder || defaultPlaceholder}
    />
  );
}
