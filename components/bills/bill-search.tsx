"use client";

import { SearchBar } from "@/components/common/search-bar";

interface BillSearchProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}

export function BillSearch({ value, onChange, placeholder }: BillSearchProps) {
    return (
        <SearchBar
            value={value}
            onChange={onChange}
            placeholder={placeholder || "Search bills..."}
        />
    );
}
