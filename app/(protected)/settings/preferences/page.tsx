'use client';

import { Card } from '@/components/ui/card';
import { SettingsIcon } from '@/components/ui/icons';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function PreferencesPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <SettingsIcon className="h-5 w-5 text-primary" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Preferences</h1>
                    <p className="text-sm text-muted-foreground">Terminology and label settings</p>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <Card className="p-6">
                    <h3 className="text-lg font-semibold text-foreground mb-2">Terminology</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                        Customize the terms used throughout the application (e.g., Events, Staff, Clients).
                    </p>
                    <Link href="/settings/preferences/terminology">
                        <Button variant="outline" size="sm">
                            Manage Terminology
                        </Button>
                    </Link>
                </Card>

                <Card className="p-6">
                    <h3 className="text-lg font-semibold text-foreground mb-2">Labels</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                        Configure column labels and display options for data tables.
                    </p>
                    <Link href="/settings/preferences/labels">
                        <Button variant="outline" size="sm">
                            Manage Labels
                        </Button>
                    </Link>
                </Card>
            </div>
        </div>
    );
}
