'use client';

import {
    Dialog,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogContent,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/client/trpc';
import { ClockIcon } from 'lucide-react';

type ActivityAction = 'CREATED' | 'UPDATED' | 'ARCHIVED' | 'UNARCHIVED' | 'ACTIVATED' | 'SUBMITTED';

interface TeamUnitHistoryModalProps {
    open: boolean;
    onClose: () => void;
    unitId: string | null;
    unitName?: string;
}

const ACTION_CONFIG: Record<ActivityAction, {
    getTitle: (unitName: string, performer: string) => string;
    getDescription: () => string;
    dotClass: string;
}> = {
    CREATED: {
        getTitle: (unitName, performer) => `${unitName} added by ${performer}`,
        getDescription: () => 'New unit added and currently pending review before assignment eligibility.',
        dotClass: 'bg-foreground',
    },
    UPDATED: {
        getTitle: (unitName, performer) => `${unitName} updated by ${performer}`,
        getDescription: () => 'Unit details were edited by a team member.',
        dotClass: 'bg-foreground',
    },
    ARCHIVED: {
        getTitle: (unitName, performer) => `${unitName} archived by ${performer}`,
        getDescription: () => 'This unit is no longer active, but remains visible for historical tracking.',
        dotClass: 'bg-foreground',
    },
    UNARCHIVED: {
        getTitle: (unitName, performer) => `${unitName} restored to active by ${performer}`,
        getDescription: () => 'Unit has been reactivated and is now eligible for assignments.',
        dotClass: 'bg-foreground',
    },
    ACTIVATED: {
        getTitle: (unitName, performer) => `${unitName} activated by ${performer}`,
        getDescription: () => 'Unit has been marked active and is eligible for assignments.',
        dotClass: 'bg-foreground',
    },
    SUBMITTED: {
        getTitle: (unitName, performer) => `${unitName} submitted for review by ${performer}`,
        getDescription: () => 'Unit is pending review before becoming eligible for assignments.',
        dotClass: 'bg-foreground',
    },
};

const fallbackConfig = {
    getTitle: (unitName: string, performer: string) => `${unitName} updated by ${performer}`,
    getDescription: () => 'An activity was recorded for this unit.',
    dotClass: 'bg-foreground',
};

export function TeamUnitHistoryModal({ open, onClose, unitId, unitName = 'Unit' }: TeamUnitHistoryModalProps) {
    const { data: activities = [], isLoading } = trpc.teamUnit.getHistory.useQuery(
        { id: unitId! },
        { enabled: open && !!unitId }
    );

    return (
        <Dialog open={open} onClose={onClose} className="max-w-lg w-full">
            <DialogHeader>
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <ClockIcon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <DialogTitle>Activity History</DialogTitle>
                        <DialogDescription>{unitName}</DialogDescription>
                    </div>
                </div>
            </DialogHeader>

            <DialogContent className="py-2 max-h-[60vh] overflow-y-auto">
                {isLoading ? (
                    <div className="flex items-center justify-center py-10 text-muted-foreground text-sm">
                        Loading history…
                    </div>
                ) : activities.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 gap-2">
                        <ClockIcon className="h-8 w-8 text-muted-foreground/40" />
                        <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
                    </div>
                ) : (
                    <ol className="divide-y divide-border">
                        {(activities as Array<typeof activities[number]>).map((activity) => {
                            const config = ACTION_CONFIG[activity.action as ActivityAction] ?? fallbackConfig;
                            const p = activity.performer as any;
                            const performerName =
                                (p.firstName || p.lastName)
                                    ? `${p.firstName} ${p.lastName}`.trim()
                                    : (p.name ?? 'Unknown');
                            const title = config.getTitle(unitName, performerName);
                            const description = config.getDescription();
                            return (
                                <li key={activity.id} className="flex items-start gap-3 py-4 px-1">
                                    <span className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${config.dotClass}`} />
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-foreground leading-snug">
                                            {title}
                                        </p>
                                        <p className="text-sm text-muted-foreground mt-0.5 leading-snug">
                                            {description}
                                        </p>
                                    </div>
                                </li>
                            );
                        })}
                    </ol>
                )}
            </DialogContent>

            <DialogFooter>
                <Button variant="outline" onClick={onClose}>
                    Close
                </Button>
            </DialogFooter>
        </Dialog>
    );
}
