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
import type { Assignment, AssignmentSaveAction, ServiceItem, ProductItem } from '@/lib/types/assignment.types';

interface AssignmentsSectionProps {
  assignments: Assignment[];
  onAssignmentsChange: (assignments: Assignment[]) => void;
  disabled?: boolean;
  className?: string;
}

export function AssignmentsSection({
  assignments,
  onAssignmentsChange,
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
        break;
      case 'new':
        setEditingAssignment(null);
        // Keep form open with fresh data (component will reset)
        setShowForm(false);
        setTimeout(() => setShowForm(true), 0);
        break;
      case 'repeat':
        // Keep form open with same data for duplication
        setEditingAssignment(null);
        // Keep the form populated with the same values
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

  // Handle quick update (inline edit for qty)
  const handleQuickUpdate = (id: string, updates: { quantity?: number }) => {
    const updatedAssignments = assignments.map((a) => {
      if (a.id !== id) return a;
      return { ...a, ...updates };
    });
    onAssignmentsChange(updatedAssignments);
  };

  // Handle cancel form
  const handleCancelForm = () => {
    setShowForm(false);
    setEditingAssignment(null);
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

  return (
    <div className={cn('bg-accent/5 border border-border/30 p-5 rounded-lg', className)}>
      <h3 className="text-lg font-semibold border-b border-border pb-2 mb-4">Assignments</h3>

      <div className="space-y-4">
        {/* Assignment List - always show when there are assignments */}
        {assignments.length > 0 && (
          <AssignmentList
            assignments={assignments}
            onEdit={handleEditAssignment}
            onDelete={handleDeleteAssignment}
            onQuickUpdate={handleQuickUpdate}
            disabled={disabled || showForm}
            editingId={editingAssignment?.id}
            renderEditForm={(assignment) => (
              <>
                <h4 className="text-base font-medium mb-4">Edit Assignment</h4>
                <AssignmentForm
                  assignment={assignment}
                  onSave={handleSaveAssignment}
                  onCancel={handleCancelForm}
                  onCreateService={() => setShowCreateService(true)}
                  onCreateProduct={() => setShowCreateProduct(true)}
                  disabled={disabled}
                />
              </>
            )}
          />
        )}

        {/* Assignment Form - only for NEW assignments (not editing) */}
        {showForm && !editingAssignment && (
          <div className="border border-border rounded-lg p-4 bg-background">
            <h4 className="text-base font-medium mb-4">Assignment Details</h4>
            <AssignmentForm
              assignment={null}
              defaultType={defaultType}
              onSave={handleSaveAssignment}
              onCancel={handleCancelForm}
              onCreateService={() => setShowCreateService(true)}
              onCreateProduct={() => setShowCreateProduct(true)}
              disabled={disabled}
            />
          </div>
        )}

        {/* Add Assignment Buttons */}
        {!showForm && (
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleAddServiceAssignment}
              disabled={disabled}
              className="gap-2"
            >
              <PlusIcon className="h-4 w-4" />
              Add Service Assignment
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleAddProductAssignment}
              disabled={disabled}
              className="gap-2"
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
