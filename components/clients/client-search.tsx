'use client';

import { SearchBar } from '@/components/common/search-bar';

interface ClientSearchProps {
  value: string;
  onChange: (query: string) => void;
  placeholder?: string;
}

export function ClientSearch({
  value,
  onChange,
  placeholder = 'Search by business name, contact, or email...',
}: ClientSearchProps) {
  return (
    <SearchBar
      value={value}
      onChange={onChange}
      placeholder={placeholder}
    />
  );
}
