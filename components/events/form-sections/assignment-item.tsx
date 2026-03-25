'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { AccordionItem, AccordionArrow, AccordionContent } from '@/components/ui/accordion';
import { EditIcon, TrashIcon, CubeIcon, WrenchScrewdriverIcon } from '@/components/ui/icons';
import { cn } from '@/lib/utils';
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
  const { hours, isHourly, totalCost, totalPrice } = getAssignmentTotals(assignment);

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


  return (
    <AccordionItem value={assignment.id} className="border rounded-xl bg-white mb-2 overflow-hidden shadow-sm hover:border-primary/20 transition-all group">
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Actions Dropdown and Expand Arrow at the Left */}
        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          <ActionDropdown
            actions={[
              { 
                label: 'Edit', 
                icon: <EditIcon className="h-3.5 w-3.5" />, 
                onClick: onEdit,
                disabled: disabled
              },
              { 
                label: 'Delete', 
                icon: <TrashIcon className="h-3.5 w-3.5" />, 
                onClick: onDelete, 
                variant: 'destructive',
                disabled: disabled
              },
            ]}
          />
          <AccordionArrow className="h-6 w-6" />
        </div>

        {/* Type Icon & Name/Type Info */}
        <div className="flex items-center gap-3 w-[180px] shrink-0">
          <div className={cn(
            'p-2.5 rounded-xl shrink-0 flex items-center justify-center transition-colors',
            isProduct ? 'bg-blue-50 text-blue-500 group-hover:bg-blue-100' : 'bg-green-50 text-green-500 group-hover:bg-green-100'
          )}>
            {isProduct ? (
              <CubeIcon className="h-5 w-5" />
            ) : (
              <WrenchScrewdriverIcon className="h-5 w-5" />
            )}
          </div>
          <div className="min-w-0">
            <div className="font-bold text-[13px] leading-tight truncate text-slate-900">{title}</div>
            <div className="text-[11px] text-slate-400 leading-tight font-medium mt-0.5">
              {isProduct ? 'Product' : 'Service'}
            </div>
          </div>
        </div>

        {/* Date & Time Group - for service assignments */}
        {!isProduct && serviceAssignment && onQuickUpdate && !disabled && (
          <div className="shrink-0 flex items-center gap-2 px-3 border-l min-w-[430px]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-1.5">
              <Input
                type="date"
                value={serviceAssignment.startDate || ''}
                min={minDate || undefined}
                max={maxDate || undefined}
                onChange={(e) => handleDateChange('startDate', e.target.value)}
                disabled={disabled}
                className="w-[125px] h-9 text-[11px] px-2 rounded-lg bg-slate-50 border-slate-200 focus:bg-white"
              />
              <Input
                type="time"
                value={serviceAssignment.startTime || ''}
                onChange={(e) => handleDateChange('startTime', e.target.value)}
                disabled={disabled}
                className="w-[95px] h-9 text-[11px] px-2 rounded-lg bg-slate-50 border-slate-200 focus:bg-white"
              />
            </div>
            <span className="text-slate-300 text-xs font-light">→</span>
            <div className="flex items-center gap-1.5">
              <Input
                type="date"
                value={serviceAssignment.endDate || ''}
                min={minDate || undefined}
                max={maxDate || undefined}
                onChange={(e) => handleDateChange('endDate', e.target.value)}
                disabled={disabled}
                className="w-[125px] h-9 text-[11px] px-2 rounded-lg bg-slate-50 border-slate-200 focus:bg-white"
              />
              <Input
                type="time"
                value={serviceAssignment.endTime || ''}
                onChange={(e) => handleDateChange('endTime', e.target.value)}
                disabled={disabled}
                className="w-[95px] h-9 text-[11px] px-2 rounded-lg bg-slate-50 border-slate-200 focus:bg-white"
              />
            </div>
          </div>
        )}

        {/* Quick Edit Controls (Always visible when not disabled) */}
        {onQuickUpdate && !disabled && (
          <div className="flex-1 flex items-center justify-end gap-5" onClick={(e) => e.stopPropagation()}>
            {/* Qty */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-slate-500 whitespace-nowrap">Qty:</span>
              <Input
                type="number"
                min={1}
                value={assignment.quantity}
                onChange={(e) => handleQtyChange(parseInt(e.target.value) || 1)}
                disabled={disabled}
                className="w-14 h-9 text-[12px] text-center px-1 rounded-lg bg-slate-50 border-slate-200 focus:bg-white"
              />
            </div>

            {/* Cost */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-slate-500 whitespace-nowrap">Cost: <span className="text-slate-400 font-normal">$</span></span>
              <Input
                type="number"
                step="0.01"
                min={0}
                value={cost ?? 0}
                onChange={(e) => handleCostChange(parseFloat(e.target.value) || 0)}
                disabled={disabled}
                className="w-20 h-9 text-[12px] px-2 rounded-lg bg-slate-50 border-slate-200 focus:bg-white text-slate-600"
              />
            </div>

            {/* Price */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-slate-500 whitespace-nowrap">Price: <span className="text-slate-400 font-normal">$</span></span>
              <Input
                type="number"
                step="0.01"
                min={0}
                value={price ?? 0}
                onChange={(e) => handlePriceChange(parseFloat(e.target.value) || 0)}
                disabled={disabled}
                className="w-20 h-9 text-[12px] px-2 font-bold rounded-lg border-slate-200 focus:ring-1 focus:ring-primary/20"
              />
            </div>

            {/* Rate Scale Label */}
            <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap w-[90px]">
              {isProduct ? 'Per Item' : (serviceAssignment?.rateType ? RATE_TYPE_LABELS[serviceAssignment.rateType] : 'Per Assignment')}
            </span>
          </div>
        )}

        {/* Total Calculations */}
        <div className="w-[120px] text-right shrink-0 pr-1 pl-4 border-l">
          <div className="text-[14px] font-extrabold text-blue-600 tracking-tight">
            ${(totalPrice ?? 0).toFixed(2)}
          </div>
          <div className="text-[10px] text-slate-400 font-medium mt-0.5">
            Cost: ${(totalCost ?? 0).toFixed(2)}
          </div>
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
                <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1.5">Exp Requirement</div>
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
