'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PencilIcon, Trash2Icon } from 'lucide-react';
import { useTerminology } from '@/lib/hooks/use-terminology';

interface BulkActionBarProps {
    selectedCount: number;
    onClearSelection: () => void;
    onEditSelected: () => void;
    onDeleteSelected: () => void;
    isEditing?: boolean;
    isDeleting?: boolean;
}

export function BulkActionBar({
    selectedCount,
    onClearSelection,
    onEditSelected,
    onDeleteSelected,
    isEditing = false,
    isDeleting = false,
}: BulkActionBarProps) {
    const { terminology } = useTerminology();
    if (selectedCount === 0) return null;

    const isActioning = isEditing || isDeleting;

    return (
        <div className="sticky top-0 z-20 bg-muted/95 backdrop-blur-sm border-b border-border p-4 mb-4 rounded-lg shadow-sm">
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Badge variant="primary" size="lg">
                        {selectedCount} {selectedCount === 1 ? `${terminology.staff.lower} member` : `${terminology.staff.lower} members`} selected
                    </Badge>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        onClick={onClearSelection}
                        disabled={isActioning}
                    >
                        Clear Selection
                    </Button>
                    <Button
                        variant="outline"
                        onClick={onEditSelected}
                        disabled={isActioning}
                    >
                        <PencilIcon className="h-4 w-4 mr-2" />
                        {isEditing ? 'Editing...' : 'Edit Selected'}
                    </Button>
                    <Button
                        variant="danger"
                        onClick={onDeleteSelected}
                        disabled={isActioning}
                    >
                        <Trash2Icon className="h-4 w-4 mr-2" />
                        {isDeleting ? 'Deleting...' : 'Delete Selected'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
