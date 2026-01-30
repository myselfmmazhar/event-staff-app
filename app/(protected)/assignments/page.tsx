'use client';

import { Card } from '@/components/ui/card';
import { ClipboardClipboardListIcon } from '@/components/ui/icons';

export default function AssignmentManagerPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <ClipboardListIcon className="h-5 w-5 text-primary" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Assignment Manager</h1>
                    <p className="text-sm text-muted-foreground">Manage staff assignments and scheduling</p>
                </div>
            </div>

            <Card className="p-12 text-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                        <ClipboardListIcon className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div>
                        <h2 className="text-xl font-semibold text-foreground">Coming Soon</h2>
                        <p className="text-sm text-muted-foreground mt-2">
                            Assignment Manager functionality will be available in a future update.
                        </p>
                    </div>
                </div>
            </Card>
        </div>
    );
}
