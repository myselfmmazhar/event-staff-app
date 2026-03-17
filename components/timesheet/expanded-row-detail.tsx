import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarIcon } from '@/components/ui/icons';
import { formatRate } from './helpers';
import { SKILL_LABELS } from './constants';
import type { CallTimeRow } from './types';
import { fmtDateTime, toNumber } from './helpers';

export function ExpandedRowDetail({ ct, onViewEvent }: { ct: CallTimeRow; onViewEvent: (id: string) => void }) {
    const accepted = ct.invitations.filter((i) => i.status === 'ACCEPTED');
    const pending = ct.invitations.filter((i) => i.status === 'PENDING');
    const declined = ct.invitations.filter((i) => i.status === 'DECLINED');
    const revisions = ct.timeEntry?.revisions ?? [];

    return (
        <tr>
            <td colSpan={19} className="px-6 py-4 bg-muted/10 border-b border-border">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                    {/* Profile Status */}
                    <div className="space-y-2">
                        <h4 className="font-semibold text-foreground text-xs uppercase tracking-wide">Profile Status</h4>
                        <div className="space-y-1.5">
                            {ct.staff ? (
                                <>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-[11px] text-muted-foreground">Account:</span>
                                        <Badge 
                                            variant={ct.staff.accountStatus === 'ACTIVE' ? 'success' : 'warning'}
                                            className="text-[10px] py-0 px-1.5"
                                        >
                                            {ct.staff.accountStatus}
                                        </Badge>
                                    </div>
                                    <p className="text-[11px] text-muted-foreground">
                                        Rating: <span className="text-foreground font-medium">{ct.staff.staffRating || 'N/A'}</span>
                                    </p>
                                    <p className="text-[11px] text-muted-foreground">
                                        Level: <span className="text-foreground font-medium">{SKILL_LABELS[ct.staff.skillLevel] || ct.staff.skillLevel || 'N/A'}</span>
                                    </p>
                                </>
                            ) : (
                                <p className="text-xs text-muted-foreground italic">No staff assigned</p>
                            )}
                        </div>
                    </div>

                    {/* Contact Info */}
                    <div className="space-y-2">
                        <h4 className="font-semibold text-foreground text-xs uppercase tracking-wide">Contact Info</h4>
                        <div className="space-y-1 text-muted-foreground text-[11px]">
                            {ct.staff ? (
                                <>
                                    <p>Email: <span className="text-foreground font-medium">{ct.staff.email}</span></p>
                                    <p>Phone: <span className="text-foreground font-medium">{ct.staff.phone}</span></p>
                                    <div className="mt-1">
                                        <span className="block text-slate-400">Address:</span>
                                        <span className="text-foreground leading-relaxed">
                                            {ct.staff.streetAddress}<br />
                                            {ct.staff.city}, {ct.staff.state} {ct.staff.zipCode}
                                        </span>
                                    </div>
                                </>
                            ) : (
                                <p className="italic">No contact info available</p>
                            )}
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                        <h4 className="font-semibold text-foreground text-xs uppercase tracking-wide">Notes</h4>
                        {ct.notes ? (
                            <p className="text-muted-foreground whitespace-pre-wrap">{ct.notes}</p>
                        ) : (
                            <p className="text-xs text-muted-foreground italic">No notes</p>
                        )}
                    </div>
                </div>

                {/* Revisions */}
                <div className="mt-6 pt-4 border-t border-border">
                    <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-foreground text-xs uppercase tracking-wide">Clock Revisions</h4>
                        {revisions.length > 0 && (
                            <Badge variant="warning" className="text-[10px] py-0 px-1.5">
                                {revisions.length} revision{revisions.length === 1 ? '' : 's'}
                            </Badge>
                        )}
                    </div>

                    {revisions.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic mt-2">No revisions yet</p>
                    ) : (
                        <div className="mt-3 space-y-2">
                            {revisions.map((r) => (
                                <div key={r.id} className="bg-card border border-border rounded-lg p-3 text-[11px]">
                                    <div className="flex items-center justify-between">
                                        <span className="font-semibold text-foreground">
                                            {fmtDateTime(r.editedAt as any)}
                                        </span>
                                        <span className="text-muted-foreground">
                                            Edited by {r.editedBy}
                                        </span>
                                    </div>
                                    <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-muted-foreground">
                                        <div>
                                            <span className="text-slate-400">Clock In:</span>{' '}
                                            <span className="text-foreground font-medium">{r.clockIn ? fmtDateTime(r.clockIn as any) : '—'}</span>
                                        </div>
                                        <div>
                                            <span className="text-slate-400">Clock Out:</span>{' '}
                                            <span className="text-foreground font-medium">{r.clockOut ? fmtDateTime(r.clockOut as any) : '—'}</span>
                                        </div>
                                        <div>
                                            <span className="text-slate-400">Break:</span>{' '}
                                            <span className="text-foreground font-medium">{r.breakMinutes ?? 0} min</span>
                                        </div>
                                        <div>
                                            <span className="text-slate-400">OT Cost / Price:</span>{' '}
                                            <span className="text-foreground font-medium">
                                                ${toNumber(r.overtimeCost ?? 0).toFixed(2)} / ${toNumber(r.overtimePrice ?? 0).toFixed(2)}
                                            </span>
                                        </div>
                                    </div>
                                    {r.notes ? (
                                        <div className="mt-2 text-muted-foreground">
                                            <span className="text-slate-400">Notes:</span> {r.notes}
                                        </div>
                                    ) : null}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* View Full Event */}
                <div className="mt-4 pt-3 border-t border-border">
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
                        View Event Details
                    </Button>
                </div>
            </td>
        </tr>
    );
}
