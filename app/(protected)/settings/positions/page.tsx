'use client';

import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { trpc } from '@/lib/client/trpc';
import { useToast } from '@/components/ui/use-toast';
import { useStaffTerm } from '@/lib/hooks/use-terminology';
import { PlusIcon, Edit2Icon, Trash2Icon, Loader2, SearchIcon } from 'lucide-react';
import { PositionFormModal } from '@/components/settings/position-form-modal';
import { ConfirmModal } from '@/components/common/confirm-modal';

type Position = {
    id: string;
    name: string;
    description: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    _count: {
        staff: number;
    };
};

export default function PositionsSettingsPage() {
    const { toast } = useToast();
    const staffTerm = useStaffTerm();
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [positionToDelete, setPositionToDelete] = useState<Position | null>(null);
    const [search, setSearch] = useState('');

    const { data: positions, isLoading, refetch } = trpc.settings.getPositions.useQuery();

    // Filter positions by search term
    const filteredPositions = useMemo(() => {
        if (!positions) return [];
        if (!search.trim()) return positions;
        const searchLower = search.toLowerCase();
        return positions.filter((position) =>
            position.name.toLowerCase().includes(searchLower)
        );
    }, [positions, search]);

    const createMutation = trpc.settings.createPosition.useMutation({
        onSuccess: () => {
            toast({
                title: 'Success',
                description: 'Position created successfully',
            });
            setModalOpen(false);
            refetch();
        },
        onError: (error) => {
            toast({
                title: 'Error',
                description: error.message || 'Failed to create position',
                variant: 'error',
            });
        },
    });

    const updateMutation = trpc.settings.updatePosition.useMutation({
        onSuccess: () => {
            toast({
                title: 'Success',
                description: 'Position updated successfully',
            });
            setModalOpen(false);
            setSelectedPosition(null);
            refetch();
        },
        onError: (error) => {
            toast({
                title: 'Error',
                description: error.message || 'Failed to update position',
                variant: 'error',
            });
        },
    });

    const toggleActiveMutation = trpc.settings.togglePositionActive.useMutation({
        onSuccess: () => {
            toast({
                title: 'Success',
                description: 'Position status updated',
            });
            refetch();
        },
        onError: (error) => {
            toast({
                title: 'Error',
                description: error.message || 'Failed to update position status',
                variant: 'error',
            });
        },
    });

    const deleteMutation = trpc.settings.deletePosition.useMutation({
        onSuccess: () => {
            toast({
                title: 'Success',
                description: 'Position deleted successfully',
            });
            setDeleteDialogOpen(false);
            setPositionToDelete(null);
            refetch();
        },
        onError: (error) => {
            toast({
                title: 'Error',
                description: error.message || 'Failed to delete position',
                variant: 'error',
            });
        },
    });

    const handleCreate = () => {
        setSelectedPosition(null);
        setModalOpen(true);
    };

    const handleEdit = (position: Position) => {
        setSelectedPosition(position);
        setModalOpen(true);
    };

    const handleDelete = (position: Position) => {
        setPositionToDelete(position);
        setDeleteDialogOpen(true);
    };

    const handleToggleActive = (position: Position) => {
        toggleActiveMutation.mutate({
            id: position.id,
            isActive: !position.isActive,
        });
    };

    const handleFormSubmit = (data: { name: string; description?: string | null }) => {
        if (selectedPosition) {
            updateMutation.mutate({
                id: selectedPosition.id,
                ...data,
            });
        } else {
            createMutation.mutate(data);
        }
    };

    const handleDeleteConfirm = () => {
        if (positionToDelete) {
            deleteMutation.mutate({ id: positionToDelete.id });
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{staffTerm.singular} Positions</h1>
                    <p className="mt-2 text-muted-foreground">
                        Manage the positions that can be assigned to {staffTerm.lowerPlural}.
                    </p>
                </div>
                <Button onClick={handleCreate}>
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Add Position
                </Button>
            </div>

            {/* Search and Positions List */}
            <Card className="p-6">
                {/* Search Input */}
                {positions && positions.length > 0 && (
                    <div className="relative mb-4">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search positions..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                )}

                {filteredPositions.length > 0 ? (
                    <div className="space-y-4">
                        <div className="grid gap-4">
                            {filteredPositions.map((position) => (
                                <div
                                    key={position.id}
                                    className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-accent/5 transition-colors"
                                >
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3">
                                            <h3 className="font-semibold text-foreground">
                                                {position.name}
                                            </h3>
                                            <Badge
                                                variant={position.isActive ? 'success' : 'secondary'}
                                                asSpan
                                            >
                                                {position.isActive ? 'Active' : 'Inactive'}
                                            </Badge>
                                            <span className="text-sm text-muted-foreground">
                                                {position._count.staff} {staffTerm.lowerPlural}
                                            </span>
                                        </div>
                                        {position.description && (
                                            <p className="text-sm text-muted-foreground mt-1">
                                                {position.description}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleToggleActive(position)}
                                            disabled={toggleActiveMutation.isPending}
                                        >
                                            {position.isActive ? 'Deactivate' : 'Activate'}
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleEdit(position)}
                                        >
                                            <Edit2Icon className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDelete(position)}
                                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                            disabled={position._count.staff > 0}
                                            title={
                                                position._count.staff > 0
                                                    ? `Cannot delete - ${position._count.staff} ${staffTerm.lowerPlural} assigned`
                                                    : 'Delete position'
                                            }
                                        >
                                            <Trash2Icon className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : positions && positions.length > 0 ? (
                    <div className="text-center py-12">
                        <p className="text-muted-foreground">
                            No positions found matching &quot;{search}&quot;
                        </p>
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <p className="text-muted-foreground mb-4">
                            No positions created yet. Add your first position to get started.
                        </p>
                        <Button onClick={handleCreate}>
                            <PlusIcon className="h-4 w-4 mr-2" />
                            Add Position
                        </Button>
                    </div>
                )}
            </Card>

            {/* Position Form Modal */}
            <PositionFormModal
                position={selectedPosition}
                open={modalOpen}
                onClose={() => {
                    setModalOpen(false);
                    setSelectedPosition(null);
                }}
                onSubmit={handleFormSubmit}
                isSubmitting={createMutation.isPending || updateMutation.isPending}
            />

            {/* Delete Confirmation Modal */}
            <ConfirmModal
                open={deleteDialogOpen}
                onClose={() => {
                    setDeleteDialogOpen(false);
                    setPositionToDelete(null);
                }}
                onConfirm={handleDeleteConfirm}
                title="Delete Position"
                description={`Are you sure you want to delete "${positionToDelete?.name}"? This action cannot be undone.`}
                confirmText="Delete"
                variant="danger"
                isLoading={deleteMutation.isPending}
            />
        </div>
    );
}
