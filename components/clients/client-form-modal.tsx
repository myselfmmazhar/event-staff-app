'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import type { CreateClientInput, UpdateClientInput } from '@/lib/schemas/client.schema';
import type { Client } from '@/lib/types/client';
import { emailValidation, phoneValidation } from "@/lib/utils/validation";
import { FieldErrors } from "@/lib/utils/error-messages";
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { CloseIcon } from '@/components/ui/icons';

// Create a unified form schema that includes hasLoginAccess
const formSchema = z.object({
  businessName: z.string().min(1, "Business name is required").max(200).transform(val => val.trim()),
  firstName: z.string().min(1, "First name is required").max(50).transform(val => val.trim()),
  lastName: z.string().min(1, "Last name is required").max(50).transform(val => val.trim()),
  email: z
    .string()
    .email({ message: FieldErrors.email.invalid })
    .transform(val => val.trim().toLowerCase())
    .refine(
      (email) => emailValidation.hasValidDomain(email),
      { message: FieldErrors.email.disposable }
    ),
  cellPhone: z
    .string()
    .refine(
      (phone) => phoneValidation.isValid(phone),
      { message: FieldErrors.phone.invalid }
    )
    .transform(val => val?.trim()),
  businessPhone: z
    .string()
    .refine(
      (phone) => !phone || phoneValidation.isValid(phone),
      { message: FieldErrors.phone.invalid }
    )
    .transform(val => val?.trim())
    .optional(),
  details: z.string().max(5000).transform(val => val?.trim()).optional(),
  venueName: z.string().max(200).transform(val => val?.trim()).optional(),
  room: z.string().max(100).transform(val => val?.trim()).optional(),
  streetAddress: z.string().min(1, "Street address is required").max(300).transform(val => val.trim()),
  aptSuiteUnit: z.string().max(50).transform(val => val?.trim()).optional(),
  city: z.string().min(1, "City is required").max(100).transform(val => val.trim()),
  country: z.string().min(1, "Country is required").max(100).transform(val => val.trim()),
  state: z.string().min(1, "State is required").max(50).transform(val => val.trim()),
  zipCode: z.string().min(1, "ZIP code is required").max(20).transform(val => val.trim()),
  hasLoginAccess: z.boolean().optional(),
});

type FormData = z.infer<typeof formSchema>;
type FormFieldName = keyof FormData;

interface ClientFormModalProps {
  client: Client | null;
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateClientInput | Omit<UpdateClientInput, 'id'>) => void;
  isSubmitting: boolean;
  backendErrors?: Array<{ field: string; message: string }>;
}

export function ClientFormModal({
  client,
  open,
  onClose,
  onSubmit,
  isSubmitting,
  backendErrors = [],
}: ClientFormModalProps) {
  const isEdit = !!client;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setError,
    watch,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      businessName: '',
      firstName: '',
      lastName: '',
      email: '',
      cellPhone: '',
      businessPhone: '',
      details: '',
      venueName: '',
      room: '',
      streetAddress: '',
      aptSuiteUnit: '',
      city: '',
      country: '',
      state: '',
      zipCode: '',
      hasLoginAccess: false,
    },
  });

  const hasLoginAccess = watch('hasLoginAccess');

  useEffect(() => {
    if (client) {
      reset({
        businessName: client.businessName,
        firstName: client.firstName,
        lastName: client.lastName,
        email: client.email,
        cellPhone: client.cellPhone,
        businessPhone: client.businessPhone || '',
        details: client.details || '',
        venueName: client.venueName || '',
        room: client.room || '',
        streetAddress: client.streetAddress,
        aptSuiteUnit: client.aptSuiteUnit || '',
        city: client.city,
        country: client.country,
        state: client.state,
        zipCode: client.zipCode,
        hasLoginAccess: client.hasLoginAccess,
      });
    } else {
      reset({
        businessName: '',
        firstName: '',
        lastName: '',
        email: '',
        cellPhone: '',
        businessPhone: '',
        details: '',
        venueName: '',
        room: '',
        streetAddress: '',
        aptSuiteUnit: '',
        city: '',
        country: '',
        state: '',
        zipCode: '',
        hasLoginAccess: false,
      });
    }
  }, [client, reset, open]);

  // Map backend errors to form fields
  useEffect(() => {
    if (backendErrors && backendErrors.length > 0) {
      backendErrors.forEach((error) => {
        setError(error.field as FormFieldName, {
          type: 'manual',
          message: error.message,
        });
      });
    }
  }, [backendErrors, setError]);

  const handleFormSubmit = (data: FormData) => {
    onSubmit(data);
  };

  return (
    <Dialog open={open} onClose={onClose} className="max-w-4xl">
      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>{isEdit ? 'Edit Client' : 'Add New Client'}</DialogTitle>
            <button
              type="button"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
            >
              <CloseIcon className="h-5 w-5" />
            </button>
          </div>
        </DialogHeader>

        <DialogContent className="max-h-[calc(100vh-280px)] overflow-y-auto">
          {/* Client ID (Read-only in edit mode) */}
          {isEdit && client && (
            <div className="mb-6 p-3 bg-muted/30 rounded-md border border-border">
              <p className="text-sm text-muted-foreground">Client ID</p>
              <p className="text-base font-medium">{client.clientId}</p>
            </div>
          )}

          {/* Client Information */}
          <div className="bg-accent/5 border border-border/30 p-5 rounded-lg mb-6">
            <h3 className="text-lg font-semibold border-b border-border pb-2 mb-4">Client Information</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="businessName" required>Business Name</Label>
                <Input
                  id="businessName"
                  {...register('businessName')}
                  error={!!errors.businessName}
                  disabled={isSubmitting}
                  placeholder="Business name"
                />
                {errors.businessName && (
                  <p className="text-sm text-destructive mt-1">{errors.businessName.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName" required>First Name</Label>
                  <Input
                    id="firstName"
                    {...register('firstName')}
                    error={!!errors.firstName}
                    disabled={isSubmitting}
                    placeholder="First name"
                  />
                  {errors.firstName && (
                    <p className="text-sm text-destructive mt-1">{errors.firstName.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="lastName" required>Last Name</Label>
                  <Input
                    id="lastName"
                    {...register('lastName')}
                    error={!!errors.lastName}
                    disabled={isSubmitting}
                    placeholder="Last name"
                  />
                  {errors.lastName && (
                    <p className="text-sm text-destructive mt-1">{errors.lastName.message}</p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="email" required>Email</Label>
                <Input
                  id="email"
                  type="email"
                  {...register('email')}
                  error={!!errors.email}
                  disabled={isSubmitting}
                  placeholder="Email address"
                />
                {errors.email && (
                  <p className="text-sm text-destructive mt-1">{errors.email.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="cellPhone" required>Cell Phone</Label>
                  <Input
                    id="cellPhone"
                    {...register('cellPhone')}
                    error={!!errors.cellPhone}
                    disabled={isSubmitting}
                    placeholder="(123) 456-7890"
                  />
                  {errors.cellPhone && (
                    <p className="text-sm text-destructive mt-1">{errors.cellPhone.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="businessPhone">Business Phone</Label>
                  <Input
                    id="businessPhone"
                    {...register('businessPhone')}
                    error={!!errors.businessPhone}
                    disabled={isSubmitting}
                    placeholder="(123) 456-7890"
                  />
                  {errors.businessPhone && (
                    <p className="text-sm text-destructive mt-1">{errors.businessPhone.message}</p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="details">Details</Label>
                <Textarea
                  id="details"
                  {...register('details')}
                  disabled={isSubmitting}
                  rows={3}
                  placeholder="Additional client details"
                />
                {errors.details && (
                  <p className="text-sm text-destructive mt-1">{errors.details.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Primary Address */}
          <div className="bg-accent/5 border border-border/30 p-5 rounded-lg mb-6">
            <h3 className="text-lg font-semibold border-b border-border pb-2 mb-4">Primary Address</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="venueName">Venue Name</Label>
                  <Input
                    id="venueName"
                    {...register('venueName')}
                    error={!!errors.venueName}
                    disabled={isSubmitting}
                    placeholder="Venue name"
                  />
                  {errors.venueName && (
                    <p className="text-sm text-destructive mt-1">{errors.venueName.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="room">Room</Label>
                  <Input
                    id="room"
                    {...register('room')}
                    error={!!errors.room}
                    disabled={isSubmitting}
                    placeholder="Room number"
                  />
                  {errors.room && (
                    <p className="text-sm text-destructive mt-1">{errors.room.message}</p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="streetAddress" required>Street Address</Label>
                <Input
                  id="streetAddress"
                  {...register('streetAddress')}
                  error={!!errors.streetAddress}
                  disabled={isSubmitting}
                  placeholder="Street address"
                />
                {errors.streetAddress && (
                  <p className="text-sm text-destructive mt-1">{errors.streetAddress.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="aptSuiteUnit">Apt/Suite/Unit</Label>
                <Input
                  id="aptSuiteUnit"
                  {...register('aptSuiteUnit')}
                  error={!!errors.aptSuiteUnit}
                  disabled={isSubmitting}
                  placeholder="Apartment, suite, unit"
                />
                {errors.aptSuiteUnit && (
                  <p className="text-sm text-destructive mt-1">{errors.aptSuiteUnit.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="city" required>City</Label>
                  <Input
                    id="city"
                    {...register('city')}
                    error={!!errors.city}
                    disabled={isSubmitting}
                    placeholder="City"
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
                    disabled={isSubmitting}
                    placeholder="State"
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
                    disabled={isSubmitting}
                    placeholder="ZIP code"
                  />
                  {errors.zipCode && (
                    <p className="text-sm text-destructive mt-1">{errors.zipCode.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="country" required>Country</Label>
                  <Input
                    id="country"
                    {...register('country')}
                    error={!!errors.country}
                    disabled={isSubmitting}
                    placeholder="Country"
                  />
                  {errors.country && (
                    <p className="text-sm text-destructive mt-1">{errors.country.message}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Client Portal Access */}
          <div className="bg-accent/5 border border-border/30 p-5 rounded-lg mb-6">
            <h3 className="text-lg font-semibold border-b border-border pb-2 mb-4">Client Portal Access</h3>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="hasLoginAccess"
                  {...register('hasLoginAccess')}
                  disabled={isSubmitting}
                  className="mt-1"
                />
                <div>
                  <label htmlFor="hasLoginAccess" className="text-sm font-medium cursor-pointer">
                    Give this client the ability to log in
                  </label>
                  <p className="text-sm text-muted-foreground mt-1">
                    The client will be able to access the portal with a temporary password
                  </p>
                </div>
              </div>

              {hasLoginAccess && !isEdit && (
                <div className="bg-blue-50 border border-blue-200 p-3 rounded-md">
                  <p className="text-sm text-blue-900">
                    💡 A temporary password will be generated and displayed after creation
                  </p>
                </div>
              )}

              {hasLoginAccess && isEdit && client?.userId && (
                <div className="bg-green-50 border border-green-200 p-3 rounded-md">
                  <p className="text-sm text-green-900">
                    ✓ Client Portal Access is currently enabled
                  </p>
                </div>
              )}
            </div>
          </div>
        </DialogContent>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : isEdit ? 'Update Client' : 'Create Client'}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
