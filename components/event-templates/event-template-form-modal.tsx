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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { CreateEventTemplateInput, UpdateEventTemplateInput, FileLink, CustomField } from '@/lib/schemas/event-template.schema';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm, useFieldArray, Controller, type SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { CloseIcon, PlusIcon, XIcon } from '@/components/ui/icons';
import { trpc } from '@/lib/client/trpc';
import { useTerminology } from '@/lib/hooks/use-terminology';
import { AddressAutocomplete } from '@/components/maps/address-autocomplete';
import { EventDocumentUpload, type EventDocument } from '@/components/events/event-document-upload';
import { RequestMethod, AmountType } from '@prisma/client';
import { AMOUNT_TYPE_OPTIONS } from '@/lib/constants/enums';

// Request method options
const REQUEST_METHODS = [
  { value: 'EMAIL', label: 'Email' },
  { value: 'TEXT_SMS', label: 'Text/SMS' },
  { value: 'PHONE_CALL', label: 'Phone Call' },
] as const;

// Common timezones
const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "America/Anchorage",
  "Pacific/Honolulu",
  "America/Toronto",
  "America/Vancouver",
  "Europe/London",
  "Europe/Paris",
  "Asia/Tokyo",
  "Australia/Sydney",
];

// Time format validation
const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

// File link schema
const fileLinkSchema = z.object({
  name: z.string().min(1, "File name is required").max(100, "File name too long"),
  link: z.string().url("Invalid file link URL"),
});

// Event document schema
const eventDocumentSchema = z.object({
  name: z.string().min(1, "Document name is required"),
  url: z.string().url("Invalid document URL"),
  type: z.string().optional(),
  size: z.number().optional(),
});

// Custom field schema
const customFieldSchema = z.object({
  label: z.string().min(1, "Label is required").max(100, "Label too long"),
  value: z.string().max(1000, "Value too long"),
});

// Form schema - define directly to avoid refinement extension issues
const formSchema = z.object({
  // Template metadata
  name: z.string().min(1, "Template name is required").max(200).transform((val) => val.trim()),
  description: z.string().max(500).optional().transform((val) => val?.trim()),

  // Event fields to prefill
  title: z.string().max(200).optional().transform((val) => val?.trim()),
  eventDescription: z.string().max(5000).optional().transform((val) => val?.trim()),
  requirements: z.string().max(500).optional().transform((val) => val?.trim()),
  privateComments: z.string().max(5000).optional().transform((val) => val?.trim()),

  // Client relationship
  clientId: z.string().uuid().optional().or(z.literal("")),

  // Request Information
  requestMethod: z.nativeEnum(RequestMethod).optional().nullable(),
  requestorName: z.string().max(200).optional().transform((val) => val?.trim()),
  requestorPhone: z.string().max(50).optional().transform((val) => val?.trim()),
  requestorEmail: z.string().max(255).email("Invalid email").optional().or(z.literal("")),
  poNumber: z.string().max(100).optional().transform((val) => val?.trim()),

  // Venue Information
  venueName: z.string().max(200).optional().transform((val) => val?.trim()),
  address: z.string().max(300).optional().transform((val) => val?.trim()),
  city: z.string().max(100).optional().transform((val) => val?.trim()),
  state: z.string().max(50).optional().transform((val) => val?.trim()),
  zipCode: z.string().max(20).optional().transform((val) => val?.trim()),

  // Location Coordinates
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),

  // Onsite Contact & Meeting Point
  meetingPoint: z.string().max(300).optional().transform((val) => val?.trim()),
  onsitePocName: z.string().max(200).optional().transform((val) => val?.trim()),
  onsitePocPhone: z.string().max(50).optional().transform((val) => val?.trim()),
  onsitePocEmail: z.string().max(255).email("Invalid email").optional().or(z.literal("")),

  // Date and Time
  startDate: z.coerce.date().optional(),
  startTime: z.string().refine((val) => !val || val === "TBD" || timeRegex.test(val), {
    message: "Start time must be in HH:MM format or TBD",
  }).optional(),
  endDate: z.coerce.date().optional(),
  endTime: z.string().refine((val) => !val || val === "TBD" || timeRegex.test(val), {
    message: "End time must be in HH:MM format or TBD",
  }).optional(),
  timezone: z.string().optional(),

  // Pre-Event Instructions
  preEventInstructions: z.string().max(5000).optional().transform((val) => val?.trim()),

  // Event Documents
  eventDocuments: z.array(eventDocumentSchema).max(20).optional(),

  // File Links
  fileLinks: z.array(fileLinkSchema).max(20).optional(),

  // Custom Fields
  customFields: z.array(customFieldSchema).max(20).optional(),

  // Billing & Rate Settings
  estimate: z.boolean().optional(),
  taskRateType: z.nativeEnum(AmountType).optional().nullable(),
  commission: z.boolean().optional(),
  commissionAmount: z.number().min(0).optional().nullable(),
  commissionAmountType: z.nativeEnum(AmountType).optional().nullable(),
  approveForOvertime: z.boolean().optional(),
  overtimeRate: z.number().min(0).optional().nullable(),
  overtimeRateType: z.nativeEnum(AmountType).optional().nullable(),

  // UI-only fields
  startTimeTBD: z.boolean().default(false),
  endTimeTBD: z.boolean().default(false),
});

type FormInput = z.input<typeof formSchema>;
type FormOutput = z.infer<typeof formSchema>;

interface EventTemplate {
  id: string;
  name: string;
  description?: string | null;
  title?: string | null;
  eventDescription?: string | null;
  requirements?: string | null;
  privateComments?: string | null;
  clientId?: string | null;
  // Request Information
  requestMethod?: RequestMethod | null;
  requestorName?: string | null;
  requestorPhone?: string | null;
  requestorEmail?: string | null;
  poNumber?: string | null;
  // Venue Information
  venueName?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  // Onsite Contact & Meeting Point
  meetingPoint?: string | null;
  onsitePocName?: string | null;
  onsitePocPhone?: string | null;
  onsitePocEmail?: string | null;
  // Date & Time
  startDate?: Date | null;
  startTime?: string | null;
  endDate?: Date | null;
  endTime?: string | null;
  timezone?: string | null;
  // Event Instructions & Documents
  preEventInstructions?: string | null;
  eventDocuments?: EventDocument[] | null;
  // File Links
  fileLinks?: FileLink[] | null;
  // Custom Fields
  customFields?: CustomField[] | null;
  // Billing & Rate Settings
  estimate?: boolean | null;
  taskRateType?: AmountType | null;
  commission?: boolean | null;
  commissionAmount?: number | null;
  commissionAmountType?: AmountType | null;
  approveForOvertime?: boolean | null;
  overtimeRate?: number | null;
  overtimeRateType?: AmountType | null;
}

interface EventTemplateFormModalProps {
  template: EventTemplate | null;
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateEventTemplateInput | Omit<UpdateEventTemplateInput, 'id'>) => void;
  isSubmitting: boolean;
  backendErrors?: Array<{ field: string; message: string }>;
}

export function EventTemplateFormModal({
  template,
  open,
  onClose,
  onSubmit,
  isSubmitting,
  backendErrors = [],
}: EventTemplateFormModalProps) {
  const { terminology } = useTerminology();
  const isEdit = !!template;
  const [startTimeTBD, setStartTimeTBD] = useState(false);
  const [endTimeTBD, setEndTimeTBD] = useState(false);

  // Fetch clients for dropdown
  const { data: clientsData } = trpc.clients.getAll.useQuery({
    page: 1,
    limit: 100
  });
  const { data: companyProfile } = trpc.settings.getCompanyProfile.useQuery();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setError,
    setValue,
    watch,
    control,
  } = useForm<FormInput, undefined, FormOutput>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      title: '',
      eventDescription: '',
      requirements: '',
      privateComments: '',
      clientId: '',
      // Request Information
      requestMethod: undefined,
      requestorName: '',
      requestorPhone: '',
      requestorEmail: '',
      poNumber: '',
      // Venue Information
      venueName: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      // Onsite Contact & Meeting Point
      meetingPoint: '',
      onsitePocName: '',
      onsitePocPhone: '',
      onsitePocEmail: '',
      // Date & Time
      startDate: undefined,
      startTime: '',
      endDate: undefined,
      endTime: '',
      timezone: companyProfile?.companyTimezone || 'America/New_York',
      // Event Instructions & Documents
      preEventInstructions: '',
      eventDocuments: [],
      // File Links
      fileLinks: [],
      // Custom Fields
      customFields: [],
      // Billing & Rate Settings
      estimate: undefined,
      taskRateType: undefined,
      commission: undefined,
      commissionAmount: undefined,
      commissionAmountType: undefined,
      approveForOvertime: undefined,
      overtimeRate: undefined,
      overtimeRateType: undefined,
      startTimeTBD: false,
      endTimeTBD: false,
    },
  });

  const { fields, append, remove } = useFieldArray<FormInput, "fileLinks">({
    control,
    name: "fileLinks",
  });

  const { fields: customFieldsFields, append: appendCustomField, remove: removeCustomField } = useFieldArray<FormInput, "customFields">({
    control,
    name: "customFields",
  });

  useEffect(() => {
    if (template) {
      const fileLinksData = template.fileLinks as FileLink[] | null;
      const eventDocumentsData = template.eventDocuments as EventDocument[] | null;
      const customFieldsData = template.customFields as CustomField[] | null;

      // Format dates to YYYY-MM-DD for date inputs
      const formatDateForInput = (date: Date | string | null | undefined) => {
        if (!date) return undefined;
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      reset({
        name: template.name,
        description: template.description || '',
        title: template.title || '',
        eventDescription: template.eventDescription || '',
        requirements: template.requirements || '',
        privateComments: template.privateComments || '',
        clientId: template.clientId || '',
        // Request Information
        requestMethod: template.requestMethod || undefined,
        requestorName: template.requestorName || '',
        requestorPhone: template.requestorPhone || '',
        requestorEmail: template.requestorEmail || '',
        poNumber: template.poNumber || '',
        // Venue Information
        venueName: template.venueName || '',
        address: template.address || '',
        city: template.city || '',
        state: template.state || '',
        zipCode: template.zipCode || '',
        latitude: template.latitude || undefined,
        longitude: template.longitude || undefined,
        // Onsite Contact & Meeting Point
        meetingPoint: template.meetingPoint || '',
        onsitePocName: template.onsitePocName || '',
        onsitePocPhone: template.onsitePocPhone || '',
        onsitePocEmail: template.onsitePocEmail || '',
        // Date & Time
        startDate: formatDateForInput(template.startDate) as any,
        startTime: template.startTime === 'TBD' ? '' : (template.startTime || ''),
        endDate: formatDateForInput(template.endDate) as any,
        endTime: template.endTime === 'TBD' ? '' : (template.endTime || ''),
        timezone: template.timezone || '',
        // Event Instructions & Documents
        preEventInstructions: template.preEventInstructions || '',
        eventDocuments: eventDocumentsData || [],
        // File Links
        fileLinks: fileLinksData || [],
        // Custom Fields
        customFields: customFieldsData || [],
        // Billing & Rate Settings
        estimate: template.estimate ?? undefined,
        taskRateType: template.taskRateType || undefined,
        commission: template.commission ?? undefined,
        commissionAmount: template.commissionAmount ?? undefined,
        commissionAmountType: template.commissionAmountType || undefined,
        approveForOvertime: template.approveForOvertime ?? undefined,
        overtimeRate: template.overtimeRate ?? undefined,
        overtimeRateType: template.overtimeRateType || undefined,
        startTimeTBD: template.startTime === 'TBD',
        endTimeTBD: template.endTime === 'TBD',
      });
      setStartTimeTBD(template.startTime === 'TBD');
      setEndTimeTBD(template.endTime === 'TBD');
    } else {
      reset({
        name: '',
        description: '',
        title: '',
        eventDescription: '',
        requirements: '',
        privateComments: '',
        clientId: '',
        // Request Information
        requestMethod: undefined,
        requestorName: '',
        requestorPhone: '',
        requestorEmail: '',
        poNumber: '',
        // Venue Information
        venueName: '',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        // Onsite Contact & Meeting Point
        meetingPoint: '',
        onsitePocName: '',
        onsitePocPhone: '',
        onsitePocEmail: '',
        // Date & Time
        startDate: undefined,
        startTime: '',
        endDate: undefined,
        endTime: '',
        timezone: companyProfile?.companyTimezone || 'America/New_York',
        // Event Instructions & Documents
        preEventInstructions: '',
        eventDocuments: [],
        // File Links
        fileLinks: [],
        // Custom Fields
        customFields: [],
        // Billing & Rate Settings
        estimate: undefined,
        taskRateType: undefined,
        commission: undefined,
        commissionAmount: undefined,
        commissionAmountType: undefined,
        approveForOvertime: undefined,
        overtimeRate: undefined,
        overtimeRateType: undefined,
        startTimeTBD: false,
        endTimeTBD: false,
      });
      setStartTimeTBD(false);
      setEndTimeTBD(false);
    }
  }, [template, reset, open, companyProfile]);

  // Map backend errors to form fields
  useEffect(() => {
    if (backendErrors && backendErrors.length > 0) {
      backendErrors.forEach((error) => {
        setError(error.field as keyof FormInput, {
          type: 'manual',
          message: error.message,
        });
      });
    }
  }, [backendErrors, setError]);

  const handleFormSubmit: SubmitHandler<FormOutput> = (data) => {
    // Remove UI-only fields and normalize time values
    const { startTimeTBD: _s, endTimeTBD: _e, ...submitData } = data;
    const normalizedData = {
      ...submitData,
      startTime: startTimeTBD ? 'TBD' : (submitData.startTime || undefined),
      endTime: endTimeTBD ? 'TBD' : (submitData.endTime || undefined),
    };

    onSubmit(normalizedData);
  };

  return (
    <Dialog open={open} onClose={onClose} className="max-w-4xl">
      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>
              {isEdit ? `Edit ${terminology.event.singular} Template` : `Create ${terminology.event.singular} Template`}
            </DialogTitle>
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
          {/* Template Information */}
          <div className="bg-primary/5 border border-primary/20 p-5 rounded-lg mb-6">
            <h3 className="text-lg font-semibold border-b border-border pb-2 mb-4">Template Information</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name" required>Template Name</Label>
                <Input
                  id="name"
                  {...register('name')}
                  error={!!errors.name}
                  disabled={isSubmitting}
                  placeholder="e.g., Corporate Conference"
                />
                {errors.name && (
                  <p className="text-sm text-destructive mt-1">{errors.name.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="description">Template Description</Label>
                <Textarea
                  id="description"
                  {...register('description')}
                  disabled={isSubmitting}
                  rows={2}
                  placeholder="Brief description of when to use this template"
                />
                {errors.description && (
                  <p className="text-sm text-destructive mt-1">{errors.description.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Event Details to Prefill */}
          <div className="bg-accent/5 border border-border/30 p-5 rounded-lg mb-6">
            <h3 className="text-lg font-semibold border-b border-border pb-2 mb-4">
              {terminology.event.singular} Details (Prefill Values)
            </h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">{terminology.event.singular} Title</Label>
                <Input
                  id="title"
                  {...register('title')}
                  error={!!errors.title}
                  disabled={isSubmitting}
                  placeholder={`Default ${terminology.event.lower} title`}
                />
                {errors.title && (
                  <p className="text-sm text-destructive mt-1">{errors.title.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="clientId">Default Client</Label>
                <Controller
                  name="clientId"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value ?? '__none__'} onValueChange={(value) => field.onChange(value === '__none__' ? null : value)} disabled={isSubmitting}>
                      <SelectTrigger id="clientId">
                        <SelectValue placeholder="No default client" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">No default client</SelectItem>
                        {clientsData?.data.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.businessName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.clientId && (
                  <p className="text-sm text-destructive mt-1">{errors.clientId.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="eventDescription">Description</Label>
                <Textarea
                  id="eventDescription"
                  {...register('eventDescription')}
                  disabled={isSubmitting}
                  rows={3}
                  placeholder={`Default ${terminology.event.lower} description`}
                />
                {errors.eventDescription && (
                  <p className="text-sm text-destructive mt-1">{errors.eventDescription.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="requirements">Requirements</Label>
                <Textarea
                  id="requirements"
                  {...register('requirements')}
                  disabled={isSubmitting}
                  rows={2}
                  placeholder="e.g., Business casual attire, Steel-toed boots required"
                />
                {errors.requirements && (
                  <p className="text-sm text-destructive mt-1">{errors.requirements.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Request Information */}
          <div className="bg-accent/5 border border-border/30 p-5 rounded-lg mb-6">
            <h3 className="text-lg font-semibold border-b border-border pb-2 mb-4">Request Information</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="requestMethod">Request Method</Label>
                  <Controller
                    name="requestMethod"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value ?? '__none__'} onValueChange={(value) => field.onChange(value === '__none__' ? null : value)} disabled={isSubmitting}>
                        <SelectTrigger id="requestMethod">
                          <SelectValue placeholder="Select method..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Select method...</SelectItem>
                          {REQUEST_METHODS.map((method) => (
                            <SelectItem key={method.value} value={method.value}>
                              {method.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.requestMethod && (
                    <p className="text-sm text-destructive mt-1">{errors.requestMethod.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="poNumber">PO # (Purchase Order)</Label>
                  <Input
                    id="poNumber"
                    {...register('poNumber')}
                    error={!!errors.poNumber}
                    disabled={isSubmitting}
                    placeholder="PO-12345"
                  />
                  {errors.poNumber && (
                    <p className="text-sm text-destructive mt-1">{errors.poNumber.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="requestorName">Requestor Name</Label>
                  <Input
                    id="requestorName"
                    {...register('requestorName')}
                    error={!!errors.requestorName}
                    disabled={isSubmitting}
                    placeholder="John Smith"
                  />
                  {errors.requestorName && (
                    <p className="text-sm text-destructive mt-1">{errors.requestorName.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="requestorPhone">Requestor Phone</Label>
                  <Input
                    id="requestorPhone"
                    {...register('requestorPhone')}
                    error={!!errors.requestorPhone}
                    disabled={isSubmitting}
                    placeholder="(555) 123-4567"
                  />
                  {errors.requestorPhone && (
                    <p className="text-sm text-destructive mt-1">{errors.requestorPhone.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="requestorEmail">Requestor Email</Label>
                  <Input
                    id="requestorEmail"
                    type="email"
                    {...register('requestorEmail')}
                    error={!!errors.requestorEmail}
                    disabled={isSubmitting}
                    placeholder="john@example.com"
                  />
                  {errors.requestorEmail && (
                    <p className="text-sm text-destructive mt-1">{errors.requestorEmail.message}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Venue Information */}
          <div className="bg-accent/5 border border-border/30 p-5 rounded-lg mb-6">
            <h3 className="text-lg font-semibold border-b border-border pb-2 mb-4">Venue Information</h3>
            <div className="space-y-4">
              {/* Address Autocomplete */}
              <div className="bg-blue-50/50 border border-blue-200 rounded-lg p-4">
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
                <p className="text-xs text-muted-foreground mt-2">
                  Start typing to search for an address, or fill in the fields below manually
                </p>
              </div>

              <div>
                <Label htmlFor="venueName">Venue Name</Label>
                <Input
                  id="venueName"
                  {...register('venueName')}
                  error={!!errors.venueName}
                  disabled={isSubmitting}
                  placeholder="Convention Center"
                />
                {errors.venueName && (
                  <p className="text-sm text-destructive mt-1">{errors.venueName.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  {...register('address')}
                  error={!!errors.address}
                  disabled={isSubmitting}
                  placeholder="123 Main Street"
                />
                {errors.address && (
                  <p className="text-sm text-destructive mt-1">{errors.address.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    {...register('city')}
                    error={!!errors.city}
                    disabled={isSubmitting}
                    placeholder="New York"
                  />
                  {errors.city && (
                    <p className="text-sm text-destructive mt-1">{errors.city.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    {...register('state')}
                    error={!!errors.state}
                    disabled={isSubmitting}
                    placeholder="NY"
                  />
                  {errors.state && (
                    <p className="text-sm text-destructive mt-1">{errors.state.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="zipCode">ZIP Code</Label>
                  <Input
                    id="zipCode"
                    {...register('zipCode')}
                    error={!!errors.zipCode}
                    disabled={isSubmitting}
                    placeholder="10001"
                  />
                  {errors.zipCode && (
                    <p className="text-sm text-destructive mt-1">{errors.zipCode.message}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Onsite Contact & Meeting Point */}
          <div className="bg-accent/5 border border-border/30 p-5 rounded-lg mb-6">
            <h3 className="text-lg font-semibold border-b border-border pb-2 mb-4">Onsite Contact & Meeting Point</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="meetingPoint">Meeting Point</Label>
                <Input
                  id="meetingPoint"
                  {...register('meetingPoint')}
                  error={!!errors.meetingPoint}
                  disabled={isSubmitting}
                  placeholder="e.g., Main entrance, Loading dock B"
                />
                {errors.meetingPoint && (
                  <p className="text-sm text-destructive mt-1">{errors.meetingPoint.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="onsitePocName">Onsite POC Name</Label>
                  <Input
                    id="onsitePocName"
                    {...register('onsitePocName')}
                    error={!!errors.onsitePocName}
                    disabled={isSubmitting}
                    placeholder="Jane Doe"
                  />
                  {errors.onsitePocName && (
                    <p className="text-sm text-destructive mt-1">{errors.onsitePocName.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="onsitePocPhone">Onsite POC Phone</Label>
                  <Input
                    id="onsitePocPhone"
                    {...register('onsitePocPhone')}
                    error={!!errors.onsitePocPhone}
                    disabled={isSubmitting}
                    placeholder="(555) 987-6543"
                  />
                  {errors.onsitePocPhone && (
                    <p className="text-sm text-destructive mt-1">{errors.onsitePocPhone.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="onsitePocEmail">Onsite POC Email</Label>
                  <Input
                    id="onsitePocEmail"
                    type="email"
                    {...register('onsitePocEmail')}
                    error={!!errors.onsitePocEmail}
                    disabled={isSubmitting}
                    placeholder="jane@example.com"
                  />
                  {errors.onsitePocEmail && (
                    <p className="text-sm text-destructive mt-1">{errors.onsitePocEmail.message}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Date & Time */}
          <div className="bg-accent/5 border border-border/30 p-5 rounded-lg mb-6">
            <h3 className="text-lg font-semibold border-b border-border pb-2 mb-4">Date & Time</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    {...register('startDate')}
                    error={!!errors.startDate}
                    disabled={isSubmitting}
                  />
                  {errors.startDate && (
                    <p className="text-sm text-destructive mt-1">{errors.startDate.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="startTime">Start Time</Label>
                  <div className="flex gap-2">
                    <Input
                      id="startTime"
                      type="time"
                      {...register('startTime')}
                      error={!!errors.startTime}
                      disabled={isSubmitting || startTimeTBD}
                      className="flex-1"
                    />
                    <label className="flex items-center gap-2 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={startTimeTBD}
                        onChange={(e) => {
                          setStartTimeTBD(e.target.checked);
                          if (e.target.checked) setValue('startTime', '');
                        }}
                        disabled={isSubmitting}
                        className="rounded border-input"
                      />
                      <span className="text-sm">TBD</span>
                    </label>
                  </div>
                  {errors.startTime && (
                    <p className="text-sm text-destructive mt-1">{errors.startTime.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    {...register('endDate')}
                    error={!!errors.endDate}
                    disabled={isSubmitting}
                  />
                  {errors.endDate && (
                    <p className="text-sm text-destructive mt-1">{errors.endDate.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="endTime">End Time</Label>
                  <div className="flex gap-2">
                    <Input
                      id="endTime"
                      type="time"
                      {...register('endTime')}
                      error={!!errors.endTime}
                      disabled={isSubmitting || endTimeTBD}
                      className="flex-1"
                    />
                    <label className="flex items-center gap-2 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={endTimeTBD}
                        onChange={(e) => {
                          setEndTimeTBD(e.target.checked);
                          if (e.target.checked) setValue('endTime', '');
                        }}
                        disabled={isSubmitting}
                        className="rounded border-input"
                      />
                      <span className="text-sm">TBD</span>
                    </label>
                  </div>
                  {errors.endTime && (
                    <p className="text-sm text-destructive mt-1">{errors.endTime.message}</p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="timezone">Timezone</Label>
                <Controller
                  name="timezone"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value ?? '__none__'} onValueChange={(value) => field.onChange(value === '__none__' ? null : value)} disabled={isSubmitting}>
                      <SelectTrigger id="timezone">
                        <SelectValue placeholder="No default timezone" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">No default timezone</SelectItem>
                        {TIMEZONES.map((tz) => (
                          <SelectItem key={tz} value={tz}>
                            {tz}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.timezone && (
                  <p className="text-sm text-destructive mt-1">{errors.timezone.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Pre-Event Instructions */}
          <div className="bg-accent/5 border border-border/30 p-5 rounded-lg mb-6">
            <h3 className="text-lg font-semibold border-b border-border pb-2 mb-4">Pre-Event Instructions</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="preEventInstructions">Instructions for Staff</Label>
                <Textarea
                  id="preEventInstructions"
                  {...register('preEventInstructions')}
                  disabled={isSubmitting}
                  rows={4}
                  placeholder="Enter any pre-event instructions, parking details, check-in procedures, etc."
                />
                {errors.preEventInstructions && (
                  <p className="text-sm text-destructive mt-1">{errors.preEventInstructions.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Event Documents */}
          <div className="bg-accent/5 border border-border/30 p-5 rounded-lg mb-6">
            <h3 className="text-lg font-semibold border-b border-border pb-2 mb-4">Event Documents</h3>
            <div className="space-y-4">
              <EventDocumentUpload
                documents={watch('eventDocuments') || []}
                onChange={(docs) => setValue('eventDocuments', docs)}
                disabled={isSubmitting}
              />
              {errors.eventDocuments && (
                <p className="text-sm text-destructive mt-1">{errors.eventDocuments.message}</p>
              )}
            </div>
          </div>

          {/* File Links */}
          <div className="bg-accent/5 border border-border/30 p-5 rounded-lg mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold border-b border-border pb-2 flex-1">File Links</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ name: '', link: '' })}
                disabled={isSubmitting}
              >
                <PlusIcon className="h-4 w-4 mr-1" />
                Add File
              </Button>
            </div>

            {fields.length === 0 && (
              <p className="text-sm text-muted-foreground">No files added yet</p>
            )}

            <div className="space-y-3">
              {fields.map((field, index) => (
                <div key={field.id}>
                  <div className="flex gap-2">
                    <div className="flex-1 space-y-1">
                      <Input
                        {...register(`fileLinks.${index}.name` as const)}
                        placeholder="File name"
                        disabled={isSubmitting}
                        error={!!(errors.fileLinks?.[index]?.name)}
                      />
                      {errors.fileLinks?.[index]?.name && (
                        <p className="text-sm text-destructive">
                          {errors.fileLinks[index]?.name?.message}
                        </p>
                      )}
                    </div>
                    <div className="flex-[2] space-y-1">
                      <Input
                        {...register(`fileLinks.${index}.link` as const)}
                        placeholder="https://example.com/file.pdf"
                        disabled={isSubmitting}
                        error={!!(errors.fileLinks?.[index]?.link)}
                      />
                      {errors.fileLinks?.[index]?.link && (
                        <p className="text-sm text-destructive">
                          {errors.fileLinks[index]?.link?.message}
                        </p>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => remove(index)}
                      disabled={isSubmitting}
                      className="self-start"
                    >
                      <XIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Private Notes */}
          <div className="bg-accent/5 border border-border/30 p-5 rounded-lg mb-6">
            <h3 className="text-lg font-semibold border-b border-border pb-2 mb-4">Private Notes</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="privateComments">Private Comments</Label>
                <Textarea
                  id="privateComments"
                  {...register('privateComments')}
                  disabled={isSubmitting}
                  rows={3}
                  placeholder="Internal notes (not visible to clients)"
                />
                {errors.privateComments && (
                  <p className="text-sm text-destructive mt-1">{errors.privateComments.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Custom Fields */}
          <div className="bg-accent/5 border border-border/30 p-5 rounded-lg mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold border-b border-border pb-2 flex-1">Custom Fields</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => appendCustomField({ label: '', value: '' })}
                disabled={isSubmitting}
              >
                <PlusIcon className="h-4 w-4 mr-1" />
                Add Field
              </Button>
            </div>

            {customFieldsFields.length === 0 && (
              <p className="text-sm text-muted-foreground">No custom fields added yet</p>
            )}

            <div className="space-y-3">
              {customFieldsFields.map((field, index) => (
                <div key={field.id}>
                  <div className="flex gap-2">
                    <div className="flex-1 space-y-1">
                      <Input
                        {...register(`customFields.${index}.label` as const)}
                        placeholder="Field label"
                        disabled={isSubmitting}
                        error={!!(errors.customFields?.[index]?.label)}
                      />
                      {errors.customFields?.[index]?.label && (
                        <p className="text-sm text-destructive">
                          {errors.customFields[index]?.label?.message}
                        </p>
                      )}
                    </div>
                    <div className="flex-2 space-y-1">
                      <Input
                        {...register(`customFields.${index}.value` as const)}
                        placeholder="Field value"
                        disabled={isSubmitting}
                        error={!!(errors.customFields?.[index]?.value)}
                      />
                      {errors.customFields?.[index]?.value && (
                        <p className="text-sm text-destructive">
                          {errors.customFields[index]?.value?.message}
                        </p>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeCustomField(index)}
                      disabled={isSubmitting}
                      className="self-start"
                    >
                      <XIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Task Settings */}
          <div className="bg-accent/5 border border-border/30 p-5 rounded-lg mb-6">
            <h3 className="text-lg font-semibold border-b border-border pb-2 mb-4">Task Settings</h3>
            <div className="space-y-6">
              {/* Row 1: Create an estimate? + Task Rate Type */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label className="text-sm font-medium mb-3 block">Create an estimate?</Label>
                  <div className="flex items-center gap-4 h-10">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="estimate"
                        checked={watch('estimate') === true}
                        onChange={() => setValue('estimate', true)}
                        disabled={isSubmitting}
                        className="accent-primary"
                      />
                      <span className="text-sm">Yes</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="estimate"
                        checked={watch('estimate') === false}
                        onChange={() => setValue('estimate', false)}
                        disabled={isSubmitting}
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
                        onValueChange={(value) => field.onChange(value || null)}
                        disabled={isSubmitting || !watch('estimate')}
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
                        checked={watch('commission') === true}
                        onChange={() => setValue('commission', true)}
                        disabled={isSubmitting}
                        className="accent-primary"
                      />
                      <span className="text-sm">Yes</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="commission"
                        checked={watch('commission') === false}
                        onChange={() => setValue('commission', false)}
                        disabled={isSubmitting}
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
                    disabled={isSubmitting || !watch('commission')}
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
                        onValueChange={(value) => field.onChange(value || null)}
                        disabled={isSubmitting || !watch('commission')}
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
                        checked={watch('approveForOvertime') === true}
                        onChange={() => setValue('approveForOvertime', true)}
                        disabled={isSubmitting}
                        className="accent-primary"
                      />
                      <span className="text-sm">Yes</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="approveForOvertime"
                        checked={watch('approveForOvertime') === false}
                        onChange={() => setValue('approveForOvertime', false)}
                        disabled={isSubmitting}
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
                    disabled={isSubmitting || !watch('approveForOvertime')}
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
                        onValueChange={(value) => field.onChange(value || null)}
                        disabled={isSubmitting || !watch('approveForOvertime')}
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
          </div>
        </DialogContent>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : isEdit ? 'Update Template' : 'Create Template'}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
