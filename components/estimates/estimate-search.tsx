"use client";

import { SearchBar } from "@/components/common/search-bar";

interface EstimateSearchProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}

export function EstimateSearch({ value, onChange, placeholder }: EstimateSearchProps) {
    return (
        <SearchBar
            value={value}
            onChange={onChange}
            placeholder={placeholder || "Search estimates..."}
        />
    );
}
