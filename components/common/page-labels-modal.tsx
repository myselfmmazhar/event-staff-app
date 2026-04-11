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
import { TagIcon, CheckIcon, ChevronDownIcon, ChevronRightIcon } from 'lucide-react';
import { useActionLabels } from '@/lib/hooks/use-labels';
import { getNestedValue, interpolateLabel } from '@/lib/config/labels';
import { useTerminology } from '@/lib/hooks/use-terminology';
import { trpc } from '@/lib/client/trpc';
import { useToast } from '@/components/ui/use-toast';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

interface LabelConfig {
    key: string;
    label: string;
    defaultLabel: string;
}

interface LabelSection {
    id: string;
    title: string;
    description?: string;
    prefix: string; // e.g., 'columns', 'filters', 'page', 'search'
    labels: LabelConfig[];
}

interface PageLabelsModalProps {
    /** Page identifier for storing labels */
    page: string;
    /** Label sections to display in the modal */
    sections: LabelSection[];
    /** Trigger button variant */
    buttonVariant?: ButtonProps['variant'];
    /** Trigger button size */
    buttonSize?: ButtonProps['size'];
    /** Trigger button text */
    buttonText?: string;
}

/**
 * Collapsible section component for label groups
 */
function CollapsibleSection({
    section,
    labels,
    setLabels,
    defaultExpanded = false,
}: {
    section: LabelSection;
    labels: Record<string, string>;
    setLabels: (labels: Record<string, string>) => void;
    defaultExpanded?: boolean;
}) {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);
    const { terminology } = useTerminology();

    // For 'page' prefix, keys are top-level (e.g., 'pageTitle')
    // For other prefixes like 'columns', 'filters', keys are nested (e.g., 'columns.clientId')
    const getStorageKey = (labelKey: string) => {
        if (section.prefix === 'page') {
            return labelKey; // No prefix for page-level labels
        }
        return `${section.prefix}.${labelKey}`;
    };

    return (
        <div className="border rounded-lg overflow-hidden">
            <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between p-3 bg-muted/50 hover:bg-muted transition-colors text-left"
            >
                <div>
                    <h4 className="text-sm font-medium text-foreground">{section.title}</h4>
                    {section.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{section.description}</p>
                    )}
                </div>
                {isExpanded ? (
                    <ChevronDownIcon className="h-4 w-4 text-muted-foreground" />
                ) : (
                    <ChevronRightIcon className="h-4 w-4 text-muted-foreground" />
                )}
            </button>
            {isExpanded && (
                <div className="p-3 space-y-3 bg-background">
                    {section.labels.map((labelConfig) => {
                        const storageKey = getStorageKey(labelConfig.key);
                        const interpolatedDefault = interpolateLabel(labelConfig.defaultLabel, terminology);
                        return (
                            <div key={storageKey} className="space-y-1.5">
                                <Label htmlFor={`label-${storageKey}`} className="text-xs text-muted-foreground">
                                    {interpolatedDefault}
                                </Label>
                                <Input
                                    id={`label-${storageKey}`}
                                    value={labels[storageKey] || ''}
                                    onChange={(e) => setLabels({ ...labels, [storageKey]: e.target.value })}
                                    placeholder={interpolatedDefault}
                                    className="h-9"
                                />
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

/**
 * Modal for editing page labels across multiple categories
 * Supports page labels, filter labels, search labels, and column labels
 */
export function PageLabelsModal({
    page,
    sections,
    buttonVariant = 'ghost',
    buttonSize = 'sm',
    buttonText = 'Customize',
}: PageLabelsModalProps) {
    const [open, setOpen] = useState(false);
    const [labels, setLabels] = useState<Record<string, string>>({});
    const [isSaving, setIsSaving] = useState(false);
    const actionLabels = useActionLabels();
    const { terminology } = useTerminology();
    const { toast } = useToast();
    const utils = trpc.useUtils();

    // Load current labels from server
    const { data: allLabels } = trpc.settings.getLabels.useQuery(
        undefined,
        { enabled: open }
    );

    // Helper to get storage key - 'page' prefix labels are top-level, others are nested
    const getStorageKey = (sectionPrefix: string, labelKey: string) => {
        if (sectionPrefix === 'page') {
            return labelKey; // No prefix for page-level labels
        }
        return `${sectionPrefix}.${labelKey}`;
    };

    // Initialize labels when data loads
    useEffect(() => {
        if (!allLabels) return;

        const pageData = allLabels?.pages?.[page as keyof typeof allLabels.pages];
        const initialLabels: Record<string, string> = {};

        sections.forEach((section) => {
            section.labels.forEach((labelConfig) => {
                const storageKey = getStorageKey(section.prefix, labelConfig.key);
                // For 'page' prefix: read directly from pageData (e.g., pageData.pageTitle)
                // For other prefixes: use nested path (e.g., pageData.columns.clientId)
                let savedValue = getNestedValue<string>(
                    pageData as unknown as Record<string, unknown>,
                    storageKey
                );

                // Fallback: legacy format where the key was stored literally (e.g., { "columns.staffId": "Talent ID" })
                if (
                    !savedValue &&
                    pageData &&
                    typeof pageData === 'object' &&
                    storageKey in (pageData as unknown as Record<string, unknown>)
                ) {
                    const directValue = (pageData as unknown as Record<string, unknown>)[storageKey];
                    if (typeof directValue === 'string') {
                        savedValue = directValue;
                    }
                }

                // Fallback: try legacy format with 'page.' prefix if not found
                if (!savedValue && section.prefix === 'page') {
                    const legacyKey = `page.${labelConfig.key}`;
                    savedValue = getNestedValue<string>(
                        pageData as unknown as Record<string, unknown>,
                        legacyKey
                    );
                }

                // Interpolate terminology placeholders in both saved and default values
                const interpolatedDefault = interpolateLabel(labelConfig.defaultLabel, terminology);
                const finalValue = savedValue
                    ? interpolateLabel(savedValue, terminology)
                    : interpolatedDefault;
                initialLabels[storageKey] = finalValue;
            });
        });

        setLabels(initialLabels);
    }, [allLabels, page, sections, open, terminology]);

    // Save mutation
    const saveMutation = trpc.settings.updatePageLabels.useMutation({
        onSuccess: (data) => {
            setIsSaving(false);
            // Update labels cache immediately so all pages/tables re-render without waiting for a refetch.
            utils.settings.getLabels.setData(undefined, data);
            utils.settings.getLabels.invalidate();
            toast({
                title: 'Labels saved',
                description: 'Your changes have been applied.',
                variant: 'success',
            });
            setOpen(false);
        },
        onError: (error) => {
            setIsSaving(false);
            toast({
                title: 'Error saving labels',
                description: error.message,
                variant: 'error',
            });
        },
    });

    const handleSave = () => {
        if (isSaving) return;
        setIsSaving(true);

        saveMutation.mutate({
            page: page as 'staff' | 'cleanup-roster' | 'events' | 'clients' | 'users' | 'dashboard' | 'mySchedule' | 'settings',
            labels: labels,
        });
    };

    const handleReset = () => {
        const defaultLabels: Record<string, string> = {};
        sections.forEach((section) => {
            section.labels.forEach((labelConfig) => {
                // Use same key format as getStorageKey - no prefix for 'page' labels
                const storageKey = getStorageKey(section.prefix, labelConfig.key);
                // Interpolate terminology placeholders in default labels
                defaultLabels[storageKey] = interpolateLabel(labelConfig.defaultLabel, terminology);
            });
        });
        setLabels(defaultLabels);
    };

    return (
        <>
            <Button
                variant={buttonVariant}
                size={buttonSize}
                onClick={() => setOpen(true)}
                title="Customize page labels"
            >
                <TagIcon className="h-4 w-4 mr-2" />
                {buttonText}
            </Button>

            <Dialog open={open} onClose={() => setOpen(false)} className="max-w-xl">
                <DialogHeader>
                    <DialogTitle>Customize Labels</DialogTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                        Customize labels to match your organization's terminology.
                    </p>
                </DialogHeader>

                <DialogContent>
                    <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                        {sections.map((section, index) => (
                            <CollapsibleSection
                                key={section.id}
                                section={section}
                                labels={labels}
                                setLabels={setLabels}
                                defaultExpanded={index === 0}
                            />
                        ))}
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
            </Dialog >
        </>
    );
}

// Re-export for backward compatibility - can be removed after migration
export { PageLabelsModal as ColumnLabelsModal };
