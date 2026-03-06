'use client';

import { Controller } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AvailabilityStatus } from '@prisma/client';
import { cn } from '@/lib/utils';
import type { AccountDetailsSectionProps } from './types';
import {
  ACCOUNT_STATUS_OPTIONS,
  STAFF_TYPE_OPTIONS,
  STAFF_ROLE_OPTIONS,
  SKILL_LEVEL_OPTIONS,
  STAFF_RATING_OPTIONS,
  AVAILABILITY_STATUS_OPTIONS,
} from './constants';

export function AccountDetailsSection({
  register,
  control,
  errors,
  watch,
  disabled = false,
  className,
  companies,
  terminology,
}: AccountDetailsSectionProps) {
  const availabilityStatus = watch('availabilityStatus');
  const staffType = watch('staffType');

  return (
    <div className={cn(className)}>
      <h3 className="text-lg font-semibold border-b border-border pb-2 mb-4">
        Account Details
      </h3>
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <Label htmlFor="accountStatus" required>
              Account Status
            </Label>
            <Controller
              name="accountStatus"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={disabled}
                >
                  <SelectTrigger id="accountStatus">
                    <SelectValue placeholder="Select status..." />
                  </SelectTrigger>
                  <SelectContent>
                    {ACCOUNT_STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.accountStatus && (
              <p className="text-sm text-destructive mt-1">{String(errors.accountStatus?.message || "")}</p>
            )}
          </div>

          <div>
            <Label htmlFor="staffType" required>
              {terminology.staff.singular} Type
            </Label>
            <Controller
              name="staffType"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={disabled}
                >
                  <SelectTrigger id="staffType">
                    <SelectValue placeholder="Select type..." />
                  </SelectTrigger>
                  <SelectContent>
                    {STAFF_TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.staffType && (
              <p className="text-sm text-destructive mt-1">{String(errors.staffType?.message || "")}</p>
            )}
          </div>

          <div>
            <Label htmlFor="staffRole" required>
              {terminology.staff.singular} Role
            </Label>
            <Controller
              name="staffRole"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={disabled}
                >
                  <SelectTrigger id="staffRole">
                    <SelectValue placeholder="Select role..." />
                  </SelectTrigger>
                  <SelectContent>
                    {STAFF_ROLE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.staffRole && (
              <p className="text-sm text-destructive mt-1">{String(errors.staffRole?.message || "")}</p>
            )}
          </div>

          <div>
            <Label htmlFor="skillLevel" required>
              Skill Level
            </Label>
            <Controller
              name="skillLevel"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={disabled}
                >
                  <SelectTrigger id="skillLevel">
                    <SelectValue placeholder="Select skill level..." />
                  </SelectTrigger>
                  <SelectContent>
                    {SKILL_LEVEL_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.skillLevel && (
              <p className="text-sm text-destructive mt-1">{String(errors.skillLevel?.message || "")}</p>
            )}
          </div>

          <div>
            <Label htmlFor="staffRating" required>
              {terminology.staff.singular} Rating
            </Label>
            <Controller
              name="staffRating"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={disabled}
                >
                  <SelectTrigger id="staffRating">
                    <SelectValue placeholder="Select rating..." />
                  </SelectTrigger>
                  <SelectContent>
                    {STAFF_RATING_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.staffRating && (
              <p className="text-sm text-destructive mt-1">{String(errors.staffRating?.message || "")}</p>
            )}
          </div>

          <div>
            <Label htmlFor="availabilityStatus" required>
              Availability Status
            </Label>
            <Controller
              name="availabilityStatus"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={disabled}
                >
                  <SelectTrigger id="availabilityStatus">
                    <SelectValue placeholder="Select availability..." />
                  </SelectTrigger>
                  <SelectContent>
                    {AVAILABILITY_STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.availabilityStatus && (
              <p className="text-sm text-destructive mt-1">{String(errors.availabilityStatus?.message || "")}</p>
            )}
          </div>

          <div>
            <Label htmlFor="experience">Experience/Notes</Label>
            <Textarea
              id="experience"
              {...register('experience')}
              disabled={disabled}
              rows={2}
              placeholder="Experience, notes"
            />
            {errors.experience && (
              <p className="text-sm text-destructive mt-1">{String(errors.experience?.message || "")}</p>
            )}
          </div>

          <div>
            <Label htmlFor="internalNotes">Internal Notes</Label>
            <Textarea
              id="internalNotes"
              {...register('internalNotes')}
              disabled={disabled}
              rows={2}
              placeholder="Internal notes"
            />
            {errors.internalNotes && (
              <p className="text-sm text-destructive mt-1">{String(errors.internalNotes?.message || "")}</p>
            )}
          </div>

          {availabilityStatus === AvailabilityStatus.TIME_OFF && (
            <>
              <div>
                <Label htmlFor="timeOffStart">Time Off Start</Label>
                <Controller
                  name="timeOffStart"
                  control={control}
                  render={({ field }) => (
                    <Input
                      id="timeOffStart"
                      type="date"
                      value={
                        field.value
                          ? new Date(field.value).toISOString().split('T')[0]
                          : ''
                      }
                      onChange={(e) =>
                        field.onChange(e.target.value ? new Date(e.target.value) : null)
                      }
                      disabled={disabled}
                      error={!!errors.timeOffStart}
                    />
                  )}
                />
                {errors.timeOffStart && (
                  <p className="text-sm text-destructive mt-1">{String(errors.timeOffStart?.message || "")}</p>
                )}
              </div>

              <div>
                <Label htmlFor="timeOffEnd">Time Off End</Label>
                <Controller
                  name="timeOffEnd"
                  control={control}
                  render={({ field }) => (
                    <Input
                      id="timeOffEnd"
                      type="date"
                      value={
                        field.value
                          ? new Date(field.value).toISOString().split('T')[0]
                          : ''
                      }
                      onChange={(e) =>
                        field.onChange(e.target.value ? new Date(e.target.value) : null)
                      }
                      disabled={disabled}
                      error={!!errors.timeOffEnd}
                    />
                  )}
                />
                {errors.timeOffEnd && (
                  <p className="text-sm text-destructive mt-1">{String(errors.timeOffEnd?.message || "")}</p>
                )}
              </div>
            </>
          )}

          <div>
            <Label htmlFor="customField1">Custom Field 1</Label>
            <Input
              id="customField1"
              {...register('customField1')}
              disabled={disabled}
              error={!!errors.customField1}
            />
            {errors.customField1 && (
              <p className="text-sm text-destructive mt-1">{String(errors.customField1?.message || "")}</p>
            )}
          </div>

          <div>
            <Label htmlFor="customField2">Custom Field 2</Label>
            <Input
              id="customField2"
              {...register('customField2')}
              disabled={disabled}
              error={!!errors.customField2}
            />
            {errors.customField2 && (
              <p className="text-sm text-destructive mt-1">{String(errors.customField2?.message || "")}</p>
            )}
          </div>

          <div>
            <Label htmlFor="customField3">Custom Field 3</Label>
            <Input
              id="customField3"
              {...register('customField3')}
              disabled={disabled}
              error={!!errors.customField3}
            />
            {errors.customField3 && (
              <p className="text-sm text-destructive mt-1">{String(errors.customField3?.message || "")}</p>
            )}
          </div>
        </div>

        {staffType === 'COMPANY' && (
          <div>
            <Label htmlFor="companyId">Associated Company</Label>
            <Controller
              name="companyId"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value || 'none'}
                  onValueChange={(val) => field.onChange(val === 'none' ? null : val)}
                  disabled={disabled}
                >
                  <SelectTrigger id="companyId">
                    <SelectValue placeholder="Select company..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {companies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.firstName} {company.lastName} ({company.staffId})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.companyId && (
              <p className="text-sm text-destructive mt-1">{String(errors.companyId?.message || "")}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
