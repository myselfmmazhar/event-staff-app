'use client';

import { Accordion } from '@/components/ui/accordion';
import { AssignmentItem } from './assignment-item';
import type { Assignment, AssignmentSaveAction } from '@/lib/types/assignment.types';

interface AssignmentListProps {
  assignments: Assignment[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  /** Quick update handler for inline edits (qty, price) */
  onQuickUpdate?: (id: string, updates: { quantity?: number }) => void;
  disabled?: boolean;
  /** ID of the assignment currently being edited (for inline form) */
  editingId?: string | null;
  /** Render prop for inline edit form */
  renderEditForm?: (assignment: Assignment) => React.ReactNode;
}

export function AssignmentList({
  assignments,
  onEdit,
  onDelete,
  onQuickUpdate,
  disabled = false,
  editingId,
  renderEditForm,
}: AssignmentListProps) {
  if (assignments.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No assignments added yet. Click "Add Assignment" to get started.
      </div>
    );
  }

  // Calculate totals
  const totals = assignments.reduce(
    (acc, assignment) => {
      let price: number | null | undefined = null;
      if (assignment.type === 'PRODUCT') {
        price = assignment.product?.price;
      } else {
        price = assignment.billRate ?? assignment.service?.price;
      }
      const lineTotal = price !== null && price !== undefined
        ? Number(price) * assignment.quantity
        : 0;

      if (assignment.type === 'PRODUCT') {
        acc.productsTotal += lineTotal;
        acc.productsCount++;
      } else {
        acc.servicesTotal += lineTotal;
        acc.servicesCount++;
      }
      acc.grandTotal += lineTotal;
      return acc;
    },
    { productsTotal: 0, servicesTotal: 0, grandTotal: 0, productsCount: 0, servicesCount: 0 }
  );

  return (
    <div className="space-y-4">
      <Accordion type="multiple" className="space-y-2">
        {assignments.map((assignment) => (
          <div key={assignment.id}>
            <AssignmentItem
              assignment={assignment}
              onEdit={() => onEdit(assignment.id)}
              onDelete={() => onDelete(assignment.id)}
              onQuickUpdate={onQuickUpdate ? (updates) => onQuickUpdate(assignment.id, updates) : undefined}
              disabled={disabled || editingId === assignment.id}
            />
            {/* Inline edit form - renders right below the item being edited */}
            {editingId === assignment.id && renderEditForm && (
              <div className="mt-2 border border-primary/30 rounded-lg p-4 bg-background shadow-sm">
                {renderEditForm(assignment)}
              </div>
            )}
          </div>
        ))}
      </Accordion>

      {/* Totals Summary */}
      <div className="border-t pt-4 mt-4 space-y-2">
        {totals.servicesCount > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              Services ({totals.servicesCount})
            </span>
            <span className="font-medium">${totals.servicesTotal.toFixed(2)}</span>
          </div>
        )}
        {totals.productsCount > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              Products ({totals.productsCount})
            </span>
            <span className="font-medium">${totals.productsTotal.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between text-base font-semibold border-t pt-2">
          <span>Grand Total</span>
          <span>${totals.grandTotal.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}
