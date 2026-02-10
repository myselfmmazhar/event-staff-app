'use client';

import { Controller } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AMOUNT_TYPE_OPTIONS } from '@/lib/constants/enums';
import { cn } from '@/lib/utils';
import type { FormSectionProps } from './types';

export function BillingSection({
  register,
  control,
  watch,
  disabled = false,
  className,
}: FormSectionProps) {
  return (
    <div className={cn('bg-accent/5 border border-border/30 p-5 rounded-lg', className)}>
      <h3 className="text-lg font-semibold border-b border-border pb-2 mb-4">Billing & Rate Settings</h3>
      <div className="space-y-4">
        {/* Estimate Flag */}
        <div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              {...register('estimate')}
              disabled={disabled}
              className="rounded border-input"
            />
            <span className="text-sm font-medium">This is an estimate</span>
          </label>
        </div>

        {/* Task Rate Type */}
        <div>
          <Label htmlFor="taskRateType">Task Rate Type</Label>
          <Controller
            name="taskRateType"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value ?? ''}
                onValueChange={field.onChange}
                disabled={disabled}
              >
                <SelectTrigger id="taskRateType">
                  <SelectValue placeholder="Select type..." />
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

        {/* Commission Section */}
        <div className="border-t border-border/30 pt-4">
          <h4 className="text-sm font-medium mb-3">Commission</h4>
          <div className="mb-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                {...register('commission')}
                disabled={disabled}
                className="rounded border-input"
              />
              <span className="text-sm">Has commission</span>
            </label>
          </div>

          {watch('commission') && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
              <div>
                <Label htmlFor="commissionAmount">Commission Amount</Label>
                <Input
                  id="commissionAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  {...register('commissionAmount', { valueAsNumber: true })}
                  disabled={disabled}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="commissionAmountType">Commission Type</Label>
                <Controller
                  name="commissionAmountType"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value ?? ''}
                      onValueChange={field.onChange}
                      disabled={disabled}
                    >
                      <SelectTrigger id="commissionAmountType">
                        <SelectValue placeholder="Select type..." />
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
          )}
        </div>

        {/* Overtime Section */}
        <div className="border-t border-border/30 pt-4">
          <h4 className="text-sm font-medium mb-3">Overtime</h4>
          <div className="mb-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                {...register('approveForOvertime')}
                disabled={disabled}
                className="rounded border-input"
              />
              <span className="text-sm">Approved for overtime</span>
            </label>
          </div>

          {watch('approveForOvertime') && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
              <div>
                <Label htmlFor="overtimeRate">Overtime Rate</Label>
                <Input
                  id="overtimeRate"
                  type="number"
                  step="0.01"
                  min="0"
                  {...register('overtimeRate', { valueAsNumber: true })}
                  disabled={disabled}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="overtimeRateType">Overtime Rate Type</Label>
                <Controller
                  name="overtimeRateType"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value ?? ''}
                      onValueChange={field.onChange}
                      disabled={disabled}
                    >
                      <SelectTrigger id="overtimeRateType">
                        <SelectValue placeholder="Select type..." />
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
          )}
        </div>
      </div>
    </div>
  );
}
