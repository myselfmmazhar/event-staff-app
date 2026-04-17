'use client';

import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';

interface ServiceSelectionTableProps {
  services: { id: string; title: string }[];
  value: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
  error?: boolean;
}

const VISIBLE_ROWS = 4;
const ROW_HEIGHT = 48;

export function ServiceSelectionTable({
  services,
  value,
  onChange,
  disabled,
  error,
}: ServiceSelectionTableProps) {
  const [search, setSearch] = useState('');
  const [sortAsc, setSortAsc] = useState(true);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const list = q ? services.filter((s) => s.title.toLowerCase().includes(q)) : services;
    return [...list].sort((a, b) =>
      sortAsc ? a.title.localeCompare(b.title) : b.title.localeCompare(a.title)
    );
  }, [services, search, sortAsc]);

  function toggle(id: string) {
    if (disabled) return;
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  }

  return (
    <div className={cn("rounded-md border", error ? "border-destructive" : "border-border")}>
      {/* Search bar */}
      <div className="flex items-center justify-end gap-2 px-3 py-2 border-b border-border">
        <span className="text-sm text-muted-foreground font-medium">Search:</span>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          disabled={disabled}
          className="h-7 w-40 rounded border border-border bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
        />
      </div>

      {/* Table */}
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40">
            <th className="w-10 px-3 py-2" />
            <th
              className="px-3 py-2 text-left font-semibold text-foreground cursor-pointer select-none"
              onClick={() => setSortAsc((p) => !p)}
            >
              <div className="flex items-center gap-1">
                Service
                <span className="text-muted-foreground text-xs">{sortAsc ? '▲' : '▼'}</span>
              </div>
            </th>
          </tr>
        </thead>
      </table>

      {/* Scrollable body */}
      <div style={{ maxHeight: VISIBLE_ROWS * ROW_HEIGHT, overflowY: 'auto' }}>
        <table className="w-full text-sm">
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={2} className="px-3 py-4 text-center text-muted-foreground">
                  No services found
                </td>
              </tr>
            ) : (
              filtered.map((service) => {
                const checked = value.includes(service.id);
                return (
                  <tr
                    key={service.id}
                    onClick={() => toggle(service.id)}
                    className={cn(
                      "border-b border-border last:border-0 transition-colors",
                      disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:bg-muted/40",
                      checked && "bg-primary/5"
                    )}
                    style={{ height: ROW_HEIGHT }}
                  >
                    <td className="w-10 px-3">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(service.id)}
                        disabled={disabled}
                        onClick={(e) => e.stopPropagation()}
                        className="h-4 w-4 rounded border-border accent-primary cursor-pointer disabled:cursor-not-allowed"
                      />
                    </td>
                    <td className="px-3 text-foreground">{service.title}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}
