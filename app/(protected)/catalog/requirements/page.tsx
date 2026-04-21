'use client';

import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { PlusIcon, TrashIcon } from '@/components/ui/icons';
import { trpc } from '@/lib/client/trpc';
import { useCrudMutations } from '@/lib/hooks/useCrudMutations';
import { CreateRequirementWizardModal } from '@/components/catalog/requirements/create-requirement-wizard-modal';
import { REQ_TEMPLATE_CARDS } from '@/lib/requirement-templates';
import { ConfirmModal } from '@/components/common/confirm-modal';

export default function CatalogRequirementsPage() {
  const { deleteMutationOptions, handleError } = useCrudMutations();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [wizardOpen, setWizardOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: activeCategories } = trpc.category.getAllActive.useQuery();

  const queryInput = useMemo(
    () => ({
      page: 1,
      limit: 100,
      search: search.trim() || undefined,
      serviceCategoryId: categoryFilter || undefined,
    }),
    [search, categoryFilter]
  );

  const { data, isLoading, refetch } = trpc.catalogRequirement.getAll.useQuery(queryInput);

  const deleteMutation = trpc.catalogRequirement.delete.useMutation(
    deleteMutationOptions('Requirement deleted', {
      onSuccess: () => {
        setDeleteId(null);
        refetch();
      },
      onError: handleError,
    })
  );

  const rows = data?.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <Button onClick={() => setWizardOpen(true)} size="lg" className="rounded-xl shadow-lg shadow-primary/10">
          <PlusIcon className="h-5 w-5 mr-2" />
          Add requirement
        </Button>
      </div>

      <Card className="p-6 space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="md:col-span-2">
            <Label htmlFor="req-search">Search</Label>
            <Input
              id="req-search"
              className="mt-1.5"
              placeholder="Search by requirement name, category, or category ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div>
            <Label>Category</Label>
            <Select
              value={categoryFilter || '__all__'}
              onValueChange={(v) => setCategoryFilter(v === '__all__' ? '' : v)}
            >
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All categories</SelectItem>
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
              <TableHead>Category</TableHead>
              <TableHead>Approvals</TableHead>
              <TableHead>Talent required</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            )}
            {!isLoading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground">
                  No requirements yet. Add one to attach onboarding rules to a category.
                </TableCell>
              </TableRow>
            )}
            {rows.map((row) => (
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
                    onClick={() => setDeleteId(row.id)}
                  >
                    <TrashIcon className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <CreateRequirementWizardModal
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        fixedCategory={null}
        onSaved={() => refetch()}
      />

      <ConfirmModal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate({ id: deleteId })}
        title="Delete requirement"
        description="Remove this requirement from the catalog? The category’s suggested onboarding cards will update automatically."
        confirmText={deleteMutation.isPending ? 'Deleting…' : 'Delete'}
        variant="danger"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
