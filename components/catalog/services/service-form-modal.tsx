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
  hasExpenditure: z.boolean().default(false),
  expenditureCost: z.number().min(0, 'Must be non-negative').nullable().default(null),
  expenditurePrice: z.number().min(0, 'Must be non-negative').nullable().default(null),
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
      hasExpenditure: false,
      expenditureCost: null,
      expenditurePrice: null,
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
        hasExpenditure: service.expenditure || expCostValue !== null || expPriceValue !== null,
        expenditureCost: expCostValue,
        expenditurePrice: expPriceValue,
      });
    } else if (!service && open) {
      reset({
        title: '',
        costUnitType: 'ASSIGNMENT',
        description: null,
        cost: null,
        price: null,
        hasExpenditure: false,
        expenditureCost: null,
        expenditurePrice: null,
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
      expenditure: data.hasExpenditure,
      expenditureCost: data.hasExpenditure ? data.expenditureCost : null,
      expenditurePrice: data.hasExpenditure ? data.expenditurePrice : null,
    });
  };

  const hasMinimum = watch('hasMinimum');
  const costUnitType = watch('costUnitType');
  const rateTypeLabel = COST_UNIT_TYPE_OPTIONS.find((opt) => opt.value === costUnitType)?.label || 'Value';

  return (
    <Dialog open={open} onClose={onClose} className="max-w-3xl">
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
              <Label htmlFor="price">Price</Label>
              <Controller
                name="price"
                control={control}
                render={({ field }) => (
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
                )}
              />
              {errors.price && (
                <p className="text-sm text-destructive mt-1">{errors.price.message}</p>
              )}
            </div>

            <div>
              <Label>Expenditures?</Label>
              <Controller
                name="hasExpenditure"
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
                      <RadioGroupItem value="no" id="exp-no" />
                      <Label htmlFor="exp-no" className="font-normal cursor-pointer">No</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="yes" id="exp-yes" />
                      <Label htmlFor="exp-yes" className="font-normal cursor-pointer">Yes</Label>
                    </div>
                  </RadioGroup>
                )}
              />
            </div>

            {watch('hasExpenditure') && (
              <>
                <div>
                  <Label htmlFor="expenditureCost">Expenditure Cost</Label>
                  <Controller
                    name="expenditureCost"
                    control={control}
                    render={({ field }) => (
                      <Input
                        id="expenditureCost"
                        type="number"
                        step="0.01"
                        min="0"
                        inputMode="decimal"
                        value={field.value ?? ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          field.onChange(val === '' ? null : parseFloat(val));
                        }}
                        error={!!errors.expenditureCost}
                        disabled={isSubmitting}
                        placeholder="0.00"
                      />
                    )}
                  />
                  {errors.expenditureCost && (
                    <p className="text-sm text-destructive mt-1">{errors.expenditureCost.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="expenditurePrice">Expenditure Price</Label>
                  <Controller
                    name="expenditurePrice"
                    control={control}
                    render={({ field }) => (
                      <Input
                        id="expenditurePrice"
                        type="number"
                        step="0.01"
                        min="0"
                        inputMode="decimal"
                        value={field.value ?? ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          field.onChange(val === '' ? null : parseFloat(val));
                        }}
                        error={!!errors.expenditurePrice}
                        disabled={isSubmitting}
                        placeholder="0.00"
                      />
                    )}
                  />
                  {errors.expenditurePrice && (
                    <p className="text-sm text-destructive mt-1">{errors.expenditurePrice.message}</p>
                  )}
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
