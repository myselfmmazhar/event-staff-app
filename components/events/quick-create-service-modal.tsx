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
import type { ServiceItem } from './item-selector';

const quickCreateServiceSchema = z.object({
  title: z
    .string()
    .min(1, 'Service title is required')
    .max(200, 'Service title must be 200 characters or less'),
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
});

type QuickCreateServiceInput = z.infer<typeof quickCreateServiceSchema>;

interface QuickCreateServiceModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (service: ServiceItem) => void;
}

export function QuickCreateServiceModal({
  open,
  onClose,
  onCreated,
}: QuickCreateServiceModalProps) {
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
  } = useForm<QuickCreateServiceInput>({
    resolver: zodResolver(quickCreateServiceSchema),
    defaultValues: {
      title: '',
      cost: undefined,
      description: '',
    },
  });

  const createMutation = trpc.service.create.useMutation({
    onSuccess: (data) => {
      toast({
        title: 'Service created',
        description: 'Service created successfully',
      });
      // Map the created service to ServiceItem format
      const serviceItem: ServiceItem = {
        id: data.id,
        serviceId: data.serviceId,
        title: data.title,
        cost: data.cost ? Number(data.cost) : null,
        costUnitType: data.costUnitType,
        description: data.description,
        isActive: data.isActive,
      };
      onCreated(serviceItem);
      handleClose();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create service',
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

  const onSubmit = async (data: QuickCreateServiceInput) => {
    setIsSubmitting(true);
    createMutation.mutate({
      title: data.title,
      cost: data.cost ?? undefined,
      description: data.description ?? undefined,
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
        <DialogTitle>Quick Create Service</DialogTitle>
      </DialogHeader>

      <DialogContent>
        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div>
            <Label htmlFor="qcs-title">Title *</Label>
            <Input
              id="qcs-title"
              {...register('title')}
              disabled={isSubmitting}
              placeholder="Enter service title"
              error={!!errors.title}
            />
            {errors.title && (
              <p className="text-sm text-destructive mt-1">{errors.title.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="qcs-cost">Cost</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                id="qcs-cost"
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
            <Label htmlFor="qcs-description">Description</Label>
            <Textarea
              id="qcs-description"
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
              {isSubmitting ? 'Creating...' : 'Create Service'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );

  return createPortal(modalContent, document.body);
}
