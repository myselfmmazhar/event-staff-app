'use client';

import { Input } from '@/components/ui/input';
import { SearchIcon } from 'lucide-react';
import { useStaffTerm } from '@/lib/hooks/use-terminology';

interface StaffSearchProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}

export function StaffSearch({ value, onChange, placeholder }: StaffSearchProps) {
    const staffTerm = useStaffTerm();
    const defaultPlaceholder = `Search by name, email, phone, or ${staffTerm.lower} ID...`;

    return (
        <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
                type="text"
                placeholder={placeholder || defaultPlaceholder}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="pl-10"
            />
        </div>
    );
}
