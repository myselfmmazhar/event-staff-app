'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CallTimeInvitationStatus } from '@prisma/client';
import { INVITATION_STATUS_LABELS } from '@/lib/schemas/call-time.schema';
import { RefreshCwIcon, XIcon } from '@/components/ui/icons';
import { useStaffTerm } from '@/lib/hooks/use-terminology';

interface Invitation {
  id: string;
  status: CallTimeInvitationStatus;
  isConfirmed: boolean;
  respondedAt: Date | null;
  declineReason: string | null;
  createdAt: Date;
  staff: {
    id: string;
    staffId: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

interface InvitationListProps {
  invitations: Invitation[];
  onResend: (invitationId: string) => void;
  onCancel: (invitationId: string) => void;
  isResending?: string;
  isCancelling?: string;
}

const STATUS_VARIANTS: Record<CallTimeInvitationStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  PENDING: 'secondary',
  ACCEPTED: 'default',
  DECLINED: 'destructive',
  CANCELLED: 'outline',
  WAITLISTED: 'secondary',
};

export function InvitationList({
  invitations,
  onResend,
  onCancel,
  isResending,
  isCancelling,
}: InvitationListProps) {
  const staffTerm = useStaffTerm();

  const formatDate = (date: Date | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  if (invitations.length === 0) {
    return (
      <div className="text-center py-8 border border-dashed border-border rounded-lg">
        <p className="text-muted-foreground">
          No invitations sent yet. Search for {staffTerm.lowerPlural} and send invitations.
        </p>
      </div>
    );
  }

  // Group invitations by status
  const confirmed = invitations.filter(
    (inv) => inv.status === 'ACCEPTED' && inv.isConfirmed
  );
  const waitlisted = invitations.filter(
    (inv) => inv.status === 'WAITLISTED' || (inv.status === 'ACCEPTED' && !inv.isConfirmed)
  );
  const pending = invitations.filter((inv) => inv.status === 'PENDING');
  const declined = invitations.filter((inv) => inv.status === 'DECLINED');
  const cancelled = invitations.filter((inv) => inv.status === 'CANCELLED');

  const renderInvitation = (invitation: Invitation) => (
    <div
      key={invitation.id}
      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30"
    >
      <div className="flex items-center gap-4">
        <div>
          <p className="font-medium">
            {invitation.staff.firstName} {invitation.staff.lastName}
          </p>
          <p className="text-sm text-muted-foreground">
            {invitation.staff.email}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right text-sm">
          <Badge variant={STATUS_VARIANTS[invitation.status]}>
            {INVITATION_STATUS_LABELS[invitation.status]}
            {invitation.status === 'ACCEPTED' && invitation.isConfirmed && ' (Confirmed)'}
          </Badge>
          {invitation.respondedAt && (
            <p className="text-muted-foreground mt-1">
              {formatDate(invitation.respondedAt)}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1">
          {(invitation.status === 'DECLINED' ||
            invitation.status === 'CANCELLED') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onResend(invitation.id)}
              disabled={isResending === invitation.id}
              title="Resend invitation"
            >
              <RefreshCwIcon
                className={`h-4 w-4 ${isResending === invitation.id ? 'animate-spin' : ''}`}
              />
            </Button>
          )}
          {invitation.status === 'PENDING' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onCancel(invitation.id)}
              disabled={isCancelling === invitation.id}
              title="Cancel invitation"
              className="text-destructive hover:text-destructive"
            >
              <XIcon className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {confirmed.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-2">
            Confirmed ({confirmed.length})
          </h4>
          <div className="space-y-2">
            {confirmed.map(renderInvitation)}
          </div>
        </div>
      )}

      {waitlisted.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-2">
            Waitlisted ({waitlisted.length})
          </h4>
          <div className="space-y-2">
            {waitlisted.map(renderInvitation)}
          </div>
        </div>
      )}

      {pending.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-2">
            Pending ({pending.length})
          </h4>
          <div className="space-y-2">
            {pending.map(renderInvitation)}
          </div>
        </div>
      )}

      {declined.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-2">
            Declined ({declined.length})
          </h4>
          <div className="space-y-2">
            {declined.map((invitation) => (
              <div key={invitation.id}>
                {renderInvitation(invitation)}
                {invitation.declineReason && (
                  <p className="text-sm text-muted-foreground ml-3 mt-1 italic">
                    Reason: {invitation.declineReason}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {cancelled.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-2">
            Cancelled ({cancelled.length})
          </h4>
          <div className="space-y-2">
            {cancelled.map(renderInvitation)}
          </div>
        </div>
      )}
    </div>
  );
}
