'use client';

import { SearchBar } from '@/components/common/search-bar';

interface UserSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function UserSearch({ value, onChange, placeholder = 'Search by name or email...' }: UserSearchProps) {
  return (
    <SearchBar
      value={value}
      onChange={onChange}
      placeholder={placeholder}
    />
  );
}
