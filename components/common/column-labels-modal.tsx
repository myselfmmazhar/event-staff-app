'use client';

import { useState, useEffect } from 'react';
import { Button, type ButtonProps } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { SettingsIcon, CheckIcon } from 'lucide-react';
import { useActionLabels } from '@/lib/hooks/use-labels';
import { trpc } from '@/lib/client/trpc';
import { useToast } from '@/components/ui/use-toast';
import { Spinner } from '@/components/ui/spinner';

interface ColumnLabelConfig {
    key: string;
    label: string;
    defaultLabel: string;
}

interface ColumnLabelsModalProps {
    /** Page identifier for storing labels */
    page: string;
    /** Column configurations with keys and default labels */
    columns: ColumnLabelConfig[];
    /** Trigger button variant */
    buttonVariant?: ButtonProps['variant'];
    /** Trigger button size */
    buttonSize?: ButtonProps['size'];
}

/**
 * Modal for editing table column labels
 * Opens a dialog with input fields for each column label
 */
export function ColumnLabelsModal({
    page,
    columns,
    buttonVariant = 'ghost',
    buttonSize = 'sm',
}: ColumnLabelsModalProps) {
    const [open, setOpen] = useState(false);
    const [labels, setLabels] = useState<Record<string, string>>({});
    const [isSaving, setIsSaving] = useState(false);
    const actionLabels = useActionLabels();
    const { toast } = useToast();
    const utils = trpc.useUtils();

    // Load current labels from server
    const { data: allLabels } = trpc.settings.getLabels.useQuery(
        undefined,
        { enabled: open }
    );

    // Initialize labels when data loads
    useEffect(() => {
        const pageLabels = (allLabels?.pages?.[page as keyof typeof allLabels.pages] || {}) as Record<string, string>;
        const initialLabels: Record<string, string> = {};
        columns.forEach((col) => {
            const savedValue = pageLabels[`columns.${col.key}`];
            initialLabels[col.key] = savedValue || col.defaultLabel;
        });
        setLabels(initialLabels);
    }, [allLabels, page, columns, open]);

    // Save mutation
    const saveMutation = trpc.settings.updatePageLabels.useMutation({
        onSuccess: () => {
            toast({
                title: 'Column labels saved',
                description: 'Your changes have been applied.',
                variant: 'success',
            });
            utils.settings.getLabels.invalidate();
            setOpen(false);
        },
        onError: (error) => {
            toast({
                title: 'Error saving labels',
                description: error.message,
                variant: 'error',
            });
        },
    });

    const handleSave = () => {
        setIsSaving(true);
        // Transform to the format expected by the API
        const labelsToSave: Record<string, string> = {};
        Object.entries(labels).forEach(([key, value]) => {
            labelsToSave[`columns.${key}`] = value;
        });
        saveMutation.mutate({ page: page as 'staff' | 'cleanup-roster' | 'events' | 'clients' | 'users' | 'dashboard' | 'mySchedule' | 'settings', labels: labelsToSave });
        setIsSaving(false);
    };

    const handleReset = () => {
        const defaultLabels: Record<string, string> = {};
        columns.forEach((col) => {
            defaultLabels[col.key] = col.defaultLabel;
        });
        setLabels(defaultLabels);
    };

    return (
        <>
            <Button
                variant={buttonVariant}
                size={buttonSize}
                onClick={() => setOpen(true)}
                title="Customize column labels"
            >
                <SettingsIcon className="h-4 w-4 mr-2" />
                Edit Columns
            </Button>

            <Dialog open={open} onClose={() => setOpen(false)} className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Customize Column Labels</DialogTitle>
                </DialogHeader>

                <DialogContent>
                    <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                            Rename table column headers to match your organization's terminology.
                        </p>

                        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                            {columns.map((col) => (
                                <div key={col.key} className="space-y-1.5">
                                    <Label htmlFor={`col-${col.key}`} className="text-xs text-muted-foreground">
                                        {col.defaultLabel}
                                    </Label>
                                    <Input
                                        id={`col-${col.key}`}
                                        value={labels[col.key] || ''}
                                        onChange={(e) => setLabels({ ...labels, [col.key]: e.target.value })}
                                        placeholder={col.defaultLabel}
                                        className="h-9"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                </DialogContent>

                <DialogFooter>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleReset}
                        disabled={isSaving}
                    >
                        Reset to Defaults
                    </Button>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setOpen(false)}
                            disabled={isSaving}
                        >
                            {actionLabels.cancel}
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleSave}
                            disabled={isSaving}
                        >
                            {isSaving ? (
                                <>
                                    <Spinner className="h-4 w-4 mr-2" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <CheckIcon className="h-4 w-4 mr-2" />
                                    {actionLabels.save}
                                </>
                            )}
                        </Button>
                    </div>
                </DialogFooter>
            </Dialog>
        </>
    );
}
