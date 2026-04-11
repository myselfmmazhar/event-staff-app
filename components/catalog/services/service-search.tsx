'use client';

import { SearchBar } from '@/components/common/search-bar';

interface ServiceSearchProps {
  value: string;
  onChange: (query: string) => void;
  placeholder?: string;
}

export function ServiceSearch({
  value,
  onChange,
  placeholder = 'Search by service title or ID...',
}: ServiceSearchProps) {
  return (
    <SearchBar
      value={value}
      onChange={onChange}
      placeholder={placeholder}
    />
  );
}

