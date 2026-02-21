'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { AccordionItem, AccordionArrow, AccordionContent } from '@/components/ui/accordion';
import { EditIcon, TrashIcon, CubeIcon, WrenchScrewdriverIcon } from '@/components/ui/icons';
import { cn } from '@/lib/utils';
import {
  EXPERIENCE_REQUIREMENT_LABELS,
  STAFF_RATING_LABELS,
} from '@/lib/constants/enums';
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

  // Quick edit state
  const [editingQty, setEditingQty] = useState(false);
  const [tempQty, setTempQty] = useState(assignment.quantity);
  const qtyInputRef = useRef<HTMLInputElement>(null);
  const [editingPrice, setEditingPrice] = useState(false);
  const [tempPrice, setTempPrice] = useState(0);
  const priceInputRef = useRef<HTMLInputElement>(null);
  const [editingCost, setEditingCost] = useState(false);
  const [tempCost, setTempCost] = useState(0);
  const costInputRef = useRef<HTMLInputElement>(null);

  // Date quick edit state
  const [editingDate, setEditingDate] = useState(false);
  const [tempStartDate, setTempStartDate] = useState(serviceAssignment?.startDate || '');
  const [tempStartTime, setTempStartTime] = useState(serviceAssignment?.startTime || '');
  const [tempEndDate, setTempEndDate] = useState(serviceAssignment?.endDate || '');
  const [tempEndTime, setTempEndTime] = useState(serviceAssignment?.endTime || '');
  const dateInputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    if (editingCost && costInputRef.current) {
      costInputRef.current.focus();
      costInputRef.current.select();
    }
  }, [editingCost]);

  useEffect(() => {
    if (editingDate && dateInputRef.current) {
      dateInputRef.current.focus();
    }
  }, [editingDate]);


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

  // Calculate line total
  const lineTotal = price !== null && price !== undefined
    ? Number(price) * assignment.quantity
    : null;

  // Format currency
  const formatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined) return '-';
    return `$${Number(value).toFixed(2)}`;
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

  // Handle cost quick edit
  const handleCostClick = (e: React.MouseEvent) => {
    if (disabled || !onQuickUpdate) return;
    e.stopPropagation();
    e.preventDefault();
    setTempCost(cost !== null && cost !== undefined ? Number(cost) : 0);
    setEditingCost(true);
  };

  const handleCostSave = () => {
    const currentCost = cost !== null && cost !== undefined ? Number(cost) : 0;
    if (tempCost !== currentCost && tempCost >= 0) {
      onQuickUpdate?.({ cost: tempCost });
    }
    setEditingCost(false);
  };

  const handleCostKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCostSave();
    } else if (e.key === 'Escape') {
      setEditingCost(false);
    }
  };

  // Handle price quick edit
  const handlePriceClick = (e: React.MouseEvent) => {
    if (disabled || !onQuickUpdate) return;
    e.stopPropagation();
    e.preventDefault();
    setTempPrice(price !== null && price !== undefined ? Number(price) : 0);
    setEditingPrice(true);
  };

  const handlePriceSave = () => {
    const currentPrice = price !== null && price !== undefined ? Number(price) : 0;
    if (tempPrice !== currentPrice && tempPrice >= 0) {
      onQuickUpdate?.({ price: tempPrice });
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

  // Handle date quick edit
  const handleDateClick = (e: React.MouseEvent) => {
    if (disabled || !onQuickUpdate || isProduct) return;
    e.stopPropagation();
    e.preventDefault();
    setTempStartDate(serviceAssignment?.startDate || '');
    setTempStartTime(serviceAssignment?.startTime || '');
    setTempEndDate(serviceAssignment?.endDate || '');
    setTempEndTime(serviceAssignment?.endTime || '');
    setEditingDate(true);
  };

  const handleDateSave = () => {
    onQuickUpdate?.({
      startDate: tempStartDate || null,
      startTime: tempStartTime || null,
      endDate: tempEndDate || null,
      endTime: tempEndTime || null,
    });
    setEditingDate(false);
  };

  const handleDateKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleDateSave();
    } else if (e.key === 'Escape') {
      setEditingDate(false);
    }
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

        {/* Date & Time - for service assignments (click to edit) */}
        {!isProduct && serviceAssignment && (
          editingDate ? (
            <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
              <Input
                ref={dateInputRef}
                type="date"
                value={tempStartDate}
                onChange={(e) => { setTempStartDate(e.target.value); setTempEndDate(e.target.value); }}
                onKeyDown={handleDateKeyDown}
                className="w-[130px] h-7 text-xs"
              />
              <Input
                type="time"
                value={tempStartTime}
                onChange={(e) => { setTempStartTime(e.target.value); setTempEndTime(e.target.value); }}
                onKeyDown={handleDateKeyDown}
                className="w-[100px] h-7 text-xs"
              />
              <span className="text-xs text-muted-foreground">→</span>
              <Input
                type="date"
                value={tempEndDate}
                onChange={(e) => setTempEndDate(e.target.value)}
                onKeyDown={handleDateKeyDown}
                className="w-[130px] h-7 text-xs"
              />
              <Input
                type="time"
                value={tempEndTime}
                onChange={(e) => setTempEndTime(e.target.value)}
                onKeyDown={handleDateKeyDown}
                className="w-[100px] h-7 text-xs"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={(e) => { e.stopPropagation(); handleDateSave(); }}
              >
                ✓
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={(e) => { e.stopPropagation(); setEditingDate(false); }}
              >
                ✕
              </Button>
            </div>
          ) : (serviceAssignment.startDate || serviceAssignment.endDate) ? (
            <div
              className={cn(
                'text-xs text-muted-foreground hidden md:block whitespace-nowrap',
                onQuickUpdate && !disabled && 'cursor-pointer hover:text-primary'
              )}
              onClick={handleDateClick}
              title="Click to edit dates"
            >
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
          ) : onQuickUpdate && !disabled ? (
            <span
              className="text-xs text-muted-foreground/50 italic hidden md:block cursor-pointer hover:text-primary"
              onClick={handleDateClick}
              title="Click to add dates"
            >
              + Add dates
            </span>
          ) : null
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
            className="w-20 h-7 text-sm"
          />
        ) : (
          <span onClick={handleQtyClick}>
            <Badge
              variant="secondary"
              className={cn(
                onQuickUpdate && !disabled && "cursor-pointer hover:bg-primary hover:text-primary-foreground"
              )}
              asSpan
            >
              Talent Qty: {assignment.quantity}
            </Badge>
          </span>
        )}

        {/* Cost - Click to edit */}
        {editingCost ? (
          <Input
            ref={costInputRef}
            type="number"
            step="0.01"
            min={0}
            value={tempCost}
            onChange={(e) => setTempCost(parseFloat(e.target.value) || 0)}
            onBlur={handleCostSave}
            onKeyDown={handleCostKeyDown}
            onClick={(e) => e.stopPropagation()}
            className="w-24 h-7 text-sm"
          />
        ) : (
          <span
            onClick={handleCostClick}
            className={cn(
              'text-sm whitespace-nowrap text-muted-foreground',
              onQuickUpdate && !disabled && 'cursor-pointer hover:text-primary'
            )}
          >
            {formatCurrency(cost)}
          </span>
        )}

        {/* Price - Click to edit */}
        {editingPrice ? (
          <Input
            ref={priceInputRef}
            type="number"
            step="0.01"
            min={0}
            value={tempPrice}
            onChange={(e) => setTempPrice(parseFloat(e.target.value) || 0)}
            onBlur={handlePriceSave}
            onKeyDown={handlePriceKeyDown}
            onClick={(e) => e.stopPropagation()}
            className="w-24 h-7 text-sm"
          />
        ) : (
          <span
            onClick={handlePriceClick}
            className={cn(
              'text-sm font-medium whitespace-nowrap',
              onQuickUpdate && !disabled && 'cursor-pointer hover:text-primary'
            )}
          >
            {formatCurrency(price)}
          </span>
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
