'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CallTimeInvitationStatus } from '@prisma/client';
import { INVITATION_STATUS_LABELS } from '@/lib/schemas/call-time.schema';
import { RefreshCwIcon, XIcon } from '@/components/ui/icons';
import { useStaffTerm } from '@/lib/hooks/use-terminology';
import { useState } from 'react';
import { ConfirmModal } from '@/components/common/confirm-modal';

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
  onAcceptOnBehalf?: (invitationId: string) => void;
  isResending?: string;
  isCancelling?: string;
  isAccepting?: string;
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
  isAccepting,
  onAcceptOnBehalf,
}: InvitationListProps) {
  const staffTerm = useStaffTerm();

  const [resendTarget, setResendTarget] = useState<Invitation | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Invitation | null>(null);
  const [acceptTarget, setAcceptTarget] = useState<Invitation | null>(null);

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
          No offers sent yet. Search for {staffTerm.lowerPlural} and send offers.
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
                onClick={() => setResendTarget(invitation)}
                disabled={isResending === invitation.id}
                title="Resend offer"
              >
                <RefreshCwIcon
                  className={`h-4 w-4 ${isResending === invitation.id ? 'animate-spin' : ''}`}
                />
              </Button>
            )}
          {invitation.status === 'PENDING' && (
            <>
              {onAcceptOnBehalf && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAcceptTarget(invitation)}
                  disabled={isAccepting === invitation.id}
                  title="Accept for User"
                >
                  Accept
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setResendTarget(invitation)}
                disabled={isResending === invitation.id}
                title="Resend offer"
              >
                Resend
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => setCancelTarget(invitation)}
                disabled={isCancelling === invitation.id}
                title="Cancel offer"
                className="hover:bg-destructive/90"
              >
                Cancel
              </Button>
            </>
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

      {/* Modals */}
      {resendTarget && (
        <ConfirmModal
          open={!!resendTarget}
          onClose={() => setResendTarget(null)}
          onConfirm={() => {
            onResend(resendTarget.id);
            setResendTarget(null);
          }}
          title="Resend Invitation"
          description={`Are you sure you want to resend the invitation to ${resendTarget.staff.firstName} ${resendTarget.staff.lastName}?`}
          confirmText="Resend"
          cancelText="Cancel"
          variant="default"
        >
          <div className="py-2">
            <p className="text-sm text-foreground">
              A new invitation email will be sent to <span className="font-semibold">{resendTarget.staff.email}</span>. The previous invitation link will be invalidated.
            </p>
          </div>
        </ConfirmModal>
      )}

      {acceptTarget && (
        <ConfirmModal
          open={!!acceptTarget}
          onClose={() => setAcceptTarget(null)}
          onConfirm={() => {
            onAcceptOnBehalf?.(acceptTarget.id);
            setAcceptTarget(null);
          }}
          title="Accept Invitation"
          description={`Are you sure you want to accept the invitation on behalf of ${acceptTarget.staff.firstName} ${acceptTarget.staff.lastName}?`}
          confirmText="Accept"
          cancelText="Cancel"
          variant="default"
        >
          <div className="py-2">
            <p className="text-sm text-foreground">
              This will confirm the offer for <span className="font-semibold">{acceptTarget.staff.email}</span> and assign them to the position.
            </p>
          </div>
        </ConfirmModal>
      )}

      {cancelTarget && (
        <ConfirmModal
          open={!!cancelTarget}
          onClose={() => setCancelTarget(null)}
          onConfirm={() => {
            onCancel(cancelTarget.id);
            setCancelTarget(null);
          }}
          title="Cancel Invitation"
          description={`Are you sure you want to cancel the invitation for ${cancelTarget.staff.firstName} ${cancelTarget.staff.lastName}?`}
          confirmText="Cancel Invitation"
          cancelText="Keep Invitation"
          variant="danger"
        >
          <div className="py-2">
            <p className="text-sm text-foreground">
              This will cancel the pending offer. <span className="font-semibold">{cancelTarget.staff.email}</span> will be notified of the cancellation.
            </p>
          </div>
        </ConfirmModal>
      )}
    </div>
  );
}
