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
import { getAssignmentTotals, formatCurrency } from '@/lib/utils/assignment-calculations';
import type { Assignment, ProductAssignment, ServiceAssignment } from '@/lib/types/assignment.types';
import type { ExperienceRequirement, StaffRating } from '@prisma/client';

interface AssignmentItemProps {
  assignment: Assignment;
  onEdit: () => void;
  onDelete: () => void;
  /** Quick update for quantity, price, cost, or dates without opening full form */
  onQuickUpdate?: (updates: { quantity?: number; price?: number; cost?: number; startDate?: string | null; startTime?: string | null; endDate?: string | null; endTime?: string | null }) => void;
  disabled?: boolean;
}

export function AssignmentItem({
  assignment,
  onEdit,
  onDelete,
  onQuickUpdate,
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
    <AccordionItem value={assignment.id} className="border rounded-lg mb-2">
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Left: Type Icon + Title */}
        <div className={cn(
          'p-2 rounded-lg shrink-0',
          isProduct ? 'bg-blue-500/10 text-blue-500' : 'bg-green-500/10 text-green-500'
        )}>
          {isProduct ? (
            <CubeIcon className="h-4 w-4" />
          ) : (
            <WrenchScrewdriverIcon className="h-4 w-4" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-medium truncate text-sm">{title}</div>
          <div className="text-xs text-muted-foreground">
            {isProduct ? 'Product' : 'Service'}
          </div>
        </div>

        {/* Date & Time - for service assignments (editable when not disabled) */}
        {!isProduct && serviceAssignment && onQuickUpdate && !disabled && (
          <div className="hidden md:flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
            <Input
              type="date"
              value={serviceAssignment.startDate || ''}
              onChange={(e) => handleDateChange('startDate', e.target.value)}
              disabled={disabled}
              className="w-[130px] h-7 text-xs"
            />
            <Input
              type="time"
              value={serviceAssignment.startTime || ''}
              onChange={(e) => handleDateChange('startTime', e.target.value)}
              disabled={disabled}
              className="w-[100px] h-7 text-xs"
            />
            <span className="text-xs text-muted-foreground">→</span>
            <Input
              type="date"
              value={serviceAssignment.endDate || ''}
              onChange={(e) => handleDateChange('endDate', e.target.value)}
              disabled={disabled}
              className="w-[130px] h-7 text-xs"
            />
            <Input
              type="time"
              value={serviceAssignment.endTime || ''}
              onChange={(e) => handleDateChange('endTime', e.target.value)}
              disabled={disabled}
              className="w-[100px] h-7 text-xs"
            />
            {/* Hours display - only for PER_HOUR rate type */}
            {isHourly && hours !== null && (
              <span className="text-xs text-muted-foreground whitespace-nowrap ml-1">
                ({hours}h)
              </span>
            )}
          </div>
        )}

        {/* Hours display when disabled (form open) - show separately */}
        {!isProduct && serviceAssignment && disabled && isHourly && hours !== null && (
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            ({hours}h)
          </span>
        )}

        {/* Quantity - always editable */}
        {onQuickUpdate && !disabled ? (
          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
            <span className="text-xs text-muted-foreground whitespace-nowrap">Qty:</span>
            <Input
              type="number"
              min={1}
              value={assignment.quantity}
              onChange={(e) => handleQtyChange(parseInt(e.target.value) || 1)}
              disabled={disabled}
              className="w-16 h-7 text-sm text-center"
            />
          </div>
        ) : (
          <Badge variant="secondary" asSpan>
            Talent Needed: {assignment.quantity}
          </Badge>
        )}

        {/* Cost - always editable */}
        {onQuickUpdate && !disabled ? (
          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
            <span className="text-xs text-muted-foreground whitespace-nowrap">Cost:</span>
            <span className="text-xs text-muted-foreground">$</span>
            <Input
              type="number"
              step="0.01"
              min={0}
              value={cost ?? 0}
              onChange={(e) => handleCostChange(parseFloat(e.target.value) || 0)}
              disabled={disabled}
              className="w-20 h-7 text-sm text-muted-foreground"
            />
          </div>
        ) : (
          <span className="text-sm whitespace-nowrap text-muted-foreground">
            {formatCurrency(cost)}
          </span>
        )}

        {/* Price - always editable */}
        {onQuickUpdate && !disabled ? (
          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
            <span className="text-xs text-muted-foreground whitespace-nowrap">Price:</span>
            <span className="text-sm font-medium">$</span>
            <Input
              type="number"
              step="0.01"
              min={0}
              value={price ?? 0}
              onChange={(e) => handlePriceChange(parseFloat(e.target.value) || 0)}
              disabled={disabled}
              className="w-20 h-7 text-sm font-medium"
            />
            {/* Rate Type display - only for services */}
            {!isProduct && serviceAssignment?.rateType && (
              <span className="text-xs text-muted-foreground">
                {RATE_TYPE_LABELS[serviceAssignment.rateType]}
              </span>
            )}
          </div>
        ) : (
          <span className="text-sm font-medium whitespace-nowrap">
            {formatCurrency(price)}
            {!isProduct && serviceAssignment?.rateType && (
              <span className="text-xs text-muted-foreground ml-1">
                {RATE_TYPE_LABELS[serviceAssignment.rateType]}
              </span>
            )}
          </span>
        )}

        {/* Total - calculated display */}
        {totalPrice !== null && (
          <div className="flex flex-col items-end">
            <span className="text-sm font-semibold text-primary whitespace-nowrap">
              {formatCurrency(totalPrice)}
            </span>
            {totalCost !== null && (
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                Cost: {formatCurrency(totalCost)}
              </span>
            )}
          </div>
        )}

        {/* Edit */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          disabled={disabled}
          className="h-8 w-8 p-0"
        >
          <EditIcon className="h-4 w-4" />
        </Button>

        {/* Delete */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          disabled={disabled}
          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
        >
          <TrashIcon className="h-4 w-4" />
        </Button>

        {/* Accordion Arrow - only this expands/collapses */}
        <AccordionArrow />
      </div>

      <AccordionContent className="px-4 pb-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          {/* Commission */}
          <div>
            <div className="text-muted-foreground text-xs mb-1">Commission</div>
            <div className="font-medium">{assignment.commission ? 'Yes' : 'No'}</div>
          </div>

          {/* Product-specific fields */}
          {isProduct && productAssignment && (
            <>
              {productAssignment.description && (
                <div className="col-span-2">
                  <div className="text-muted-foreground text-xs mb-1">Description</div>
                  <div className="font-medium">{productAssignment.description}</div>
                </div>
              )}
              {productAssignment.instructions && (
                <div className="col-span-2">
                  <div className="text-muted-foreground text-xs mb-1">Instructions</div>
                  <div className="font-medium">{productAssignment.instructions}</div>
                </div>
              )}
            </>
          )}

          {/* Service-specific fields */}
          {!isProduct && serviceAssignment && (
            <>
              {/* Experience & Rating */}
              <div>
                <div className="text-muted-foreground text-xs mb-1">Experience</div>
                <div className="font-medium">
                  {serviceAssignment.experienceRequired === 'ANY'
                    ? 'Any'
                    : EXPERIENCE_REQUIREMENT_LABELS[serviceAssignment.experienceRequired as ExperienceRequirement] || serviceAssignment.experienceRequired}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs mb-1">Rating</div>
                <div className="font-medium">
                  {serviceAssignment.ratingRequired === 'ANY'
                    ? 'Any'
                    : STAFF_RATING_LABELS[serviceAssignment.ratingRequired as StaffRating] || serviceAssignment.ratingRequired}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs mb-1">Approve Overtime</div>
                <div className="font-medium">{serviceAssignment.approveOvertime ? 'Yes' : 'No'}</div>
              </div>
            </>
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
