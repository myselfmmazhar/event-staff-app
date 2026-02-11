'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  SettingsIcon,
  MapPinIcon,
  CalendarIcon,
  TrashIcon,
  DocumentDuplicateIcon,
  BellIcon,
  SearchIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CheckIcon,
  ClockIcon,
} from '@/components/ui/icons';
import { formatRate } from '@/lib/utils/currency-formatter';
import { format } from 'date-fns';
import type { GroupedAssignment } from '@/lib/utils/call-time-grouping';
import { useStaffTerm } from '@/lib/hooks/use-terminology';

interface GroupedAssignmentMobileCardProps {
  group: GroupedAssignment;
  onManage?: () => void;
  onFindTalent?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onSendReminder?: () => void;
  selectable?: boolean;
  selected?: boolean;
  onSelect?: () => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

function formatTime(time: string | null): string {
  if (!time) return '';
  const parts = time.split(':');
  if (parts.length < 2) return '';
  const hours = parts[0] || '0';
  const minutes = parts[1] || '00';
  const hour = parseInt(hours, 10);
  if (isNaN(hour)) return '';
  const ampm = hour >= 12 ? 'pm' : 'am';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes}${ampm}`;
}

export function GroupedAssignmentMobileCard({
  group,
  onManage,
  onFindTalent,
  onDelete,
  onDuplicate,
  onSendReminder,
  selectable = false,
  selected = false,
  onSelect,
  isExpanded = false,
  onToggleExpand,
}: GroupedAssignmentMobileCardProps) {
  const staffTerm = useStaffTerm();
  const startDate = typeof group.startDate === 'string'
    ? new Date(group.startDate)
    : group.startDate;

  // Group invitations by status
  const confirmedInvitations = group.invitations.filter(
    (inv) => inv.status === 'ACCEPTED' && inv.isConfirmed
  );
  const pendingInvitations = group.invitations.filter(
    (inv) => inv.status === 'PENDING'
  );
  const waitlistedInvitations = group.invitations.filter(
    (inv) => inv.status === 'ACCEPTED' && !inv.isConfirmed
  );

  return (
    <Card className={`p-4 ${selected ? 'ring-2 ring-primary' : ''}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          {selectable && (
            <input
              type="checkbox"
              checked={selected}
              onChange={onSelect}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
          )}
          <Badge variant={group.needsStaff ? 'warning' : 'success'}>
            {group.needsStaff ? 'Needs Staff' : 'Filled'}
          </Badge>
          {group.callTimeIds.length > 1 && (
            <Badge variant="secondary" size="sm">
              x{group.callTimeIds.length}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          {onManage && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={onManage}
              title="Manage Assignment"
            >
              <SettingsIcon className="h-4 w-4" />
            </Button>
          )}
          {onFindTalent && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={onFindTalent}
              title="Find Talent"
            >
              <SearchIcon className="h-4 w-4" />
            </Button>
          )}
          {onDuplicate && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={onDuplicate}
              title="Duplicate Assignment"
            >
              <DocumentDuplicateIcon className="h-4 w-4" />
            </Button>
          )}
          {onSendReminder && group.confirmedCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={onSendReminder}
              title="Send Reminder"
            >
              <BellIcon className="h-4 w-4" />
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
              onClick={onDelete}
              title="Delete Assignment"
            >
              <TrashIcon className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <h3 className="font-semibold text-foreground mb-1">
        {group.serviceName}
      </h3>
      <p className="text-sm text-muted-foreground mb-2">
        {group.event.title}
      </p>

      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
        <CalendarIcon className="h-4 w-4" />
        <span>
          {format(startDate, 'EEE, MMM d')} &middot; {formatTime(group.startTime)} - {formatTime(group.endTime)}
        </span>
      </div>

      {(group.event.venueName || group.event.city) && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
          <MapPinIcon className="h-4 w-4" />
          <span>
            {group.event.venueName}
            {group.event.city && `, ${group.event.city}`}
            {group.event.state && `, ${group.event.state}`}
          </span>
        </div>
      )}

      <div className="flex items-center justify-between pt-3 border-t border-border">
        <div className="flex items-center gap-1">
          <span className={`font-medium ${group.needsStaff ? 'text-yellow-600' : 'text-green-600'}`}>
            {group.confirmedCount}/{group.numberOfStaffRequired}
          </span>
          <span className="text-sm text-muted-foreground">Staff Filled</span>
        </div>
        <span className="text-sm font-medium text-foreground">
          {formatRate(group.payRate, group.payRateType)}
        </span>
      </div>

      {/* Expandable Section */}
      {onToggleExpand && (
        <div className="mt-3 pt-3 border-t border-border">
          <button
            type="button"
            onClick={onToggleExpand}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full"
          >
            {isExpanded ? (
              <ChevronDownIcon className="h-4 w-4" />
            ) : (
              <ChevronRightIcon className="h-4 w-4" />
            )}
            <span>{isExpanded ? 'Hide' : 'Show'} {staffTerm.plural}</span>
          </button>

          {isExpanded && (
            <div className="mt-3 space-y-2">
              {confirmedInvitations.length === 0 && pendingInvitations.length === 0 && waitlistedInvitations.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">
                  No {staffTerm.lowerPlural} assigned yet
                </p>
              ) : (
                <>
                  {/* Confirmed */}
                  {confirmedInvitations.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {confirmedInvitations.map((inv) => (
                        <Badge
                          key={inv.id}
                          variant="success"
                          className="flex items-center gap-1"
                        >
                          <CheckIcon className="h-3 w-3" />
                          {inv.staff.firstName} {inv.staff.lastName}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Waitlisted */}
                  {waitlistedInvitations.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {waitlistedInvitations.map((inv) => (
                        <Badge
                          key={inv.id}
                          variant="info"
                          className="flex items-center gap-1"
                        >
                          <ClockIcon className="h-3 w-3" />
                          {inv.staff.firstName} {inv.staff.lastName}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Pending */}
                  {pendingInvitations.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {pendingInvitations.map((inv) => (
                        <Badge
                          key={inv.id}
                          variant="warning"
                          className="flex items-center gap-1"
                        >
                          <ClockIcon className="h-3 w-3" />
                          {inv.staff.firstName} {inv.staff.lastName}
                        </Badge>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
