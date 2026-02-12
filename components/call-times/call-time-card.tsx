'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SkillLevel, RateType, CallTimeInvitationStatus } from '@prisma/client';
import { EditIcon, TrashIcon, UsersIcon, EyeIcon } from '@/components/ui/icons';
import { SKILL_LEVEL_LABELS } from '@/lib/constants';
import { formatDateShort, formatTime, isSameDay } from '@/lib/utils/date-formatter';
import { formatRateCompact } from '@/lib/utils/currency-formatter';

interface CallTimeCardProps {
  callTime: {
    id: string;
    callTimeId: string;
    service: { title: string } | null;
    numberOfStaffRequired: number;
    skillLevel: SkillLevel;
    startDate: Date | null;
    startTime: string | null;
    endDate: Date | null;
    endTime: string | null;
    payRate: number | string | { toNumber: () => number };
    payRateType: RateType;
    confirmedCount: number;
    invitations: Array<{
      status: CallTimeInvitationStatus;
    }>;
  };
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function CallTimeCard({
  callTime,
  onView,
  onEdit,
  onDelete,
}: CallTimeCardProps) {
  const sameDay = isSameDay(callTime.startDate, callTime.endDate);

  const pendingCount = callTime.invitations.filter(
    (inv) => inv.status === 'PENDING'
  ).length;
  const acceptedCount = callTime.invitations.filter(
    (inv) => inv.status === 'ACCEPTED'
  ).length;

  const isFilled = callTime.confirmedCount >= callTime.numberOfStaffRequired;

  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-semibold text-lg truncate">
              {callTime.service?.title || 'No Service'}
            </h3>
            <Badge variant={isFilled ? 'default' : 'secondary'}>
              {callTime.confirmedCount}/{callTime.numberOfStaffRequired} filled
            </Badge>
          </div>

          {/* Call Time ID */}
          <p className="text-sm text-muted-foreground mb-3">
            {callTime.callTimeId}
          </p>

          {/* Details Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground">Date</p>
              <p className="font-medium">
                {formatDateShort(callTime.startDate)}
                {!sameDay && ` - ${formatDateShort(callTime.endDate)}`}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Time</p>
              <p className="font-medium">
                {formatTime(callTime.startTime)} - {formatTime(callTime.endTime)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Pay Rate</p>
              <p className="font-medium">
                {formatRateCompact(callTime.payRate, callTime.payRateType)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Skill Level</p>
              <p className="font-medium">
                {SKILL_LEVEL_LABELS[callTime.skillLevel]}
              </p>
            </div>
          </div>

          {/* Invitation Status */}
          {callTime.invitations.length > 0 && (
            <div className="flex items-center gap-2 mt-3 text-sm">
              <UsersIcon className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                {pendingCount} pending, {acceptedCount} accepted
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onView}
            title="View details"
          >
            <EyeIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onEdit}
            title="Edit"
          >
            <EditIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            title="Delete"
            className="text-destructive hover:text-destructive"
          >
            <TrashIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
