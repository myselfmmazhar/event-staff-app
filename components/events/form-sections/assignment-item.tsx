'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  disabled?: boolean;
}

export function AssignmentItem({
  assignment,
  onEdit,
  onDelete,
  disabled = false,
}: AssignmentItemProps) {
  const isProduct = assignment.type === 'PRODUCT';
  const productAssignment = isProduct ? (assignment as ProductAssignment) : null;
  const serviceAssignment = !isProduct ? (assignment as ServiceAssignment) : null;

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

            {/* Quantity */}
            <Badge variant="secondary" className="ml-2">
              Qty: {assignment.quantity}
            </Badge>

            {/* Price */}
            <span className="text-sm font-medium ml-auto mr-4">
              {formatPrice(lineTotal)}
            </span>
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
