'use client';

import { useEffect, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { SkillLevel, AvailabilityStatus, StaffRating } from '@prisma/client';
import { useStaffTerm } from '@/lib/hooks/use-terminology';
import { AlertIcon } from '@/components/ui/icons';

export type SearchRowKind = 'INDIVIDUAL' | 'TEAM';

export interface SearchRow {
  // Common
  id: string;
  rowId: string;                  // INDIVIDUAL:<staffId> or TEAM:<managerStaffId>:<serviceId>
  kind: SearchRowKind;
  staffId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  skillLevel: SkillLevel;
  availabilityStatus: AvailabilityStatus;
  staffRating?: StaffRating;
  city: string;
  state: string;
  country: string;
  internalNotes?: string | null;
  locationMatch: number;
  distanceMiles?: number | null;
  invitationStatus?: string | null;
  invitationConfirmed?: boolean | null;
  hasConflict?: boolean;
  conflicts?: Array<{
    eventTitle: string;
    startDate: string | Date;
    endDate: string | Date;
    startTime?: string | null;
    endTime?: string | null;
    city?: string | null;
    state?: string | null;
  }>;
  userId?: string | null;
  hasLoginAccess?: boolean;
  services?: Array<{ service: { id: string; title: string } }>;

  // Type-specific
  totalUnits: number;
  availableUnits: number;
  serviceId?: string | null;
  serviceTitle?: string | null;
  managerStaffId?: string | null;
}

interface StaffSearchTableProps {
  rows: SearchRow[];
  selectedRowIds: string[];
  selectionCounts?: Record<string, number>;
  onSelectionChange: (rowIds: string[]) => void;
  onCountChange?: (rowId: string, count: number) => void;
  isLoading?: boolean;
  showInvitationStatus?: boolean;
}

const SKILL_LEVEL_LABELS: Record<SkillLevel, string> = {
  BEGINNER: 'Beginner',
  INTERMEDIATE: 'Intermediate',
  ADVANCED: 'Advanced',
};

const RATING_LABELS: Record<StaffRating, string> = {
  A: 'A',
  B: 'B',
  C: 'C',
  D: 'D',
  NA: 'N/A',
};

const RATING_COLORS: Record<StaffRating, string> = {
  A: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  B: 'bg-blue-100 text-blue-800 border-blue-200',
  C: 'bg-amber-100 text-amber-800 border-amber-200',
  D: 'bg-red-100 text-red-800 border-red-200',
  NA: 'bg-gray-100 text-gray-600 border-gray-200',
};

function getInvitationBadge(status: string | null | undefined, isConfirmed: boolean | null | undefined) {
  if (!status) return null;
  switch (status) {
    case 'ACCEPTED':
      if (isConfirmed) {
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-xs">Confirmed</Badge>;
      }
      return <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs">Accepted</Badge>;
    case 'PENDING':
      return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 text-xs">Pending</Badge>;
    case 'DECLINED':
      return <Badge className="bg-red-100 text-red-800 border-red-200 text-xs">Declined</Badge>;
    case 'CANCELLED':
      return <Badge className="bg-gray-100 text-gray-600 border-gray-200 text-xs">Cancelled</Badge>;
    case 'WAITLISTED':
      return <Badge className="bg-purple-100 text-purple-800 border-purple-200 text-xs">Waitlisted</Badge>;
    default:
      return null;
  }
}

export function StaffSearchTable({
  rows,
  selectedRowIds,
  selectionCounts = {},
  onSelectionChange,
  onCountChange,
  isLoading,
  showInvitationStatus = false,
}: StaffSearchTableProps) {
  const staffTerm = useStaffTerm();

  const isUnregistered = (r: SearchRow) => r.kind === 'INDIVIDUAL' && !r.userId;
  const isSelectable = (r: SearchRow) => !isUnregistered(r) && r.availableUnits > 0;
  const selectableRows = rows.filter(isSelectable);

  const allSelected = selectableRows.length > 0 &&
    selectableRows.every((r) => selectedRowIds.includes(r.rowId));
  const someSelected = selectedRowIds.length > 0 && !allSelected;
  const selectAllRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someSelected && !allSelected;
    }
  }, [someSelected, allSelected]);

  const handleSelectAll = () => {
    if (allSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(selectableRows.map((r) => r.rowId));
    }
  };

  const handleSelectOne = (row: SearchRow) => {
    if (!isSelectable(row)) return;
    if (selectedRowIds.includes(row.rowId)) {
      onSelectionChange(selectedRowIds.filter((i) => i !== row.rowId));
    } else {
      onSelectionChange([...selectedRowIds, row.rowId]);
    }
  };

  const getLocationBadge = (locationMatch: number) => {
    if (locationMatch >= 100) return <Badge variant="default">Same City</Badge>;
    if (locationMatch >= 50) return <Badge variant="secondary">Same State</Badge>;
    return <Badge variant="outline">Other</Badge>;
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-16 bg-muted/50 animate-pulse rounded-md" />
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="text-center py-8 border border-dashed border-border rounded-lg">
        <p className="text-muted-foreground">
          No available {staffTerm.lowerPlural} found matching the requirements.
        </p>
      </div>
    );
  }

  const unregisteredCount = rows.filter(isUnregistered).length;

  return (
    <div className="space-y-2">
      {unregisteredCount > 0 && (
        <div className="flex items-center gap-2 p-3 bg-info/10 border border-info/20 rounded-lg text-sm">
          <AlertIcon className="h-4 w-4 text-info flex-shrink-0" />
          <span className="text-info">
            {unregisteredCount} {staffTerm.lowerPlural} haven't completed registration and cannot receive offers.
          </span>
        </div>
      )}

      <div className="border rounded-lg overflow-auto max-h-[600px] relative">
        <table className="w-full border-collapse">
          <thead className="bg-muted/50 sticky top-0 z-20 backdrop-blur-sm shadow-sm">
            <tr>
              <th className="w-12 px-4 py-3 text-left">
                <Checkbox
                  ref={selectAllRef}
                  checked={allSelected}
                  onChange={handleSelectAll}
                  disabled={selectableRows.length === 0}
                />
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium">Talent</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Type</th>
              <th className="px-4 py-3 text-left text-sm font-medium whitespace-nowrap">Available Units</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Distance</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Skill</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Rating</th>
              {showInvitationStatus && (
                <th className="px-4 py-3 text-left text-sm font-medium">Invitation</th>
              )}
              <th className="px-4 py-3 text-left text-sm font-medium whitespace-nowrap">Location</th>
              <th className="px-4 py-3 text-left text-sm font-medium whitespace-nowrap">Conflict</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Internal Comments</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => {
              const unregistered = isUnregistered(row);
              const noUnits = row.availableUnits <= 0;
              const disabled = unregistered || noUnits;
              const selected = selectedRowIds.includes(row.rowId);

              return (
                <tr
                  key={row.rowId}
                  className={`
                    ${disabled
                      ? 'opacity-60 cursor-not-allowed bg-muted/20'
                      : 'hover:bg-muted/30 cursor-pointer'
                    }
                    ${selected && !disabled ? 'bg-primary/5' : ''}
                  `}
                  onClick={() => handleSelectOne(row)}
                  title={
                    unregistered
                      ? 'This staff member must complete registration first'
                      : noUnits
                        ? row.invitationStatus === 'PENDING'
                          ? 'Invitation already sent — awaiting response'
                          : 'No available units for this manager + service'
                        : undefined
                  }
                >
                  <td className="px-4 py-3">
                    <Checkbox
                      checked={selected}
                      onChange={() => handleSelectOne(row)}
                      onClick={(e) => e.stopPropagation()}
                      disabled={disabled}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium flex items-center gap-2">
                        {row.kind === 'INDIVIDUAL' ? (
                          <>
                            {row.firstName} {row.lastName}
                            {unregistered && (
                              <Badge variant="warning" className="text-xs">Not Registered</Badge>
                            )}
                          </>
                        ) : (
                          <>{row.firstName} {row.lastName}</>
                        )}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {row.kind === 'INDIVIDUAL' ? (
                          row.staffId
                        ) : (
                          <>
                            {row.staffId} · Team · {row.totalUnits} {row.totalUnits === 1 ? 'unit' : 'units'}
                          </>
                        )}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {row.kind === 'INDIVIDUAL' ? (
                      <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs">Individual</Badge>
                    ) : (
                      <Badge className="bg-purple-100 text-purple-800 border-purple-200 text-xs">Team</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {row.kind === 'INDIVIDUAL' ? (
                      <div>
                        <Badge variant="outline">1 unit</Badge>
                        <p className="text-[11px] text-muted-foreground mt-1">Always 1 for individual</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {row.availableUnits} {row.availableUnits === 1 ? 'unit' : 'units'} available
                          </Badge>
                        </div>
                        {selected && onCountChange && (
                          <div className="flex flex-col gap-1" onClick={(e) => e.stopPropagation()}>
                            <label className="text-[10px] font-bold text-primary uppercase tracking-wider">Offers to send</label>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min={1}
                                max={row.availableUnits}
                                value={selectionCounts[row.rowId] ?? row.availableUnits}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value);
                                  if (!isNaN(val)) {
                                    onCountChange(row.rowId, Math.min(row.availableUnits, Math.max(1, val)));
                                  }
                                }}
                                className="w-16 h-8 px-2 py-1 text-sm border rounded bg-background focus:ring-1 focus:ring-primary outline-none transition-all"
                              />
                              <span className="text-xs text-muted-foreground">/ {row.availableUnits}</span>
                            </div>
                          </div>
                        )}
                        {!selected && (
                          <p className="text-[11px] text-muted-foreground">
                            {row.totalUnits} total · {row.availableUnits} currently available
                          </p>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {row.distanceMiles != null ? (
                      <span className="text-sm font-medium">{row.distanceMiles} mi</span>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline">{SKILL_LEVEL_LABELS[row.skillLevel]}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    {row.staffRating && (
                      <Badge variant="outline" className={RATING_COLORS[row.staffRating]}>
                        {RATING_LABELS[row.staffRating]}
                      </Badge>
                    )}
                  </td>
                  {showInvitationStatus && (
                    <td className="px-4 py-3">
                      {getInvitationBadge(row.invitationStatus, row.invitationConfirmed)}
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {getLocationBadge(row.locationMatch)}
                      <span className="text-sm text-muted-foreground">
                        {row.city}, {row.state}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {row.hasConflict && row.conflicts && row.conflicts.length > 0 ? (
                      <div className="space-y-1 min-w-[180px]">
                        {row.conflicts.map((c, idx) => (
                          <div key={idx} className="bg-orange-100/30 p-2 rounded border border-orange-200/50 text-xs shadow-sm">
                            <p className="font-bold text-orange-900 truncate mb-1" title={c.eventTitle}>
                              {c.eventTitle}
                            </p>
                            <div className="flex flex-col gap-1 text-[11px] text-orange-700 font-medium">
                              <span className="flex items-center gap-1.5">
                                <svg className="w-3.5 h-3.5 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                {new Date(c.startDate).toLocaleDateString()}
                                {c.startTime ? ` • ${c.startTime}` : ''}
                              </span>
                              {c.city && (
                                <span className="flex items-center gap-1.5 opacity-80">
                                  <svg className="w-3.5 h-3.5 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                  {c.city}, {c.state}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full uppercase tracking-wider">Clear</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-muted-foreground truncate max-w-[200px] block">
                      {row.internalNotes || '—'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
