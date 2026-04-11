'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AddressAutocomplete } from '@/components/maps/address-autocomplete';
import { cn } from '@/lib/utils';
import type { TalentDetailsSectionProps } from './types';

export function TalentDetailsSection({
  register,
  errors,
  setValue,
  disabled = false,
  className,
  fields = 'all',
}: TalentDetailsSectionProps) {
  const showContact = fields === 'all' || fields === 'contact';
  const showAddress = fields === 'all' || fields === 'address';

  return (
    <div className={cn(className)}>
      <h3 className="text-lg font-semibold border-b border-border pb-2 mb-4">
        Talent Details
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
        {showContact && (
          <>
        <div>
          <Label htmlFor="firstName">
            First Name
          </Label>
          <Input
            id="firstName"
            {...register('firstName')}
            disabled={disabled}
            error={!!errors.firstName}
            placeholder="First name"
          />
          {errors.firstName && (
            <p className="text-sm text-destructive mt-1">{String(errors.firstName?.message || "")}</p>
          )}
        </div>

        <div>
          <Label htmlFor="lastName">
            Last Name
          </Label>
          <Input
            id="lastName"
            {...register('lastName')}
            disabled={disabled}
            error={!!errors.lastName}
            placeholder="Last name"
          />
          {errors.lastName && (
            <p className="text-sm text-destructive mt-1">{String(errors.lastName?.message || "")}</p>
          )}
        </div>

        <div>
          <Label htmlFor="email" required>
            Email
          </Label>
          <Input
            id="email"
            type="email"
            {...register('email')}
            disabled={disabled}
            error={!!errors.email}
            placeholder="email@example.com"
          />
          {errors.email && (
            <p className="text-sm text-destructive mt-1">{String(errors.email?.message || "")}</p>
          )}
        </div>

        <div>
          <Label htmlFor="phone">
            Phone
          </Label>
          <Input
            id="phone"
            type="tel"
            {...register('phone')}
            disabled={disabled}
            error={!!errors.phone}
            placeholder="(555) 123-4567"
          />
          {errors.phone && (
            <p className="text-sm text-destructive mt-1">{String(errors.phone?.message || "")}</p>
          )}
        </div>

        <div>
          <AddressAutocomplete
            label="Search Address"
            placeholder="Type to search..."
            onSelect={(addressData) => {
              setValue('streetAddress', addressData.address);
              setValue('city', addressData.city);
              setValue('state', addressData.state);
              setValue('zipCode', addressData.zipCode);
              setValue('latitude', addressData.latitude);
              setValue('longitude', addressData.longitude);
            }}
          />
        </div>

        <div>
          <Label htmlFor="streetAddress">
            Address
          </Label>
          <Input
            id="streetAddress"
            {...register('streetAddress')}
            disabled={disabled}
            error={!!errors.streetAddress}
            placeholder="123 Main Street"
          />
          {errors.streetAddress && (
            <p className="text-sm text-destructive mt-1">{String(errors.streetAddress?.message || "")}</p>
          )}
        </div>

        <div>
          <Label htmlFor="aptSuiteUnit">
            Apt / Suite / Unit
          </Label>
          <Input
            id="aptSuiteUnit"
            {...register('aptSuiteUnit')}
            disabled={disabled}
            placeholder="Suite 200"
          />
        </div>

        <div>
          <Label htmlFor="city">
            City
          </Label>
          <Input
            id="city"
            {...register('city')}
            disabled={disabled}
            error={!!errors.city}
            placeholder="New York"
          />
          {errors.city && (
            <p className="text-sm text-destructive mt-1">{String(errors.city?.message || "")}</p>
          )}
        </div>

        <div>
          <Label htmlFor="state">
            State
          </Label>
          <Input
            id="state"
            {...register('state')}
            disabled={disabled}
            error={!!errors.state}
            placeholder="NY"
          />
          {errors.state && (
            <p className="text-sm text-destructive mt-1">{String(errors.state?.message || "")}</p>
          )}
        </div>

        <div>
          <Label htmlFor="zipCode">
            ZIP Code
          </Label>
          <Input
            id="zipCode"
            {...register('zipCode')}
            disabled={disabled}
            error={!!errors.zipCode}
            placeholder="12345"
          />
          {errors.zipCode && (
            <p className="text-sm text-destructive mt-1">{String(errors.zipCode?.message || "")}</p>
          )}
        </div>
          </>
        )}
      </div>
    </div>
  );
}
