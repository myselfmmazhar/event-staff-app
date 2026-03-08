'use client';

import { useEffect, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { SkillLevel, AvailabilityStatus, StaffRating } from '@prisma/client';
import { useStaffTerm } from '@/lib/hooks/use-terminology';
import { AlertIcon } from '@/components/ui/icons';

interface Staff {
  id: string;
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
  services?: Array<{
    service: { id: string; title: string };
  }>;
}

interface StaffSearchTableProps {
  staff: Staff[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  isLoading?: boolean;
  showInvitationStatus?: boolean;
}

const SKILL_LEVEL_LABELS: Record<SkillLevel, string> = {
  BEGINNER: 'Beginner',
  INTERMEDIATE: 'Intermediate',
  ADVANCED: 'Advanced',
};

const AVAILABILITY_LABELS: Record<AvailabilityStatus, string> = {
  OPEN_TO_OFFERS: 'Available',
  BUSY: 'Busy',
  TIME_OFF: 'Time Off',
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
  staff,
  selectedIds,
  onSelectionChange,
  isLoading,
  showInvitationStatus = false,
}: StaffSearchTableProps) {
  const staffTerm = useStaffTerm();

  // Filter out unregistered staff from selection counts
  const registeredStaff = staff.filter((s) => s.userId);
  const allSelected = registeredStaff.length > 0 &&
    registeredStaff.every((s) => selectedIds.includes(s.id));
  const someSelected = selectedIds.length > 0 && !allSelected;

  // Track the indeterminate state of the "select all" checkbox
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
      // Only select registered staff
      onSelectionChange(registeredStaff.map((s) => s.id));
    }
  };

  const handleSelectOne = (member: Staff) => {
    // Don't allow selecting unregistered staff
    if (!member.userId) return;

    if (selectedIds.includes(member.id)) {
      onSelectionChange(selectedIds.filter((i) => i !== member.id));
    } else {
      onSelectionChange([...selectedIds, member.id]);
    }
  };

  const getLocationBadge = (locationMatch: number) => {
    if (locationMatch >= 100) {
      return <Badge variant="default">Same City</Badge>;
    } else if (locationMatch >= 50) {
      return <Badge variant="secondary">Same State</Badge>;
    }
    return <Badge variant="outline">Other</Badge>;
  };

  const isUnregistered = (member: Staff) => !member.userId;

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="h-16 bg-muted/50 animate-pulse rounded-md"
          />
        ))}
      </div>
    );
  }

  if (staff.length === 0) {
    return (
      <div className="text-center py-8 border border-dashed border-border rounded-lg">
        <p className="text-muted-foreground">
          No available {staffTerm.lowerPlural} found matching the requirements.
        </p>
      </div>
    );
  }

  const unregisteredCount = staff.filter(isUnregistered).length;

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

      <div className="border rounded-lg overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="w-12 px-4 py-3 text-left">
                <Checkbox
                  ref={selectAllRef}
                  checked={allSelected}
                  onChange={handleSelectAll}
                  disabled={registeredStaff.length === 0}
                />
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium">{staffTerm.singular}</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Distance</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Skill</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Rating</th>
              {/* <th className="px-4 py-3 text-left text-sm font-medium">Status</th> */}
              {showInvitationStatus && (
                <th className="px-4 py-3 text-left text-sm font-medium">Invitation</th>
              )}
              <th className="px-4 py-3 text-left text-sm font-medium whitespace-nowrap">Location</th>
              <th className="px-4 py-3 text-left text-sm font-medium whitespace-nowrap">Conflict</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Internal Comments</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {staff.map((member) => {
              const unregistered = isUnregistered(member);
              return (
                <tr
                  key={member.id}
                  className={`
                    ${unregistered
                      ? 'opacity-60 cursor-not-allowed bg-muted/20'
                      : 'hover:bg-muted/30 cursor-pointer'
                    }
                    ${selectedIds.includes(member.id) && !unregistered ? 'bg-primary/5' : ''}
                  `}
                  onClick={() => handleSelectOne(member)}
                  title={unregistered ? 'This staff member must complete registration first' : undefined}
                >
                  <td className="px-4 py-3">
                    <Checkbox
                      checked={selectedIds.includes(member.id)}
                      onChange={() => handleSelectOne(member)}
                      onClick={(e) => e.stopPropagation()}
                      disabled={unregistered}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div>
                        <p className="font-medium flex items-center gap-2">
                          {member.firstName} {member.lastName}
                          {unregistered && (
                            <Badge variant="warning" className="text-xs">
                              Not Registered
                            </Badge>
                          )}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {member.staffId}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {member.distanceMiles != null ? (
                      <span className="text-sm font-medium">{member.distanceMiles} mi</span>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline">
                      {SKILL_LEVEL_LABELS[member.skillLevel]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    {member.staffRating && (
                      <Badge
                        variant="outline"
                        className={RATING_COLORS[member.staffRating]}
                      >
                        {RATING_LABELS[member.staffRating]}
                      </Badge>
                    )}
                  </td>
                  {/* <td className="px-4 py-3">
                    <Badge
                      variant={
                        member.availabilityStatus === 'OPEN_TO_OFFERS'
                          ? 'default'
                          : 'secondary'
                      }
                    >
                      {AVAILABILITY_LABELS[member.availabilityStatus]}
                    </Badge>
                  </td> */}
                  {showInvitationStatus && (
                    <td className="px-4 py-3">
                      {getInvitationBadge(member.invitationStatus, member.invitationConfirmed)}
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {getLocationBadge(member.locationMatch)}
                      <span className="text-sm text-muted-foreground">
                        {member.city}, {member.state}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {member.hasConflict && member.conflicts && member.conflicts.length > 0 ? (
                      <div className="space-y-1 min-w-[180px]">
                        {member.conflicts.map((c, idx) => (
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
                      {member.internalNotes || '—'}
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
