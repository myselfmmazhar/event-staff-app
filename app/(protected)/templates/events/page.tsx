'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PlusIcon, SearchIcon, EditIcon, TrashIcon } from '@/components/ui/icons';
import { DataTable, type ColumnDef } from '@/components/common/data-table';
import { Pagination } from '@/components/common/pagination';
import { EventTemplateFormModal } from '@/components/event-templates/event-template-form-modal';
import { EventTemplateDeleteModal } from '@/components/event-templates/event-template-delete-modal';
import { trpc } from '@/lib/client/trpc';
import { useTerminology } from '@/lib/hooks/use-terminology';
import { useCrudMutations } from '@/lib/hooks/useCrudMutations';
import type { CreateEventTemplateInput, UpdateEventTemplateInput } from '@/lib/schemas/event-template.schema';
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
  const { backendErrors, setBackendErrors, createMutationOptions, updateMutationOptions, deleteMutationOptions } = useCrudMutations();

  // State
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'createdAt' | 'updatedAt' | 'name'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Modal state
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<EventTemplate | null>(null);

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

  // Mutations
  const createMutation = trpc.eventTemplate.create.useMutation({
    ...createMutationOptions('Template created successfully', {
      onSuccess: () => {
        setFormOpen(false);
        setSelectedTemplate(null);
        refetch();
      },
    }),
  });

  const updateMutation = trpc.eventTemplate.update.useMutation({
    ...updateMutationOptions('Template updated successfully', {
      onSuccess: () => {
        setFormOpen(false);
        setSelectedTemplate(null);
        refetch();
      },
    }),
  });

  const deleteMutation = trpc.eventTemplate.delete.useMutation(
    deleteMutationOptions('Template deleted successfully', {
      onSuccess: () => {
        setDeleteOpen(false);
        setSelectedTemplate(null);
        refetch();
      },
    })
  );

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
      key: 'name',
      label: 'Template Name',
      sortable: true,
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
      render: (item) => (
        <span className="text-muted-foreground">{item.title || '-'}</span>
      ),
    },
    {
      key: 'venue',
      label: 'Venue',
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
      render: (item) => (
        <div className="text-muted-foreground text-sm">
          <p>{formatDate(item.createdAt)}</p>
          <p className="text-xs">by {item.createdByUser.name}</p>
        </div>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      headerClassName: 'text-right py-3 px-4',
      className: 'text-right',
      render: (item) => (
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEdit(item)}
            title="Edit template"
          >
            <EditIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(item)}
            className="text-destructive hover:text-destructive"
            title="Delete template"
          >
            <TrashIcon className="h-4 w-4" />
          </Button>
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
    <div className="container mx-auto px-4 py-6">
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
        <Button onClick={handleCreate}>
          <PlusIcon className="h-4 w-4 mr-2" />
          New Template
        </Button>
      </div>

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
    </div>
  );
}
