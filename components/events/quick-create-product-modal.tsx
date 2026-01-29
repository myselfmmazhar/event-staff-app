'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { trpc } from '@/lib/client/trpc';
import { toast } from '@/components/ui/use-toast';
import type { ProductItem } from './item-selector';

const quickCreateProductSchema = z.object({
  title: z
    .string()
    .min(1, 'Product title is required')
    .max(200, 'Product title must be 200 characters or less'),
  cost: z
    .number()
    .min(0, 'Cost must be non-negative')
    .optional()
    .nullable(),
  description: z
    .string()
    .max(1000, 'Description must be 1000 characters or less')
    .optional()
    .nullable(),
  category: z
    .string()
    .max(200, 'Category must be 200 characters or less')
    .optional()
    .nullable(),
});

type QuickCreateProductInput = z.infer<typeof quickCreateProductSchema>;

interface QuickCreateProductModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (product: ProductItem) => void;
}

export function QuickCreateProductModal({
  open,
  onClose,
  onCreated,
}: QuickCreateProductModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<QuickCreateProductInput>({
    resolver: zodResolver(quickCreateProductSchema),
    defaultValues: {
      title: '',
      cost: undefined,
      description: '',
      category: '',
    },
  });

  const createMutation = trpc.product.create.useMutation({
    onSuccess: (data) => {
      toast({
        title: 'Product created',
        description: 'Product created successfully',
      });
      // Map the created product to ProductItem format
      const productItem: ProductItem = {
        id: data.id,
        productId: data.productId,
        title: data.title,
        cost: data.cost ? Number(data.cost) : null,
        priceUnitType: data.priceUnitType,
        description: data.description,
        category: data.category,
        isActive: data.isActive,
      };
      onCreated(productItem);
      handleClose();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create product',
        variant: 'error',
      });
      setIsSubmitting(false);
    },
  });

  const handleClose = () => {
    reset();
    setIsSubmitting(false);
    onClose();
  };

  const onSubmit = async (data: QuickCreateProductInput) => {
    setIsSubmitting(true);
    createMutation.mutate({
      title: data.title,
      cost: data.cost ?? undefined,
      description: data.description ?? undefined,
      category: data.category ?? undefined,
    });
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleSubmit(onSubmit)(e);
  };

  // Use portal to render modal outside of any parent form
  if (!mounted) return null;

  const modalContent = (
    <Dialog open={open} onClose={handleClose} className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Quick Create Product</DialogTitle>
      </DialogHeader>

      <DialogContent>
        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div>
            <Label htmlFor="qcp-title">Title *</Label>
            <Input
              id="qcp-title"
              {...register('title')}
              disabled={isSubmitting}
              placeholder="Enter product title"
              error={!!errors.title}
            />
            {errors.title && (
              <p className="text-sm text-destructive mt-1">{errors.title.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="qcp-cost">Cost</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  id="qcp-cost"
                  type="number"
                  step="0.01"
                  min="0"
                  {...register('cost', { valueAsNumber: true })}
                  disabled={isSubmitting}
                  placeholder="0.00"
                  className="pl-7"
                  error={!!errors.cost}
                />
              </div>
              {errors.cost && (
                <p className="text-sm text-destructive mt-1">{errors.cost.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="qcp-category">Category</Label>
              <Input
                id="qcp-category"
                {...register('category')}
                disabled={isSubmitting}
                placeholder="e.g., Equipment"
                error={!!errors.category}
              />
              {errors.category && (
                <p className="text-sm text-destructive mt-1">{errors.category.message}</p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="qcp-description">Description</Label>
            <Textarea
              id="qcp-description"
              {...register('description')}
              disabled={isSubmitting}
              placeholder="Optional description"
              rows={3}
            />
            {errors.description && (
              <p className="text-sm text-destructive mt-1">{errors.description.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Product'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );

  return createPortal(modalContent, document.body);
}
