'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AddressAutocomplete } from '@/components/maps/address-autocomplete';
import { cn } from '@/lib/utils';
import type { TeamDetailsSectionProps } from './types';

export function TeamDetailsSection({
  register,
  errors,
  setValue,
  disabled = false,
  className,
}: TeamDetailsSectionProps) {
  return (
    <div className={cn(className)}>
      <h3 className="text-lg font-semibold border-b border-border pb-2 mb-4">
        Team Entity Details
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <Label htmlFor="teamEntityName" required>
            Team Entity Name
          </Label>
          <Input
            id="teamEntityName"
            {...register('teamEntityName')}
            disabled={disabled}
            error={!!errors.teamEntityName}
            placeholder="Team or company name"
          />
          {errors.teamEntityName && (
            <p className="text-sm text-destructive mt-1">{String(errors.teamEntityName?.message || "")}</p>
          )}
        </div>

        <div>
          <Label htmlFor="teamEmail" required>
            Team Email
          </Label>
          <Input
            id="teamEmail"
            type="email"
            {...register('teamEmail')}
            disabled={disabled}
            error={!!errors.teamEmail}
            placeholder="team@example.com"
          />
          {errors.teamEmail && (
            <p className="text-sm text-destructive mt-1">{String(errors.teamEmail?.message || "")}</p>
          )}
        </div>

        <div>
          <Label htmlFor="teamPhone" required>
            Team Phone
          </Label>
          <Input
            id="teamPhone"
            type="tel"
            {...register('teamPhone')}
            disabled={disabled}
            error={!!errors.teamPhone}
            placeholder="(555) 123-4567"
          />
          {errors.teamPhone && (
            <p className="text-sm text-destructive mt-1">{String(errors.teamPhone?.message || "")}</p>
          )}
        </div>

        <div>
          <AddressAutocomplete
            label="Search Address"
            placeholder="Type to search..."
            onSelect={(addressData) => {
              setValue('teamAddressLine1', addressData.address);
              setValue('teamCity', addressData.city);
              setValue('teamState', addressData.state);
              setValue('teamZipCode', addressData.zipCode);
            }}
          />
        </div>

        <div>
          <Label htmlFor="teamAddressLine1" required>
            Team Address
          </Label>
          <Input
            id="teamAddressLine1"
            {...register('teamAddressLine1')}
            disabled={disabled}
            error={!!errors.teamAddressLine1}
            placeholder="123 Main Street"
          />
          {errors.teamAddressLine1 && (
            <p className="text-sm text-destructive mt-1">{String(errors.teamAddressLine1?.message || "")}</p>
          )}
        </div>

        <div>
          <Label htmlFor="teamAddressLine2">
            Apt / Suite / Unit
          </Label>
          <Input
            id="teamAddressLine2"
            {...register('teamAddressLine2')}
            disabled={disabled}
            placeholder="Suite 200"
          />
        </div>

        <div>
          <Label htmlFor="teamCity" required>
            City
          </Label>
          <Input
            id="teamCity"
            {...register('teamCity')}
            disabled={disabled}
            error={!!errors.teamCity}
            placeholder="New York"
          />
          {errors.teamCity && (
            <p className="text-sm text-destructive mt-1">{String(errors.teamCity?.message || "")}</p>
          )}
        </div>

        <div>
          <Label htmlFor="teamState" required>
            State
          </Label>
          <Input
            id="teamState"
            {...register('teamState')}
            disabled={disabled}
            error={!!errors.teamState}
            placeholder="NY"
          />
          {errors.teamState && (
            <p className="text-sm text-destructive mt-1">{String(errors.teamState?.message || "")}</p>
          )}
        </div>

        <div>
          <Label htmlFor="teamZipCode" required>
            ZIP Code
          </Label>
          <Input
            id="teamZipCode"
            {...register('teamZipCode')}
            disabled={disabled}
            error={!!errors.teamZipCode}
            placeholder="12345"
          />
          {errors.teamZipCode && (
            <p className="text-sm text-destructive mt-1">{String(errors.teamZipCode?.message || "")}</p>
          )}
        </div>
      </div>
    </div>
  );
}
