import type { Assignment, ServiceAssignment } from '@/lib/types/assignment.types';

const HOURS_PER_DAY = 8;

export interface AssignmentDateTimeParams {
  startDate: string | null | undefined;
  startTime: string | null | undefined;
  endDate: string | null | undefined;
  endTime: string | null | undefined;
  rateType: string | null | undefined;
}

/**
 * Calculate hours from start/end date+time for PER_HOUR rate type.
 * If times are not set, assumes 8 hours per day.
 */
export function calculateHours(params: AssignmentDateTimeParams): number | null {
  const { startDate, startTime, endDate, endTime, rateType } = params;

  if (rateType !== 'PER_HOUR') return null;

  // For hourly, we MUST have both start and end date/time to calculate
  if (!startDate || !endDate) return null;

  const effectiveEndDate = endDate;

  // If we have both times, calculate exact hours
  if (startTime && endTime) {
    const start = new Date(`${startDate}T${startTime}`);
    const end = new Date(`${effectiveEndDate}T${endTime}`);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;

    const diffMs = end.getTime() - start.getTime();
    // Return 0 for invalid time ranges (end before start)
    if (diffMs < 0) return 0;

    // Convert to hours, round to 2 decimal places
    return Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
  }

  // If one time is set but not both, we can't calculate exact hours
  if (startTime || endTime) return null;

  // No times set - calculate days and assume 8 hours per day
  const start = new Date(startDate);
  const end = new Date(effectiveEndDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;

  // Calculate number of days (inclusive)
  const diffDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  if (diffDays <= 0) return null;

  return diffDays * HOURS_PER_DAY;
}

/**
 * Calculate total based on rate type.
 * Per Hour: unitRate × hours × qty
 * Per Assignment: unitRate × qty
 */
export function calculateTotal(
  unitRate: number | null | undefined,
  quantity: number,
  hours: number | null,
  isHourly: boolean
): number | null {
  if (unitRate === null || unitRate === undefined) return null;
  const rate = Number(unitRate);
  if (isHourly) {
    if (hours === null) return null;
    return rate * hours * quantity;
  }
  return rate * quantity;
}

/**
 * Get assignment totals (cost and price) for a single assignment.
 */
export function getAssignmentTotals(assignment: Assignment): {
  hours: number | null;
  isHourly: boolean;
  totalCost: number | null;
  totalPrice: number | null;
} {
  const isProduct = assignment.type === 'PRODUCT';

  if (isProduct) {
    const cost = assignment.product?.cost;
    const price = assignment.product?.price;
    return {
      hours: null,
      isHourly: false,
      totalCost: calculateTotal(cost, assignment.quantity, null, false),
      totalPrice: calculateTotal(price, assignment.quantity, null, false),
    };
  }

  const serviceAssignment = assignment as ServiceAssignment;
  const cost = serviceAssignment.payRate ?? serviceAssignment.service?.cost;
  const price = serviceAssignment.billRate ?? serviceAssignment.service?.price;
  const isHourly = serviceAssignment.rateType === 'PER_HOUR';

  const hours = calculateHours({
    startDate: serviceAssignment.startDate,
    startTime: serviceAssignment.startTime,
    endDate: serviceAssignment.endDate,
    endTime: serviceAssignment.endTime,
    rateType: serviceAssignment.rateType,
  });

  let totalCost = calculateTotal(cost, assignment.quantity, hours, isHourly);
  let totalPrice = calculateTotal(price, assignment.quantity, hours, isHourly);

  // If hourly but we can't derive hours yet, fall back to per-unit totals so
  // cost/price still show (matches legacy UX where shift/day totals stay visible).
  if (isHourly && hours === null) {
    if (totalCost === null) {
      totalCost = calculateTotal(cost, assignment.quantity, null, false);
    }
    if (totalPrice === null) {
      totalPrice = calculateTotal(price, assignment.quantity, null, false);
    }
  }

  return {
    hours,
    isHourly,
    totalCost,
    totalPrice,
  };
}

/**
 * Format a number as currency.
 */
export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'TBD';
  return `$${Number(value).toFixed(2)}`;
}
