'use client';

import { useEffect, useMemo } from 'react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, SubmitHandler } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { CloseIcon } from '@/components/ui/icons';
import type { Category } from '@/lib/types/category';
import type { CreateCategoryInput } from '@/lib/schemas/category.schema';
import {
  REQ_TEMPLATE_IDS,
  templatesFromCategoryRow,
  type ReqTemplateId,
} from '@/lib/requirement-templates';
import { RequirementTemplateCardGrid } from '@/components/common/requirement-template-card-grid';

const reqTemplateIdSchema = z.enum(REQ_TEMPLATE_IDS);

const formSchema = z.object({
  name: z
    .string()
    .min(1, 'Category name is required')
    .max(200, 'Name must be 200 characters or less')
    .transform((v) => v.trim()),
  description: z
    .string()
    .max(1000, 'Description must be 1000 characters or less')
    .transform((v) => v.trim())
    .nullable()
    .default(null),
  requirementTemplateIds: z.array(reqTemplateIdSchema).default([]),
  isRequired: z.boolean(),
});

type FormInput = z.input<typeof formSchema>;
type FormOutput = z.infer<typeof formSchema>;
type FormFieldName = keyof FormInput;

interface CategoryFormModalProps {
  category: Category | null;
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateCategoryInput) => void;
  isSubmitting: boolean;
  backendErrors?: Array<{ field: string; message: string }>;
}

export function CategoryFormModal({
  category,
  open,
  onClose,
  onSubmit,
  isSubmitting,
  backendErrors = [],
}: CategoryFormModalProps) {
  const isEdit = !!category;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setError,
    watch,
    setValue,
  } = useForm<FormInput, undefined, FormOutput>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: null,
      requirementTemplateIds: [],
      isRequired: false,
    },
  });

  const templateIds = watch('requirementTemplateIds') ?? [];

  const hasDocumentOrEsignStep = useMemo(
    () => templateIds.some((t) => t === 'upload' || t === 'idv' || t === 'headshot' || t === 'esign'),
    [templateIds]
  );

  const selectedSet = useMemo(() => new Set(templateIds), [templateIds]);

  useEffect(() => {
    if (category && open) {
      reset({
        name: category.name,
        description: category.description ?? null,
        requirementTemplateIds: templatesFromCategoryRow({
          requirementTemplateIds: category.requirementTemplateIds ?? [],
          requirementType: category.requirementType,
        }),
        isRequired: category.isRequired ?? false,
      });
    } else if (!category && open) {
      reset({
        name: '',
        description: null,
        requirementTemplateIds: [],
        isRequired: false,
      });
    }
  }, [category, open, reset]);

  useEffect(() => {
    if (!hasDocumentOrEsignStep) {
      setValue('isRequired', false);
    }
  }, [hasDocumentOrEsignStep, setValue]);

  useEffect(() => {
    if (backendErrors.length > 0) {
      backendErrors.forEach((error) => {
        setError(error.field as FormFieldName, {
          type: 'manual',
          message: error.message,
        });
      });
    }
  }, [backendErrors, setError]);

  const toggleTemplate = (id: ReqTemplateId) => {
    const next = new Set(templateIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setValue('requirementTemplateIds', [...next]);
  };

  const handleFormSubmit: SubmitHandler<FormOutput> = (data) => {
    onSubmit({
      name: data.name,
      description: data.description || null,
      requirementTemplateIds: data.requirementTemplateIds,
      isRequired: data.isRequired,
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      className="mx-4 flex h-[min(94vh,1000px)] w-full max-h-[min(94vh,1000px)] max-w-[1400px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-card p-0 shadow-xl"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleSubmit(handleFormSubmit)(e);
        }}
      >
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>{isEdit ? 'Edit Category' : 'Add Category'}</DialogTitle>
            <button
              type="button"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
            >
              <CloseIcon className="h-5 w-5" />
            </button>
          </div>
        </DialogHeader>

        <DialogContent>
          {isEdit && category && (
            <div className="mb-6 p-3 bg-muted/30 rounded-md border border-border">
              <p className="text-sm text-muted-foreground">Category ID</p>
              <p className="text-base font-medium">{category.categoryId}</p>
            </div>
          )}

          <div className="space-y-6">
            <div>
              <Label htmlFor="name" required>
                Category Name
              </Label>
              <Input
                id="name"
                {...register('name')}
                error={!!errors.name}
                disabled={isSubmitting}
                placeholder="e.g., Security"
              />
              {errors.name && (
                <p className="text-sm text-destructive mt-1">{errors.name.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                rows={3}
                {...register('description')}
                error={!!errors.description}
                disabled={isSubmitting}
                placeholder="Optional description (max 1000 characters)"
              />
              {errors.description && (
                <p className="text-sm text-destructive mt-1">{errors.description.message}</p>
              )}
            </div>

            <div>
              <Label>Onboarding requirement cards</Label>
              <p className="text-xs text-muted-foreground mt-1 mb-4">
                Select which reusable requirements apply to services in this category. When talent is
                assigned those services, these cards are suggested automatically (you can still adjust on
                the talent form).
              </p>
              <RequirementTemplateCardGrid
                selected={selectedSet}
                onToggle={toggleTemplate}
                disabled={isSubmitting}
              />
            </div>

            <div className="flex items-start gap-3 rounded-md border border-border p-3 bg-muted/20">
              <Checkbox
                id="isRequired"
                checked={watch('isRequired')}
                onChange={(e) => setValue('isRequired', e.target.checked)}
                disabled={isSubmitting || !hasDocumentOrEsignStep}
              />
              <div>
                <Label htmlFor="isRequired" className="cursor-pointer font-medium">
                  Required when talent submits data
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  When enabled, talent must satisfy document upload or e-signature requirements from the
                  cards above before saving their profile or accepting an invitation. Tax form (W-9) flow
                  is handled separately.
                </p>
              </div>
            </div>
          </div>
        </DialogContent>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Category'}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
