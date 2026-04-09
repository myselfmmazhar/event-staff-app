'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DataTable, ColumnDef } from '@/components/common/data-table';
import { EditIcon, TrashIcon } from '@/components/ui/icons';
import type { CategoryTableRow } from '@/lib/types/category';
import { CATEGORY_REQUIREMENT_LABELS } from '@/lib/category-requirements';
import { ActionDropdown, type ActionItem } from '@/components/common/action-dropdown';

interface CategoryTableProps {
  categories: CategoryTableRow[];
  isLoading?: boolean;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string, isActive: boolean) => void;
  onSort: (column: string) => void;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
}

export function CategoryTable({
  categories,
  isLoading,
  onEdit,
  onDelete,
  onToggleActive,
  onSort,
  sortBy,
  sortOrder,
  selectedIds,
  onSelectionChange,
}: CategoryTableProps) {
  const allSelected =
    selectedIds && categories.length > 0 && categories.every((c) => selectedIds.has(c.id));
  const someSelected = selectedIds && categories.some((c) => selectedIds.has(c.id));

  const toggleAll = () => {
    if (!onSelectionChange || !selectedIds) return;
    if (allSelected) {
      const newSet = new Set(selectedIds);
      categories.forEach((c) => newSet.delete(c.id));
      onSelectionChange(newSet);
    } else {
      const newSet = new Set(selectedIds);
      categories.forEach((c) => newSet.add(c.id));
      onSelectionChange(newSet);
    }
  };

  const toggleOne = (id: string) => {
    if (!onSelectionChange || !selectedIds) return;
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    onSelectionChange(newSet);
  };

  const columns: ColumnDef<CategoryTableRow>[] = [
    ...(selectedIds && onSelectionChange
      ? [
          {
            key: 'select' as const,
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
            render: (category: CategoryTableRow) => (
              <Checkbox
                checked={selectedIds.has(category.id)}
                onChange={() => toggleOne(category.id)}
                aria-label={`Select ${category.name}`}
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
              />
            ),
          },
        ]
      : []),
    {
      key: 'actions',
      label: 'Actions',
      headerClassName: 'text-left py-3 px-4 w-10',
      className: 'w-10 py-4 px-4',
      render: (category) => {
        const actions: ActionItem[] = [
          {
            label: 'Edit category',
            icon: <EditIcon className="h-3.5 w-3.5" />,
            onClick: () => onEdit(category.id),
          },
          {
            label: 'Delete category',
            icon: <TrashIcon className="h-3.5 w-3.5" />,
            onClick: () => onDelete(category.id),
            variant: 'destructive',
          },
          {
            label: category.isActive ? 'Deactivate category' : 'Activate category',
            onClick: () => onToggleActive(category.id, !category.isActive),
          },
        ];
        return <ActionDropdown actions={actions} />;
      },
    },
    {
      key: 'status',
      label: 'Status',
      className: 'py-4 px-4 whitespace-nowrap',
      render: (category) => (
        <Badge variant={category.isActive ? 'success' : 'secondary'} asSpan>
          {category.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'categoryId',
      label: 'Category ID',
      className: 'py-4 px-4 whitespace-nowrap',
      render: (category) => (
        <span className="font-mono text-sm text-muted-foreground">{category.categoryId}</span>
      ),
    },
    {
      key: 'requirementType',
      label: 'Collection',
      className: 'py-4 px-4 whitespace-nowrap text-sm',
      render: (category) => (
        <span className="text-foreground">
          {CATEGORY_REQUIREMENT_LABELS[category.requirementType]}
        </span>
      ),
    },
    {
      key: 'talentRequired',
      label: 'Talent required',
      className: 'py-4 px-4 whitespace-nowrap',
      render: (category) => (
        <Badge variant={category.isRequired ? 'primary' : 'secondary'} asSpan>
          {category.isRequired ? 'Yes' : 'No'}
        </Badge>
      ),
    },
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      className: 'py-4 px-4',
      render: (category) => <span className="font-medium text-foreground">{category.name}</span>,
    },
    {
      key: 'description',
      label: 'Description',
      className: 'py-4 px-4 text-sm text-muted-foreground max-w-xs truncate',
      render: (category) => category.description ?? '-',
    },
  ];

  const renderMobileCard = (category: CategoryTableRow) => {
    return (
      <div key={category.id} className="bg-card rounded-lg border border-border p-4 space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="font-mono text-xs text-muted-foreground mb-1">{category.categoryId}</div>
            <h3 className="font-semibold text-card-foreground">{category.name}</h3>
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge variant="secondary" size="sm" asSpan>
                {CATEGORY_REQUIREMENT_LABELS[category.requirementType]}
              </Badge>
              <Badge variant={category.isRequired ? 'primary' : 'secondary'} size="sm" asSpan>
                {category.isRequired ? 'Required' : 'Optional'}
              </Badge>
            </div>
            {category.description && (
              <div className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {category.description}
              </div>
            )}
          </div>
          <Badge variant={category.isActive ? 'success' : 'secondary'} asSpan>
            {category.isActive ? 'Active' : 'Inactive'}
          </Badge>
        </div>

        <div className="flex items-center gap-2 pt-2 border-t border-border">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(category.id)}
            className="flex-1"
          >
            <EditIcon className="h-4 w-4 mr-1" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDelete(category.id)}
            className="flex-1 text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <TrashIcon className="h-4 w-4 mr-1" />
            Delete
          </Button>
        </div>
      </div>
    );
  };

  return (
    <DataTable
      data={categories}
      columns={columns}
      isLoading={isLoading}
      sortBy={sortBy}
      sortOrder={sortOrder}
      onSort={onSort}
      getRowKey={(category) => category.id}
      emptyMessage="No categories found"
      mobileCard={renderMobileCard}
      minWidth="700px"
    />
  );
}
