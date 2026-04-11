'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArchiveBoxIcon } from '@/components/ui/icons';
import { Pencil } from 'lucide-react';
import { useTerminology } from '@/lib/hooks/use-terminology';

interface EventBulkActionBarProps {
    selectedCount: number;
    onClearSelection: () => void;
    onEditSelected: () => void;
    onArchiveSelected: () => void;
    isEditing?: boolean;
    isArchiving?: boolean;
}

export function EventBulkActionBar({
    selectedCount,
    onClearSelection,
    onEditSelected,
    onArchiveSelected,
    isEditing = false,
    isArchiving = false,
}: EventBulkActionBarProps) {
    const { terminology } = useTerminology();
    if (selectedCount === 0) return null;

    const isActioning = isEditing || isArchiving;

    return (
        <div className="sticky top-0 z-20 bg-muted/95 backdrop-blur-sm border-b border-border p-4 mb-4 rounded-lg shadow-sm">
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Badge variant="primary" size="lg">
                        {selectedCount} {selectedCount === 1 ? terminology.event.lower : terminology.event.lowerPlural} selected
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
                        <Pencil className="h-4 w-4 mr-2" />
                        {isEditing ? 'Editing...' : 'Edit Selected'}
                    </Button>
                    <Button
                        variant="danger"
                        onClick={onArchiveSelected}
                        disabled={isActioning}
                    >
                        <ArchiveBoxIcon className="h-4 w-4 mr-2" />
                        {isArchiving ? 'Archiving...' : 'Archive Selected'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
