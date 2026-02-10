'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
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
  const [mounted, setMounted] = useState(false);
  const [showAddAssignment, setShowAddAssignment] = useState(assignments.length > 0);
  const [showForm, setShowForm] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [showCreateService, setShowCreateService] = useState(false);
  const [showCreateProduct, setShowCreateProduct] = useState(false);

  // For SSR safety
  useEffect(() => {
    setMounted(true);
  }, []);

  // Update toggle when assignments change externally
  useEffect(() => {
    if (assignments.length > 0 && !showAddAssignment) {
      setShowAddAssignment(true);
    }
  }, [assignments.length, showAddAssignment]);

  // Service creation mutation
  const createServiceMutation = trpc.service.create.useMutation({
    onSuccess: (data) => {
      toast({
        title: 'Service created',
        description: `${data.title} has been created successfully.`,
      });
      setShowCreateService(false);
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
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create product',
        variant: 'destructive',
      });
    },
  });

  // Handle toggle change
  const handleToggleChange = (value: boolean) => {
    setShowAddAssignment(value);
    if (!value) {
      // If user selects "No", clear all assignments
      onAssignmentsChange([]);
      setShowForm(false);
      setEditingAssignment(null);
    }
  };

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

  // Handle cancel form
  const handleCancelForm = () => {
    setShowForm(false);
    setEditingAssignment(null);
  };

  // Handle add new assignment
  const handleAddAssignment = () => {
    setEditingAssignment(null);
    setShowForm(true);
  };

  return (
    <div className={cn('bg-accent/5 border border-border/30 p-5 rounded-lg', className)}>
      <h3 className="text-lg font-semibold border-b border-border pb-2 mb-4">Assignments</h3>

      {/* Add Assignment Toggle */}
      <div className="mb-4">
        <Label className="text-sm font-medium mb-2 block">Add Assignment to this Task?</Label>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="showAddAssignment"
              checked={showAddAssignment === true}
              onChange={() => handleToggleChange(true)}
              disabled={disabled}
              className="accent-primary"
            />
            <span className="text-sm">Yes</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="showAddAssignment"
              checked={showAddAssignment === false}
              onChange={() => handleToggleChange(false)}
              disabled={disabled}
              className="accent-primary"
            />
            <span className="text-sm">No</span>
          </label>
        </div>
      </div>

      {/* Assignments Content (when Yes is selected) */}
      {showAddAssignment && (
        <div className="space-y-4">
          {/* Assignment List */}
          {assignments.length > 0 && !showForm && (
            <AssignmentList
              assignments={assignments}
              onEdit={handleEditAssignment}
              onDelete={handleDeleteAssignment}
              disabled={disabled}
            />
          )}

          {/* Assignment Form */}
          {showForm && (
            <div className="border border-border rounded-lg p-4 bg-background">
              <h4 className="text-base font-medium mb-4">
                {editingAssignment ? 'Edit Assignment' : 'Assignment Details'}
              </h4>
              <AssignmentForm
                assignment={editingAssignment}
                onSave={handleSaveAssignment}
                onCancel={handleCancelForm}
                onCreateService={() => setShowCreateService(true)}
                onCreateProduct={() => setShowCreateProduct(true)}
                disabled={disabled}
              />
            </div>
          )}

          {/* Add Assignment Button */}
          {!showForm && (
            <Button
              type="button"
              variant="outline"
              onClick={handleAddAssignment}
              disabled={disabled}
              className="gap-2"
            >
              <PlusIcon className="h-4 w-4" />
              Add {assignments.length > 0 ? 'Another ' : ''}Assignment
            </Button>
          )}
        </div>
      )}

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
