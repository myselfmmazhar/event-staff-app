'use client';

import { useEffect } from 'react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import { CostUnitType, ExperienceRequirement, StaffRating } from '@prisma/client';
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
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { CloseIcon } from '@/components/ui/icons';
import type { Service } from '@/lib/types/service';
import type { CreateServiceInput } from '@/lib/schemas/service.schema';
import {
  COST_UNIT_TYPE_OPTIONS,
  EXPERIENCE_REQUIREMENT_OPTIONS,
  STAFF_RATING_LABELS,
} from '@/lib/constants/enums';

// Form schema - uses null for optional enum fields, similar to staff form
const formSchema = z.object({
  title: z
    .string()
    .min(1, 'Service title is required')
    .max(200, 'Title must be 200 characters or less')
    .transform((v) => v.trim()),
  costUnitType: z.nativeEnum(CostUnitType).nullable().default(null),
  description: z
    .string()
    .max(1000, 'Description must be 1000 characters or less')
    .transform((v) => v.trim())
    .nullable()
    .default(null),
  experienceRequirement: z.nativeEnum(ExperienceRequirement).nullable().default(null),
  ratingRequirement: z.nativeEnum(StaffRating).nullable().default(null),
  cost: z.number().positive('Cost must be a positive number').nullable().default(null),
});

type FormInput = z.input<typeof formSchema>;
type FormOutput = z.infer<typeof formSchema>;
type FormFieldName = keyof FormInput;

interface ServiceFormModalProps {
  service: Service | null;
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateServiceInput) => void;
  isSubmitting: boolean;
  backendErrors?: Array<{ field: string; message: string }>;
}

export function ServiceFormModal({
  service,
  open,
  onClose,
  onSubmit,
  isSubmitting,
  backendErrors = [],
}: ServiceFormModalProps) {
  const isEdit = !!service;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setError,
    control,
  } = useForm<FormInput, undefined, FormOutput>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      costUnitType: null,
      description: null,
      experienceRequirement: null,
      ratingRequirement: null,
      cost: null,
    },
  });

  useEffect(() => {
    if (service && open) {
      let costValue: number | null = null;
      if (service.cost != null) {
        if (typeof service.cost === 'object' && 'toNumber' in service.cost) {
          costValue = (service.cost as { toNumber: () => number }).toNumber();
        } else {
          costValue = Number(service.cost);
        }
      }
      reset({
        title: service.title,
        costUnitType: service.costUnitType ?? null,
        description: service.description ?? null,
        experienceRequirement: service.experienceRequirement ?? null,
        ratingRequirement: service.ratingRequirement ?? null,
        cost: costValue,
      });
    } else if (!service && open) {
      reset({
        title: '',
        costUnitType: null,
        description: null,
        experienceRequirement: null,
        ratingRequirement: null,
        cost: null,
      });
    }
  }, [service, open, reset]);

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
      title: data.title,
      costUnitType: data.costUnitType,
      description: data.description || null,
      experienceRequirement: data.experienceRequirement,
      ratingRequirement: data.ratingRequirement,
      cost: data.cost,
    });
  };

  return (
    <Dialog open={open} onClose={onClose} className="max-w-3xl">
      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>{isEdit ? 'Edit Service' : 'Add Service'}</DialogTitle>
            <button
              type="button"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
            >
              <CloseIcon className="h-5 w-5" />
            </button>
          </div>
        </DialogHeader>

        <DialogContent className="max-h-[calc(100vh-280px)] overflow-y-auto">
          {isEdit && service && (
            <div className="mb-6 p-3 bg-muted/30 rounded-md border border-border">
              <p className="text-sm text-muted-foreground">Service ID</p>
              <p className="text-base font-medium">{service.serviceId}</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Label htmlFor="title" required>
                Service Title
              </Label>
              <Input
                id="title"
                {...register('title')}
                error={!!errors.title}
                disabled={isSubmitting}
                placeholder="e.g., Security staff"
              />
              {errors.title && (
                <p className="text-sm text-destructive mt-1">{errors.title.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="costUnitType">Cost Unit Type</Label>
              <Controller
                name="costUnitType"
                control={control}
                render={({ field }) => (
                  <Select
                    id="costUnitType"
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value || null)}
                    error={!!errors.costUnitType}
                    disabled={isSubmitting}
                  >
                    <option value="">—</option>
                    {COST_UNIT_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </Select>
                )}
              />
              {errors.costUnitType && (
                <p className="text-sm text-destructive mt-1">{errors.costUnitType.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="cost">Cost</Label>
              <Controller
                name="cost"
                control={control}
                render={({ field }) => (
                  <Input
                    id="cost"
                    type="number"
                    step="0.01"
                    min="0"
                    inputMode="decimal"
                    value={field.value ?? ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      field.onChange(val === '' ? null : parseFloat(val));
                    }}
                    error={!!errors.cost}
                    disabled={isSubmitting}
                    placeholder="e.g., 25.00"
                  />
                )}
              />
              {errors.cost && (
                <p className="text-sm text-destructive mt-1">{errors.cost.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="experienceRequirement">Experience Requirement</Label>
              <Controller
                name="experienceRequirement"
                control={control}
                render={({ field }) => (
                  <Select
                    id="experienceRequirement"
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value || null)}
                    error={!!errors.experienceRequirement}
                    disabled={isSubmitting}
                  >
                    <option value="">—</option>
                    {EXPERIENCE_REQUIREMENT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </Select>
                )}
              />
              {errors.experienceRequirement && (
                <p className="text-sm text-destructive mt-1">
                  {errors.experienceRequirement.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="ratingRequirement">Rating Requirement</Label>
              <Controller
                name="ratingRequirement"
                control={control}
                render={({ field }) => (
                  <Select
                    id="ratingRequirement"
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value || null)}
                    error={!!errors.ratingRequirement}
                    disabled={isSubmitting}
                  >
                    <option value="">—</option>
                    {(Object.keys(STAFF_RATING_LABELS) as Array<keyof typeof STAFF_RATING_LABELS>).map(
                      (value) => (
                        <option key={value} value={value}>
                          {STAFF_RATING_LABELS[value]}
                        </option>
                      )
                    )}
                  </Select>
                )}
              />
              {errors.ratingRequirement && (
                <p className="text-sm text-destructive mt-1">
                  {errors.ratingRequirement.message}
                </p>
              )}
            </div>

            <div className="sm:col-span-2">
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
          </div>
        </DialogContent>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Service'}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
