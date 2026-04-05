'use client';

import { Input } from '@/components/ui/input';
import { SearchIcon } from '@/components/ui/icons';

interface CategorySearchProps {
  value: string;
  onChange: (value: string) => void;
}

export function CategorySearch({ value, onChange }: CategorySearchProps) {
  return (
    <div className="relative">
      <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search by category name or ID..."
        className="pl-9"
      />
    </div>
  );
}
