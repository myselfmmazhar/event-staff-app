'use client';

import { useMemo, useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PlusIcon, TrashIcon, SquaresIcon, ClipboardListIcon } from '@/components/ui/icons';
import { trpc } from '@/lib/client/trpc';
import { useCrudMutations } from '@/lib/hooks/useCrudMutations';
import { CreateRequirementWizardModal } from '@/components/catalog/requirements/create-requirement-wizard-modal';
import { REQ_TEMPLATE_CARDS } from '@/lib/requirement-templates';
import { ConfirmModal } from '@/components/common/confirm-modal';
import { CategorySearch } from '@/components/catalog/categories/category-search';
import { CategoryFilters } from '@/components/catalog/categories/category-filters';
import { CategoryTable } from '@/components/catalog/categories/category-table';
import { CategoryFormModal } from '@/components/catalog/categories/category-form-modal';
import { DeleteCategoryModal } from '@/components/catalog/categories/delete-category-modal';
import { useCategoriesFilters, type CategoryStatus, type CategorySortBy, type SortOrder } from '@/store/categories-filters.store';
import { ActiveFilters } from '@/components/common/active-filters';
import { Pagination } from '@/components/common/pagination';
import { useUrlSync } from '@/lib/hooks/useUrlSync';
import type { Category, CategoryTableRow } from '@/lib/types/category';
import { cn } from '@/lib/utils';

type SubTab = 'categories' | 'requirements';

const STATUS_LABELS: Record<CategoryStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
};

function parseNumberParam(value: string | null, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseStatusesParam(value: string | null): CategoryStatus[] {
  if (!value) return [];
  const statuses = value.split(',').filter((s): s is CategoryStatus =>
    s === 'active' || s === 'inactive'
  );
  return statuses;
}

const CATEGORY_SORT_FIELDS: CategorySortBy[] = ['name', 'createdAt'];
const CATEGORY_SORT_FIELD_SET = new Set<CategorySortBy>(CATEGORY_SORT_FIELDS);

function parseSortByParam(value: string | null): CategorySortBy {
  if (value && CATEGORY_SORT_FIELD_SET.has(value as CategorySortBy)) {
    return value as CategorySortBy;
  }
  return 'name';
}

function parseSortOrderParam(value: string | null): SortOrder {
  return value === 'desc' ? 'desc' : 'asc';
}

function CatalogRequirementsContent() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<SubTab>((searchParams.get('tab') as SubTab) || 'categories');
  
  // --- Requirements State ---
  const { deleteMutationOptions: reqDeleteOptions, handleError } = useCrudMutations();
  const [reqSearch, setReqSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [wizardOpen, setWizardOpen] = useState(false);
  const [reqDeleteId, setReqDeleteId] = useState<string | null>(null);

  // --- Categories State ---
  const catFilters = useCategoriesFilters();
  const { 
    backendErrors, 
    setBackendErrors, 
    createMutationOptions: catCreateOptions, 
    updateMutationOptions: catUpdateOptions, 
    deleteMutationOptions: catDeleteOptions, 
    handleSuccess 
  } = useCrudMutations();

  const [catModals, setCatModals] = useState({
    form: false,
    delete: false,
  });

  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [pendingRequirementCategory, setPendingRequirementCategory] = useState<Category | null>(null);
  const [selectedCatIds, setSelectedCatIds] = useState<Set<string>>(new Set());
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);

  // --- Queries ---
  const { data: activeCategories } = trpc.category.getAllActive.useQuery();
  
  // Requirements Query
  const reqQueryInput = useMemo(
    () => ({
      page: 1,
      limit: 100,
      search: reqSearch.trim() || undefined,
      serviceCategoryId: categoryFilter || undefined,
    }),
    [reqSearch, categoryFilter]
  );
  const { data: reqData, isLoading: reqLoading, refetch: refetchReqs } = trpc.catalogRequirement.getAll.useQuery(reqQueryInput);

  // Categories Query
  const getIsActiveFilter = (): boolean | undefined => {
    if (catFilters.statuses.length === 0 || catFilters.statuses.length === 2) return undefined;
    return catFilters.statuses.includes('active');
  };

  const { data: catData, isLoading: catLoading, refetch: refetchCats } = trpc.category.getAll.useQuery({
    page: catFilters.page,
    limit: catFilters.limit,
    search: catFilters.search || undefined,
    isActive: getIsActiveFilter(),
    createdFrom: catFilters.createdFrom ? new Date(catFilters.createdFrom) : undefined,
    createdTo: catFilters.createdTo ? new Date(catFilters.createdTo) : undefined,
    sortBy: catFilters.sortBy,
    sortOrder: catFilters.sortOrder,
  });

  // --- Mutations ---
  const reqDeleteMutation = trpc.catalogRequirement.delete.useMutation(
    reqDeleteOptions('Requirement deleted', {
      onSuccess: () => {
        setReqDeleteId(null);
        refetchReqs();
      },
      onError: handleError,
    })
  );

  const catCreateMutation = trpc.category.create.useMutation(
    catCreateOptions('Category created successfully', {
      onSuccess: (created) => {
        setCatModals((prev) => ({ ...prev, form: false }));
        setSelectedCategory(null);
        refetchCats();
        if (created) {
          setPendingRequirementCategory(created as Category);
          setWizardOpen(true);
        }
      },
    })
  );

  const catUpdateMutation = trpc.category.update.useMutation(
    catUpdateOptions('Category updated successfully', {
      onSuccess: () => {
        setCatModals((prev) => ({ ...prev, form: false }));
        setSelectedCategory(null);
        refetchCats();
      },
    })
  );

  const catDeleteMutation = trpc.category.delete.useMutation(
    catDeleteOptions('Category deleted successfully', {
      onSuccess: () => {
        setCatModals((prev) => ({ ...prev, delete: false }));
        setSelectedCategory(null);
        refetchCats();
      },
    })
  );

  const catDeleteManyMutation = trpc.category.deleteMany.useMutation({
    onSuccess: (result) => {
      handleSuccess(`${result.count} categories deleted successfully`);
      setIsBulkDeleteOpen(false);
      setSelectedCatIds(new Set());
      refetchCats();
    },
    onError: handleError,
  });

  const toggleActiveMutation = trpc.category.toggleActive.useMutation({
    ...catUpdateOptions('Category status updated', {
      onSuccess: () => refetchCats(),
    }),
  });

  // --- Handlers ---
  const handleCreateCategory = () => {
    setSelectedCategory(null);
    setBackendErrors([]);
    setCatModals((prev) => ({ ...prev, form: true }));
  };

  const handleEditCategory = (id: string) => {
    const category = (catData?.data as any[]).find((c) => c.id === id);
    if (category) {
      setSelectedCategory(category);
      setBackendErrors([]);
      setCatModals((prev) => ({ ...prev, form: true }));
    }
  };

  const handleDeleteCategory = (id: string) => {
    const category = (catData?.data as any[]).find((c) => c.id === id);
    if (category) {
      setSelectedCategory(category);
      setCatModals((prev) => ({ ...prev, delete: true }));
    }
  };

  const handleSortCategories = (field: string) => {
    const sortField = parseSortByParam(field);
    if (catFilters.sortBy === sortField) {
      catFilters.setSortOrder(catFilters.sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      catFilters.setSortBy(sortField);
      catFilters.setSortOrder('asc');
    }
  };

  // Sync categories filters with URL
  useUrlSync(catFilters, { keys: ['page', 'limit', 'search', 'statuses', 'sortBy', 'sortOrder'] });

  useEffect(() => {
    if (activeTab === 'categories') {
      useCategoriesFilters.persist.rehydrate();
      if (searchParams.has('page')) catFilters.setPage(parseNumberParam(searchParams.get('page'), 1));
      if (searchParams.has('limit')) catFilters.setLimit(parseNumberParam(searchParams.get('limit'), 10));
      if (searchParams.has('search')) catFilters.setSearch(searchParams.get('search') || '');
      if (searchParams.has('statuses')) catFilters.setStatuses(parseStatusesParam(searchParams.get('statuses')));
    }
  }, [activeTab]);

  const catRows: CategoryTableRow[] = (catData?.data ?? []).map((c: any) => ({
    id: c.id,
    categoryId: c.categoryId,
    name: c.name,
    description: c.description ?? null,
    requirementType: c.requirementType,
    requirementTemplateIds: c.requirementTemplateIds ?? [],
    isRequired: c.isRequired,
    isActive: c.isActive,
    createdAt: c.createdAt,
  }));

  const activeFilters: Array<{ key: string; label: string; value: string; onRemove: () => void }> = [];
  if (catFilters.search) {
    activeFilters.push({ key: 'search', label: 'Search', value: catFilters.search, onRemove: () => catFilters.setSearch('') });
  }

  return (
    <div className="space-y-6">
      {/* Sub-tab Switcher */}
      <div className="flex items-center justify-between border-b border-border">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('categories')}
            className={cn(
              "flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all",
              activeTab === 'categories' ? "text-primary border-primary" : "text-muted-foreground border-transparent hover:text-foreground"
            )}
          >
            <SquaresIcon className="h-4 w-4" />
            Collections
          </button>
          <button
            onClick={() => setActiveTab('requirements')}
            className={cn(
              "flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all",
              activeTab === 'requirements' ? "text-primary border-primary" : "text-muted-foreground border-transparent hover:text-foreground"
            )}
          >
            <ClipboardListIcon className="h-4 w-4" />
            All Requirements
          </button>
        </div>
        <div className="pb-2">
          {activeTab === 'categories' ? null : (
            <Button onClick={() => setWizardOpen(true)} size="sm" className="rounded-lg shadow-sm">
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Requirement
            </Button>
          )}
        </div>
      </div>

      {activeTab === 'categories' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <Card className="p-6 overflow-visible relative z-20">
            <div className="space-y-4">
              <CategorySearch value={catFilters.search} onChange={catFilters.setSearch} />
              <CategoryFilters />
              <ActiveFilters filters={activeFilters} />
            </div>
          </Card>

          <Card className="p-6">
            <CategoryTable
              categories={catRows}
              isLoading={catLoading}
              sortBy={catFilters.sortBy}
              sortOrder={catFilters.sortOrder}
              onEdit={handleEditCategory}
              onDelete={handleDeleteCategory}
              onToggleActive={(id, isActive) => toggleActiveMutation.mutate({ id, isActive })}
              onSort={handleSortCategories}
              selectedIds={selectedCatIds}
              onSelectionChange={setSelectedCatIds}
            />
            {catData && catData.meta.total > 0 && (
              <div className="mt-6">
                <Pagination
                  currentPage={catFilters.page}
                  totalPages={catData.meta.totalPages}
                  totalItems={catData.meta.total}
                  itemsPerPage={catFilters.limit}
                  onPageChange={catFilters.setPage}
                  onItemsPerPageChange={catFilters.setLimit}
                />
              </div>
            )}
          </Card>
        </div>
      )}

      {activeTab === 'requirements' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <Card className="p-6 space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="md:col-span-2">
                <Label htmlFor="req-search">Search</Label>
                <Input
                  id="req-search"
                  className="mt-1.5"
                  placeholder="Search by requirement name, category, or category ID..."
                  value={reqSearch}
                  onChange={(e) => setReqSearch(e.target.value)}
                />
              </div>
              <div>
                <Label>Collection Filter</Label>
                <Select
                  value={categoryFilter || '__all__'}
                  onValueChange={(v) => setCategoryFilter(v === '__all__' ? '' : v)}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="All collections" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All collections</SelectItem>
                    {(activeCategories ?? []).map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Requirement</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead>Collection</TableHead>
                  <TableHead>Approvals</TableHead>
                  <TableHead>Talent required</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reqLoading && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-muted-foreground">Loading…</TableCell>
                  </TableRow>
                )}
                {!reqLoading && (reqData?.data ?? []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-muted-foreground">
                      No requirements yet. Add one to attach onboarding rules to a category.
                    </TableCell>
                  </TableRow>
                )}
                {(reqData?.data ?? []).map((row: any) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell>
                      {REQ_TEMPLATE_CARDS.find((c) => c.id === row.templateId)?.title ?? row.templateId}
                    </TableCell>
                    <TableCell>
                      {row.serviceCategory.name}
                      <span className="text-muted-foreground text-xs ml-1">({row.serviceCategory.categoryId})</span>
                    </TableCell>
                    <TableCell>{row.requiresApproval ? 'On' : 'Off'}</TableCell>
                    <TableCell>{row.isTalentRequired ? 'Yes' : 'No'}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setReqDeleteId(row.id)}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </div>
      )}

      {/* Modals */}
      <CategoryFormModal
        category={selectedCategory}
        open={catModals.form}
        onClose={() => {
          setCatModals((prev) => ({ ...prev, form: false }));
          setSelectedCategory(null);
          setBackendErrors([]);
        }}
        onSubmit={(formData) => {
          if (selectedCategory) {
            catUpdateMutation.mutate({ id: selectedCategory.id, name: formData.name, description: formData.description });
          } else {
            catCreateMutation.mutate({ ...formData, requirementTemplateIds: [], isRequired: false });
          }
        }}
        isSubmitting={catCreateMutation.isPending || catUpdateMutation.isPending}
        backendErrors={backendErrors}
      />

      <DeleteCategoryModal
        category={selectedCategory ? { name: selectedCategory.name, categoryId: selectedCategory.categoryId } : null}
        open={catModals.delete}
        onClose={() => { setCatModals((prev) => ({ ...prev, delete: false })); setSelectedCategory(null); }}
        onConfirm={() => selectedCategory && catDeleteMutation.mutate({ id: selectedCategory.id })}
        isLoading={catDeleteMutation.isPending}
      />

      <CreateRequirementWizardModal
        open={wizardOpen}
        onClose={() => { setWizardOpen(false); setPendingRequirementCategory(null); }}
        fixedCategory={pendingRequirementCategory ? { id: pendingRequirementCategory.id, name: pendingRequirementCategory.name, categoryId: pendingRequirementCategory.categoryId } : null}
        onSaved={() => { refetchReqs(); refetchCats(); }}
      />

      <ConfirmModal
        open={!!reqDeleteId}
        onClose={() => setReqDeleteId(null)}
        onConfirm={() => reqDeleteId && reqDeleteMutation.mutate({ id: reqDeleteId })}
        title="Delete requirement"
        description="Remove this requirement from the catalog? The category’s suggested onboarding cards will update automatically."
        confirmText={reqDeleteMutation.isPending ? 'Deleting…' : 'Delete'}
        variant="danger"
        isLoading={reqDeleteMutation.isPending}
      />
    </div>
  );
}

export default function CatalogRequirementsPage() {
  return (
    <Suspense fallback={<div>Loading catalog...</div>}>
      <CatalogRequirementsContent />
    </Suspense>
  );
}
