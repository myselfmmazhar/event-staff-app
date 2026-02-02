'use client';

import { CallTimeCard } from './call-time-card';
import { Button } from '@/components/ui/button';
import { PlusIcon } from '@/components/ui/icons';
import { SkillLevel, RateType, CallTimeInvitationStatus } from '@prisma/client';
import { useEventTerm } from '@/lib/hooks/use-terminology';

interface CallTime {
  id: string;
  callTimeId: string;
  service: { title: string };
  numberOfStaffRequired: number;
  skillLevel: SkillLevel;
  startDate: Date;
  startTime: string | null;
  endDate: Date;
  endTime: string | null;
  payRate: number | { toNumber: () => number };
  payRateType: RateType;
  confirmedCount: number;
  invitations: Array<{
    status: CallTimeInvitationStatus;
  }>;
}

interface CallTimeListProps {
  callTimes: CallTime[];
  onView: (callTime: CallTime) => void;
  onEdit: (callTime: CallTime) => void;
  onDelete: (callTime: CallTime) => void;
  onCreate: () => void;
  isLoading?: boolean;
}

export function CallTimeList({
  callTimes,
  onView,
  onEdit,
  onDelete,
  onCreate,
  isLoading,
}: CallTimeListProps) {
  const eventTerm = useEventTerm();

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-32 bg-muted/50 animate-pulse rounded-lg"
          />
        ))}
      </div>
    );
  }

  if (callTimes.length === 0) {
    return (
      <div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
        <h3 className="text-lg font-medium mb-2">No call times yet</h3>
        <p className="text-muted-foreground mb-4">
          Create your first call time to start staffing this {eventTerm.lower}.
        </p>
        <Button onClick={onCreate}>
          <PlusIcon className="h-4 w-4 mr-2" />
          Create Call Time
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {callTimes.map((callTime) => (
        <CallTimeCard
          key={callTime.id}
          callTime={callTime}
          onView={() => onView(callTime)}
          onEdit={() => onEdit(callTime)}
          onDelete={() => onDelete(callTime)}
        />
      ))}
    </div>
  );
}
