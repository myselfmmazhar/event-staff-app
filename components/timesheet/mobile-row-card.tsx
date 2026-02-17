import { Badge } from '@/components/ui/badge';
import { CalendarIcon, ClockIcon, UsersIcon } from '@/components/ui/icons';
import { formatDate, formatTimeRange, getAcceptedStaff } from './helpers';
import type { CallTimeRow } from './types';

export function MobileRowCard({ ct, onRowClick }: { ct: CallTimeRow; onRowClick: (id: string) => void }) {
    const accepted = getAcceptedStaff(ct.invitations);

    return (
        <div
            onClick={() => onRowClick(ct.event.id)}
            className="p-4 hover:bg-muted/30 cursor-pointer transition-colors space-y-2"
        >
            <div className="flex items-center justify-between">
                <Badge variant="default" className="text-xs">{ct.service?.title || 'Unassigned'}</Badge>
                {ct.event.client && (
                    <Badge variant="secondary" className="text-xs">{ct.event.client.businessName}</Badge>
                )}
            </div>
            <p className="font-medium text-foreground text-sm">{ct.event.title}</p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                    <CalendarIcon className="h-3 w-3" />
                    {formatDate(ct.startDate)} – {formatDate(ct.endDate || ct.event.endDate)}
                </span>
                {ct.startTime && (
                    <span className="flex items-center gap-1">
                        <ClockIcon className="h-3 w-3" />
                        {formatTimeRange(ct.startTime, ct.endTime)}
                    </span>
                )}
            </div>
            <div className="flex items-center gap-3 text-xs">
                <span className="text-muted-foreground">
                    Staff: {ct.confirmedCount}/{ct.numberOfStaffRequired}
                </span>
                {ct.event.venueName && (
                    <span className="text-muted-foreground truncate">📍 {ct.event.venueName}</span>
                )}
            </div>
            {(accepted.length > 0 || ct.needsStaff) && (
                <div className="flex items-center gap-1">
                    <UsersIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    {accepted.length > 0 ? (
                        <span className="text-xs text-muted-foreground">
                            {accepted.map((inv) => `${inv.staff.firstName} ${inv.staff.lastName.charAt(0)}.`).join(', ')}
                        </span>
                    ) : (
                        <Badge variant="warning" className="text-xs">Need {ct.numberOfStaffRequired}</Badge>
                    )}
                </div>
            )}
        </div>
    );
}
