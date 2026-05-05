'use client';

import { useEffect } from 'react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import { CostUnitType } from '@prisma/client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectContent, SelectValue, SelectItem } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { CloseIcon } from '@/components/ui/icons';
import type { Service } from '@/lib/types/service';
import type { CreateServiceInput } from '@/lib/schemas/service.schema';
import {
  COST_UNIT_TYPE_OPTIONS,
} from '@/lib/constants/enums';
import { trpc } from '@/lib/client/trpc';
import { CATEGORY_REQUIREMENT_LABELS } from '@/lib/category-requirements';
import { formatRequirementTemplatesShort, normalizeReqTemplateIds } from '@/lib/requirement-templates';

// Form schema - uses null for optional enum fields, similar to staff form
const formSchema = z.object({
  title: z
    .string()
    .min(1, 'Service title is required')
    .max(200, 'Title must be 200 characters or less')
    .transform((v) => v.trim()),
  costUnitType: z.nativeEnum(CostUnitType).default('ASSIGNMENT'),
  description: z
    .string()
    .max(1000, 'Description must be 1000 characters or less')
    .transform((v) => v.trim())
    .nullable()
    .default(null),
  cost: z.number().positive('Cost must be a positive number').nullable().default(null),
  price: z.number().positive('Price must be a positive number').nullable().default(null),
  hasMinimum: z.boolean().default(false),
  minimum: z.number().min(0, 'Must be non-negative').nullable().default(null),
  expenditureCost: z.number().min(0, 'Must be non-negative').nullable().default(null),
  expenditurePrice: z.number().min(0, 'Must be non-negative').nullable().default(null),
  categoryId: z.string().uuid().nullable().default(null),
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
    watch,
    setValue,
  } = useForm<FormInput, undefined, FormOutput>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      costUnitType: 'ASSIGNMENT',
      description: null,
      cost: null,
      price: null,
      hasMinimum: false,
      minimum: null,
      expenditureCost: null,
      expenditurePrice: null,
      categoryId: null,
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

      let priceValue: number | null = null;
      if (service.price != null) {
        if (typeof service.price === 'object' && 'toNumber' in service.price) {
          priceValue = (service.price as { toNumber: () => number }).toNumber();
        } else {
          priceValue = Number(service.price);
        }
      }

      let expCostValue: number | null = null;
      if (service.expenditureCost != null) {
        expCostValue = typeof service.expenditureCost === 'object' && 'toNumber' in service.expenditureCost 
          ? (service.expenditureCost as any).toNumber() 
          : Number(service.expenditureCost);
      } else if (service.expenditureAmount != null) {
        expCostValue = typeof service.expenditureAmount === 'object' && 'toNumber' in service.expenditureAmount 
          ? (service.expenditureAmount as any).toNumber() 
          : Number(service.expenditureAmount);
      }

      let expPriceValue: number | null = null;
      if (service.expenditurePrice != null) {
        expPriceValue = typeof service.expenditurePrice === 'object' && 'toNumber' in service.expenditurePrice 
          ? (service.expenditurePrice as any).toNumber() 
          : Number(service.expenditurePrice);
      } else if (service.expenditureAmount != null) {
        expPriceValue = typeof service.expenditureAmount === 'object' && 'toNumber' in service.expenditureAmount 
          ? (service.expenditureAmount as any).toNumber() 
          : Number(service.expenditureAmount);
      }

      reset({
        title: service.title,
        costUnitType: service.costUnitType ?? 'ASSIGNMENT',
        description: service.description ?? null,
        cost: costValue,
        price: priceValue,
        hasMinimum: service.expenditure || expCostValue !== null || expPriceValue !== null || service.minimum !== null,
        minimum: service.minimum != null ? (typeof service.minimum === 'object' && 'toNumber' in (service.minimum as any) ? (service.minimum as any).toNumber() : Number(service.minimum)) : null,
        expenditureCost: expCostValue,
        expenditurePrice: expPriceValue,
        categoryId: (service as any).categoryId ?? null,
      });
    } else if (!service && open) {
      reset({
        title: '',
        costUnitType: 'ASSIGNMENT',
        description: null,
        cost: null,
        price: null,
        hasMinimum: false,
        minimum: null,
        expenditureCost: null,
        expenditurePrice: null,
        categoryId: null,
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
      cost: data.cost,
      price: data.price,
      minimum: data.hasMinimum ? data.minimum : null,
      expenditure: data.hasMinimum,
      expenditureCost: data.hasMinimum ? data.expenditureCost : null,
      expenditurePrice: data.hasMinimum ? data.expenditurePrice : null,
      categoryId: data.categoryId || null,
    });
  };

  const costUnitType = watch('costUnitType');
  const rateTypeLabel = COST_UNIT_TYPE_OPTIONS.find((opt) => opt.value === costUnitType)?.label || 'Value';

  const { data: categoriesData } = trpc.category.getAllActive.useQuery();
  const selectedCategoryId = watch('categoryId');
  const selectedCategory = categoriesData?.find((c) => c.id === selectedCategoryId) ?? null;

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

        <DialogContent>
          {isEdit && service && (
            <div className="mb-6 p-3 bg-muted/30 rounded-md border border-border">
              <p className="text-sm text-muted-foreground">Service ID</p>
              <p className="text-base font-medium">{service.serviceId}</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-3">
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

            <div className="sm:col-span-3">
              <Label htmlFor="categoryId">Collection</Label>
              <Controller
                name="categoryId"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value || 'none'}
                    onValueChange={(val) => field.onChange(val === 'none' ? null : val)}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger id="categoryId">
                      <SelectValue placeholder="Select a category (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {categoriesData?.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name} ({cat.categoryId})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {selectedCategory && (() => {
                const ids = normalizeReqTemplateIds(selectedCategory.requirementTemplateIds ?? []);
                const requirementLabel = ids.length > 0
                  ? formatRequirementTemplatesShort(ids)
                  : CATEGORY_REQUIREMENT_LABELS[selectedCategory.requirementType as keyof typeof CATEGORY_REQUIREMENT_LABELS];
                return (
                  <div className="mt-2 p-3 bg-muted/30 rounded-md border border-border flex items-center gap-6">
                    <div>
                      <p className="text-xs text-muted-foreground">Collection</p>
                      <p className="text-sm font-medium">{selectedCategory.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Requirement</p>
                      <p className="text-sm font-medium">{requirementLabel ?? '—'}</p>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="sm:col-span-3">
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
              <Label htmlFor="costUnitType">Rate Type</Label>
              <Controller
                name="costUnitType"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value ?? ''}
                    onValueChange={(value) => field.onChange(value || null)}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger id="costUnitType">
                      <SelectValue placeholder="Select rate type" />
                    </SelectTrigger>
                    <SelectContent>
                      {COST_UNIT_TYPE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
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
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-muted-foreground">$</span>
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
                  </div>
                )}
              />
              <p className="text-[10px] text-muted-foreground mt-1 italic">
                Cost paid to staff
              </p>
              {errors.cost && (
                <p className="text-sm text-destructive mt-1">{errors.cost.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="price">Price</Label>
              <Controller
                name="price"
                control={control}
                render={({ field }) => (
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-muted-foreground">$</span>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      min="0"
                      inputMode="decimal"
                      value={field.value ?? ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        field.onChange(val === '' ? null : parseFloat(val));
                      }}
                      error={!!errors.price}
                      disabled={isSubmitting}
                      placeholder="e.g., 50.00"
                    />
                  </div>
                )}
              />
              <p className="text-[10px] text-muted-foreground mt-1 italic">
                Price billed to client
              </p>
              {errors.price && (
                <p className="text-sm text-destructive mt-1">{errors.price.message}</p>
              )}
            </div>

            <div>
              <Label>Minimum?</Label>
              <Controller
                name="hasMinimum"
                control={control}
                render={({ field }) => (
                  <RadioGroup
                    value={field.value ? 'yes' : 'no'}
                    onValueChange={(value) => {
                      const enabled = value === 'yes';
                      field.onChange(enabled);
                    }}
                    className="flex items-center gap-4 mt-2"
                    disabled={isSubmitting}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no" id="min-no" />
                      <Label htmlFor="min-no" className="font-normal cursor-pointer">No</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="yes" id="min-yes" />
                      <Label htmlFor="min-yes" className="font-normal cursor-pointer">Yes</Label>
                    </div>
                  </RadioGroup>
                )}
              />
            </div>

            {watch('hasMinimum') && (
              <>
                <div>
                  <Label htmlFor="minimum">Quantity</Label>
                  <Controller
                    name="minimum"
                    control={control}
                    render={({ field }) => (
                      <Input
                        id="minimum"
                        type="number"
                        step="1"
                        min="0"
                        value={field.value ?? ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          field.onChange(val === '' ? null : parseFloat(val));
                        }}
                        error={!!errors.minimum}
                        disabled={isSubmitting}
                        placeholder="e.g., 4"
                      />
                    )}
                  />
                  {errors.minimum && (
                    <p className="text-sm text-destructive mt-1">{errors.minimum.message}</p>
                  )}
                </div>

                <div>
                  <Label>Rate Type</Label>
                  <Input
                    value={rateTypeLabel}
                    disabled={true}
                    className="bg-muted/50 cursor-not-allowed"
                    readOnly
                  />
                  <p className="text-[10px] text-muted-foreground mt-1 italic">
                    Follows main Rate Type
                  </p>
                </div>


              </>
            )}
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
