'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EyeIcon, MapPinIcon, CalendarIcon, TrashIcon, DocumentDuplicateIcon, BellIcon } from '@/components/ui/icons';
import { formatRate } from '@/lib/utils/currency-formatter';
import { format } from 'date-fns';
import type { AssignmentData } from './assignment-table';

interface AssignmentMobileCardProps {
  assignment: AssignmentData;
  onView?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onSendReminder?: () => void;
  // Selection support
  selectable?: boolean;
  selected?: boolean;
  onSelect?: () => void;
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

function getPayRateValue(payRate: AssignmentData['payRate']): number {
  if (typeof payRate === 'number') return payRate;
  if (typeof payRate === 'string') return parseFloat(payRate);
  if (payRate && typeof payRate === 'object' && 'toNumber' in payRate && payRate.toNumber) {
    return payRate.toNumber();
  }
  return 0;
}

export function AssignmentMobileCard({
  assignment,
  onView,
  onDelete,
  onDuplicate,
  onSendReminder,
  selectable = false,
  selected = false,
  onSelect,
}: AssignmentMobileCardProps) {
  const startDate = typeof assignment.startDate === 'string'
    ? new Date(assignment.startDate)
    : assignment.startDate;

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
          <Badge variant={assignment.needsStaff ? 'warning' : 'success'}>
            {assignment.needsStaff ? 'Needs Staff' : 'Filled'}
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={onView}
            title="View Details"
          >
            <EyeIcon className="h-4 w-4" />
          </Button>
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
          {onSendReminder && assignment.confirmedCount > 0 && (
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
        {assignment.service?.title || 'No Position'}
      </h3>
      <p className="text-sm text-muted-foreground mb-2">
        {assignment.event.title}
      </p>

      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
        <CalendarIcon className="h-4 w-4" />
        <span>
          {format(startDate, 'EEE, MMM d')} &middot; {formatTime(assignment.startTime)} - {formatTime(assignment.endTime)}
        </span>
      </div>

      {(assignment.event.venueName || assignment.event.city) && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
          <MapPinIcon className="h-4 w-4" />
          <span>
            {assignment.event.venueName}
            {assignment.event.city && `, ${assignment.event.city}`}
            {assignment.event.state && `, ${assignment.event.state}`}
          </span>
        </div>
      )}

      <div className="flex items-center justify-between pt-3 border-t border-border">
        <div className="flex items-center gap-1">
          <span className={`font-medium ${assignment.needsStaff ? 'text-yellow-600' : 'text-green-600'}`}>
            {assignment.confirmedCount}/{assignment.numberOfStaffRequired}
          </span>
          <span className="text-sm text-muted-foreground">Staff Filled</span>
        </div>
        <span className="text-sm font-medium text-foreground">
          {formatRate(getPayRateValue(assignment.payRate), assignment.payRateType)}
        </span>
      </div>
    </Card>
  );
}
