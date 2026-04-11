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
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { CloseIcon, EyeIcon } from '@/components/ui/icons';
import { AddressAutocomplete } from '@/components/maps/address-autocomplete';
import { ClientLocationsSection } from './client-locations-section';
import { TemporaryLocationsSection, type TemporaryLocation } from './temporary-locations-section';

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
  requirements: z.string().max(200).transform(val => val?.trim()).optional(),

  // Business Address
  businessAddress: z.string().max(300).transform(val => val?.trim()).optional(),
  businessAddressLine2: z.string().max(200).transform(val => val?.trim()).optional(),
  city: z.string().min(1, "City is required").max(100).transform(val => val.trim()),
  state: z.string().min(1, "State is required").max(50).transform(val => val.trim()),
  zipCode: z.string().min(1, "ZIP code is required").max(20).transform(val => val.trim()),

  // CC Email
  ccEmail: z
    .string()
    .email({ message: FieldErrors.email.invalid })
    .transform(val => val?.trim().toLowerCase())
    .optional()
    .or(z.literal("")),

  // Billing Contact
  billingFirstName: z.string().max(50).transform(val => val?.trim()).optional(),
  billingLastName: z.string().max(50).transform(val => val?.trim()).optional(),
  billingEmail: z
    .string()
    .email({ message: FieldErrors.email.invalid })
    .transform(val => val?.trim().toLowerCase())
    .optional()
    .or(z.literal("")),
  billingPhone: z
    .string()
    .refine(
      (phone) => !phone || phoneValidation.isValid(phone),
      { message: FieldErrors.phone.invalid }
    )
    .transform(val => val?.trim())
    .optional(),

  sameAsContact: z.boolean().optional(),
  hasLoginAccess: z.boolean().optional(),
});

type FormData = z.infer<typeof formSchema>;
type FormFieldName = keyof FormData;
type SaveAction = 'close' | 'new';

export interface CreateClientInputWithLocations extends CreateClientInput {
  pendingLocations?: TemporaryLocation[];
}

interface ClientFormModalProps {
  client: Client | null;
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateClientInputWithLocations | Omit<UpdateClientInput, 'id'>, saveAction?: SaveAction) => void;
  isSubmitting: boolean;
  backendErrors?: Array<{ field: string; message: string }>;
  onLocationsChange?: () => void;
  onViewDetails?: () => void;
  /** Increment this key to reset the form for a new entry (used with Save & New) */
  resetKey?: number;
}

export function ClientFormModal({
  client,
  open,
  onClose,
  onSubmit,
  isSubmitting,
  backendErrors = [],
  onLocationsChange,
  onViewDetails,
  resetKey = 0,
}: ClientFormModalProps) {
  const isEdit = !!client;
  const [tempLocations, setTempLocations] = useState<TemporaryLocation[]>([]);

  // Save action state (for Save & Close vs Save & New)
  const [pendingSaveAction, setPendingSaveAction] = useState<SaveAction>('close');

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setError,
    watch,
    setValue,
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
      requirements: '',
      businessAddress: '',
      businessAddressLine2: '',
      city: '',
      state: '',
      zipCode: '',
      ccEmail: '',
      billingFirstName: '',
      billingLastName: '',
      billingEmail: '',
      billingPhone: '',
      sameAsContact: false,
      hasLoginAccess: true,
    },
  });

  const sameAsContact = watch('sameAsContact');
  const firstName = watch('firstName');
  const lastName = watch('lastName');
  const email = watch('email');
  const cellPhone = watch('cellPhone');

  useEffect(() => {
    if (sameAsContact) {
      setValue('billingFirstName', firstName);
      setValue('billingLastName', lastName);
      setValue('billingEmail', email);
      setValue('billingPhone', cellPhone);
    }
  }, [sameAsContact, firstName, lastName, email, cellPhone, setValue]);

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
        requirements: client.requirements || '',
        businessAddress: client.businessAddress || '',
        businessAddressLine2: (client as any).businessAddressLine2 || '',
        city: client.city,
        state: client.state,
        zipCode: client.zipCode,
        ccEmail: client.ccEmail || '',
        billingFirstName: client.billingFirstName || '',
        billingLastName: client.billingLastName || '',
        billingEmail: client.billingEmail || '',
        billingPhone: client.billingPhone || '',
        sameAsContact:
          (client.billingFirstName || '') === client.firstName &&
          (client.billingLastName || '') === client.lastName &&
          (client.billingEmail || '') === client.email &&
          (client.billingPhone || '') === client.cellPhone,
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
        requirements: '',
        businessAddress: '',
        businessAddressLine2: '',
        city: '',
        state: '',
        zipCode: '',
        ccEmail: '',
        billingFirstName: '',
        billingLastName: '',
        billingEmail: '',
        billingPhone: '',
        sameAsContact: false,
        hasLoginAccess: true,
      });
      setTempLocations([]);
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
    if (!isEdit && tempLocations.length > 0) {
      // Include pending locations for create mode
      onSubmit({ ...data, pendingLocations: tempLocations }, pendingSaveAction);
    } else {
      onSubmit(data, pendingSaveAction);
    }
  };

  // Wrapper to ensure form submission doesn't bubble to parent forms
  const onFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();
    handleSubmit(handleFormSubmit)(e);
  };

  const handleSaveAndClose = () => {
    setPendingSaveAction('close');
  };

  const handleSaveAndNew = () => {
    setPendingSaveAction('new');
  };

  // Default form values
  const getDefaultValues = () => ({
    businessName: '',
    firstName: '',
    lastName: '',
    email: '',
    cellPhone: '',
    businessPhone: '',
    details: '',
    requirements: '',
    businessAddress: '',
    businessAddressLine2: '',
    city: '',
    state: '',
    zipCode: '',
    ccEmail: '',
    billingFirstName: '',
    billingLastName: '',
    billingEmail: '',
    billingPhone: '',
    sameAsContact: false,
    hasLoginAccess: true,
  });

  // Reset form when resetKey changes (triggered by Save & New)
  useEffect(() => {
    if (resetKey > 0 && !client) {
      reset(getDefaultValues());
      setTempLocations([]);
      setPendingSaveAction('close');
    }
  }, [resetKey, client, reset]);

  return (
    <Dialog open={open} onClose={onClose} fullScreen>
      <form onSubmit={onFormSubmit} className="h-full flex flex-col">
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

        <DialogContent className="flex-1 overflow-y-auto">
          {/* Client ID (Read-only in edit mode) */}
          {isEdit && client && (
            <div className="mb-6 p-3 bg-muted/30 rounded-md border border-border inline-block">
              <p className="text-sm text-muted-foreground">Client ID</p>
              <p className="text-base font-medium">{client.clientId}</p>
            </div>
          )}

          {/* Client Information Section */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold border-b border-border pb-2 mb-4">Client Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

              <div>
                <Label htmlFor="ccEmail">CC Email</Label>
                <Input
                  id="ccEmail"
                  type="email"
                  {...register('ccEmail')}
                  error={!!errors.ccEmail}
                  disabled={isSubmitting}
                  placeholder="CC email address"
                />
                {errors.ccEmail && (
                  <p className="text-sm text-destructive mt-1">{errors.ccEmail.message}</p>
                )}
              </div>

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

            {/* Details & Requirements - separate row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
              <div>
                <Label htmlFor="details">Details</Label>
                <Textarea
                  id="details"
                  {...register('details')}
                  disabled={isSubmitting}
                  rows={2}
                  placeholder="Additional details"
                />
                {errors.details && (
                  <p className="text-sm text-destructive mt-1">{errors.details.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="requirements">Requirements</Label>
                <Textarea
                  id="requirements"
                  {...register('requirements')}
                  disabled={isSubmitting}
                  rows={2}
                  placeholder="e.g., Business casual attire"
                />
                {errors.requirements && (
                  <p className="text-sm text-destructive mt-1">{errors.requirements.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Business Address Section */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold border-b border-border pb-2 mb-4">Business Address</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Address Search */}
              <div>
                <AddressAutocomplete
                  label="Search Address"
                  placeholder="Type to search..."
                  defaultValue={client?.businessAddress || ''}
                  onSelect={(addressData) => {
                    setValue('businessAddress', addressData.address);
                    setValue('city', addressData.city);
                    setValue('state', addressData.state);
                    setValue('zipCode', addressData.zipCode);
                  }}
                />
              </div>

              <div>
                <Label htmlFor="businessAddress">Business Address</Label>
                <Input
                  id="businessAddress"
                  {...register('businessAddress')}
                  error={!!errors.businessAddress}
                  disabled={isSubmitting}
                  placeholder="Business address"
                />
                {errors.businessAddress && (
                  <p className="text-sm text-destructive mt-1">{errors.businessAddress.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="businessAddressLine2">Apt / Suite / Unit</Label>
                <Input
                  id="businessAddressLine2"
                  {...register('businessAddressLine2')}
                  disabled={isSubmitting}
                  placeholder="Suite 200"
                />
              </div>

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
            </div>
          </div>

          {/* Billing Contact Section */}
          <div className="mb-6">
            <div className="flex items-center justify-between border-b border-border pb-2 mb-4">
              <h3 className="text-lg font-semibold">Billing Contact</h3>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="sameAsContact"
                  {...register('sameAsContact')}
                  disabled={isSubmitting}
                />
                <Label htmlFor="sameAsContact" className="text-[14px] font-medium cursor-pointer">
                  Same as contact
                </Label>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="billingFirstName">Billing First Name</Label>
                <Input
                  id="billingFirstName"
                  {...register('billingFirstName')}
                  error={!!errors.billingFirstName}
                  disabled={isSubmitting || sameAsContact}
                  placeholder="First name"
                />
                {errors.billingFirstName && (
                  <p className="text-sm text-destructive mt-1">{errors.billingFirstName.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="billingLastName">Billing Last Name</Label>
                <Input
                  id="billingLastName"
                  {...register('billingLastName')}
                  error={!!errors.billingLastName}
                  disabled={isSubmitting || sameAsContact}
                  placeholder="Last name"
                />
                {errors.billingLastName && (
                  <p className="text-sm text-destructive mt-1">{errors.billingLastName.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="billingEmail">Billing Email</Label>
                <Input
                  id="billingEmail"
                  type="email"
                  {...register('billingEmail')}
                  error={!!errors.billingEmail}
                  disabled={isSubmitting || sameAsContact}
                  placeholder="billing@example.com"
                />
                {errors.billingEmail && (
                  <p className="text-sm text-destructive mt-1">{errors.billingEmail.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="billingPhone">Billing Phone</Label>
                <Input
                  id="billingPhone"
                  {...register('billingPhone')}
                  error={!!errors.billingPhone}
                  disabled={isSubmitting || sameAsContact}
                  placeholder="(123) 456-7890"
                />
                {errors.billingPhone && (
                  <p className="text-sm text-destructive mt-1">{errors.billingPhone.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Locations & Portal Access Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Saved Locations */}
            {isEdit && client ? (
              <ClientLocationsSection
                clientId={client.id}
                locations={client.locations || []}
                onLocationsChange={onLocationsChange || (() => { })}
              />
            ) : (
              <TemporaryLocationsSection
                locations={tempLocations}
                onLocationsChange={setTempLocations}
              />
            )}

            {/* Client Portal Access */}
            <div className="bg-accent/5 border border-border/30 p-5 rounded-lg">
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
                      The client will receive an email invitation to set up their account
                    </p>
                  </div>
                </div>

                {hasLoginAccess && !isEdit && (
                  <div className="bg-blue-50 border border-blue-200 p-3 rounded-md">
                    <p className="text-sm text-blue-900">
                      An invitation email will be sent after creating the client
                    </p>
                  </div>
                )}

                {hasLoginAccess && isEdit && !client?.userId && !client?.invitationToken && (
                  <div className="bg-blue-50 border border-blue-200 p-3 rounded-md">
                    <p className="text-sm text-blue-900">
                      An invitation email will be sent to the client
                    </p>
                  </div>
                )}

                {hasLoginAccess && isEdit && client?.invitationToken && !client?.userId && (
                  <div className="bg-amber-50 border border-amber-200 p-3 rounded-md">
                    <p className="text-sm text-amber-900">
                      Invitation pending - waiting for client to accept
                    </p>
                  </div>
                )}

                {hasLoginAccess && isEdit && client?.userId && (
                  <div className="bg-green-50 border border-green-200 p-3 rounded-md">
                    <p className="text-sm text-green-900">
                      Client Portal Access is currently enabled
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogContent>

        <DialogFooter>
          {isEdit && onViewDetails && (
            <Button type="button" variant="outline" onClick={onViewDetails} className="mr-auto">
              <EyeIcon className="h-4 w-4 mr-2" />
              View Details
            </Button>
          )}
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Close
          </Button>
          {!isEdit && (
            <Button
              type="submit"
              variant="outline"
              disabled={isSubmitting}
              onClick={handleSaveAndNew}
            >
              {isSubmitting && pendingSaveAction === 'new' ? 'Saving...' : 'Save & New'}
            </Button>
          )}
          <Button
            type="submit"
            disabled={isSubmitting}
            onClick={handleSaveAndClose}
          >
            {isSubmitting && pendingSaveAction === 'close' ? 'Saving...' : isEdit ? 'Update Client' : 'Save & Close'}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
