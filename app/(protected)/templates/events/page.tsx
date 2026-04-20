'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { PlusIcon, SearchIcon, EditIcon, TrashIcon, UploadIcon } from '@/components/ui/icons';
import { ConfirmModal } from '@/components/common/confirm-modal';
import { DataTable, type ColumnDef } from '@/components/common/data-table';
import { Pagination } from '@/components/common/pagination';
import { EventTemplateFormModal } from '@/components/event-templates/event-template-form-modal';
import { EventTemplateDeleteModal } from '@/components/event-templates/event-template-delete-modal';
import { EventTemplateExportDropdown } from '@/components/event-templates/event-template-export-dropdown';
import { EventTemplateImportModal } from '@/components/event-templates/event-template-import-modal';
import { trpc } from '@/lib/client/trpc';
import { useTerminology } from '@/lib/hooks/use-terminology';
import { useCrudMutations } from '@/lib/hooks/useCrudMutations';
import type { CreateEventTemplateInput, UpdateEventTemplateInput } from '@/lib/schemas/event-template.schema';
import type { EventTemplateExport } from '@/lib/utils/event-template-export';
import { RequestMethod } from '@prisma/client';

interface EventTemplate {
  id: string;
  name: string;
  description: string | null;
  title: string | null;
  eventDescription: string | null;
  requirements: string | null;
  privateComments: string | null;
  clientId: string | null;
  // Request Information
  requestMethod: RequestMethod | null;
  requestorName: string | null;
  requestorPhone: string | null;
  requestorEmail: string | null;
  poNumber: string | null;
  // Venue Information
  venueName: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  latitude: number | null;
  longitude: number | null;
  // Onsite Contact & Meeting Point
  meetingPoint: string | null;
  onsitePocName: string | null;
  onsitePocPhone: string | null;
  onsitePocEmail: string | null;
  // Date & Time
  startDate: Date | null;
  startTime: string | null;
  endDate: Date | null;
  endTime: string | null;
  timezone: string | null;
  // Event Instructions & Documents
  preEventInstructions: string | null;
  eventDocuments: any;
  // File Links
  fileLinks: any;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  client: { id: string; businessName: string } | null;
  createdByUser: { id: string; name: string; email: string };
}

export default function EventTemplatesPage() {
  const { terminology } = useTerminology();
  const { backendErrors, setBackendErrors, handleSuccess, handleError, createMutationOptions, updateMutationOptions, deleteMutationOptions } = useCrudMutations();

  // State
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'createdAt' | 'updatedAt' | 'name'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Modal state
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<EventTemplate | null>(null);

  // Bulk delete state
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  // Row selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Fetch templates
  const { data, isLoading, refetch } = trpc.eventTemplate.getAll.useQuery({
    page,
    limit,
    search: search || undefined,
    sortBy,
    sortOrder,
  });

  const templates = data?.data ?? [];
  const pagination = data?.pagination;

  // Fetch all templates for export (when exporting all)
  const { data: allTemplatesData, refetch: refetchExport } = trpc.eventTemplate.getAllForExport.useQuery();
  const allTemplates = allTemplatesData ?? [];

  // Compute selected templates for export
  const selectedTemplates = useMemo(() => {
    return allTemplates.filter((t) => selectedIds.has(t.id)) as EventTemplateExport[];
  }, [allTemplates, selectedIds]);

  // Row selection handlers
  const allSelected = templates.length > 0 && templates.every((t) => selectedIds.has(t.id));
  const someSelected = templates.some((t) => selectedIds.has(t.id));

  const toggleAll = () => {
    if (allSelected) {
      // Deselect all on current page
      const newSet = new Set(selectedIds);
      templates.forEach((t) => newSet.delete(t.id));
      setSelectedIds(newSet);
    } else {
      // Select all on current page
      const newSet = new Set(selectedIds);
      templates.forEach((t) => newSet.add(t.id));
      setSelectedIds(newSet);
    }
  };

  const toggleOne = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  // Mutations
  const createMutation = trpc.eventTemplate.create.useMutation({
    ...createMutationOptions('Template created successfully', {
      onSuccess: () => {
        setFormOpen(false);
        setSelectedTemplate(null);
        refetch();
        refetchExport();
      },
    }),
  });

  const updateMutation = trpc.eventTemplate.update.useMutation({
    ...updateMutationOptions('Template updated successfully', {
      onSuccess: () => {
        setFormOpen(false);
        setSelectedTemplate(null);
        refetch();
        refetchExport();
      },
    }),
  });

  const deleteMutation = trpc.eventTemplate.delete.useMutation(
    deleteMutationOptions('Template deleted successfully', {
      onSuccess: () => {
        setDeleteOpen(false);
        setSelectedTemplate(null);
        refetch();
        refetchExport();
      },
    })
  );

  const deleteManyMutation = trpc.eventTemplate.deleteMany.useMutation({
    onSuccess: (result) => {
      const count = result.count;
      const message =
        count === 1
          ? 'Template deleted successfully'
          : `${count} templates deleted successfully`;
      handleSuccess(message);
      setBulkDeleteOpen(false);
      clearSelection();
      refetch();
      refetchExport();
    },
    onError: handleError,
  });

  // Handlers
  const handleCreate = () => {
    setSelectedTemplate(null);
    setBackendErrors([]);
    setFormOpen(true);
  };

  const handleEdit = (template: EventTemplate) => {
    setSelectedTemplate(template);
    setBackendErrors([]);
    setFormOpen(true);
  };

  const handleDelete = (template: EventTemplate) => {
    setSelectedTemplate(template);
    setDeleteOpen(true);
  };

  const handleFormSubmit = (data: CreateEventTemplateInput | Omit<UpdateEventTemplateInput, 'id'>) => {
    if (selectedTemplate) {
      updateMutation.mutate({ id: selectedTemplate.id, ...data });
    } else {
      createMutation.mutate(data as CreateEventTemplateInput);
    }
  };

  const handleDeleteConfirm = () => {
    if (selectedTemplate) {
      deleteMutation.mutate({ id: selectedTemplate.id });
    }
  };

  const handleBulkDeleteSelected = () => {
    if (selectedIds.size === 0) return;
    setBulkDeleteOpen(true);
  };

  const handleBulkDeleteConfirm = () => {
    deleteManyMutation.mutate({ ids: Array.from(selectedIds) });
  };

  const handleSort = (field: string) => {
    if (field === sortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field as typeof sortBy);
      setSortOrder('desc');
    }
  };

  // Format date for display
  const formatDate = (date: Date | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString();
  };

  // Table columns
  const columns: ColumnDef<EventTemplate>[] = [
    {
      key: 'select',
      label: (
        <Checkbox
          checked={allSelected}
          indeterminate={someSelected && !allSelected}
          onChange={toggleAll}
          aria-label="Select all"
        />
      ),
      headerClassName: 'w-12 py-3 px-4',
      className: 'w-12 py-4 px-4',
      render: (item) => (
        <Checkbox
          checked={selectedIds.has(item.id)}
          onChange={() => toggleOne(item.id)}
          aria-label={`Select ${item.name}`}
          onClick={(e) => e.stopPropagation()}
        />
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      headerClassName: 'text-left py-3 px-4',
      className: 'py-4 px-4',
      render: (item) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="px-0"
            onClick={() => handleEdit(item)}
            title="Edit template"
          >
            <EditIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="px-0 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => handleDelete(item)}
            title="Delete template"
          >
            <TrashIcon className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
    {
      key: 'name',
      label: 'Template Name',
      sortable: true,
      className: 'py-4 px-4',
      render: (item) => (
        <div>
          <p className="font-medium text-foreground">{item.name}</p>
          {item.description && (
            <p className="text-sm text-muted-foreground truncate max-w-xs">{item.description}</p>
          )}
        </div>
      ),
    },
    {
      key: 'title',
      label: `${terminology.event.singular} Title`,
      className: 'py-4 px-4',
      render: (item) => (
        <span className="text-muted-foreground">{item.title || '-'}</span>
      ),
    },
    {
      key: 'venue',
      label: 'Venue',
      className: 'py-4 px-4',
      render: (item) => (
        <div className="text-muted-foreground">
          {item.venueName ? (
            <>
              <p>{item.venueName}</p>
              {item.city && item.state && (
                <p className="text-xs">{item.city}, {item.state}</p>
              )}
            </>
          ) : (
            '-'
          )}
        </div>
      ),
    },
    {
      key: 'client',
      label: 'Default Client',
      className: 'py-4 px-4',
      render: (item) => (
        <span className="text-muted-foreground">
          {item.client?.businessName || '-'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      label: 'Created',
      sortable: true,
      className: 'py-4 px-4',
      render: (item) => (
        <div className="text-muted-foreground text-sm">
          <p>{formatDate(item.createdAt)}</p>
          <p className="text-xs">by {item.createdByUser.name}</p>
        </div>
      ),
    },
  ];

  // Mobile card renderer
  const mobileCard = (item: EventTemplate) => (
    <Card className="p-4 mb-3">
      <div className="flex justify-between items-start mb-2">
        <div>
          <p className="font-medium text-foreground">{item.name}</p>
          {item.description && (
            <p className="text-sm text-muted-foreground">{item.description}</p>
          )}
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => handleEdit(item)}>
            <EditIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(item)}
            className="text-destructive"
          >
            <TrashIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
        <div>
          <span className="font-medium">Title:</span> {item.title || '-'}
        </div>
        <div>
          <span className="font-medium">Venue:</span> {item.venueName || '-'}
        </div>
        <div>
          <span className="font-medium">Client:</span> {item.client?.businessName || '-'}
        </div>
        <div>
          <span className="font-medium">Created:</span> {formatDate(item.createdAt)}
        </div>
      </div>
    </Card>
  );

  return (
    <div className="mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {terminology.event.singular} Templates
          </h1>
          <p className="text-muted-foreground">
            Manage templates for quick {terminology.event.lower} creation
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <EventTemplateExportDropdown
            templates={allTemplates as EventTemplateExport[]}
            selectedTemplates={selectedTemplates}
            selectedCount={selectedIds.size}
          />
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <UploadIcon className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Button onClick={handleCreate}>
            <PlusIcon className="h-4 w-4 mr-2" />
            New Template
          </Button>
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="sticky top-0 z-20 bg-muted/95 backdrop-blur-sm border-b border-border p-4 mb-4 rounded-lg shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Badge variant="primary" size="lg">
                {selectedIds.size} template{selectedIds.size !== 1 ? 's' : ''} selected
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={clearSelection}>
                Clear Selection
              </Button>
              <Button
                variant="danger"
                onClick={handleBulkDeleteSelected}
                disabled={deleteManyMutation.isPending}
              >
                <TrashIcon className="h-4 w-4 mr-2" />
                {deleteManyMutation.isPending ? 'Deleting...' : 'Delete Selected'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <Card className="p-4 mb-6">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search templates..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-10"
          />
        </div>
      </Card>

      {/* Table */}
      <Card className="p-4 mb-6">
        <DataTable
          tableId="templates-events"
          data={templates}
          columns={columns}
          isLoading={isLoading}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={handleSort}
          emptyMessage={`No ${terminology.event.lower} templates found`}
          emptyDescription="Create your first template to get started"
          mobileCard={mobileCard}
          getRowKey={(item) => item.id}
          minWidth="700px"
        />
      </Card>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <Pagination
          currentPage={page}
          totalPages={pagination.totalPages}
          totalItems={pagination.total}
          itemsPerPage={limit}
          onPageChange={setPage}
          onItemsPerPageChange={setLimit}
        />
      )}

      {/* Form Modal */}
      <EventTemplateFormModal
        template={selectedTemplate}
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setSelectedTemplate(null);
        }}
        onSubmit={handleFormSubmit}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        backendErrors={backendErrors}
      />

      {/* Delete Modal */}
      {selectedTemplate && (
        <EventTemplateDeleteModal
          templateName={selectedTemplate.name}
          open={deleteOpen}
          onClose={() => {
            setDeleteOpen(false);
            setSelectedTemplate(null);
          }}
          onConfirm={handleDeleteConfirm}
          isDeleting={deleteMutation.isPending}
        />
      )}

      {/* Import Modal */}
      <EventTemplateImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onSuccess={() => {
          setImportOpen(false);
          refetch();
          refetchExport();
        }}
      />

      {/* Bulk Delete Confirmation Modal */}
      <ConfirmModal
        open={bulkDeleteOpen}
        onClose={() => setBulkDeleteOpen(false)}
        onConfirm={handleBulkDeleteConfirm}
        isLoading={deleteManyMutation.isPending}
        title={`Delete ${selectedIds.size} template${selectedIds.size !== 1 ? 's' : ''}`}
        description="This action cannot be undone."
        confirmText={deleteManyMutation.isPending ? 'Deleting...' : 'Delete'}
        variant="danger"
      >
        <p className="text-sm text-muted-foreground">
          Are you sure you want to permanently delete {selectedIds.size} template{selectedIds.size !== 1 ? 's' : ''}?
        </p>
        <div className="mt-4 flex flex-wrap gap-2 max-h-32 overflow-y-auto p-3 bg-muted/50 rounded-md border border-border">
          {allTemplates
            .filter((t) => selectedIds.has(t.id))
            .map((t) => (
              <Badge key={t.id} variant="secondary" size="sm">
                {t.name}
              </Badge>
            ))}
        </div>
      </ConfirmModal>
    </div>
  );
}
