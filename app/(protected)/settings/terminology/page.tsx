'use client';

import { Card } from '@/components/ui/card';
import { TerminologyForm } from '@/components/settings/terminology-form';
import { useTerminology } from '@/lib/hooks/use-terminology';
import { Loader2 } from 'lucide-react';

export default function TerminologySettingsPage() {
    const { terminology, isLoading } = useTerminology();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Terminology Customization</h1>
                <p className="mt-2 text-muted-foreground">
                    Customize how your organization refers to staff and events throughout the application.
                </p>
            </div>

            {/* Current Terminology Preview */}
            <Card className="p-6">
                <h2 className="text-lg font-semibold mb-4">Current Terminology</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <h3 className="text-sm font-medium text-muted-foreground mb-2">Staff Term</h3>
                        <div className="space-y-1">
                            <p className="text-sm">
                                <span className="font-medium">Singular:</span> {terminology.staff.singular}
                            </p>
                            <p className="text-sm">
                                <span className="font-medium">Plural:</span> {terminology.staff.plural}
                            </p>
                            <p className="text-sm">
                                <span className="font-medium">ID Prefix:</span> {terminology.staffIdPrefix}
                            </p>
                            <p className="text-sm">
                                <span className="font-medium">Route:</span> /{terminology.staff.route}
                            </p>
                        </div>
                    </div>
                    <div>
                        <h3 className="text-sm font-medium text-muted-foreground mb-2">Event Term</h3>
                        <div className="space-y-1">
                            <p className="text-sm">
                                <span className="font-medium">Singular:</span> {terminology.event.singular}
                            </p>
                            <p className="text-sm">
                                <span className="font-medium">Plural:</span> {terminology.event.plural}
                            </p>
                            <p className="text-sm">
                                <span className="font-medium">ID Prefix:</span> {terminology.eventIdPrefix}
                            </p>
                            <p className="text-sm">
                                <span className="font-medium">Route:</span> /{terminology.event.route}
                            </p>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Terminology Form */}
            <Card className="p-6">
                <TerminologyForm currentTerminology={terminology} />
            </Card>
        </div>
    );
}
