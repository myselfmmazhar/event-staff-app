'use client';

import { SearchBar } from '@/components/common/search-bar';

interface ProductSearchProps {
  value: string;
  onChange: (query: string) => void;
  placeholder?: string;
}

export function ProductSearch({
  value,
  onChange,
  placeholder = 'Search by product title or ID...',
}: ProductSearchProps) {
  return <SearchBar value={value} onChange={onChange} placeholder={placeholder} />;
}

