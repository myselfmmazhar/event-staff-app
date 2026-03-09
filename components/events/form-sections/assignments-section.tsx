'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { PlusIcon } from '@/components/ui/icons';
import { cn } from '@/lib/utils';
import { AssignmentForm } from './assignment-form';
import { AssignmentList } from './assignment-list';
import { ServiceFormModal } from '@/components/catalog/services/service-form-modal';
import { ProductFormModal } from '@/components/catalog/products/product-form-modal';
import { useToast } from '@/components/ui/use-toast';
import { trpc } from '@/lib/client/trpc';
import type { Assignment, AssignmentSaveAction } from '@/lib/types/assignment.types';
import { XIcon } from '@/components/ui/icons';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import type { EventFormData } from './types';
import type { UseFormWatch, UseFormSetValue } from 'react-hook-form';

interface AssignmentsSectionProps {
  assignments: Assignment[];
  onAssignmentsChange: (assignments: Assignment[]) => void;
  watch: UseFormWatch<EventFormData>;
  setValue: UseFormSetValue<EventFormData>;
  disabled?: boolean;
  className?: string;
}

export function AssignmentsSection({
  assignments,
  onAssignmentsChange,
  watch: eventWatch,
  setValue: eventSetValue,
  disabled = false,
  className,
}: AssignmentsSectionProps) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [mounted, setMounted] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [defaultType, setDefaultType] = useState<'SERVICE' | 'PRODUCT'>('SERVICE');
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [showCreateService, setShowCreateService] = useState(false);
  const [showCreateProduct, setShowCreateProduct] = useState(false);
  // For "Save & Repeat" - holds template assignment to prefill form
  const [repeatAssignment, setRepeatAssignment] = useState<Assignment | null>(null);
  // For live preview - holds current form values while editing
  const [livePreviewAssignment, setLivePreviewAssignment] = useState<Assignment | null>(null);

  // Date range warning dialog state
  const [showDateWarning, setShowDateWarning] = useState(false);
  const [dateWarningMessage, setDateWarningMessage] = useState('');

  const handleInvalidDate = (message: string) => {
    setDateWarningMessage(message);
    setShowDateWarning(true);
  };

  // For SSR safety
  useEffect(() => {
    setMounted(true);
  }, []);

  // Service creation mutation
  const createServiceMutation = trpc.service.create.useMutation({
    onSuccess: (data) => {
      toast({
        title: 'Service created',
        description: `${data.title} has been created successfully.`,
      });
      setShowCreateService(false);
      // Invalidate cache so the new service appears in the dropdown
      utils.service.getAll.invalidate();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create service',
        variant: 'destructive',
      });
    },
  });

  // Product creation mutation
  const createProductMutation = trpc.product.create.useMutation({
    onSuccess: (data) => {
      toast({
        title: 'Product created',
        description: `${data.title} has been created successfully.`,
      });
      setShowCreateProduct(false);
      // Invalidate cache so the new product appears in the dropdown
      utils.product.getAll.invalidate();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create product',
        variant: 'destructive',
      });
    },
  });

  // Handle save assignment
  const handleSaveAssignment = (assignment: Assignment, action: AssignmentSaveAction) => {
    if (editingAssignment) {
      // Update existing assignment
      const updatedAssignments = assignments.map((a) =>
        a.id === editingAssignment.id ? assignment : a
      );
      onAssignmentsChange(updatedAssignments);
    } else {
      // Add new assignment
      onAssignmentsChange([...assignments, assignment]);
    }

    // Handle action
    switch (action) {
      case 'close':
        setShowForm(false);
        setEditingAssignment(null);
        setRepeatAssignment(null);
        setLivePreviewAssignment(null);
        break;
      case 'new':
        setEditingAssignment(null);
        setRepeatAssignment(null);
        setLivePreviewAssignment(null);
        // Keep form open with fresh data (component will reset)
        setShowForm(false);
        setTimeout(() => setShowForm(true), 0);
        break;
      case 'repeat':
        // Keep form open with same data for duplication (new ID will be generated on next save)
        setEditingAssignment(null);
        setRepeatAssignment({ ...assignment, id: crypto.randomUUID() });
        setLivePreviewAssignment(null);
        break;
    }

    toast({
      title: 'Assignment saved',
      description: 'The assignment has been saved successfully.',
    });
  };

  // Handle edit assignment
  const handleEditAssignment = (id: string) => {
    const assignment = assignments.find((a) => a.id === id);
    if (assignment) {
      setEditingAssignment(assignment);
      setShowForm(true);
    }
  };

  // Handle delete assignment
  const handleDeleteAssignment = (id: string) => {
    const updatedAssignments = assignments.filter((a) => a.id !== id);
    onAssignmentsChange(updatedAssignments);
    toast({
      title: 'Assignment removed',
      description: 'The assignment has been removed.',
    });
  };

  // Handle quick update (inline edit for qty, cost, price, and dates)
  const handleQuickUpdate = (id: string, updates: { quantity?: number; price?: number; cost?: number; startDate?: string | null; startTime?: string | null; endDate?: string | null; endTime?: string | null }) => {
    const updatedAssignments = assignments.map((a) => {
      if (a.id !== id) return a;

      const baseUpdates: Record<string, any> = {};
      if (updates.quantity !== undefined) {
        baseUpdates.quantity = updates.quantity;
      }
      if (updates.price !== undefined && a.type === 'SERVICE') {
        baseUpdates.billRate = updates.price;
      }
      if (updates.cost !== undefined && a.type === 'SERVICE') {
        baseUpdates.payRate = updates.cost;
      }
      if (a.type === 'SERVICE') {
        if (updates.startDate !== undefined) baseUpdates.startDate = updates.startDate;
        if (updates.startTime !== undefined) baseUpdates.startTime = updates.startTime;
        if (updates.endDate !== undefined) baseUpdates.endDate = updates.endDate;
        if (updates.endTime !== undefined) baseUpdates.endTime = updates.endTime;
      }

      return { ...a, ...baseUpdates } as Assignment;
    });
    onAssignmentsChange(updatedAssignments);
  };

  // Handle cancel form
  const handleCancelForm = () => {
    setShowForm(false);
    setEditingAssignment(null);
    setRepeatAssignment(null);
    setLivePreviewAssignment(null);
  };

  // Handle add new service assignment
  const handleAddServiceAssignment = () => {
    setEditingAssignment(null);
    setDefaultType('SERVICE');
    setShowForm(true);
  };

  // Handle add new product assignment
  const handleAddProductAssignment = () => {
    setEditingAssignment(null);
    setDefaultType('PRODUCT');
    setShowForm(true);
  };

  // Sync event dates to a new service assignment when form is first opened
  // Handle date restrictions for AssignmentForm
  const eventStartDate = eventWatch('startDate');
  const eventEndDate = eventWatch('endDate');

  const formatDateForInput = (date: any): string | null => {
    if (!date) return null;
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) return date; // Already in correct format
    const d = new Date(date);
    if (isNaN(d.getTime())) return null;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const minDate = formatDateForInput(eventStartDate);
  const maxDate = formatDateForInput(eventEndDate);

  // Sync event dates to a new service assignment when form is first opened
  useEffect(() => {
    if (showForm && !editingAssignment && !repeatAssignment && defaultType === 'SERVICE') {
      const eventStartTime = eventWatch('startTime');
      const eventEndTime = eventWatch('endTime');

      // Use a small timeout to ensure the form is mounted and registered before we try to set values
      // Note: AssignmentForm has its own internal reset/defaultValues logic, but it takes an optional 'assignment' prop.
      // We'll create a "prefill" assignment if dates are present.
      if (minDate || eventStartTime || maxDate || eventEndTime) {
        const prefill: Partial<Assignment> = {
          type: 'SERVICE',
          startDate: minDate || undefined,
          startTime: eventStartTime || undefined,
          endDate: maxDate || undefined,
          endTime: eventEndTime || undefined,
          startTimeTBD: eventStartTime === 'TBD',
          endTimeTBD: eventEndTime === 'TBD'
        };
        setRepeatAssignment(prefill as Assignment);
      }
    }
  }, [showForm, editingAssignment, repeatAssignment, defaultType, eventWatch, minDate, maxDate]);


  return (
    <div className={cn('bg-white border rounded-xl overflow-hidden', className)}>
      <div className="bg-slate-50/50 px-5 py-3 border-b border-slate-100 flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900 tracking-tight uppercase">Assignments</h3>
        {!showForm && assignments.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-bold">
              {assignments.length} Total
            </span>
          </div>
        )}
      </div>

      <div className="p-5 space-y-5">
        {/* Assignment List - always show when there are assignments */}
        {assignments.length > 0 && (
          <AssignmentList
            assignments={assignments}
            onEdit={handleEditAssignment}
            onDelete={handleDeleteAssignment}
            onQuickUpdate={handleQuickUpdate}
            disabled={disabled || showForm}
            editingId={editingAssignment?.id}
            livePreviewAssignment={livePreviewAssignment}
            minDate={minDate}
            maxDate={maxDate}
            onInvalidDate={handleInvalidDate}
            renderEditForm={(assignment) => (
              <>
                <h4 className="text-base font-medium mb-4">Edit Assignment</h4>
                <AssignmentForm
                  assignment={assignment}
                  onSave={handleSaveAssignment}
                  onCancel={handleCancelForm}
                  onLiveChange={setLivePreviewAssignment}
                  onCreateService={() => setShowCreateService(true)}
                  onCreateProduct={() => setShowCreateProduct(true)}
                  minDate={minDate}
                  maxDate={maxDate}
                  onInvalidDate={handleInvalidDate}
                  disabled={disabled}
                />
              </>
            )}
          />
        )}

        {/* Assignment Form - only for NEW assignments (not editing) */}
        {showForm && !editingAssignment && (
          <Dialog open={showForm} onClose={handleCancelForm} className="max-w-4xl w-[90vw]">
            <DialogHeader className="flex flex-row items-center justify-between pr-2">
              <DialogTitle>
                {defaultType === 'SERVICE' ? 'Add Service Assignment' : 'Add Product Assignment'}
              </DialogTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancelForm}
                className="h-8 w-8 p-0 rounded-full hover:bg-accent"
              >
                <XIcon className="h-4 w-4" />
              </Button>
            </DialogHeader>
            <DialogContent>
              <AssignmentForm
                assignment={repeatAssignment}
                defaultType={defaultType}
                onSave={handleSaveAssignment}
                onCancel={handleCancelForm}
                onCreateService={() => setShowCreateService(true)}
                onCreateProduct={() => setShowCreateProduct(true)}
                minDate={minDate}
                maxDate={maxDate}
                onInvalidDate={handleInvalidDate}
                disabled={disabled}
              />
            </DialogContent>
          </Dialog>
        )}

        {/* Add Assignment Buttons */}
        {!showForm && (
          <div className="flex items-center gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleAddServiceAssignment}
              disabled={disabled}
              className="gap-2.5 h-11 px-6 rounded-xl border-blue-100 text-blue-600 font-semibold hover:bg-blue-50 hover:border-blue-200 transition-all text-xs"
            >
              <PlusIcon className="h-4 w-4" />
              Add Service Assignment
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleAddProductAssignment}
              disabled={disabled}
              className="gap-2.5 h-11 px-6 rounded-xl border-blue-100 text-blue-600 font-semibold hover:bg-blue-50 hover:border-blue-200 transition-all text-xs"
            >
              <PlusIcon className="h-4 w-4" />
              Add Product Assignment
            </Button>
          </div>
        )}
      </div>

      {/* Service Creation Modal */}
      {mounted &&
        showCreateService &&
        createPortal(
          <ServiceFormModal
            service={null}
            open={showCreateService}
            onClose={() => setShowCreateService(false)}
            onSubmit={async (data) => {
              await createServiceMutation.mutateAsync(data as any);
            }}
            isSubmitting={createServiceMutation.isPending}
          />,
          document.body
        )}

      {/* Product Creation Modal */}
      {mounted &&
        showCreateProduct &&
        createPortal(
          <ProductFormModal
            product={null}
            open={showCreateProduct}
            onClose={() => setShowCreateProduct(false)}
            onSubmit={async (data) => {
              await createProductMutation.mutateAsync(data as any);
            }}
            isSubmitting={createProductMutation.isPending}
          />,
          document.body
        )}
    </div>
  );
}
