'use client';

import { useState } from 'react';
import { Controller } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AMOUNT_TYPE_OPTIONS } from '@/lib/constants/enums';
import { cn } from '@/lib/utils';
import { ChevronDownIcon } from '@/components/ui/icons';
import type { FormSectionProps } from './types';

export function BillingSection({
  register,
  control,
  watch,
  setValue,
  disabled = false,
  className,
}: FormSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isEstimate = watch('estimate');
  const hasCommission = watch('commission');
  const approveForOvertime = watch('approveForOvertime');

  return (
    <div className={cn('bg-accent/5 border border-border/30 p-5 rounded-lg', className)}>
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h3 className="text-lg font-semibold">Task settings</h3>
        <ChevronDownIcon className={cn('h-5 w-5 text-muted-foreground transition-transform', isExpanded && 'rotate-180')} />
      </div>
      {isExpanded && (
      <div className="space-y-6 mt-4 pt-4 border-t border-border">
        {/* Row 1: Create an estimate? + Task Rate Type */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label className="text-sm font-medium mb-3 block">Create an estimate?</Label>
            <div className="flex items-center gap-4 h-10">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="estimate"
                  checked={isEstimate === true}
                  onChange={() => setValue('estimate', true)}
                  disabled={disabled}
                  className="accent-primary"
                />
                <span className="text-sm">Yes</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="estimate"
                  checked={isEstimate === false || isEstimate === undefined}
                  onChange={() => setValue('estimate', false)}
                  disabled={disabled}
                  className="accent-primary"
                />
                <span className="text-sm">No</span>
              </label>
            </div>
          </div>
          <div>
            <Label htmlFor="taskRateType">Task Rate Type</Label>
            <Controller
              name="taskRateType"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value ?? ''}
                  onValueChange={field.onChange}
                  disabled={disabled || !isEstimate}
                >
                  <SelectTrigger id="taskRateType">
                    <SelectValue placeholder="Multiplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {AMOUNT_TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </div>

        {/* Row 2: Commission? + Amount + Amount Type */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <Label className="text-sm font-medium mb-3 block">Commission?</Label>
            <div className="flex items-center gap-4 h-10">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="commission"
                  checked={hasCommission === true}
                  onChange={() => setValue('commission', true)}
                  disabled={disabled}
                  className="accent-primary"
                />
                <span className="text-sm">Yes</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="commission"
                  checked={hasCommission === false || hasCommission === undefined}
                  onChange={() => setValue('commission', false)}
                  disabled={disabled}
                  className="accent-primary"
                />
                <span className="text-sm">No</span>
              </label>
            </div>
          </div>
          <div>
            <Label htmlFor="commissionAmount">If Yes, please enter amount</Label>
            <Input
              id="commissionAmount"
              type="number"
              step="0.01"
              min="0"
              {...register('commissionAmount', { valueAsNumber: true })}
              disabled={disabled || !hasCommission}
              placeholder=""
            />
          </div>
          <div>
            <Label htmlFor="commissionAmountType">Amount type</Label>
            <Controller
              name="commissionAmountType"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value ?? ''}
                  onValueChange={field.onChange}
                  disabled={disabled || !hasCommission}
                >
                  <SelectTrigger id="commissionAmountType">
                    <SelectValue placeholder="Multiplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {AMOUNT_TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </div>

        {/* Row 3: Approve for Overtime? + Rate + OT Type */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <Label className="text-sm font-medium mb-3 block">Approve for Overtime?</Label>
            <div className="flex items-center gap-4 h-10">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="approveForOvertime"
                  checked={approveForOvertime === true}
                  onChange={() => setValue('approveForOvertime', true)}
                  disabled={disabled}
                  className="accent-primary"
                />
                <span className="text-sm">Yes</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="approveForOvertime"
                  checked={approveForOvertime === false || approveForOvertime === undefined}
                  onChange={() => setValue('approveForOvertime', false)}
                  disabled={disabled}
                  className="accent-primary"
                />
                <span className="text-sm">No</span>
              </label>
            </div>
          </div>
          <div>
            <Label htmlFor="overtimeRate">If Yes, please enter rate</Label>
            <Input
              id="overtimeRate"
              type="number"
              step="0.01"
              min="0"
              {...register('overtimeRate', { valueAsNumber: true })}
              disabled={disabled || !approveForOvertime}
              placeholder=""
            />
          </div>
          <div>
            <Label htmlFor="overtimeRateType">OT Type</Label>
            <Controller
              name="overtimeRateType"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value ?? ''}
                  onValueChange={field.onChange}
                  disabled={disabled || !approveForOvertime}
                >
                  <SelectTrigger id="overtimeRateType">
                    <SelectValue placeholder="Multiplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {AMOUNT_TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
