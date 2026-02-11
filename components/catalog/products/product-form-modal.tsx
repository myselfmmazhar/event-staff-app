'use client';

import { useEffect } from 'react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, SubmitHandler, useForm } from 'react-hook-form';
import { MinimumPurchase, PriceUnitType } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { CloseIcon } from '@/components/ui/icons';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectContent, SelectValue, SelectItem } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { Product } from '@/lib/types/product';
import type { CreateProductInput } from '@/lib/schemas/product.schema';
import {
  MINIMUM_PURCHASE_OPTIONS,
  PRICE_UNIT_TYPE_OPTIONS,
} from '@/lib/constants/enums';
import { decimalToNumber } from '@/lib/utils/currency-formatter';

const formSchema = z.object({
  title: z
    .string()
    .min(1, 'Product title is required')
    .max(200, 'Title must be 200 characters or less')
    .transform((v) => v.trim()),
  description: z
    .string()
    .max(1000, 'Description must be 1000 characters or less')
    .transform((v) => v.trim())
    .nullable()
    .default(null),
  priceUnitType: z.nativeEnum(PriceUnitType).default(PriceUnitType.UNIT),
  minimumPurchase: z.nativeEnum(MinimumPurchase).nullable().default(null),
  trackInventory: z.boolean().default(false),
  supplier: z
    .string()
    .max(200, 'Supplier must be 200 characters or less')
    .transform((v) => v.trim())
    .nullable()
    .default(null),
  brand: z
    .string()
    .max(200, 'Brand must be 200 characters or less')
    .transform((v) => v.trim())
    .nullable()
    .default(null),
  category: z
    .string()
    .max(200, 'Category must be 200 characters or less')
    .transform((v) => v.trim())
    .nullable()
    .default(null),
  cost: z.number().positive('Cost must be a positive number').nullable().default(null),
  price: z.number().positive('Price must be a positive number').nullable().default(null),
});

type FormInput = z.input<typeof formSchema>;
type FormOutput = z.infer<typeof formSchema>;
type FormFieldName = keyof FormInput;

interface ProductFormModalProps {
  product: Product | null;
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateProductInput) => void;
  isSubmitting: boolean;
  backendErrors?: Array<{ field: string; message: string }>;
}

export function ProductFormModal({
  product,
  open,
  onClose,
  onSubmit,
  isSubmitting,
  backendErrors = [],
}: ProductFormModalProps) {
  const isEdit = !!product;

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
      description: null,
      priceUnitType: PriceUnitType.UNIT,
      minimumPurchase: null,
      trackInventory: false,
      supplier: null,
      brand: null,
      category: null,
      cost: null,
      price: null,
    },
  });

  useEffect(() => {
    if (product && open) {
      reset({
        title: product.title,
        description: product.description ?? null,
        priceUnitType: product.priceUnitType ?? PriceUnitType.UNIT,
        minimumPurchase: product.minimumPurchase ?? null,
        trackInventory: product.trackInventory ?? false,
        supplier: product.supplier ?? null,
        brand: product.brand ?? null,
        category: product.category ?? null,
        cost: decimalToNumber(product.cost),
        price: decimalToNumber(product.price),
      });
    } else if (!product && open) {
      reset({
        title: '',
        description: null,
        priceUnitType: PriceUnitType.UNIT,
        minimumPurchase: null,
        trackInventory: false,
        supplier: null,
        brand: null,
        category: null,
        cost: null,
        price: null,
      });
    }
  }, [product, open, reset]);

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
      description: data.description || null,
      priceUnitType: data.priceUnitType,
      minimumPurchase: data.minimumPurchase,
      trackInventory: data.trackInventory,
      supplier: data.supplier || null,
      brand: data.brand || null,
      category: data.category || null,
      cost: data.cost,
      price: data.price,
    });
  };

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
            <DialogTitle>{isEdit ? 'Edit Product' : 'Add Product'}</DialogTitle>
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
          {isEdit && product && (
            <div className="mb-6 p-3 bg-muted/30 rounded-md border border-border">
              <p className="text-sm text-muted-foreground">Product ID</p>
              <p className="text-base font-medium">{product.productId}</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-3">
              <Label htmlFor="title" required>
                Product Title
              </Label>
              <Input
                id="title"
                {...register('title')}
                error={!!errors.title}
                disabled={isSubmitting}
                placeholder="e.g., Bottled water"
              />
              {errors.title && (
                <p className="text-sm text-destructive mt-1">{errors.title.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="priceUnitType">Price Unit Type</Label>
              <Controller
                name="priceUnitType"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(value) => field.onChange(value as PriceUnitType)}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger id="priceUnitType">
                      <SelectValue placeholder="Select unit type" />
                    </SelectTrigger>
                    <SelectContent>
                      {PRICE_UNIT_TYPE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.priceUnitType && (
                <p className="text-sm text-destructive mt-1">{errors.priceUnitType.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="minimumPurchase">Minimum Purchase</Label>
              <Controller
                name="minimumPurchase"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value ?? '__none__'}
                    onValueChange={(value) => field.onChange(value === '__none__' ? null : value)}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger id="minimumPurchase">
                      <SelectValue placeholder="—" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">—</SelectItem>
                      {MINIMUM_PURCHASE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.minimumPurchase && (
                <p className="text-sm text-destructive mt-1">{errors.minimumPurchase.message}</p>
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
              <Label htmlFor="supplier">Supplier</Label>
              <Input
                id="supplier"
                {...register('supplier')}
                error={!!errors.supplier}
                disabled={isSubmitting}
                placeholder="Optional supplier"
              />
              {errors.supplier && (
                <p className="text-sm text-destructive mt-1">{errors.supplier.message}</p>
              )}
            </div>

            <div className="sm:pt-7">
              <Controller
                name="trackInventory"
                control={control}
                render={({ field }) => (
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="trackInventory"
                      checked={field.value}
                      onChange={(e) => field.onChange(e.target.checked)}
                      disabled={isSubmitting}
                    />
                    <Label htmlFor="trackInventory" className="mb-0">
                      Track Inventory
                    </Label>
                  </div>
                )}
              />
            </div>

            <div className="sm:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="brand">Brand</Label>
                <Input
                  id="brand"
                  {...register('brand')}
                  error={!!errors.brand}
                  disabled={isSubmitting}
                  placeholder="Optional brand"
                />
                {errors.brand && (
                  <p className="text-sm text-destructive mt-1">{errors.brand.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  {...register('category')}
                  error={!!errors.category}
                  disabled={isSubmitting}
                  placeholder="Optional category"
                />
                {errors.category && (
                  <p className="text-sm text-destructive mt-1">{errors.category.message}</p>
                )}
              </div>
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
          </div>
        </DialogContent>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Product'}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}

