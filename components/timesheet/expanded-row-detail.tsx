import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarIcon } from '@/components/ui/icons';
import { SKILL_LABELS } from './constants';
import type { CallTimeRow } from './types';
import { fmtDateTime, fmtClockDateTime, toNumber } from './helpers';

export function ExpandedRowDetail({
    ct,
    onViewEvent,
    colSpan = 17,
    cardStyle = false,
    subTab = 'all',
}: {
    ct: CallTimeRow;
    onViewEvent: (id: string) => void;
    colSpan?: number;
    cardStyle?: boolean;
    subTab?: 'all' | 'bill' | 'invoice' | 'commission';
}) {
    const revisions = ct.timeEntry?.revisions ?? [];
    // For invoice/bill flows, hide team-unit details and show only the manager's
    // contact info (the manager IS the staff on team-based invitations).
    const hideTeamForFinance = subTab === 'invoice' || subTab === 'bill';
    const manager = ct.teamUnit?.staff ?? ct.staff ?? null;

    return (
        <tr>
            <td
                colSpan={colSpan}
                className={
                    cardStyle
                        ? 'border-0 border-x border-b border-border bg-muted/25 px-4 py-4 shadow-sm rounded-b-lg'
                        : 'px-4 py-4 bg-muted/20 border-b border-border'
                }
            >
                <div className="space-y-4 text-sm max-w-4xl">
                    <div className="space-y-2 pb-3 border-b border-border">
                        <h4 className="font-semibold text-foreground text-xs uppercase tracking-wide">Profile status</h4>
                        <div className="space-y-1.5 text-[11px] text-muted-foreground">
                            {ct.staff ? (
                                <>
                                    <p>
                                        Account:{' '}
                                        <span className="text-foreground font-medium">{ct.staff.accountStatus}</span>
                                    </p>
                                    <p>
                                        Rating:{' '}
                                        <span className="text-foreground font-medium">{ct.staff.staffRating || 'N/A'}</span>
                                    </p>
                                    <p>
                                        Level:{' '}
                                        <span className="text-foreground font-medium">
                                            {SKILL_LABELS[ct.staff.skillLevel] || ct.staff.skillLevel || 'N/A'}
                                        </span>
                                    </p>
                                </>
                            ) : (
                                <p className="italic">No staff assigned</p>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2 pb-3 border-b border-border">
                        <h4 className="font-semibold text-foreground text-xs uppercase tracking-wide">Contact</h4>
                        <div className="space-y-1 text-muted-foreground text-[11px]">
                            {hideTeamForFinance && ct.teamUnit ? (
                                manager ? (
                                    <>
                                        <p>
                                            Name:{' '}
                                            <span className="text-foreground font-medium">
                                                {manager.firstName} {manager.lastName}
                                            </span>
                                        </p>
                                        <p>
                                            Email: <span className="text-foreground font-medium">{manager.email}</span>
                                        </p>
                                        <p>
                                            Phone: <span className="text-foreground font-medium">{manager.phone}</span>
                                        </p>
                                        <p className="text-foreground leading-relaxed">
                                            {manager.streetAddress}
                                            <br />
                                            {manager.city}, {manager.state} {manager.zipCode}
                                        </p>
                                    </>
                                ) : (
                                    <p className="italic">No manager contact info available</p>
                                )
                            ) : ct.teamUnit ? (
                                manager ? (
                                    <>
                                        <p>
                                            Name:{' '}
                                            <span className="text-foreground font-medium">
                                                {manager.firstName} {manager.lastName}
                                            </span>
                                        </p>
                                        <p>
                                            Email: <span className="text-foreground font-medium">{manager.email}</span>
                                        </p>
                                        <p>
                                            Phone: <span className="text-foreground font-medium">{manager.phone}</span>
                                        </p>
                                        <p className="text-foreground leading-relaxed">
                                            {manager.streetAddress}
                                            <br />
                                            {manager.city}, {manager.state} {manager.zipCode}
                                        </p>
                                    </>
                                ) : (
                                    <p className="italic">No manager contact info available</p>
                                )
                            ) : ct.staff ? (
                                <>
                                    <p>
                                        Email: <span className="text-foreground font-medium">{ct.staff.email}</span>
                                    </p>
                                    <p>
                                        Phone: <span className="text-foreground font-medium">{ct.staff.phone}</span>
                                    </p>
                                    <p className="text-foreground leading-relaxed">
                                        {ct.staff.streetAddress}
                                        <br />
                                        {ct.staff.city}, {ct.staff.state} {ct.staff.zipCode}
                                    </p>
                                </>
                            ) : (
                                <p className="italic">No contact info available</p>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2 pb-3 border-b border-border">
                        <h4 className="font-semibold text-foreground text-xs uppercase tracking-wide">Notes</h4>
                        {ct.notes ? (
                            <p className="text-muted-foreground whitespace-pre-wrap text-[11px]">{ct.notes}</p>
                        ) : (
                            <p className="text-xs text-muted-foreground italic">No notes</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                            <h4 className="font-semibold text-foreground text-xs uppercase tracking-wide">
                                Clock revisions
                            </h4>
                            {revisions.length > 0 && (
                                <Badge variant="secondary" className="text-[10px] py-0 px-1.5">
                                    {revisions.length} revision{revisions.length === 1 ? '' : 's'}
                                </Badge>
                            )}
                        </div>

                        {revisions.length === 0 ? (
                            <p className="text-xs text-muted-foreground italic">No revisions yet</p>
                        ) : (
                            <div className="space-y-2">
                                {revisions.map((r) => (
                                    <div
                                        key={r.id}
                                        className="border border-border rounded-md px-3 py-2 text-[11px] bg-card"
                                    >
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <span className="font-semibold text-foreground">
                                                {fmtDateTime(r.editedAt as any)}
                                            </span>
                                            <span className="text-muted-foreground">Edited by {r.editedBy}</span>
                                        </div>
                                        <div className="mt-2 space-y-1 text-muted-foreground">
                                            <p>
                                                Clock in:{' '}
                                                <span className="text-foreground font-medium">
                                                    {r.clockIn ? fmtClockDateTime(r.clockIn as any) : '—'}
                                                </span>
                                            </p>
                                            <p>
                                                Clock out:{' '}
                                                <span className="text-foreground font-medium">
                                                    {r.clockOut ? fmtClockDateTime(r.clockOut as any) : '—'}
                                                </span>
                                            </p>
                                            <p>
                                                Break:{' '}
                                                <span className="text-foreground font-medium">
                                                    {r.breakMinutes ?? 0} min
                                                </span>
                                            </p>
                                            <p>
                                                OT cost / price:{' '}
                                                <span className="text-foreground font-medium">
                                                    ${toNumber(r.overtimeCost ?? 0).toFixed(2)} / $
                                                    {toNumber(r.overtimePrice ?? 0).toFixed(2)}
                                                </span>
                                            </p>
                                        </div>
                                        {r.notes ? (
                                            <p className="mt-2 text-muted-foreground">
                                                <span className="text-muted-foreground">Notes:</span> {r.notes}
                                            </p>
                                        ) : null}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="pt-1">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                                e.stopPropagation();
                                onViewEvent(ct.event.id);
                            }}
                            className="text-xs gap-1.5"
                        >
                            <CalendarIcon className="h-3.5 w-3.5" />
                            View event details
                        </Button>
                    </div>
                </div>
            </td>
        </tr>
    );
}
