'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AddressAutocomplete } from '@/components/maps/address-autocomplete';
import { cn } from '@/lib/utils';
import type { FormSectionProps } from './types';

export function VenueSection({
  register,
  errors,
  setValue,
  disabled = false,
  className,
}: FormSectionProps) {
  return (
    <div className={cn('', className)}>
      <h3 className="text-base font-bold text-slate-900 mb-5">Location Information</h3>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <AddressAutocomplete
            label="Search Address (Optional)"
            placeholder="Type to search for an address..."
            onSelect={(addressData) => {
              setValue('address', addressData.address);
              setValue('city', addressData.city);
              setValue('state', addressData.state);
              setValue('zipCode', addressData.zipCode);
              setValue('latitude', addressData.latitude);
              setValue('longitude', addressData.longitude);
            }}
          />
        </div>

        <div>
          <Label htmlFor="venueName" required>Location Name</Label>
          <Input
            id="venueName"
            {...register('venueName')}
            error={!!errors.venueName}
            disabled={disabled}
            placeholder="Convention Center"
          />
          {errors.venueName && (
            <p className="text-sm text-destructive mt-1">{errors.venueName.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="address" required>Address</Label>
          <Input
            id="address"
            {...register('address')}
            error={!!errors.address}
            disabled={disabled}
            placeholder="123 Main Street"
          />
          {errors.address && (
            <p className="text-sm text-destructive mt-1">{errors.address.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="addressLine2">Apt / Suite / Unit</Label>
          <Input
            id="addressLine2"
            {...register('addressLine2')}
            disabled={disabled}
            placeholder="Suite 200"
          />
        </div>

        <div>
          <Label htmlFor="city" required>City</Label>
          <Input
            id="city"
            {...register('city')}
            error={!!errors.city}
            disabled={disabled}
            placeholder="New York"
          />
          {errors.city && (
            <p className="text-sm text-destructive mt-1">{errors.city.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="state" required>State</Label>
          <Input
            id="state"
            {...register('state')}
            error={!!errors.state}
            disabled={disabled}
            placeholder="NY"
          />
          {errors.state && (
            <p className="text-sm text-destructive mt-1">{errors.state.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="zipCode" required>ZIP Code</Label>
          <Input
            id="zipCode"
            {...register('zipCode')}
            error={!!errors.zipCode}
            disabled={disabled}
            placeholder="10001"
          />
          {errors.zipCode && (
            <p className="text-sm text-destructive mt-1">{errors.zipCode.message}</p>
          )}
        </div>
      </div>
    </div>
  );
}
