'use client';

import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { InfoIcon } from 'lucide-react';
import { EventStatus } from '@prisma/client';
import { useTerminology } from '@/lib/hooks/use-terminology';
import { trpc } from '@/lib/client/trpc';
import { EVENT_STATUS_LABELS } from '@/lib/constants';

export type EventBulkEditFormData = {
    status?: { enabled: boolean; value?: EventStatus };
    clientId?: { enabled: boolean; value?: string | null };
};

interface EventForBulkEdit {
    id: string;
    eventId: string;
    title: string;
}

interface EventBulkEditModalProps {
    events: EventForBulkEdit[];
    open: boolean;
    onClose: () => void;
    onSubmit: (data: EventBulkEditFormData) => void;
    isSubmitting: boolean;
}

const DEFAULT_FORM_STATE: EventBulkEditFormData = {
    status: { enabled: false, value: undefined },
    clientId: { enabled: false, value: undefined },
};

export function EventBulkEditModal({
    events,
    open,
    onClose,
    onSubmit,
    isSubmitting,
}: EventBulkEditModalProps) {
    const { terminology } = useTerminology();
    const [formData, setFormData] = useState<EventBulkEditFormData>(DEFAULT_FORM_STATE);

    // Fetch clients for the dropdown
    const { data: clientsData } = trpc.clients.getAll.useQuery(
        { page: 1, limit: 100 },
        { enabled: open }
    );
    const clients = clientsData?.data ?? [];

    // Reset form when modal opens
    useEffect(() => {
        if (open) {
            setFormData(DEFAULT_FORM_STATE);
        }
    }, [open]);

    // Count how many fields are enabled
    const enabledFieldCount = Object.values(formData).filter(
        (field) => field?.enabled
    ).length;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Only include enabled fields
        const enabledData: EventBulkEditFormData = {};

        if (formData.status?.enabled) {
            enabledData.status = formData.status;
        }
        if (formData.clientId?.enabled) {
            enabledData.clientId = formData.clientId;
        }

        onSubmit(enabledData);
    };

    const updateField = <K extends keyof EventBulkEditFormData>(
        field: K,
        updates: Partial<NonNullable<EventBulkEditFormData[K]>>
    ) => {
        setFormData((prev) => ({
            ...prev,
            [field]: {
                ...prev[field],
                ...updates,
            },
        }));
    };

    return (
        <Dialog open={open} onClose={onClose} className="max-w-2xl">
            <form onSubmit={handleSubmit}>
                <DialogHeader>
                    <DialogTitle>Batch Edit {terminology.event.plural}</DialogTitle>
                    <DialogDescription>
                        Edit multiple {terminology.event.lowerPlural} at once. Only enabled fields will be updated.
                    </DialogDescription>
                </DialogHeader>

                <DialogContent>
                    <div className="space-y-6">
                        {/* Selected Events Summary with Titles */}
                        <div className="p-4 bg-muted/50 rounded-lg">
                            <div className="flex items-center gap-2 mb-3">
                                <Badge variant="primary" size="lg">
                                    {events.length} {events.length === 1 ? terminology.event.lower : terminology.event.lowerPlural} selected
                                </Badge>
                            </div>
                            {/* Event Titles List */}
                            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                                {events.map((event) => (
                                    <Badge key={event.id} variant="secondary" size="sm">
                                        {event.title}
                                    </Badge>
                                ))}
                            </div>
                        </div>

                        {/* Info Alert */}
                        <div className="p-3 bg-info/10 border border-info/20 rounded-lg flex gap-2">
                            <InfoIcon className="h-4 w-4 text-info mt-0.5 shrink-0" />
                            <p className="text-sm text-foreground">
                                Toggle the checkbox next to each field to enable editing.
                                {enabledFieldCount === 0 && ' Enable at least one field to save changes.'}
                            </p>
                        </div>

                        {/* Field Toggles */}
                        <div className="space-y-4">
                            {/* 1. Status */}
                            <div className="flex items-start gap-4 py-3 border-b border-border">
                                <div className="flex items-center gap-2 w-40 shrink-0 pt-2">
                                    <Checkbox
                                        checked={formData.status?.enabled}
                                        onChange={(e) =>
                                            updateField('status', { enabled: e.target.checked })
                                        }
                                    />
                                    <Label className="text-sm font-medium mb-0">Status</Label>
                                </div>
                                <div className="flex-1">
                                    {formData.status?.enabled ? (
                                        <Select
                                            value={formData.status.value || ''}
                                            onValueChange={(value) =>
                                                updateField('status', {
                                                    value: value as EventStatus,
                                                })
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select status..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {Object.entries(EVENT_STATUS_LABELS).map(([value, label]) => (
                                                    <SelectItem key={value} value={value}>
                                                        {label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    ) : (
                                        <p className="text-sm text-muted-foreground py-2">
                                            Enable to edit this field
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* 2. Client */}
                            <div className="flex items-start gap-4 py-3">
                                <div className="flex items-center gap-2 w-40 shrink-0 pt-2">
                                    <Checkbox
                                        checked={formData.clientId?.enabled}
                                        onChange={(e) =>
                                            updateField('clientId', { enabled: e.target.checked })
                                        }
                                    />
                                    <Label className="text-sm font-medium mb-0">Client</Label>
                                </div>
                                <div className="flex-1">
                                    {formData.clientId?.enabled ? (
                                        <Select
                                            value={formData.clientId.value ?? ''}
                                            onValueChange={(value) =>
                                                updateField('clientId', {
                                                    value: value || null,
                                                })
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="None (Remove client)" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="">None (Remove client)</SelectItem>
                                                {clients.map((client) => (
                                                    <SelectItem key={client.id} value={client.id}>
                                                        {client.businessName || `${client.firstName} ${client.lastName}`}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    ) : (
                                        <p className="text-sm text-muted-foreground py-2">
                                            Enable to edit this field
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </DialogContent>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isSubmitting} type="button">
                        Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting || enabledFieldCount === 0}>
                        {isSubmitting
                            ? 'Saving...'
                            : `Update ${events.length} ${events.length === 1 ? terminology.event.lower : terminology.event.lowerPlural}`}
                    </Button>
                </DialogFooter>
            </form>
        </Dialog>
    );
}
