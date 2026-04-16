'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
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
type SaveAction = 'close' | 'new' | 'update-continue';

const CLIENT_TABS = [
  { id: 'info' as const, label: 'Client Info' },
  { id: 'address' as const, label: 'Address' },
  { id: 'billing' as const, label: 'Billing' },
  { id: 'access' as const, label: 'Locations & Access' },
];
type ClientTab = 'info' | 'address' | 'billing' | 'access';

const CLIENT_FIELD_TO_TAB: Record<string, ClientTab> = {
  businessName: 'info', firstName: 'info', lastName: 'info',
  email: 'info', ccEmail: 'info', cellPhone: 'info', businessPhone: 'info',
  details: 'info', requirements: 'info',
  businessAddress: 'address', businessAddressLine2: 'address',
  city: 'address', state: 'address', zipCode: 'address',
  billingFirstName: 'billing', billingLastName: 'billing',
  billingEmail: 'billing', billingPhone: 'billing', sameAsContact: 'billing',
  hasLoginAccess: 'access',
};

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
  const [clientTab, setClientTab] = useState<ClientTab>('info');
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
  const businessName = watch('businessName');
  const city = watch('city');
  const state = watch('state');
  const zipCode = watch('zipCode');

  useEffect(() => {
    if (sameAsContact) {
      setValue('billingFirstName', firstName);
      setValue('billingLastName', lastName);
      setValue('billingEmail', email);
      setValue('billingPhone', cellPhone);
    }
  }, [sameAsContact, firstName, lastName, email, cellPhone, setValue]);

  const hasLoginAccess = watch('hasLoginAccess');

  // Wizard step logic
  const CLIENT_STEP_IDS = ['info', 'address', 'billing', 'access'] as const;
  const stepIndex = CLIENT_STEP_IDS.indexOf(clientTab as typeof CLIENT_STEP_IDS[number]);
  const isLastStep = clientTab === 'access';

  const canContinueInfo =
    Boolean(businessName?.trim()) &&
    Boolean(firstName?.trim()) &&
    Boolean(lastName?.trim()) &&
    Boolean(email?.trim()) &&
    Boolean(cellPhone?.trim());

  const canContinueAddress =
    Boolean(city?.trim()) &&
    Boolean(state?.trim()) &&
    Boolean(zipCode?.trim());

  const canContinue =
    clientTab === 'info' ? canContinueInfo :
    clientTab === 'address' ? canContinueAddress :
    true;

  const goNext = () => {
    if (!canContinue) return;
    if (stepIndex < CLIENT_STEP_IDS.length - 1) {
      const nextTab = CLIENT_STEP_IDS[stepIndex + 1];
      if (nextTab) {
        setClientTab(nextTab);
      }
    }
  };

  const goBack = () => {
    if (stepIndex > 0) {
      const prevTab = CLIENT_STEP_IDS[stepIndex - 1];
      if (prevTab) {
        setClientTab(prevTab);
      }
    }
  };

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
    // Navigate to next step after triggering update-and-continue
    if (pendingSaveAction === 'update-continue') {
      goNext();
    }
  };

  // Wrapper to ensure form submission doesn't bubble to parent forms
  const onFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();
    handleSubmit(handleFormSubmit, (errors) => {
      const firstField = Object.keys(errors)[0];
      const tab = firstField ? CLIENT_FIELD_TO_TAB[firstField] : undefined;
      if (tab) setClientTab(tab);
    })(e);
  };

  const handleSaveAndClose = () => {
    setPendingSaveAction('close');
  };

  const handleSaveAndNew = () => {
    setPendingSaveAction('new');
  };

  const handleUpdateAndContinue = () => {
    setPendingSaveAction('update-continue');
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

  // Reset tab when dialog opens
  useEffect(() => {
    if (open) setClientTab('info');
  }, [open]);

  // Reset form when resetKey changes (triggered by Save & New)
  useEffect(() => {
    if (resetKey > 0 && !client) {
      reset(getDefaultValues());
      setTempLocations([]);
      setPendingSaveAction('close');
    }
  }, [resetKey, client, reset]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      className="mx-4 flex h-[min(92vh,900px)] w-full max-h-[min(92vh,900px)] max-w-5xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-card p-0 shadow-xl"
    >
      <DialogContent className="flex h-full min-h-0 flex-1 flex-col overflow-hidden p-0">
        <form onSubmit={onFormSubmit} className="flex h-full min-h-0 flex-col bg-white">

          {/* Header + tabs */}
          <div className="shrink-0 border-b border-slate-200 px-6 pb-0 pt-5 sm:px-8">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1 pr-2">
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                  {isEdit ? 'Edit Client' : 'Add New Client'}
                </h2>
                <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-500">
                  Fill in the client&apos;s contact information, business address, billing details, and portal access settings.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="shrink-0 rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
                aria-label="Close"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-6 flex gap-1 overflow-x-auto border-t border-slate-200/90 pt-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {CLIENT_TABS.map(({ id, label }) => {
                const active = clientTab === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setClientTab(id)}
                    className={cn(
                      'relative shrink-0 whitespace-nowrap px-3 py-3 text-sm transition-colors',
                      active
                        ? 'font-bold text-slate-900'
                        : 'font-medium text-slate-500 hover:text-slate-700'
                    )}
                  >
                    {label}
                    {active && (
                      <span className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-slate-900" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Body */}
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6 sm:px-8">

            {/* Client Info Tab */}
            {clientTab === 'info' && (
              <div className="mx-auto max-w-4xl">
                {isEdit && client && (
                  <div className="mb-6 inline-block rounded-md border border-border bg-muted/30 p-3">
                    <p className="text-sm text-muted-foreground">Client ID</p>
                    <p className="text-base font-medium">{client.clientId}</p>
                  </div>
                )}
                <h3 className="text-base font-bold text-slate-900">Client Information</h3>
                <p className="mt-1 text-xs text-slate-500">Core contact and business details for this client.</p>
                <div className="mt-6 grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">
                  <div>
                    <Label htmlFor="businessName" className="text-sm font-bold text-slate-900" required>Business Name</Label>
                    <Input
                      id="businessName"
                      {...register('businessName')}
                      error={!!errors.businessName}
                      disabled={isSubmitting}
                      placeholder="Business name"
                      className="mt-2 rounded-lg border-slate-200"
                    />
                    {errors.businessName && (
                      <p className="mt-1 text-sm text-destructive">{errors.businessName.message}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="firstName" className="text-sm font-bold text-slate-900" required>First Name</Label>
                    <Input
                      id="firstName"
                      {...register('firstName')}
                      error={!!errors.firstName}
                      disabled={isSubmitting}
                      placeholder="First name"
                      className="mt-2 rounded-lg border-slate-200"
                    />
                    {errors.firstName && (
                      <p className="mt-1 text-sm text-destructive">{errors.firstName.message}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="lastName" className="text-sm font-bold text-slate-900" required>Last Name</Label>
                    <Input
                      id="lastName"
                      {...register('lastName')}
                      error={!!errors.lastName}
                      disabled={isSubmitting}
                      placeholder="Last name"
                      className="mt-2 rounded-lg border-slate-200"
                    />
                    {errors.lastName && (
                      <p className="mt-1 text-sm text-destructive">{errors.lastName.message}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="email" className="text-sm font-bold text-slate-900" required>Email</Label>
                    <Input
                      id="email"
                      type="email"
                      {...register('email')}
                      error={!!errors.email}
                      disabled={isSubmitting}
                      placeholder="Email address"
                      className="mt-2 rounded-lg border-slate-200"
                    />
                    {errors.email && (
                      <p className="mt-1 text-sm text-destructive">{errors.email.message}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="ccEmail" className="text-sm font-bold text-slate-900">CC Email</Label>
                    <Input
                      id="ccEmail"
                      type="email"
                      {...register('ccEmail')}
                      error={!!errors.ccEmail}
                      disabled={isSubmitting}
                      placeholder="CC email address"
                      className="mt-2 rounded-lg border-slate-200"
                    />
                    {errors.ccEmail && (
                      <p className="mt-1 text-sm text-destructive">{errors.ccEmail.message}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="cellPhone" className="text-sm font-bold text-slate-900" required>Cell Phone</Label>
                    <Input
                      id="cellPhone"
                      {...register('cellPhone')}
                      error={!!errors.cellPhone}
                      disabled={isSubmitting}
                      placeholder="(123) 456-7890"
                      className="mt-2 rounded-lg border-slate-200"
                    />
                    {errors.cellPhone && (
                      <p className="mt-1 text-sm text-destructive">{errors.cellPhone.message}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="businessPhone" className="text-sm font-bold text-slate-900">Business Phone</Label>
                    <Input
                      id="businessPhone"
                      {...register('businessPhone')}
                      error={!!errors.businessPhone}
                      disabled={isSubmitting}
                      placeholder="(123) 456-7890"
                      className="mt-2 rounded-lg border-slate-200"
                    />
                    {errors.businessPhone && (
                      <p className="mt-1 text-sm text-destructive">{errors.businessPhone.message}</p>
                    )}
                  </div>
                </div>
                <div className="mt-5 grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">
                  <div>
                    <Label htmlFor="details" className="text-sm font-bold text-slate-900">Details</Label>
                    <Textarea
                      id="details"
                      {...register('details')}
                      disabled={isSubmitting}
                      rows={3}
                      placeholder="Additional details"
                      className="mt-2 rounded-lg border-slate-200"
                    />
                    {errors.details && (
                      <p className="mt-1 text-sm text-destructive">{errors.details.message}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="requirements" className="text-sm font-bold text-slate-900">Requirements</Label>
                    <Textarea
                      id="requirements"
                      {...register('requirements')}
                      disabled={isSubmitting}
                      rows={3}
                      placeholder="e.g., Business casual attire"
                      className="mt-2 rounded-lg border-slate-200"
                    />
                    {errors.requirements && (
                      <p className="mt-1 text-sm text-destructive">{errors.requirements.message}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Address Tab */}
            {clientTab === 'address' && (
              <div className="mx-auto max-w-4xl">
                <h3 className="text-base font-bold text-slate-900">Business Address</h3>
                <p className="mt-1 text-xs text-slate-500">Search or manually enter the primary business address.</p>
                <div className="mt-6 grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">
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
                    <Label htmlFor="businessAddress" className="text-sm font-bold text-slate-900">Business Address</Label>
                    <Input
                      id="businessAddress"
                      {...register('businessAddress')}
                      error={!!errors.businessAddress}
                      disabled={isSubmitting}
                      placeholder="Business address"
                      className="mt-2 rounded-lg border-slate-200"
                    />
                    {errors.businessAddress && (
                      <p className="mt-1 text-sm text-destructive">{errors.businessAddress.message}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="businessAddressLine2" className="text-sm font-bold text-slate-900">Apt / Suite / Unit</Label>
                    <Input
                      id="businessAddressLine2"
                      {...register('businessAddressLine2')}
                      disabled={isSubmitting}
                      placeholder="Suite 200"
                      className="mt-2 rounded-lg border-slate-200"
                    />
                  </div>
                  <div>
                    <Label htmlFor="city" className="text-sm font-bold text-slate-900" required>City</Label>
                    <Input
                      id="city"
                      {...register('city')}
                      error={!!errors.city}
                      disabled={isSubmitting}
                      placeholder="City"
                      className="mt-2 rounded-lg border-slate-200"
                    />
                    {errors.city && (
                      <p className="mt-1 text-sm text-destructive">{errors.city.message}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="state" className="text-sm font-bold text-slate-900" required>State</Label>
                    <Input
                      id="state"
                      {...register('state')}
                      error={!!errors.state}
                      disabled={isSubmitting}
                      placeholder="State"
                      className="mt-2 rounded-lg border-slate-200"
                    />
                    {errors.state && (
                      <p className="mt-1 text-sm text-destructive">{errors.state.message}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="zipCode" className="text-sm font-bold text-slate-900" required>ZIP Code</Label>
                    <Input
                      id="zipCode"
                      {...register('zipCode')}
                      error={!!errors.zipCode}
                      disabled={isSubmitting}
                      placeholder="ZIP code"
                      className="mt-2 rounded-lg border-slate-200"
                    />
                    {errors.zipCode && (
                      <p className="mt-1 text-sm text-destructive">{errors.zipCode.message}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Billing Tab */}
            {clientTab === 'billing' && (
              <div className="mx-auto max-w-4xl">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Billing Contact</h3>
                    <p className="mt-1 text-xs text-slate-500">Who should receive billing communications?</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="sameAsContact"
                      {...register('sameAsContact')}
                      disabled={isSubmitting}
                    />
                    <Label htmlFor="sameAsContact" className="cursor-pointer text-sm font-medium">
                      Same as contact
                    </Label>
                  </div>
                </div>
                <div className="mt-6 grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">
                  <div>
                    <Label htmlFor="billingFirstName" className="text-sm font-bold text-slate-900">Billing First Name</Label>
                    <Input
                      id="billingFirstName"
                      {...register('billingFirstName')}
                      error={!!errors.billingFirstName}
                      disabled={isSubmitting || sameAsContact}
                      placeholder="First name"
                      className="mt-2 rounded-lg border-slate-200"
                    />
                    {errors.billingFirstName && (
                      <p className="mt-1 text-sm text-destructive">{errors.billingFirstName.message}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="billingLastName" className="text-sm font-bold text-slate-900">Billing Last Name</Label>
                    <Input
                      id="billingLastName"
                      {...register('billingLastName')}
                      error={!!errors.billingLastName}
                      disabled={isSubmitting || sameAsContact}
                      placeholder="Last name"
                      className="mt-2 rounded-lg border-slate-200"
                    />
                    {errors.billingLastName && (
                      <p className="mt-1 text-sm text-destructive">{errors.billingLastName.message}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="billingEmail" className="text-sm font-bold text-slate-900">Billing Email</Label>
                    <Input
                      id="billingEmail"
                      type="email"
                      {...register('billingEmail')}
                      error={!!errors.billingEmail}
                      disabled={isSubmitting || sameAsContact}
                      placeholder="billing@example.com"
                      className="mt-2 rounded-lg border-slate-200"
                    />
                    {errors.billingEmail && (
                      <p className="mt-1 text-sm text-destructive">{errors.billingEmail.message}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="billingPhone" className="text-sm font-bold text-slate-900">Billing Phone</Label>
                    <Input
                      id="billingPhone"
                      {...register('billingPhone')}
                      error={!!errors.billingPhone}
                      disabled={isSubmitting || sameAsContact}
                      placeholder="(123) 456-7890"
                      className="mt-2 rounded-lg border-slate-200"
                    />
                    {errors.billingPhone && (
                      <p className="mt-1 text-sm text-destructive">{errors.billingPhone.message}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Locations & Access Tab */}
            {clientTab === 'access' && (
              <div className="mx-auto max-w-4xl space-y-6">
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
                <div className="rounded-lg border border-border/30 bg-accent/5 p-5">
                  <h3 className="text-base font-bold text-slate-900">Client Portal Access</h3>
                  <p className="mt-1 text-xs text-slate-500">Control whether this client can log in to the portal.</p>
                  <div className="mt-4 space-y-4">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="hasLoginAccess"
                        {...register('hasLoginAccess')}
                        disabled={isSubmitting}
                        className="mt-1"
                      />
                      <div>
                        <label htmlFor="hasLoginAccess" className="cursor-pointer text-sm font-medium">
                          Give this client the ability to log in
                        </label>
                        <p className="mt-1 text-sm text-muted-foreground">
                          The client will receive an email invitation to set up their account
                        </p>
                      </div>
                    </div>
                    {hasLoginAccess && !isEdit && (
                      <div className="rounded-md border border-blue-200 bg-blue-50 p-3">
                        <p className="text-sm text-blue-900">An invitation email will be sent after creating the client</p>
                      </div>
                    )}
                    {hasLoginAccess && isEdit && !client?.userId && !client?.invitationToken && (
                      <div className="rounded-md border border-blue-200 bg-blue-50 p-3">
                        <p className="text-sm text-blue-900">An invitation email will be sent to the client</p>
                      </div>
                    )}
                    {hasLoginAccess && isEdit && client?.invitationToken && !client?.userId && (
                      <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
                        <p className="text-sm text-amber-900">Invitation pending - waiting for client to accept</p>
                      </div>
                    )}
                    {hasLoginAccess && isEdit && client?.userId && (
                      <div className="rounded-md border border-green-200 bg-green-50 p-3">
                        <p className="text-sm text-green-900">Client Portal Access is currently enabled</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Footer — primary (Continue / save) left; Back, Cancel, Save & New on one row */}
          <div className="shrink-0 border-t border-slate-200 px-6 py-4 sm:px-8">
            <div className="flex w-full min-w-0 flex-row flex-wrap items-center justify-between gap-x-2 gap-y-2">
              <div className="min-w-0 shrink-0">
                {!isLastStep ? (
                  <Button
                    type="button"
                    onClick={goNext}
                    disabled={isSubmitting || !canContinue}
                    className="h-14 shrink-0 rounded-xl bg-slate-900 px-8 text-lg font-bold text-white shadow-lg shadow-slate-200 transition-all hover:bg-slate-800 hover:shadow-none sm:h-16 sm:px-12 sm:text-xl sm:min-w-[300px]"
                  >
                    Continue
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    onClick={handleSaveAndClose}
                    className="h-14 shrink-0 rounded-xl bg-slate-900 px-8 text-lg font-bold text-white shadow-lg shadow-slate-200 transition-all hover:bg-slate-800 hover:shadow-none sm:h-16 sm:px-12 sm:text-xl sm:min-w-[300px]"
                  >
                    {isSubmitting && pendingSaveAction === 'close'
                      ? 'Saving...'
                      : isEdit
                        ? 'Update Client'
                        : !isEdit && isLastStep && hasLoginAccess
                          ? 'Send & Close'
                          : 'Save & Close'}
                  </Button>
                )}
              </div>
              <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
                {isEdit && !isLastStep && (
                  <Button
                    type="submit"
                    variant="outline"
                    onClick={handleUpdateAndContinue}
                    disabled={isSubmitting || !canContinue}
                    className="rounded-lg border-slate-200"
                  >
                    {isSubmitting && pendingSaveAction === 'update-continue' ? 'Saving...' : 'Save & Update'}
                  </Button>
                )}
                {isEdit && onViewDetails && (
                  <Button type="button" variant="outline" onClick={onViewDetails} className="rounded-lg border-slate-200">
                    <EyeIcon className="mr-2 h-4 w-4" />
                    View Details
                  </Button>
                )}
                {stepIndex > 0 && (
                  <Button type="button" variant="outline" onClick={goBack} disabled={isSubmitting} className="rounded-lg border-slate-200">
                    Back
                  </Button>
                )}
                <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting} className="rounded-lg border-slate-200">
                  Cancel
                </Button>
                {!isEdit && (
                  <Button type="submit" variant="outline" disabled={isSubmitting} onClick={handleSaveAndNew} className="rounded-lg border-slate-200">
                    {isSubmitting && pendingSaveAction === 'new' ? 'Saving...' : isLastStep && hasLoginAccess ? 'Send & New' : 'Save & New'}
                  </Button>
                )}
              </div>
            </div>
          </div>

        </form>
      </DialogContent>
    </Dialog>
  );
}
