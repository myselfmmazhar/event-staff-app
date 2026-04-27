'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PlusIcon } from 'lucide-react';
import { ConfirmModal } from '@/components/common/confirm-modal';
import { StaffFormModal } from '@/components/staff/staff-form-modal';
import { StaffTable, type StaffWithRelations } from '@/components/staff/staff-table';
// AssignStaffModal removed - using ViewDetails and Message actions instead
import { StaffSearch } from '@/components/staff/staff-search';
import { StaffFilters } from '@/components/staff/staff-filters';
import { ActiveFilters } from '@/components/common/active-filters';
import { ViewStaffModal } from '@/components/staff/view-staff-modal';
import { DeleteStaffModal } from '@/components/staff/delete-staff-modal';
import { BulkEditModal, type BulkEditFormData } from '@/components/staff/bulk-edit-modal';
import { BulkActionBar } from '@/components/staff/bulk-action-bar';
import { StaffMessageModal } from '@/components/staff/staff-message-modal';
import { Pagination } from '@/components/common/pagination';
import { PageLabelsModal } from '@/components/common/page-labels-modal';
import { trpc as api } from '@/lib/client/trpc';
import type { CreateStaffInput, UpdateStaffInput } from '@/lib/schemas/staff.schema';
import type { UpsertStaffTaxDetailsInput } from '@/lib/schemas/staff-tax-details.schema';
import { useState, useEffect, useRef } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { useSearchParams } from 'next/navigation';
import { useTerminology } from '@/lib/hooks/use-terminology';
import { useStaffPageLabels } from '@/lib/hooks/use-labels';
import { useStaffFilters } from '@/store/staff-filters.store';
import { AccountStatus, StaffType, SkillLevel, StaffRole } from '@prisma/client';

export default function StaffPage() {
    const { terminology } = useTerminology();
    const staffLabels = useStaffPageLabels();
    const { toast } = useToast();
    const searchParams = useSearchParams();
    const { data: profile } = api.profile.getMyProfile.useQuery();

    // Fetch current user's staff profile to check for TEAM role
    const { data: staffProfile } = api.staff.getMyProfile.useQuery(undefined, {
        enabled: profile?.role === 'STAFF',
    });

    const isTeamUser = profile?.role === 'STAFF' && staffProfile?.staffRole === StaffRole.TEAM;

    // Zustand store for filters (with localStorage persistence for date filters)
    const {
        page,
        setPage,
        limit,
        setLimit,
        search,
        setSearch,
        accountStatuses,
        setAccountStatuses,
        staffTypes,
        setStaffTypes,
        skillLevels,
        setSkillLevels,
        createdFrom,
        setCreatedFrom,
        createdTo,
        setCreatedTo,
        sortBy,
        setSortBy,
        sortOrder,
        setSortOrder,
        resetFilters,
    } = useStaffFilters();

    // State
    const [modals, setModals] = useState({
        form: false,
        view: false,
        delete: false,
        bulkEdit: false,
        bulkDelete: false,
        message: false,
    });
    const [selectedStaff, setSelectedStaff] = useState<StaffWithRelations | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isUpdateAndContinue, setIsUpdateAndContinue] = useState(false);

    // Confirmation dialog states
    const [isResendConfirmOpen, setIsResendConfirmOpen] = useState(false);
    const [isDisableConfirmOpen, setIsDisableConfirmOpen] = useState(false);
    const [staffToResend, setStaffToResend] = useState<StaffWithRelations | null>(null);
    const [staffToDisable, setStaffToDisable] = useState<StaffWithRelations | null>(null);
    // Message staff placeholder (no action for now)
    const [messagingStaff, setMessagingStaff] = useState<StaffWithRelations | null>(null);

    // Rehydrate date filters from localStorage on mount
    useEffect(() => {
        useStaffFilters.persist.rehydrate();
    }, []);

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
        accountStatuses: accountStatuses.length > 0 ? accountStatuses : undefined,
        staffTypes: staffTypes.length > 0 ? staffTypes : undefined,
        skillLevels: skillLevels.length > 0 ? skillLevels : undefined,
        createdFrom: createdFrom ? new Date(createdFrom) : undefined,
        createdTo: createdTo ? new Date(createdTo) : undefined,
        sortBy,
        sortOrder,
    });

    const handleSort = (field: string) => {
        const normalizedField =
            field === 'status' ? 'accountStatus' :
            field === 'type' ? 'staffType' :
            field === 'availability' ? 'availabilityStatus' :
            field;

        if (sortBy === normalizedField) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(normalizedField as any);
            setSortOrder('asc');
        }
        setPage(1);
    };

    // tRPC mutations
    const updateMutation = api.staff.update.useMutation({
        onSuccess: () => {
            toast({
                title: 'Success',
                description: `${terminology.staff.singular} updated successfully`,
            });
            if (!isUpdateAndContinue) {
                setModals((prev) => ({ ...prev, form: false }));
                setSelectedStaff(null);
            }
            setIsUpdateAndContinue(false);
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

    // Ref to hold pending tax data during staff creation
    const pendingTaxDataRef = useRef<Record<string, unknown> | null>(null);

    const taxDetailsUpsertMutation = api.staffTaxDetails.upsert.useMutation({
        onSuccess: () => {
            toast({
                title: 'Tax details saved',
                description: 'Tax details saved alongside new staff record',
            });
        },
        onError: (error) => {
            toast({
                title: 'Warning',
                description: `Staff created but failed to save tax details: ${error.message}`,
                variant: 'error',
            });
        },
    });

    const createMutation = api.staff.create.useMutation({
        onSuccess: (newStaff) => {
            toast({
                title: 'Success',
                description: `${terminology.staff.singular} created successfully. An invitation email has been sent.`,
            });
            // Save tax details if any were filled during creation
            if (pendingTaxDataRef.current && newStaff?.id) {
                taxDetailsUpsertMutation.mutate({
                    staffId: newStaff.id,
                    ...pendingTaxDataRef.current,
                } as UpsertStaffTaxDetailsInput);
                pendingTaxDataRef.current = null;
            }
            setModals((prev) => ({ ...prev, form: false }));
            setSelectedStaff(null);
            refetch();
        },
        onError: (error) => {
            pendingTaxDataRef.current = null;
            toast({
                title: 'Error',
                description: error.message || `Failed to create ${terminology.staff.lower}`,
                variant: 'error',
            });
        },
    });

    const grantLoginAccessMutation = api.staff.grantLoginAccess.useMutation({
        onSuccess: () => {
            toast({
                title: 'Success',
                description: `Login access granted and credentials sent via email`,
            });
            setModals((prev) => ({ ...prev, view: false }));
            setSelectedStaff(null);
            refetch();
        },
        onError: (error) => {
            toast({
                title: 'Error',
                description: error.message || `Failed to grant login access`,
                variant: 'error',
            });
        },
    });

    const resendInvitationMutation = api.staff.resendInvitation.useMutation({
        onSuccess: () => {
            toast({
                title: 'Success',
                description: `Invitation resent successfully`,
            });
            setIsResendConfirmOpen(false);
            setStaffToResend(null);
            refetch();
        },
        onError: (error) => {
            toast({
                title: 'Error',
                description: error.message || `Failed to resend invitation`,
                variant: 'error',
            });
        },
    });

    const bulkDisableMutation = api.staff.bulkDisable.useMutation({
        onSuccess: (result) => {
            toast({
                title: 'Success',
                description: `${result.success} ${terminology.staff.lowerPlural} disabled`,
            });
            setIsDisableConfirmOpen(false);
            setStaffToDisable(null);
            setModals((prev) => ({ ...prev, view: false }));
            setSelectedStaff(null);
            refetch();
        },
        onError: (error) => {
            toast({
                title: 'Error',
                description: error.message || `Failed to disable ${terminology.staff.lowerPlural}`,
                variant: 'error',
            });
        },
    });

    const bulkUpdateMutation = api.staff.bulkUpdate.useMutation({
        onSuccess: (result) => {
            const { success, failed } = result;
            if (success > 0) {
                toast({
                    title: 'Success',
                    description: failed.length > 0
                        ? `Updated ${success} ${terminology.staff.lower} member(s). ${failed.length} failed.`
                        : `Successfully updated ${success} ${terminology.staff.lower} member(s)`,
                });
            }
            if (failed.length > 0) {
                const failureDetails = failed.map(f => `${f.staffId}: ${f.reason}`).join(', ');
                toast({
                    title: `Some ${terminology.staff.lower} members could not be updated`,
                    description: failureDetails,
                    variant: 'error',
                });
            }
            setSelectedIds(new Set());
            setModals((prev) => ({ ...prev, bulkEdit: false }));
            refetch();
        },
        onError: (error) => {
            toast({
                title: 'Error',
                description: error.message || `Failed to update ${terminology.staff.lower} members`,
                variant: 'error',
            });
        },
    });

    const bulkDeleteMutation = api.staff.bulkDelete.useMutation({
        onSuccess: (result) => {
            const { success, failed } = result;
            if (success > 0) {
                toast({
                    title: 'Success',
                    description: failed.length > 0
                        ? `Deleted ${success} ${terminology.staff.lower} member(s). ${failed.length} failed.`
                        : `Successfully deleted ${success} ${terminology.staff.lower} member(s)`,
                });
            }
            if (failed.length > 0) {
                const failureDetails = failed.map(f => `${f.staffId}: ${f.reason}`).join(', ');
                toast({
                    title: `Some ${terminology.staff.lower} members could not be deleted`,
                    description: failureDetails,
                    variant: 'error',
                });
            }
            setSelectedIds(new Set());
            setModals((prev) => ({ ...prev, bulkDelete: false }));
            refetch();
        },
        onError: (error) => {
            toast({
                title: 'Error',
                description: error.message || `Failed to delete ${terminology.staff.lower} members`,
                variant: 'error',
            });
        },
    });

    // Handlers
    const handleCreate = () => {
        setSelectedStaff(null);
        setModals((prev) => ({ ...prev, form: true }));
    };

    const handleEdit = (staff: StaffWithRelations) => {
        setSelectedStaff(staff);
        setModals((prev) => ({ ...prev, form: true }));
    };

    const clearSelection = () => setSelectedIds(new Set());

    // Get selected staff for bulk operations
    const selectedStaffList = ((data?.data ?? []) as StaffWithRelations[]).filter((s) => selectedIds.has(s.id));

    const handleBulkEditSelected = () => {
        if (selectedIds.size === 0) return;
        setModals((prev) => ({ ...prev, bulkEdit: true }));
    };

    const handleBulkDeleteSelected = () => {
        if (selectedIds.size === 0) return;
        setModals((prev) => ({ ...prev, bulkDelete: true }));
    };

    const handleBulkEditSubmit = (formData: BulkEditFormData) => {
        bulkUpdateMutation.mutate({
            staffIds: Array.from(selectedIds),
            ...formData,
        });
    };

    const handleBulkDeleteConfirm = () => {
        bulkDeleteMutation.mutate({
            staffIds: Array.from(selectedIds),
        });
    };

    const handleDelete = (staff: StaffWithRelations) => {
        setSelectedStaff(staff);
        setModals((prev) => ({ ...prev, delete: true }));
    };

    const handleViewFromEdit = () => {
        setModals((prev) => ({ ...prev, form: false, view: true }));
    };

    const handleViewDetails = (staff: StaffWithRelations) => {
        setSelectedStaff(staff);
        setModals((prev) => ({ ...prev, view: true }));
    };

    const handleMessage = (staff: StaffWithRelations) => {
        setMessagingStaff(staff);
        setModals((prev) => ({ ...prev, message: true }));
    };

    const handleFormSubmit = (formData: CreateStaffInput | Omit<UpdateStaffInput, 'id'>, taxData?: Record<string, unknown>, saveAction?: 'close' | 'update-continue') => {
        setIsUpdateAndContinue(saveAction === 'update-continue');
        if (selectedStaff) {
            updateMutation.mutate({
                id: selectedStaff.id,
                ...formData,
            } as UpdateStaffInput);
        } else {
            // Store tax data for saving after successful creation
            pendingTaxDataRef.current = taxData ?? null;
            createMutation.mutate(formData as CreateStaffInput);
        }
    };

    const handleDeleteConfirm = () => {
        if (selectedStaff) {
            deleteMutation.mutate({ id: selectedStaff.id });
        }
    };

    const handleGrantLoginAccess = (staffId: string) => {
        grantLoginAccessMutation.mutate({ id: staffId });
    };

    const handleResendInvitation = (staffId: string) => {
        // Find staff by ID to get their name for the confirmation dialog
        const staff = data?.data?.find((s) => s.id === staffId) as StaffWithRelations | undefined;
        if (staff) {
            setStaffToResend(staff);
            setIsResendConfirmOpen(true);
        }
    };

    const handleResendConfirm = () => {
        if (staffToResend) {
            resendInvitationMutation.mutate({ id: staffToResend.id });
        }
    };

    const handleDisableStaff = (staffId: string) => {
        // Find staff by ID to get their name for the confirmation dialog
        const staff = (data?.data?.find((s) => s.id === staffId) || selectedStaff) as StaffWithRelations | undefined;
        if (staff) {
            setStaffToDisable(staff);
            setIsDisableConfirmOpen(true);
        }
    };

    const handleDisableConfirm = () => {
        if (staffToDisable) {
            bulkDisableMutation.mutate({ staffIds: [staffToDisable.id] });
        }
    };

    const handleClearFilters = () => {
        resetFilters();
    };

    const totalPages = data ? Math.ceil(data.meta.total / limit) : 0;

    // Build active filters for display
    const STATUS_LABELS: Record<AccountStatus, string> = {
        ACTIVE: 'Active',
        PENDING: 'Pending',
        DISABLED: 'Disabled',
        TERMINATED: 'Terminated',
        ARCHIVED: 'Archived',
    };

    const TYPE_LABELS: Record<StaffType, string> = {
        COMPANY: 'Company',
        EMPLOYEE: 'Employee',
        TEAM: 'Team',
        CONTRACTOR: 'Contractor',
        FREELANCE: 'Freelance',
    };

    const SKILL_LABELS: Record<SkillLevel, string> = {
        BEGINNER: 'Beginner',
        INTERMEDIATE: 'Intermediate',
        ADVANCED: 'Advanced',
    };

    const activeFilters: Array<{ key: string; label: string; value: string; onRemove: () => void }> = [];

    if (search) {
        activeFilters.push({
            key: 'search',
            label: 'Search',
            value: search,
            onRemove: () => setSearch(''),
        });
    }

    if (accountStatuses.length > 0) {
        const statusLabels = accountStatuses.map((s) => STATUS_LABELS[s]).join(', ');
        activeFilters.push({
            key: 'statuses',
            label: 'Status',
            value: accountStatuses.length === 1 ? statusLabels : `${accountStatuses.length} selected`,
            onRemove: () => setAccountStatuses([]),
        });
    }

    if (staffTypes.length > 0) {
        const typeLabels = staffTypes.map((t) => TYPE_LABELS[t]).join(', ');
        activeFilters.push({
            key: 'types',
            label: 'Type',
            value: staffTypes.length === 1 ? typeLabels : `${staffTypes.length} selected`,
            onRemove: () => setStaffTypes([]),
        });
    }

    if (skillLevels.length > 0) {
        const skillLabels = skillLevels.map((l) => SKILL_LABELS[l]).join(', ');
        activeFilters.push({
            key: 'skillLevels',
            label: 'Skill Level',
            value: skillLevels.length === 1 ? skillLabels : `${skillLevels.length} selected`,
            onRemove: () => setSkillLevels([]),
        });
    }

    if (createdFrom) {
        activeFilters.push({
            key: 'createdFrom',
            label: 'From',
            value: createdFrom,
            onRemove: () => setCreatedFrom(''),
        });
    }

    if (createdTo) {
        activeFilters.push({
            key: 'createdTo',
            label: 'To',
            value: createdTo,
            onRemove: () => setCreatedTo(''),
        });
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">
                        {staffLabels.pageTitle}
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        {staffLabels.pageSubtitle}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <PageLabelsModal
                        page="staff"
                        sections={[
                            {
                                id: 'page',
                                title: 'Page Labels',
                                description: 'Customize heading, buttons, and search text',
                                prefix: 'page',
                                labels: [
                                    { key: 'pageTitle', label: 'Page Title', defaultLabel: `${terminology.staff.plural}` },
                                    { key: 'pageSubtitle', label: 'Page Subtitle', defaultLabel: `Manage ${terminology.staff.lowerPlural} and positions` },
                                    { key: 'addButton', label: 'Add Button', defaultLabel: `Add ${terminology.staff.singular}` },
                                    { key: 'searchPlaceholder', label: 'Search Placeholder', defaultLabel: `Search by name, email, phone, or ${terminology.staff.lower} ID...` },
                                ],
                            },
                            {
                                id: 'filters',
                                title: 'Filter Labels',
                                description: 'Customize filter names',
                                prefix: 'filters',
                                labels: [
                                    { key: 'title', label: 'Filters Heading', defaultLabel: 'Filters' },
                                    { key: 'accountStatus', label: 'Account Status', defaultLabel: 'Account Status' },
                                    { key: 'staffType', label: 'Staff Type', defaultLabel: `${terminology.staff.singular} Type` },
                                    { key: 'skillLevel', label: 'Skill Level', defaultLabel: 'Skill Level' },
                                ],
                            },
                            {
                                id: 'columns',
                                title: 'Table Columns',
                                description: 'Customize table column headers',
                                prefix: 'columns',
                                labels: [
                                    { key: 'staffId', label: 'Staff ID', defaultLabel: `${terminology.staff.singular} ID` },
                                    { key: 'name', label: 'Name', defaultLabel: 'Name' },
                                    { key: 'email', label: 'Email', defaultLabel: 'Email' },
                                    { key: 'phone', label: 'Phone', defaultLabel: 'Phone' },
                                    { key: 'type', label: 'Type', defaultLabel: 'Type' },
                                    { key: 'status', label: 'Status', defaultLabel: 'Status' },
                                    { key: 'skillLevel', label: 'Experience', defaultLabel: 'Experience' },
                                    { key: 'availability', label: 'Availability', defaultLabel: 'Availability' },
                                    { key: 'actions', label: 'Actions', defaultLabel: 'Actions' },
                                ],
                            },
                        ]}
                        buttonVariant="outline"
                        buttonSize="md"
                    />

                    {/* Add Staff Button */}
                    <Button onClick={handleCreate}>
                        <PlusIcon className="h-4 w-4 mr-2" />
                        {staffLabels.addButton}
                    </Button>
                </div>
            </div>

            {/* Search and Filters */}
            <Card className="p-6 overflow-visible relative z-20">
                <div className="space-y-4">
                    <StaffSearch
                        value={search}
                        onChange={setSearch}
                        placeholder={staffLabels.searchPlaceholder}
                    />
                    <StaffFilters
                        selectedStatuses={accountStatuses}
                        selectedTypes={staffTypes}
                        selectedSkillLevels={skillLevels}
                        createdFrom={createdFrom}
                        createdTo={createdTo}
                        onStatusChange={setAccountStatuses}
                        onTypeChange={setStaffTypes}
                        onSkillLevelChange={setSkillLevels}
                        onCreatedFromChange={setCreatedFrom}
                        onCreatedToChange={setCreatedTo}
                        onClearFilters={handleClearFilters}
                    />
                    <ActiveFilters filters={activeFilters} />
                </div>
            </Card>

            {/* Bulk Action Bar - appears when items are selected */}
            <BulkActionBar
                selectedCount={selectedIds.size}
                onClearSelection={clearSelection}
                onEditSelected={handleBulkEditSelected}
                onDeleteSelected={handleBulkDeleteSelected}
                isEditing={bulkUpdateMutation.isPending}
                isDeleting={bulkDeleteMutation.isPending}
            />

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
                                staff={(data?.data ?? []) as StaffWithRelations[]}
                                onEdit={handleEdit}
                                onDelete={handleDelete}
                                onViewDetails={handleViewDetails}
                                onMessage={handleMessage}
                                onSort={handleSort}
                                sortBy={sortBy}
                                sortOrder={sortOrder}
                                selectedIds={selectedIds}
                                onSelectionChange={setSelectedIds}
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
                onViewDetails={handleViewFromEdit}
                allowedStaffTypeChipIds={isTeamUser ? ['employee'] : undefined}
                defaultStaffTypeChipId={isTeamUser ? 'employee' : undefined}
            />

            <ViewStaffModal
                staff={selectedStaff}
                open={modals.view}
                onClose={() => {
                    setModals((prev) => ({ ...prev, view: false }));
                    setSelectedStaff(null);
                }}
                onGrantLoginAccess={handleGrantLoginAccess}
                onResendInvitation={handleResendInvitation}
                onDisable={handleDisableStaff}
                isActioning={grantLoginAccessMutation.isPending || resendInvitationMutation.isPending || bulkDisableMutation.isPending}
            />

            <DeleteStaffModal
                staff={selectedStaff}
                open={modals.delete}
                onClose={() => {
                    setModals((prev) => ({ ...prev, delete: false }));
                    setSelectedStaff(null);
                }}
                onConfirm={handleDeleteConfirm}
                isDeleting={deleteMutation.isPending}
            />

            {/* Confirmation Modals */}
            <ConfirmModal
                open={isResendConfirmOpen}
                onClose={() => {
                    setIsResendConfirmOpen(false);
                    setStaffToResend(null);
                }}
                onConfirm={handleResendConfirm}
                isLoading={resendInvitationMutation.isPending}
                title="Resend Invitation"
                description={`Are you sure you want to resend the invitation to ${staffToResend?.firstName} ${staffToResend?.lastName}?`}
                confirmText="Resend"
                variant="default"
            >
                <p className="text-sm text-muted-foreground">
                    A new invitation email will be sent to <strong>{staffToResend?.email}</strong>.
                    The previous invitation link will be invalidated.
                </p>
            </ConfirmModal>

            <ConfirmModal
                open={isDisableConfirmOpen}
                onClose={() => {
                    setIsDisableConfirmOpen(false);
                    setStaffToDisable(null);
                }}
                onConfirm={handleDisableConfirm}
                isLoading={bulkDisableMutation.isPending}
                title="Disable Account"
                description={`Are you sure you want to disable ${staffToDisable?.firstName} ${staffToDisable?.lastName}'s account?`}
                confirmText="Disable"
                variant="danger"
            >
                <p className="text-sm text-muted-foreground">
                    This will prevent the {terminology.staff.lower} from logging in or being assigned to events.
                    You can re-enable the account later if needed.
                </p>
            </ConfirmModal>

            {/* Bulk Edit Modal */}
            <BulkEditModal
                staff={selectedStaffList}
                open={modals.bulkEdit}
                onClose={() => setModals((prev) => ({ ...prev, bulkEdit: false }))}
                onSubmit={handleBulkEditSubmit}
                isSubmitting={bulkUpdateMutation.isPending}
            />

            {/* Bulk Delete Confirmation Modal */}
            <ConfirmModal
                open={modals.bulkDelete}
                onClose={() => setModals((prev) => ({ ...prev, bulkDelete: false }))}
                onConfirm={handleBulkDeleteConfirm}
                isLoading={bulkDeleteMutation.isPending}
                title={`Delete ${selectedIds.size} ${selectedIds.size === 1 ? terminology.staff.singular : terminology.staff.plural}`}
                description={`Are you sure you want to permanently delete ${selectedIds.size} ${selectedIds.size === 1 ? terminology.staff.lower : terminology.staff.lowerPlural}?`}
                confirmText="Delete"
                variant="danger"
            >
                <p className="text-sm text-muted-foreground">
                    This action cannot be undone. All data associated with the selected {terminology.staff.lowerPlural} will be permanently removed.
                </p>
                {selectedStaffList.length > 0 && (
                    <div className="mt-4 space-y-2">
                        <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-3 bg-muted/50 rounded-md border border-border">
                            {selectedStaffList.map((staff) => (
                                <Badge key={staff.id} variant="secondary" size="sm">
                                    {staff.firstName} {staff.lastName}
                                </Badge>
                            ))}
                        </div>
                    </div>
                )}
            </ConfirmModal>

            <StaffMessageModal
                staff={messagingStaff}
                open={modals.message}
                onClose={() => {
                    setModals((prev) => ({ ...prev, message: false }));
                    setMessagingStaff(null);
                }}
            />

        </div>
    );
}
