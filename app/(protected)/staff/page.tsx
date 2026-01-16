'use client';

import { Button, LinkButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PlusIcon, UsersIcon } from 'lucide-react';
import { ConfirmModal } from '@/components/common/confirm-modal';
import { StaffFormModal } from '@/components/staff/staff-form-modal';
import { StaffTable, type StaffWithRelations } from '@/components/staff/staff-table';
import { StaffSearch } from '@/components/staff/staff-search';
import { StaffFilters } from '@/components/staff/staff-filters';
import { ViewStaffModal } from '@/components/staff/view-staff-modal';
import { DeleteStaffModal } from '@/components/staff/delete-staff-modal';
import { Pagination } from '@/components/common/pagination';
import { PageLabelsModal } from '@/components/common/page-labels-modal';
import { trpc as api } from '@/lib/client/trpc';
import type { CreateStaffInput, UpdateStaffInput } from '@/lib/schemas/staff.schema';
import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { useSearchParams } from 'next/navigation';
import { useTerminology } from '@/lib/hooks/use-terminology';
import { useStaffPageLabels } from '@/lib/hooks/use-labels';
import { AccountStatus, StaffType, SkillLevel } from '@prisma/client';

type StaffFilterState = {
    accountStatus: AccountStatus | 'ALL';
    staffType: StaffType | 'ALL';
    skillLevel: SkillLevel | 'ALL';
};

const DEFAULT_FILTERS: StaffFilterState = {
    accountStatus: 'ALL',
    staffType: 'ALL',
    skillLevel: 'ALL',
};

type StaffFilterKey = keyof StaffFilterState;

const ACCOUNT_STATUS_VALUES = new Set<AccountStatus>(Object.values(AccountStatus));
const STAFF_TYPE_VALUES = new Set<StaffType>(Object.values(StaffType));
const SKILL_LEVEL_VALUES = new Set<SkillLevel>(Object.values(SkillLevel));

function parseStaffFilterValue<K extends StaffFilterKey>(
    key: K,
    value: string
): StaffFilterState[K] {
    if (!value) {
        return 'ALL' as StaffFilterState[K];
    }

    if (key === 'accountStatus' && ACCOUNT_STATUS_VALUES.has(value as AccountStatus)) {
        return value as StaffFilterState[K];
    }

    if (key === 'staffType' && STAFF_TYPE_VALUES.has(value as StaffType)) {
        return value as StaffFilterState[K];
    }

    if (key === 'skillLevel' && SKILL_LEVEL_VALUES.has(value as SkillLevel)) {
        return value as StaffFilterState[K];
    }

    return 'ALL' as StaffFilterState[K];
}

export default function StaffPage() {
    const { terminology } = useTerminology();
    const staffLabels = useStaffPageLabels();
    const { toast } = useToast();
    const searchParams = useSearchParams();

    // State
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [search, setSearch] = useState('');
    const [filters, setFilters] = useState<StaffFilterState>(DEFAULT_FILTERS);
    const [modals, setModals] = useState({
        form: false,
        view: false,
        delete: false,
    });
    const [selectedStaff, setSelectedStaff] = useState<StaffWithRelations | null>(null);

    // Confirmation dialog states
    const [isResendConfirmOpen, setIsResendConfirmOpen] = useState(false);
    const [isDisableConfirmOpen, setIsDisableConfirmOpen] = useState(false);
    const [staffToResend, setStaffToResend] = useState<StaffWithRelations | null>(null);
    const [staffToDisable, setStaffToDisable] = useState<StaffWithRelations | null>(null);

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
        accountStatus: filters.accountStatus === 'ALL' ? undefined : filters.accountStatus,
        staffType: filters.staffType === 'ALL' ? undefined : filters.staffType,
        skillLevel: filters.skillLevel === 'ALL' ? undefined : filters.skillLevel,
        sortBy: 'createdAt',
        sortOrder: 'desc',
    });

    // tRPC mutations
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

    const createMutation = api.staff.create.useMutation({
        onSuccess: () => {
            toast({
                title: 'Success',
                description: `${terminology.staff.singular} created successfully. An invitation email has been sent.`,
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

    // Handlers
    const handleCreate = () => {
        setSelectedStaff(null);
        setModals((prev) => ({ ...prev, form: true }));
    };

    const handleView = (staff: StaffWithRelations) => {
        setSelectedStaff(staff);
        setModals((prev) => ({ ...prev, view: true }));
    };

    const handleEdit = (staff: StaffWithRelations) => {
        setSelectedStaff(staff);
        setModals((prev) => ({ ...prev, form: true }));
    };

    const handleDelete = (staff: StaffWithRelations) => {
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
            // Create staff and send invitation email
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
        const staff = data?.data?.find((s) => s.id === staffId);
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
        const staff = data?.data?.find((s) => s.id === staffId) || selectedStaff;
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

    const handleFilterChange = <K extends StaffFilterKey>(
        key: K,
        value: string
    ) => {
        setFilters((prev) => ({
            ...prev,
            [key]: parseStaffFilterValue(key, value),
        }));
        setPage(1);
    };

    const handleClearFilters = () => {
        setFilters(DEFAULT_FILTERS);
        setPage(1);
    };

    const totalPages = data ? Math.ceil(data.meta.total / limit) : 0;

    return (
        <div className="p-6 space-y-6">
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
                                    { key: 'cleanupRoster', label: 'Cleanup Roster Button', defaultLabel: 'Cleanup Roster' },
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
                    />
                    {/* Cleanup Roster Button */}
                    <LinkButton href="/staff/cleanup-roster" variant="outline">
                        <UsersIcon className="h-4 w-4 mr-2" />
                        {staffLabels.cleanupRoster}
                    </LinkButton>

                    {/* Add Staff Button */}
                    <Button onClick={handleCreate}>
                        <PlusIcon className="h-4 w-4 mr-2" />
                        {staffLabels.addButton}
                    </Button>
                </div>
            </div>

            {/* Search and Filters */}
            <Card className="p-6">
                <div className="space-y-4">
                    <StaffSearch
                        value={search}
                        onChange={setSearch}
                        placeholder={staffLabels.searchPlaceholder}
                    />
                    <StaffFilters
                        filters={{
                            accountStatus: filters.accountStatus === 'ALL' ? '' : filters.accountStatus,
                            staffType: filters.staffType === 'ALL' ? '' : filters.staffType,
                            skillLevel: filters.skillLevel === 'ALL' ? '' : filters.skillLevel,
                        }}
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
                                staff={data?.data ?? []}
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
        </div>
    );
}
