'use client';

import { Input } from '@/components/ui/input';
import { AccordionItem, AccordionArrow, AccordionContent } from '@/components/ui/accordion';
import { EditIcon, TrashIcon } from '@/components/ui/icons';
import {
  EXPERIENCE_REQUIREMENT_LABELS,
  STAFF_RATING_LABELS,
  RATE_TYPE_LABELS,
} from '@/lib/constants/enums';
import { ActionDropdown } from '@/components/common/action-dropdown';
import { getAssignmentTotals, formatCurrency } from '@/lib/utils/assignment-calculations';
import type { Assignment, ProductAssignment, ServiceAssignment } from '@/lib/types/assignment.types';
import type { ExperienceRequirement, StaffRating } from '@prisma/client';

interface AssignmentItemProps {
  assignment: Assignment;
  onEdit: () => void;
  onDelete: () => void;
  onQuickUpdate?: (updates: { quantity?: number; price?: number; cost?: number; startDate?: string | null; startTime?: string | null; endDate?: string | null; endTime?: string | null }) => void;
  minDate?: string | null;
  maxDate?: string | null;
  disabled?: boolean;
  /** Callback when a date is out of range */
  onInvalidDate?: (message: string) => void;
}

export function AssignmentItem({
  assignment,
  onEdit,
  onDelete,
  onQuickUpdate,
  minDate,
  maxDate,
  onInvalidDate,
  disabled = false,
}: AssignmentItemProps) {
  const isProduct = assignment.type === 'PRODUCT';
  const productAssignment = isProduct ? (assignment as ProductAssignment) : null;
  const serviceAssignment = !isProduct ? (assignment as ServiceAssignment) : null;


  // Get display title
  const title = isProduct
    ? productAssignment?.product?.title || 'Product'
    : serviceAssignment?.service?.title || 'Service';

  // Get display cost - use payRate for services, product.cost for products
  const cost = isProduct
    ? productAssignment?.product?.cost
    : serviceAssignment?.payRate ?? serviceAssignment?.service?.cost;

  // Get display price - use billRate for services, product.price for products
  const price = isProduct
    ? productAssignment?.product?.price
    : serviceAssignment?.billRate ?? serviceAssignment?.service?.price;

  // Calculate hours and totals using shared utility
  const { totalCost, totalPrice } = getAssignmentTotals(assignment);

  // Direct update handlers (no click-to-edit, fields are always editable)
  const handleQtyChange = (value: number) => {
    if (value >= 1) {
      onQuickUpdate?.({ quantity: value });
    }
  };

  const handleCostChange = (value: number) => {
    if (value >= 0) {
      onQuickUpdate?.({ cost: value });
    }
  };

  const handlePriceChange = (value: number) => {
    if (value >= 0) {
      onQuickUpdate?.({ price: value });
    }
  };

  const handleDateChange = (field: 'startDate' | 'startTime' | 'endDate' | 'endTime', value: string) => {
    if ((field === 'startDate' || field === 'endDate') && value) {
      if (minDate && value < minDate) {
        onInvalidDate?.(`You cannot select a date earlier than ${new Date(minDate + 'T12:00:00').toLocaleDateString()}.`);
        return;
      }
      if (maxDate && value > maxDate) {
        onInvalidDate?.(`You cannot select a date later than ${new Date(maxDate + 'T12:00:00').toLocaleDateString()}.`);
        return;
      }
    }

    const updates: { startDate?: string | null; startTime?: string | null; endDate?: string | null; endTime?: string | null } = {};
    updates[field] = value || null;

    // When start date changes, also update end date if it's empty or before start date
    if (field === 'startDate' && value) {
      const currentEndDate = serviceAssignment?.endDate;
      if (!currentEndDate || currentEndDate < value) {
        updates.endDate = value;
      }
    }
    // When start time changes, also update end time if it's empty
    if (field === 'startTime' && value && !serviceAssignment?.endTime) {
      updates.endTime = value;
    }

    onQuickUpdate?.(updates);
  };


  const editable = Boolean(onQuickUpdate && !disabled);
  const rateLabel = isProduct
    ? 'Per item'
    : serviceAssignment?.rateType
      ? RATE_TYPE_LABELS[serviceAssignment.rateType]
      : 'Per shift';

  return (
    <AccordionItem
      value={assignment.id}
      className="mb-2 overflow-visible rounded-xl border border-slate-200 bg-white shadow-sm transition-all hover:border-primary/25 group"
    >
      {/* Row 1: service + schedule · Row 2: quantity / cost / price / rate — totals fixed right */}
      <div className="flex min-w-0 items-stretch">
        <div
          className="flex min-w-0 flex-1 flex-col gap-2 px-3 py-2.5 sm:gap-2.5 sm:px-4"
          onClick={editable ? (e) => e.stopPropagation() : undefined}
        >
          <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-2.5">
            <div className="flex shrink-0 items-center gap-1" onClick={(e) => e.stopPropagation()}>
              <ActionDropdown
                actions={[
                  {
                    label: 'Edit',
                    icon: <EditIcon className="h-3.5 w-3.5" />,
                    onClick: onEdit,
                    disabled: disabled,
                  },
                  {
                    label: 'Delete',
                    icon: <TrashIcon className="h-3.5 w-3.5" />,
                    onClick: onDelete,
                    variant: 'destructive',
                    disabled: disabled,
                  },
                ]}
              />
              <AccordionArrow className="h-6 w-6" />
            </div>

            <div className="min-w-[100px] max-w-[200px] shrink-0 sm:min-w-[128px] sm:max-w-[240px]">
              <div className="truncate text-[13px] font-bold leading-tight text-slate-900">{title}</div>
              <div className="mt-0.5 truncate text-[11px] font-medium leading-tight text-slate-400">
                {isProduct ? 'Product' : 'Service'}
              </div>
            </div>

            {!isProduct && serviceAssignment && onQuickUpdate && (
              <>
                <div className="hidden h-9 w-px shrink-0 bg-slate-200 sm:block" aria-hidden />
                <div className="flex w-full min-w-0 flex-wrap items-center gap-1.5 sm:w-auto">
                  <Input
                    type="date"
                    value={serviceAssignment.startDate || ''}
                    min={minDate || undefined}
                    max={maxDate || undefined}
                    onChange={(e) => handleDateChange('startDate', e.target.value)}
                    disabled={disabled || !editable}
                    className="h-8 w-[118px] rounded-lg border-slate-200 bg-slate-50 px-1.5 text-[11px] focus:bg-white sm:w-[128px]"
                  />
                  <Input
                    type="time"
                    value={serviceAssignment.startTime || ''}
                    onChange={(e) => handleDateChange('startTime', e.target.value)}
                    disabled={disabled || !editable}
                    className="h-8 w-[100px] rounded-lg border-slate-200 bg-slate-50 px-1.5 text-[11px] focus:bg-white sm:w-[108px]"
                  />
                  <span className="shrink-0 px-0.5 text-xs font-light text-slate-300">—</span>
                  <Input
                    type="date"
                    value={serviceAssignment.endDate || ''}
                    min={minDate || undefined}
                    max={maxDate || undefined}
                    onChange={(e) => handleDateChange('endDate', e.target.value)}
                    disabled={disabled || !editable}
                    className="h-8 w-[118px] rounded-lg border-slate-200 bg-slate-50 px-1.5 text-[11px] focus:bg-white sm:w-[128px]"
                  />
                  <Input
                    type="time"
                    value={serviceAssignment.endTime || ''}
                    onChange={(e) => handleDateChange('endTime', e.target.value)}
                    disabled={disabled || !editable}
                    className="h-8 w-[100px] rounded-lg border-slate-200 bg-slate-50 px-1.5 text-[11px] focus:bg-white sm:w-[108px]"
                  />
                </div>
              </>
            )}
          </div>

          {editable && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-slate-100 pt-2 sm:gap-4">
              <div className="flex items-center gap-1">
                <span className="whitespace-nowrap text-[11px] font-medium text-slate-500">Quantity:</span>
                <Input
                  type="number"
                  min={1}
                  value={assignment.quantity}
                  onChange={(e) => handleQtyChange(parseInt(e.target.value, 10) || 1)}
                  disabled={disabled}
                  className="h-8 w-12 rounded-lg border-slate-200 bg-slate-50 px-1 text-center text-[12px] focus:bg-white sm:w-14"
                />
              </div>
              <div className="flex items-center gap-1">
                <span className="whitespace-nowrap text-[11px] font-medium text-slate-500">Cost: $</span>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  value={cost ?? 0}
                  onChange={(e) => handleCostChange(parseFloat(e.target.value) || 0)}
                  disabled={disabled}
                  className="h-8 w-[4.5rem] rounded-lg border-slate-200 bg-slate-50 px-1.5 text-[12px] text-slate-700 focus:bg-white sm:w-20"
                />
              </div>
              <div className="flex items-center gap-1">
                <span className="whitespace-nowrap text-[11px] font-medium text-slate-500">Price: $</span>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  value={price ?? 0}
                  onChange={(e) => handlePriceChange(parseFloat(e.target.value) || 0)}
                  disabled={disabled}
                  className="h-8 w-[4.5rem] rounded-lg border-slate-200 bg-slate-50 px-1.5 text-[12px] font-semibold text-slate-900 focus:bg-white sm:w-20"
                />
              </div>
              <div className="flex h-8 shrink-0 items-center rounded-lg border border-slate-200/80 bg-slate-50 px-2 sm:px-2.5">
                <span className="whitespace-nowrap text-[10px] font-medium text-slate-500 sm:text-[11px]">
                  {rateLabel}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-end justify-center gap-0.5 border-l border-slate-200 bg-white px-3 py-2 text-right sm:px-4">
          <div className="text-[14px] font-extrabold leading-tight tracking-tight text-blue-600 sm:text-[15px]">
            <span className="text-[11px] font-semibold text-blue-600/85">Price: </span>
            {formatCurrency(totalPrice)}
          </div>
          <div className="text-[10px] font-medium text-slate-400">Cost: {formatCurrency(totalCost)}</div>
        </div>
      </div>

      <AccordionContent>
        <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 grid grid-cols-2 md:grid-cols-4 gap-6">
          {/* Detailed assignment info */}
          <div>
            <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1.5">Description</div>
            <div className="text-sm text-slate-600 line-clamp-3">{(isProduct ? productAssignment?.description : serviceAssignment?.notes) || (isProduct ? 'No product description provided' : 'No service description provided')}</div>
          </div>

          {!isProduct && serviceAssignment && (
            <>
              <div>
                <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1.5">Rating Requirement</div>
                <div className="text-sm text-slate-700 font-semibold">{STAFF_RATING_LABELS[serviceAssignment.ratingRequired as StaffRating] || serviceAssignment.ratingRequired}</div>
              </div>
              <div>
                <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1.5">Experience Requirement</div>
                <div className="text-sm text-slate-700 font-semibold">{EXPERIENCE_REQUIREMENT_LABELS[serviceAssignment.experienceRequired as ExperienceRequirement] || serviceAssignment.experienceRequired}</div>
              </div>
              <div>
                <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1.5">Approve Overtime</div>
                <div className="font-semibold text-xs py-1 px-2 rounded bg-slate-200/50 w-fit">{serviceAssignment.approveOvertime ? 'YES' : 'NO'}</div>
              </div>
            </>
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
