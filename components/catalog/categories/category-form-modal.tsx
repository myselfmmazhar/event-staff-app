'use client';

import { useEffect } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CloseIcon } from '@/components/ui/icons';
import type { Category } from '@/lib/types/category';
import type { CreateCategoryInput } from '@/lib/schemas/category.schema';
import {
  CATEGORY_REQUIREMENT_TYPE,
  CATEGORY_REQUIREMENT_LABELS,
  type CategoryRequirementType,
} from '@/lib/category-requirements';

const REQUIREMENT_OPTIONS: { value: CategoryRequirementType; group: string }[] = [
  { value: CATEGORY_REQUIREMENT_TYPE.STANDARD, group: 'Standard' },
  { value: CATEGORY_REQUIREMENT_TYPE.ESIGNATURE, group: 'Standard' },
  { value: CATEGORY_REQUIREMENT_TYPE.FILE_UPLOAD, group: 'Standard' },
  { value: CATEGORY_REQUIREMENT_TYPE.DRIVER_LICENSE, group: 'Smart' },
  { value: CATEGORY_REQUIREMENT_TYPE.HEADSHOT, group: 'Smart' },
  { value: CATEGORY_REQUIREMENT_TYPE.RESUME, group: 'Smart' },
];

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
  requirementType: z.nativeEnum(CATEGORY_REQUIREMENT_TYPE),
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
      requirementType: CATEGORY_REQUIREMENT_TYPE.STANDARD,
      isRequired: false,
    },
  });

  const requirementType = watch('requirementType');

  useEffect(() => {
    if (category && open) {
      reset({
        name: category.name,
        description: category.description ?? null,
        requirementType: category.requirementType ?? CATEGORY_REQUIREMENT_TYPE.STANDARD,
        isRequired: category.isRequired ?? false,
      });
    } else if (!category && open) {
      reset({
        name: '',
        description: null,
        requirementType: CATEGORY_REQUIREMENT_TYPE.STANDARD,
        isRequired: false,
      });
    }
  }, [category, open, reset]);

  useEffect(() => {
    if (requirementType === CATEGORY_REQUIREMENT_TYPE.STANDARD) {
      setValue('isRequired', false);
    }
  }, [requirementType, setValue]);

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

  const handleFormSubmit: SubmitHandler<FormOutput> = (data) => {
    onSubmit({
      name: data.name,
      description: data.description || null,
      requirementType: data.requirementType,
      isRequired:
        data.requirementType === CATEGORY_REQUIREMENT_TYPE.STANDARD ? false : data.isRequired,
    });
  };

  const standardOptions = REQUIREMENT_OPTIONS.filter((o) => o.group === 'Standard');
  const smartOptions = REQUIREMENT_OPTIONS.filter((o) => o.group === 'Smart');

  return (
    <Dialog open={open} onClose={onClose} className="max-w-lg">
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

          <div className="space-y-4">
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
                rows={4}
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
              <Label htmlFor="requirementType">Data collection type</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Choose what talent must provide when this category applies to their assigned services.
              </p>
              <Select
                value={requirementType}
                onValueChange={(v) => setValue('requirementType', v as CategoryRequirementType)}
                disabled={isSubmitting}
              >
                <SelectTrigger id="requirementType" className="w-full">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase">
                    Standard
                  </div>
                  {standardOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {CATEGORY_REQUIREMENT_LABELS[opt.value]}
                    </SelectItem>
                  ))}
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase mt-1">
                    Smart
                  </div>
                  {smartOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {CATEGORY_REQUIREMENT_LABELS[opt.value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-start gap-3 rounded-md border border-border p-3 bg-muted/20">
              <Checkbox
                id="isRequired"
                checked={watch('isRequired')}
                onChange={(e) => setValue('isRequired', e.target.checked)}
                disabled={
                  isSubmitting || requirementType === CATEGORY_REQUIREMENT_TYPE.STANDARD
                }
              />
              <div>
                <Label htmlFor="isRequired" className="cursor-pointer font-medium">
                  Required when talent submits data
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  When enabled, talent must satisfy this requirement (uploaded documents or e-signed
                  tax form, depending on type) before saving their profile or invitation acceptance.
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
