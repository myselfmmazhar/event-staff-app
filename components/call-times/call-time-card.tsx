'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  RATE_TYPE_LABELS,
  INVITATION_STATUS_LABELS,
} from '@/lib/schemas/call-time.schema';
import { SkillLevel, RateType, CallTimeInvitationStatus } from '@prisma/client';
import { EditIcon, TrashIcon, UsersIcon, EyeIcon } from '@/components/ui/icons';

interface CallTimeCardProps {
  callTime: {
    id: string;
    callTimeId: string;
    position: { name: string };
    numberOfStaffRequired: number;
    skillLevel: SkillLevel;
    startDate: Date;
    startTime: string | null;
    endDate: Date;
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

const SKILL_LEVEL_LABELS: Record<SkillLevel, string> = {
  BEGINNER: 'Beginner',
  INTERMEDIATE: 'Intermediate',
  ADVANCED: 'Advanced',
};

export function CallTimeCard({
  callTime,
  onView,
  onEdit,
  onDelete,
}: CallTimeCardProps) {
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (time: string | null) => {
    if (!time) return 'TBD';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    return `${hour > 12 ? hour - 12 : hour}:${minutes} ${hour >= 12 ? 'PM' : 'AM'}`;
  };

  const payRate =
    typeof callTime.payRate === 'object'
      ? callTime.payRate.toNumber()
      : Number(callTime.payRate);

  const isSameDay =
    new Date(callTime.startDate).toDateString() ===
    new Date(callTime.endDate).toDateString();

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
              {callTime.position.name}
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
                {formatDate(callTime.startDate)}
                {!isSameDay && ` - ${formatDate(callTime.endDate)}`}
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
                ${payRate.toFixed(2)} {RATE_TYPE_LABELS[callTime.payRateType].toLowerCase()}
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
