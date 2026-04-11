"use client";

import { SearchBar } from "@/components/common/search-bar";

interface InvoiceSearchProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}

export function InvoiceSearch({ value, onChange, placeholder }: InvoiceSearchProps) {
    return (
        <SearchBar
            value={value}
            onChange={onChange}
            placeholder={placeholder || "Search invoices..."}
        />
    );
}
