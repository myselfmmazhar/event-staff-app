'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PlusIcon } from '@/components/ui/icons';
import { StaffFormModal } from '@/components/staff/staff-form-modal';
import { StaffTable } from '@/components/staff/staff-table';
import { StaffSearch } from '@/components/staff/staff-search';
import { StaffFilters } from '@/components/staff/staff-filters';
import { ViewStaffDialog } from '@/components/staff/view-staff-dialog';
import { DeleteStaffDialog } from '@/components/staff/delete-staff-dialog';
import { Pagination } from '@/components/common/pagination';
import { trpc as api } from '@/lib/client/trpc';
import type { CreateStaffInput, UpdateStaffInput } from '@/lib/schemas/staff.schema';
import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { useSearchParams } from 'next/navigation';
import { useTerminology } from '@/lib/hooks/use-terminology';

export default function StaffPage() {
    const { terminology } = useTerminology();
    const { toast } = useToast();
    const searchParams = useSearchParams();

    // State
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [search, setSearch] = useState('');
    const [filters, setFilters] = useState<{
        accountStatus?: string;
        staffType?: string;
        skillLevel?: string;
    }>({});
    const [modals, setModals] = useState({
        form: false,
        view: false,
        delete: false,
    });
    const [selectedStaff, setSelectedStaff] = useState<any | null>(null);

    // Handle create query parameter
    useEffect(() => {
        const createParam = searchParams.get('create');
        if (createParam === 'true') {
            handleCreate();
            // Clean up URL
            const newUrl = window.location.pathname;
            window.history.replaceState({}, '', newUrl);
        }
    }, [searchParams]);

    // tRPC queries
    const { data, isLoading, refetch } = api.staff.getAll.useQuery({
        page,
        limit,
        search: search || undefined,
        accountStatus: filters.accountStatus as any,
        staffType: filters.staffType as any,
        skillLevel: filters.skillLevel as any,
        sortBy: 'createdAt',
        sortOrder: 'desc',
    });

    // tRPC mutations
    const createMutation = api.staff.create.useMutation({
        onSuccess: () => {
            toast({
                title: 'Success',
                description: `${terminology.staff.singular} created successfully`,
            });
            setModals((prev) => ({ ...prev, form: false }));
            setSelectedStaff(null);
            refetch();
        },
        onError: (error) => {
            toast({
                title: 'Error',
                description: error.message || `Failed to create ${terminology.staff.lower}`,
                variant: 'error',
            });
        },
    });

    const updateMutation = api.staff.update.useMutation({
        onSuccess: () => {
            toast({
                title: 'Success',
                description: `${terminology.staff.singular} updated successfully`,
            });
            setModals((prev) => ({ ...prev, form: false }));
            setSelectedStaff(null);
            refetch();
        },
        onError: (error) => {
            toast({
                title: 'Error',
                description: error.message || `Failed to update ${terminology.staff.lower}`,
                variant: 'error',
            });
        },
    });

    const deleteMutation = api.staff.delete.useMutation({
        onSuccess: () => {
            toast({
                title: 'Success',
                description: `${terminology.staff.singular} deleted successfully`,
            });
            setModals((prev) => ({ ...prev, delete: false }));
            setSelectedStaff(null);
            refetch();
        },
        onError: (error) => {
            toast({
                title: 'Error',
                description: error.message || `Failed to delete ${terminology.staff.lower}`,
                variant: 'error',
            });
        },
    });

    // Handlers
    const handleCreate = () => {
        setSelectedStaff(null);
        setModals((prev) => ({ ...prev, form: true }));
    };

    const handleView = (staff: any) => {
        setSelectedStaff(staff);
        setModals((prev) => ({ ...prev, view: true }));
    };

    const handleEdit = (staff: any) => {
        setSelectedStaff(staff);
        setModals((prev) => ({ ...prev, form: true }));
    };

    const handleDelete = (staff: any) => {
        setSelectedStaff(staff);
        setModals((prev) => ({ ...prev, delete: true }));
    };

    const handleFormSubmit = (formData: CreateStaffInput | Omit<UpdateStaffInput, 'id'>) => {
        if (selectedStaff) {
            updateMutation.mutate({
                id: selectedStaff.id,
                ...formData,
            } as UpdateStaffInput);
        } else {
            createMutation.mutate(formData as CreateStaffInput);
        }
    };

    const handleDeleteConfirm = () => {
        if (selectedStaff) {
            deleteMutation.mutate({ id: selectedStaff.id });
        }
    };

    const handleFilterChange = (key: string, value: string | undefined) => {
        setFilters((prev) => ({
            ...prev,
            [key]: value,
        }));
        setPage(1);
    };

    const handleClearFilters = () => {
        setFilters({});
        setPage(1);
    };

    const totalPages = data ? Math.ceil(data.meta.total / limit) : 0;

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">{terminology.staff.plural}</h1>
                    <p className="text-muted-foreground mt-1">
                        Manage {terminology.staff.lowerPlural}, positions, and work types
                    </p>
                </div>
                <Button onClick={handleCreate}>
                    <PlusIcon className="h-5 w-5 mr-2" />
                    Add {terminology.staff.singular}
                </Button>
            </div>

            {/* Search and Filters */}
            <Card className="p-6">
                <div className="space-y-4">
                    <StaffSearch value={search} onChange={setSearch} />
                    <StaffFilters
                        filters={filters}
                        onFilterChange={handleFilterChange}
                        onClearFilters={handleClearFilters}
                    />
                </div>
            </Card>

            {/* Table */}
            <Card className="p-6">
                <div className="relative z-10">
                    {isLoading ? (
                        <div className="text-center py-8 text-muted-foreground">
                            Loading {terminology.staff.lowerPlural}...
                        </div>
                    ) : (
                        <>
                            <StaffTable
                                staff={(data?.data || []) as any}
                                onView={handleView}
                                onEdit={handleEdit}
                                onDelete={handleDelete}
                            />

                            {/* Pagination */}
                            {data && data.meta.total > 0 && (
                                <div className="mt-6">
                                    <Pagination
                                        currentPage={page}
                                        totalPages={totalPages}
                                        totalItems={data.meta.total}
                                        itemsPerPage={limit}
                                        onPageChange={setPage}
                                        onItemsPerPageChange={setLimit}
                                    />
                                </div>
                            )}
                        </>
                    )}
                </div>
            </Card>

            {/* Modals */}
            <StaffFormModal
                staff={selectedStaff}
                open={modals.form}
                onClose={() => {
                    setModals((prev) => ({ ...prev, form: false }));
                    setSelectedStaff(null);
                }}
                onSubmit={handleFormSubmit}
                isSubmitting={createMutation.isPending || updateMutation.isPending}
            />

            <ViewStaffDialog
                staff={selectedStaff}
                open={modals.view}
                onClose={() => {
                    setModals((prev) => ({ ...prev, view: false }));
                    setSelectedStaff(null);
                }}
            />

            <DeleteStaffDialog
                staff={selectedStaff}
                open={modals.delete}
                onClose={() => {
                    setModals((prev) => ({ ...prev, delete: false }));
                    setSelectedStaff(null);
                }}
                onConfirm={handleDeleteConfirm}
                isDeleting={deleteMutation.isPending}
            />
        </div>
    );
}
