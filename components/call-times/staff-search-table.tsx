'use client';

import { useEffect, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { SkillLevel, AvailabilityStatus } from '@prisma/client';
import { useStaffTerm } from '@/lib/hooks/use-terminology';

interface Staff {
  id: string;
  staffId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  skillLevel: SkillLevel;
  availabilityStatus: AvailabilityStatus;
  city: string;
  state: string;
  country: string;
  locationMatch: number;
  positions: Array<{
    position: { id: string; name: string };
  }>;
}

interface StaffSearchTableProps {
  staff: Staff[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  isLoading?: boolean;
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

export function StaffSearchTable({
  staff,
  selectedIds,
  onSelectionChange,
  isLoading,
}: StaffSearchTableProps) {
  const staffTerm = useStaffTerm();
  const allSelected = staff.length > 0 && selectedIds.length === staff.length;
  const someSelected = selectedIds.length > 0 && selectedIds.length < staff.length;

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
      onSelectionChange(staff.map((s) => s.id));
    }
  };

  const handleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((i) => i !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
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

  return (
    <div className="border rounded-lg overflow-hidden">
      <table className="w-full">
        <thead className="bg-muted/50">
          <tr>
            <th className="w-12 px-4 py-3 text-left">
              <Checkbox
                ref={selectAllRef}
                checked={allSelected}
                onChange={handleSelectAll}
              />
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium">{staffTerm.singular}</th>
            <th className="px-4 py-3 text-left text-sm font-medium">Contact</th>
            <th className="px-4 py-3 text-left text-sm font-medium">Skill</th>
            <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
            <th className="px-4 py-3 text-left text-sm font-medium">Location</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {staff.map((member) => (
            <tr
              key={member.id}
              className={`hover:bg-muted/30 cursor-pointer ${
                selectedIds.includes(member.id) ? 'bg-primary/5' : ''
              }`}
              onClick={() => handleSelectOne(member.id)}
            >
              <td className="px-4 py-3">
                <Checkbox
                  checked={selectedIds.includes(member.id)}
                  onChange={() => handleSelectOne(member.id)}
                  onClick={(e) => e.stopPropagation()}
                />
              </td>
              <td className="px-4 py-3">
                <div>
                  <p className="font-medium">
                    {member.firstName} {member.lastName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {member.staffId}
                  </p>
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="text-sm">
                  <p>{member.email}</p>
                  <p className="text-muted-foreground">{member.phone}</p>
                </div>
              </td>
              <td className="px-4 py-3">
                <Badge variant="outline">
                  {SKILL_LEVEL_LABELS[member.skillLevel]}
                </Badge>
              </td>
              <td className="px-4 py-3">
                <Badge
                  variant={
                    member.availabilityStatus === 'OPEN_TO_OFFERS'
                      ? 'default'
                      : 'secondary'
                  }
                >
                  {AVAILABILITY_LABELS[member.availabilityStatus]}
                </Badge>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  {getLocationBadge(member.locationMatch)}
                  <span className="text-sm text-muted-foreground">
                    {member.city}, {member.state}
                  </span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
