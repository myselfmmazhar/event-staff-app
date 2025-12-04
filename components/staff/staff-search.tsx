'use client';

import { Input } from '@/components/ui/input';
import { SearchIcon } from 'lucide-react';
import { useStaffTerm } from '@/lib/hooks/use-terminology';

interface StaffSearchProps {
    value: string;
    onChange: (value: string) => void;
}

export function StaffSearch({ value, onChange }: StaffSearchProps) {
    const staffTerm = useStaffTerm();

    return (
        <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
                type="text"
                placeholder={`Search by name, email, phone, or ${staffTerm.lower} ID...`}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="pl-10"
            />
        </div>
    );
}
