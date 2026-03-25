'use client';

import { Accordion } from '@/components/ui/accordion';
import { AssignmentItem } from './assignment-item';
import { getAssignmentTotals, formatCurrency } from '@/lib/utils/assignment-calculations';
import type { Assignment } from '@/lib/types/assignment.types';

interface AssignmentListProps {
  assignments: Assignment[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  /** Quick update handler for inline edits (qty, price, dates) */
  onQuickUpdate?: (id: string, updates: { quantity?: number; price?: number; cost?: number; startDate?: string | null; startTime?: string | null; endDate?: string | null; endTime?: string | null }) => void;
  disabled?: boolean;
  /** ID of the assignment currently being edited (for inline form) */
  editingId?: string | null;
  /** Live preview assignment from form (overrides stored assignment for display) */
  livePreviewAssignment?: Assignment | null;
  /** Min date for service assignments */
  minDate?: string | null;
  /** Max date for service assignments */
  maxDate?: string | null;
  /** Callback when a date is out of range */
  onInvalidDate?: (message: string) => void;
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
  livePreviewAssignment,
  renderEditForm,
  minDate,
  maxDate,
  onInvalidDate,
}: AssignmentListProps) {
  if (assignments.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No assignments added yet. Click "Add Assignment" to get started.
      </div>
    );
  }

  // Use live preview assignment if editing, otherwise use stored assignment
  const getDisplayAssignment = (assignment: Assignment): Assignment => {
    if (livePreviewAssignment && assignment.id === editingId) {
      return livePreviewAssignment;
    }
    return assignment;
  };

  // Calculate totals using shared utility (using live preview when available)
  const totals = assignments.reduce(
    (acc, assignment) => {
      const displayAssignment = getDisplayAssignment(assignment);
      const { totalPrice, totalCost } = getAssignmentTotals(displayAssignment);
      const lineTotalPrice = totalPrice ?? 0;
      const lineTotalCost = totalCost ?? 0;

      if (displayAssignment.type === 'PRODUCT') {
        acc.productsTotalPrice += lineTotalPrice;
        acc.productsTotalCost += lineTotalCost;
        acc.productsCount++;
      } else {
        acc.servicesTotalPrice += lineTotalPrice;
        acc.servicesTotalCost += lineTotalCost;
        acc.servicesCount++;
      }
      acc.grandTotalPrice += lineTotalPrice;
      acc.grandTotalCost += lineTotalCost;
      return acc;
    },
    {
      productsTotalPrice: 0, productsTotalCost: 0,
      servicesTotalPrice: 0, servicesTotalCost: 0,
      grandTotalPrice: 0, grandTotalCost: 0,
      productsCount: 0, servicesCount: 0
    }
  );

  return (
    <div className="space-y-4">
      <Accordion type="multiple" className="space-y-2">
        {assignments.map((assignment) => {
          const displayAssignment = getDisplayAssignment(assignment);
          return (
            <div key={assignment.id}>
              <AssignmentItem
                assignment={displayAssignment}
                onEdit={() => onEdit(assignment.id)}
                onDelete={() => onDelete(assignment.id)}
                onQuickUpdate={onQuickUpdate ? (updates) => onQuickUpdate(assignment.id, updates) : undefined}
                minDate={minDate}
                maxDate={maxDate}
                onInvalidDate={onInvalidDate}
                disabled={disabled || editingId === assignment.id}
              />
              {/* Inline edit form - renders right below the item being edited */}
              {editingId === assignment.id && renderEditForm && (
                <div className="mt-2 border border-primary/30 rounded-lg p-4 bg-background shadow-sm">
                  {renderEditForm(assignment)}
                </div>
              )}
            </div>
          );
        })}
      </Accordion>

      {/* Totals Summary */}
      <div className="pt-6 mt-6 space-y-3">
        {totals.servicesCount > 0 && (
          <div className="flex justify-between items-center text-sm px-1">
            <span className="text-slate-500 font-medium">
              Services ({totals.servicesCount})
            </span>
            <div className="text-right">
              <span className="font-bold text-slate-900">{formatCurrency(totals.servicesTotalPrice)}</span>
              <span className="text-[11px] text-slate-400 ml-3 font-medium">
                Cost: {formatCurrency(totals.servicesTotalCost)}
              </span>
            </div>
          </div>
        )}
        {totals.productsCount > 0 && (
          <div className="flex justify-between items-center text-sm px-1">
            <span className="text-slate-500 font-medium">
              Products ({totals.productsCount})
            </span>
            <div className="text-right">
              <span className="font-bold text-slate-900">{formatCurrency(totals.productsTotalPrice)}</span>
              <span className="text-[11px] text-slate-400 ml-3 font-medium">
                Cost: {formatCurrency(totals.productsTotalCost)}
              </span>
            </div>
          </div>
        )}
        <div className="flex justify-between items-center text-base border-t border-slate-100 pt-3 px-1">
          <span className="font-bold text-slate-900">Grand Total</span>
          <div className="text-right flex items-center gap-3">
            <span className="font-extrabold text-[#1e293b] text-lg">{formatCurrency(totals.grandTotalPrice)}</span>
            <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
              Cost: {formatCurrency(totals.grandTotalCost)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
