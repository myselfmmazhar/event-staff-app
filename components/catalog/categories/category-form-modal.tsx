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
import { CloseIcon } from '@/components/ui/icons';
import type { Category } from '@/lib/types/category';

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
});

type FormInput = z.input<typeof formSchema>;
type FormOutput = z.infer<typeof formSchema>;
type FormFieldName = keyof FormInput;

interface CategoryFormModalProps {
  category: Category | null;
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; description: string | null }) => void;
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
  } = useForm<FormInput, undefined, FormOutput>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: null,
    },
  });

  useEffect(() => {
    if (category && open) {
      reset({
        name: category.name,
        description: category.description ?? null,
      });
    } else if (!category && open) {
      reset({
        name: '',
        description: null,
      });
    }
  }, [category, open, reset]);

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
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      className="mx-4 flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-slate-200 bg-card p-0 shadow-xl"
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

            {!isEdit && (
              <p className="text-xs text-muted-foreground rounded-md border border-border bg-muted/20 p-3">
                After you create this category, you can add onboarding requirements in the next step (or skip and
                configure them later under the Requirements tab).
              </p>
            )}
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
