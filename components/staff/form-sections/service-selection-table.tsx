'use client';

import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

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

  const selectedServices = useMemo(() => {
    return value.map((id) => services.find((s) => s.id === id)).filter(Boolean);
  }, [value, services]);

  function toggle(id: string) {
    if (disabled) return;
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  }

  function removeService(id: string) {
    if (disabled) return;
    onChange(value.filter((v) => v !== id));
  }

  return (
    <div className="space-y-4">
      {/* Selected Services Cards Display */}
      {selectedServices.length > 0 && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-widest mb-3">
            Selected Services
          </p>
          <div className="flex flex-wrap gap-2">
            {selectedServices.map((service) => (
              <div
                key={service!.id}
                className={cn(
                  'inline-flex items-center gap-2 px-3 py-2 rounded-lg border',
                  'bg-white border-primary/30 text-slate-900',
                  'shadow-sm hover:shadow-md transition-shadow',
                  disabled ? 'opacity-60' : ''
                )}
              >
                <span className="text-sm font-medium">{service!.title}</span>
                <button
                  type="button"
                  onClick={() => removeService(service!.id)}
                  disabled={disabled}
                  className={cn(
                    'p-1 rounded-md transition-colors ml-1',
                    'hover:bg-destructive/10 text-slate-400 hover:text-destructive',
                    disabled ? 'cursor-not-allowed' : 'cursor-pointer'
                  )}
                  aria-label={`Remove ${service!.title}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Table Container */}
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
    </div>
  );
}
