'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SearchIcon, EyeIcon, CheckIcon, ClockIcon, SendIcon } from '@/components/ui/icons';
import type { GroupedAssignment } from '@/lib/utils/call-time-grouping';
import { useStaffTerm } from '@/lib/hooks/use-terminology';

interface AssignmentExpandedRowProps {
  group: GroupedAssignment;
  onFindTalent: (callTimeId: string) => void;
  onViewDetails: (callTimeId: string) => void;
  onSendInvitations?: (callTimeId: string) => void;
}

export function AssignmentExpandedRow({
  group,
  onFindTalent,
  onViewDetails,
  onSendInvitations,
}: AssignmentExpandedRowProps) {
  const staffTerm = useStaffTerm();

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

  const hasAssignedTalent = confirmedInvitations.length > 0 || pendingInvitations.length > 0 || waitlistedInvitations.length > 0;

  return (
    <div className="p-4 bg-muted/10 border-t border-border">
      <div className="space-y-4">
        {/* Talents Section */}
        <div>
          <h4 className="text-sm font-medium text-foreground mb-2">
            {staffTerm.plural} Assigned
          </h4>

          {!hasAssignedTalent ? (
            <p className="text-sm text-muted-foreground italic">
              No {staffTerm.lowerPlural} assigned yet
            </p>
          ) : (
            <div className="space-y-2">
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

              {/* Waitlisted (Accepted but not confirmed) */}
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
                      <span className="text-xs opacity-75">(Waitlist)</span>
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
                      <span className="text-xs opacity-75">(Pending)</span>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions Section */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onFindTalent(group.primaryCallTimeId);
            }}
          >
            <SearchIcon className="h-4 w-4 mr-1" />
            Find {staffTerm.singular}
          </Button>

          {onSendInvitations && group.needsStaff && (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onSendInvitations(group.primaryCallTimeId);
              }}
            >
              <SendIcon className="h-4 w-4 mr-1" />
              Send Invitations
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onViewDetails(group.primaryCallTimeId);
            }}
          >
            <EyeIcon className="h-4 w-4 mr-1" />
            View Full Details
          </Button>

          {/* Show info about multiple call times if grouped */}
          {group.callTimeIds.length > 1 && (
            <span className="text-xs text-muted-foreground ml-auto">
              {group.callTimeIds.length} positions grouped
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
