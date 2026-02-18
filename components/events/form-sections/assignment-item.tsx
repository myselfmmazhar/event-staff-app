'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { EditIcon, TrashIcon, CubeIcon, WrenchScrewdriverIcon } from '@/components/ui/icons';
import { cn } from '@/lib/utils';
import {
  COST_UNIT_TYPE_LABELS,
  PRICE_UNIT_TYPE_LABELS,
  EXPERIENCE_REQUIREMENT_LABELS,
  STAFF_RATING_LABELS,
} from '@/lib/constants/enums';
import type { Assignment, ProductAssignment, ServiceAssignment } from '@/lib/types/assignment.types';
import type { CostUnitType, PriceUnitType, ExperienceRequirement, StaffRating } from '@prisma/client';

interface AssignmentItemProps {
  assignment: Assignment;
  onEdit: () => void;
  onDelete: () => void;
  /** Quick update for quantity and price without opening full form */
  onQuickUpdate?: (updates: { quantity?: number; customPrice?: number | null }) => void;
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

  // Quick edit state
  const [editingQty, setEditingQty] = useState(false);
  const [editingPrice, setEditingPrice] = useState(false);
  const [tempQty, setTempQty] = useState(assignment.quantity);
  const [tempPrice, setTempPrice] = useState<string>('');
  const qtyInputRef = useRef<HTMLInputElement>(null);
  const priceInputRef = useRef<HTMLInputElement>(null);

  // Focus input when editing starts
  useEffect(() => {
    if (editingQty && qtyInputRef.current) {
      qtyInputRef.current.focus();
      qtyInputRef.current.select();
    }
  }, [editingQty]);

  useEffect(() => {
    if (editingPrice && priceInputRef.current) {
      priceInputRef.current.focus();
      priceInputRef.current.select();
    }
  }, [editingPrice]);

  // Get display title
  const title = isProduct
    ? productAssignment?.product?.title || 'Product'
    : serviceAssignment?.service?.title || 'Service';

  // Get display price
  const price = assignment.customPrice ?? (
    isProduct ? productAssignment?.product?.price : serviceAssignment?.service?.price
  );

  // Calculate line total
  const lineTotal = price !== null && price !== undefined
    ? Number(price) * assignment.quantity
    : null;

  // Format price
  const formatPrice = (value: number | null | undefined) => {
    if (value === null || value === undefined) return '-';
    return `$${Number(value).toFixed(2)}`;
  };

  // Get unit type label
  const getUnitTypeLabel = (unitType: string | null) => {
    if (!unitType) return '-';
    if (isProduct) {
      return PRICE_UNIT_TYPE_LABELS[unitType as PriceUnitType] || unitType;
    }
    return COST_UNIT_TYPE_LABELS[unitType as CostUnitType] || unitType;
  };

  // Handle quantity quick edit
  const handleQtyClick = (e: React.MouseEvent) => {
    if (disabled || !onQuickUpdate) return;
    e.stopPropagation();
    e.preventDefault();
    setTempQty(assignment.quantity);
    setEditingQty(true);
  };

  const handleQtySave = () => {
    if (tempQty !== assignment.quantity && tempQty >= 1) {
      onQuickUpdate?.({ quantity: tempQty });
    }
    setEditingQty(false);
  };

  const handleQtyKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleQtySave();
    } else if (e.key === 'Escape') {
      setEditingQty(false);
    }
  };

  // Handle price quick edit
  const handlePriceClick = (e: React.MouseEvent) => {
    if (disabled || !onQuickUpdate) return;
    e.stopPropagation();
    e.preventDefault();
    setTempPrice(price !== null && price !== undefined ? Number(price).toFixed(2) : '');
    setEditingPrice(true);
  };

  const handlePriceSave = () => {
    const newPrice = tempPrice === '' ? null : parseFloat(tempPrice);
    if (newPrice !== assignment.customPrice) {
      onQuickUpdate?.({ customPrice: newPrice });
    }
    setEditingPrice(false);
  };

  const handlePriceKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handlePriceSave();
    } else if (e.key === 'Escape') {
      setEditingPrice(false);
    }
  };

  return (
    <AccordionItem value={assignment.id} className="border rounded-lg mb-2">
      <div className="flex items-center justify-between pr-2">
        <AccordionTrigger className="flex-1 px-4 py-3 hover:no-underline">
          <div className="flex items-center gap-3 text-left">
            {/* Type Icon */}
            <div className={cn(
              'p-2 rounded-lg',
              isProduct ? 'bg-blue-500/10 text-blue-500' : 'bg-green-500/10 text-green-500'
            )}>
              {isProduct ? (
                <CubeIcon className="h-4 w-4" />
              ) : (
                <WrenchScrewdriverIcon className="h-4 w-4" />
              )}
            </div>

            {/* Title & Type */}
            <div>
              <div className="font-medium">{title}</div>
              <div className="text-xs text-muted-foreground">
                {isProduct ? 'Product' : 'Service'}
              </div>
            </div>

            {/* Date & Time - for service assignments */}
            {!isProduct && serviceAssignment && (serviceAssignment.startDate || serviceAssignment.endDate) && (
              <div className="text-sm text-muted-foreground ml-4">
                {serviceAssignment.startDate && (
                  <span>
                    {serviceAssignment.startDateUBD ? 'UBD' : serviceAssignment.startDate}
                    {serviceAssignment.startTime && !serviceAssignment.startTimeTBD && ` ${serviceAssignment.startTime}`}
                    {serviceAssignment.startTimeTBD && ' (TBD)'}
                  </span>
                )}
                {serviceAssignment.startDate && serviceAssignment.endDate && ' → '}
                {serviceAssignment.endDate && (
                  <span>
                    {serviceAssignment.endDateUBD ? 'UBD' : serviceAssignment.endDate}
                    {serviceAssignment.endTime && !serviceAssignment.endTimeTBD && ` ${serviceAssignment.endTime}`}
                    {serviceAssignment.endTimeTBD && ' (TBD)'}
                  </span>
                )}
              </div>
            )}

            {/* Quantity - Click to edit */}
            {editingQty ? (
              <Input
                ref={qtyInputRef}
                type="number"
                min={1}
                value={tempQty}
                onChange={(e) => setTempQty(parseInt(e.target.value) || 1)}
                onBlur={handleQtySave}
                onKeyDown={handleQtyKeyDown}
                onClick={(e) => e.stopPropagation()}
                className="w-20 h-7 text-sm ml-4"
              />
            ) : (
              <span onClick={handleQtyClick}>
                <Badge
                  variant="secondary"
                  className={cn(
                    "ml-4",
                    onQuickUpdate && !disabled && "cursor-pointer hover:bg-primary hover:text-primary-foreground"
                  )}
                  asSpan
                >
                  Qty: {assignment.quantity}
                </Badge>
              </span>
            )}

            {/* Price - Click to edit */}
            {editingPrice ? (
              <div className="ml-auto mr-4 flex items-center">
                <span className="text-sm mr-1">$</span>
                <Input
                  ref={priceInputRef}
                  type="number"
                  step="0.01"
                  min={0}
                  value={tempPrice}
                  onChange={(e) => setTempPrice(e.target.value)}
                  onBlur={handlePriceSave}
                  onKeyDown={handlePriceKeyDown}
                  onClick={(e) => e.stopPropagation()}
                  className="w-24 h-7 text-sm"
                />
              </div>
            ) : (
              <span
                className={cn(
                  "text-sm font-medium ml-auto mr-4",
                  onQuickUpdate && !disabled && "cursor-pointer hover:text-primary"
                )}
                onClick={handlePriceClick}
              >
                {formatPrice(price)}
              </span>
            )}
          </div>
        </AccordionTrigger>

        {/* Actions */}
        <div className="flex items-center gap-1">
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
        </div>
      </div>

      <AccordionContent className="px-4 pb-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          {/* Cost */}
          <div>
            <div className="text-muted-foreground text-xs mb-1">Cost</div>
            <div className="font-medium">{formatPrice(assignment.customCost)}</div>
          </div>

          {/* Price */}
          <div>
            <div className="text-muted-foreground text-xs mb-1">Price</div>
            <div className="font-medium">{formatPrice(assignment.customPrice)}</div>
          </div>

          {/* Unit Type */}
          <div>
            <div className="text-muted-foreground text-xs mb-1">Unit Type</div>
            <div className="font-medium">{getUnitTypeLabel(assignment.costUnitType)}</div>
          </div>

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
              {/* Date & Time */}
              {(serviceAssignment.startDate || serviceAssignment.endDate) && (
                <>
                  <div>
                    <div className="text-muted-foreground text-xs mb-1">Start Date</div>
                    <div className="font-medium">{serviceAssignment.startDate || '-'}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-xs mb-1">Start Time</div>
                    <div className="font-medium">{serviceAssignment.startTime || '-'}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-xs mb-1">End Date</div>
                    <div className="font-medium">{serviceAssignment.endDate || '-'}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-xs mb-1">End Time</div>
                    <div className="font-medium">{serviceAssignment.endTime || '-'}</div>
                  </div>
                </>
              )}

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
