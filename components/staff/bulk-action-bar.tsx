'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface BulkActionBarProps {
    selectedCount: number;
    onClearSelection: () => void;
    onDisableSelected: () => void;
    isDisabling?: boolean;
}

export function BulkActionBar({
    selectedCount,
    onClearSelection,
    onDisableSelected,
    isDisabling = false,
}: BulkActionBarProps) {
    if (selectedCount === 0) return null;

    return (
        <div className="sticky top-0 z-20 bg-muted/95 backdrop-blur-sm border-b border-border p-4 mb-4 rounded-lg shadow-sm">
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Badge variant="primary" size="lg">
                        {selectedCount} {selectedCount === 1 ? 'staff member' : 'staff members'} selected
                    </Badge>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        onClick={onClearSelection}
                        disabled={isDisabling}
                    >
                        Clear Selection
                    </Button>
                    <Button
                        variant="danger"
                        onClick={onDisableSelected}
                        disabled={isDisabling}
                    >
                        {isDisabling ? 'Disabling...' : 'Disable Selected'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
