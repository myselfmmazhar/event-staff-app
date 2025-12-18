import { RateType } from '@prisma/client';

/**
 * Rate type labels for display
 */
export const RATE_TYPE_LABELS: Record<RateType, string> = {
  [RateType.PER_HOUR]: 'Per Hour',
  [RateType.PER_SHIFT]: 'Per Shift',
  [RateType.PER_DAY]: 'Per Day',
  [RateType.PER_EVENT]: 'Per Event',
};

type DecimalValue = number | string | { toNumber: () => number };

/**
 * Normalize a decimal value to a number
 * Handles Prisma Decimal objects, strings, and numbers
 */
export function normalizeDecimal(value: DecimalValue): number {
  if (typeof value === 'object' && 'toNumber' in value) {
    return value.toNumber();
  }
  return Number(value);
}

/**
 * Format a currency value
 * @param amount - The amount (can be number, string, or Prisma Decimal)
 * @param options - Formatting options
 * @returns Formatted currency string (e.g., "$25.00")
 */
export function formatCurrency(
  amount: DecimalValue,
  options?: {
    currency?: string;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
  }
): string {
  const {
    currency = 'USD',
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
  } = options || {};

  const numericAmount = normalizeDecimal(amount);

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(numericAmount);
}

/**
 * Format a rate with its type label
 * @param amount - The rate amount
 * @param rateType - The rate type (PER_HOUR, PER_SHIFT, etc.)
 * @returns Formatted rate string (e.g., "$25.00 per hour")
 *
 * @example
 * formatRate(25, RateType.PER_HOUR)
 * // Returns: "$25.00 per hour"
 *
 * formatRate(150, RateType.PER_SHIFT)
 * // Returns: "$150.00 per shift"
 */
export function formatRate(amount: DecimalValue, rateType: RateType): string {
  const formattedAmount = formatCurrency(amount);
  const rateLabel = RATE_TYPE_LABELS[rateType].toLowerCase();
  return `${formattedAmount} ${rateLabel}`;
}

/**
 * Format a rate without currency symbol (just the number with rate type)
 * @param amount - The rate amount
 * @param rateType - The rate type
 * @returns Formatted string (e.g., "$25.00 per hour")
 */
export function formatRateCompact(amount: DecimalValue, rateType: RateType): string {
  const numericAmount = normalizeDecimal(amount);
  const rateLabel = RATE_TYPE_LABELS[rateType].toLowerCase();
  return `$${numericAmount.toFixed(2)} ${rateLabel}`;
}

/**
 * Format a simple dollar amount without Intl (lighter weight)
 * @param amount - The amount
 * @returns Formatted string (e.g., "$25.00")
 */
export function formatDollar(amount: DecimalValue): string {
  const numericAmount = normalizeDecimal(amount);
  return `$${numericAmount.toFixed(2)}`;
}
