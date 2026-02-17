import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarIcon } from '@/components/ui/icons';
import { formatRate } from './helpers';
import { SKILL_LABELS } from './constants';
import type { CallTimeRow } from './types';

export function ExpandedRowDetail({ ct, onViewEvent }: { ct: CallTimeRow; onViewEvent: (id: string) => void }) {
    const accepted = ct.invitations.filter((i) => i.status === 'ACCEPTED');
    const pending = ct.invitations.filter((i) => i.status === 'PENDING');
    const declined = ct.invitations.filter((i) => i.status === 'DECLINED');

    return (
        <tr>
            <td colSpan={12} className="px-6 py-4 bg-muted/10 border-b border-border">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                    {/* Rates */}
                    <div className="space-y-2">
                        <h4 className="font-semibold text-foreground text-xs uppercase tracking-wide">Rate Details</h4>
                        <div className="space-y-1 text-muted-foreground">
                            <p>Pay: <span className="text-foreground font-medium">{formatRate(ct.payRate, ct.payRateType)}</span></p>
                            <p>Bill: <span className="text-foreground font-medium">{formatRate(ct.billRate, ct.billRateType)}</span></p>
                            <p>Skill: <span className="text-foreground font-medium">{SKILL_LABELS[ct.skillLevel] || ct.skillLevel}</span></p>
                        </div>
                    </div>

                    {/* Invitations */}
                    <div className="space-y-2">
                        <h4 className="font-semibold text-foreground text-xs uppercase tracking-wide">Invitations</h4>
                        <div className="space-y-1.5">
                            {accepted.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                    <Badge variant="success" className="text-xs">✓ Accepted ({accepted.length})</Badge>
                                    {accepted.map((inv) => (
                                        <span key={inv.id} className="text-xs text-muted-foreground">
                                            {inv.staff.firstName} {inv.staff.lastName}
                                        </span>
                                    ))}
                                </div>
                            )}
                            {pending.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                    <Badge variant="warning" className="text-xs">⏳ Pending ({pending.length})</Badge>
                                    {pending.map((inv) => (
                                        <span key={inv.id} className="text-xs text-muted-foreground">
                                            {inv.staff.firstName} {inv.staff.lastName}
                                        </span>
                                    ))}
                                </div>
                            )}
                            {declined.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                    <Badge variant="danger" className="text-xs">✗ Declined ({declined.length})</Badge>
                                    {declined.map((inv) => (
                                        <span key={inv.id} className="text-xs text-muted-foreground">
                                            {inv.staff.firstName} {inv.staff.lastName}
                                        </span>
                                    ))}
                                </div>
                            )}
                            {ct.invitations.length === 0 && (
                                <p className="text-xs text-muted-foreground italic">No invitations sent yet</p>
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
