'use client';

import { Card } from '@/components/ui/card';
import { ListIcon } from '@/components/ui/icons';

export default function TimesheetPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <ListIcon className="h-5 w-5 text-primary" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Time Sheet</h1>
                    <p className="text-sm text-muted-foreground">Timeline and task overview</p>
                </div>
            </div>

            <Card className="p-8 text-center">
                <div className="mx-auto max-w-md space-y-4">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                        <ListIcon className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h2 className="text-xl font-semibold text-foreground">Coming Soon</h2>
                    <p className="text-muted-foreground">
                        This page will display a timeline view similar to the dashboard overview,
                        showing upcoming tasks and event schedules.
                    </p>
                </div>
            </Card>
        </div>
    );
}
