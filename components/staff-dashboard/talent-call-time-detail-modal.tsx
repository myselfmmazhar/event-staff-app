'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  CloseIcon,
  DocumentTextIcon,
  EnvelopeIcon,
  MailIcon,
  MapPinIcon,
  PhoneIcon,
  UserIcon,
} from '@/components/ui/icons';
import { trpc } from '@/lib/client/trpc';
import { RATE_TYPE_LABELS } from '@/lib/schemas/call-time.schema';
import { useEventTerm } from '@/lib/hooks/use-terminology';
import { useTalentTimezone } from '@/lib/hooks/use-talent-timezone';
import { convertWallClock, shortTzLabel } from '@/lib/utils/timezone-convert';
import { isDateNullOrUBD, isSameDay as checkSameDay } from '@/lib/utils/date-formatter';
import type { RateType, SkillLevel } from '@prisma/client';

interface TalentCallTimeDetailModalProps {
  invitationId: string | null;
  open: boolean;
  onClose: () => void;
}

const SKILL_LEVEL_LABELS: Record<SkillLevel, string> = {
  BEGINNER: 'Beginner',
  INTERMEDIATE: 'Intermediate',
  ADVANCED: 'Advanced',
};

interface EventDocumentLike {
  name: string;
  url: string;
  type?: string;
  size?: number;
}

function formatDate(date: Date | string | null | undefined) {
  if (!date) return 'UBD';
  const d = new Date(date);
  if (d.getFullYear() === 1970) return 'UBD';
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTime(time: string | null | undefined) {
  if (!time) return 'TBD';
  const [hours, minutes] = time.split(':');
  if (!hours || !minutes) return 'TBD';
  const hour = Number.parseInt(hours, 10);
  if (Number.isNaN(hour)) return 'TBD';
  return `${hour > 12 ? hour - 12 : hour === 0 ? 12 : hour}:${minutes} ${hour >= 12 ? 'PM' : 'AM'}`;
}

function getStatusBadge(status: string, isConfirmed: boolean) {
  if (status === 'ACCEPTED' && isConfirmed) {
    return <Badge variant="success">Confirmed</Badge>;
  }
  if (status === 'ACCEPTED') {
    return <Badge variant="warning">Waitlisted</Badge>;
  }
  if (status === 'PENDING') {
    return <Badge variant="secondary">Pending</Badge>;
  }
  if (status === 'DECLINED') {
    return <Badge variant="destructive">Declined</Badge>;
  }
  return <Badge variant="outline">{status}</Badge>;
}

export function TalentCallTimeDetailModal({
  invitationId,
  open,
  onClose,
}: TalentCallTimeDetailModalProps) {
  const eventTerm = useEventTerm();
  const { timezone: talentTz } = useTalentTimezone();
  const hasInvitationId = Boolean(invitationId);

  const { data: invitation, isLoading } = trpc.callTime.getInvitationById.useQuery(
    { invitationId: invitationId ?? '' },
    { enabled: hasInvitationId && open }
  );

  if (!open) return null;

  if (isLoading || !invitation) {
    return (
      <Dialog open={open} onClose={onClose} className="max-w-5xl w-[90vw]">
        <DialogContent>
          <div className="h-96 flex items-center justify-center">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const callTime = invitation.callTime;
  const event = callTime.event;
  const eventTz = (event as { timezone?: string | null }).timezone || 'UTC';

  const payRate =
    typeof callTime.payRate === 'object' && callTime.payRate !== null && 'toNumber' in callTime.payRate
      ? (callTime.payRate as { toNumber: () => number }).toNumber()
      : Number(callTime.payRate);

  const payRateTypeLabel = RATE_TYPE_LABELS[callTime.payRateType as RateType];
  const skillLevelLabel = SKILL_LEVEL_LABELS[callTime.skillLevel as SkillLevel];

  const start = convertWallClock(callTime.startDate, callTime.startTime, eventTz, talentTz);
  const end = convertWallClock(callTime.endDate, callTime.endTime, eventTz, talentTz);
  const tzLabel = shortTzLabel(talentTz, start.date ?? new Date());

  const isSameDay = checkSameDay(start.date, end.date);
  const isStartDateUBD = isDateNullOrUBD(start.date);
  const isEndDateUBD = isDateNullOrUBD(end.date);

  const documents: EventDocumentLike[] = Array.isArray(event.eventDocuments)
    ? (event.eventDocuments as unknown as EventDocumentLike[])
    : [];

  const fullAddress = [event.address, event.city, event.state, event.zipCode]
    .filter(Boolean)
    .join(', ');

  return (
    <Dialog open={open} onClose={onClose} className="max-w-5xl w-[90vw]">
      <DialogHeader>
        <div className="flex items-center justify-between">
          <div>
            <DialogTitle className="flex items-center gap-2">
              {callTime.service?.title || 'No Service'}
              {getStatusBadge(invitation.status, invitation.isConfirmed)}
            </DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {callTime.callTimeId}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>
      </DialogHeader>

      <DialogContent className="max-h-[calc(100vh-200px)] overflow-y-auto">
        {/* Quick details — mirrors admin layout (minus billRate) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg mb-6">
          <div>
            <p className="text-sm text-muted-foreground">Date</p>
            <p className="font-medium">
              {isStartDateUBD ? 'UBD' : formatDate(start.date)}
              {!isSameDay && !isEndDateUBD && (
                <>
                  <br />
                  <span className="text-muted-foreground">to </span>
                  {formatDate(end.date)}
                </>
              )}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Time</p>
            <p className="font-medium">
              {formatTime(start.time)} - {formatTime(end.time)}
              {tzLabel && (
                <span className="ml-1 text-xs text-muted-foreground">
                  {tzLabel}
                </span>
              )}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Pay Rate</p>
            <p className="font-medium">
              ${payRate.toFixed(2)} {payRateTypeLabel.toLowerCase()}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Skill Level</p>
            <p className="font-medium">{skillLevelLabel}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{eventTerm.singular}</p>
            <p className="font-medium">{event.title}</p>
            <p className="text-xs text-muted-foreground">{event.eventId}</p>
          </div>
          <div className="md:col-span-3">
            <p className="text-sm text-muted-foreground">Location</p>
            <p className="font-medium">
              {event.venueName}
              {fullAddress && (
                <>
                  <br />
                  <span className="text-muted-foreground font-normal">{fullAddress}</span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Event description */}
        {event.description && (
          <DetailSection icon={<DocumentTextIcon className="h-4 w-4" />} title={`${eventTerm.singular} Description`}>
            <p className="text-sm whitespace-pre-wrap">{event.description}</p>
          </DetailSection>
        )}

        {/* Requirements */}
        {event.requirements && (
          <DetailSection icon={<DocumentTextIcon className="h-4 w-4" />} title="Requirements">
            <p className="text-sm whitespace-pre-wrap">{event.requirements}</p>
          </DetailSection>
        )}

        {/* Pre-event instructions */}
        {event.preEventInstructions && (
          <DetailSection icon={<DocumentTextIcon className="h-4 w-4" />} title="Pre-Event Instructions">
            <p className="text-sm whitespace-pre-wrap">{event.preEventInstructions}</p>
          </DetailSection>
        )}

        {/* Assignment-specific instructions */}
        {callTime.instructions && (
          <DetailSection icon={<DocumentTextIcon className="h-4 w-4" />} title="Assignment Instructions">
            <p className="text-sm whitespace-pre-wrap">{callTime.instructions}</p>
          </DetailSection>
        )}

        {/* Logistics — meeting point + on-site contact */}
        {(event.meetingPoint || event.onsitePocName || event.onsitePocPhone || event.onsitePocEmail) && (
          <DetailSection icon={<MapPinIcon className="h-4 w-4" />} title="On-Site Logistics">
            <div className="space-y-2 text-sm">
              {event.meetingPoint && (
                <div className="flex items-start gap-2">
                  <MapPinIcon className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-muted-foreground">Meeting Point</p>
                    <p className="font-medium whitespace-pre-wrap">{event.meetingPoint}</p>
                  </div>
                </div>
              )}
              {event.onsitePocName && (
                <div className="flex items-start gap-2">
                  <UserIcon className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-muted-foreground">On-Site Contact</p>
                    <p className="font-medium">{event.onsitePocName}</p>
                  </div>
                </div>
              )}
              {event.onsitePocPhone && (
                <div className="flex items-start gap-2">
                  <PhoneIcon className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-muted-foreground">Phone</p>
                    <a
                      href={`tel:${event.onsitePocPhone}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {event.onsitePocPhone}
                    </a>
                  </div>
                </div>
              )}
              {event.onsitePocEmail && (
                <div className="flex items-start gap-2">
                  <MailIcon className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-muted-foreground">Email</p>
                    <a
                      href={`mailto:${event.onsitePocEmail}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {event.onsitePocEmail}
                    </a>
                  </div>
                </div>
              )}
            </div>
          </DetailSection>
        )}

        {/* Documents */}
        {documents.length > 0 && (
          <DetailSection icon={<EnvelopeIcon className="h-4 w-4" />} title="Documents">
            <ul className="space-y-2">
              {documents.map((doc) => (
                <li key={doc.url}>
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <DocumentTextIcon className="h-4 w-4" />
                    {doc.name}
                  </a>
                </li>
              ))}
            </ul>
          </DetailSection>
        )}

        {/* Decline reason — only when this invitation was declined */}
        {invitation.status === 'DECLINED' && invitation.declineReason && (
          <DetailSection icon={<DocumentTextIcon className="h-4 w-4" />} title="Decline Reason">
            <p className="text-sm whitespace-pre-wrap">{invitation.declineReason}</p>
          </DetailSection>
        )}

        <div className="flex justify-end pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DetailSection({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-6 p-4 bg-muted/30 rounded-lg">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
        {icon}
        <span>{title}</span>
      </div>
      <div className="text-foreground">{children}</div>
    </div>
  );
}
