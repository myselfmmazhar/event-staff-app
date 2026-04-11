'use client';

import { Card } from '@/components/ui/card';
import { CalendarIcon } from '@/components/ui/icons';

export default function ShiftPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <CalendarIcon className="h-5 w-5 text-primary" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Shift</h1>
                    <p className="text-sm text-muted-foreground">Event call times overview</p>
                </div>
            </div>

            <Card className="p-8 text-center">
                <div className="mx-auto max-w-md space-y-4">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                        <CalendarIcon className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h2 className="text-xl font-semibold text-foreground">Coming Soon</h2>
                    <p className="text-muted-foreground">
                        This page will display all event call times across your events.
                        You&apos;ll be able to manage and view staff shifts from here.
                    </p>
                </div>
            </Card>
        </div>
    );
}
