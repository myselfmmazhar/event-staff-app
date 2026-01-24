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
import { Select } from '@/components/ui/select';
import { EventSchema, TIMEZONES, REQUEST_METHODS } from '@/lib/schemas/event.schema';
import type { CreateEventInput, UpdateEventInput, FileLink, EventDocument } from '@/lib/schemas/event.schema';
import { EventStatus, RequestMethod } from '@prisma/client';
import { EventDocumentUpload } from './event-document-upload';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm, useFieldArray, type SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { CloseIcon, PlusIcon, XIcon } from '@/components/ui/icons';
import { trpc } from '@/lib/client/trpc';
import { useTerminology } from '@/lib/hooks/use-terminology';
import { AddressAutocomplete } from '@/components/maps/address-autocomplete';

// Use the create schema directly for create mode
const createFormSchema = EventSchema.create;

// Build edit form schema (all fields optional except those being updated)
const editFormSchema = z.object({
  title: z.string().min(1, "Title is required").max(200).transform(val => val.trim()),
  description: z.string().max(5000).optional().transform(val => val?.trim()),
  requirements: z.string().max(200).optional().transform(val => val?.trim()),
  privateComments: z.string().max(5000).optional().transform(val => val?.trim()),
  clientId: z.string().optional(),
  venueName: z.string().min(1, "Venue name is required").max(200).transform(val => val.trim()),
  address: z.string().min(1, "Address is required").max(300).transform(val => val.trim()),
  city: z.string().min(1, "City is required").max(100).transform(val => val.trim()),
  state: z.string().min(1, "State is required").max(50).transform(val => val.trim()),
  zipCode: z.string().min(1, "ZIP code is required").max(20).transform(val => val.trim()),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  startDate: z.coerce.date({ message: "Start date is required" }),
  startTime: z.string().optional(),
  startTimeTBD: z.boolean().default(false),
  endDate: z.coerce.date({ message: "End date is required" }),
  endTime: z.string().optional(),
  endTimeTBD: z.boolean().default(false),
  timezone: z.string().min(1, "Timezone is required"),
  dailyDigestMode: z.boolean().default(false),
  requireStaff: z.boolean().default(false),
  status: z.nativeEnum(EventStatus).default(EventStatus.DRAFT),
  fileLinks: z.array(z.object({
    name: z.string().min(1, "File name is required"),
    link: z.string().url("Invalid URL"),
  })).optional(),
  // Request Information
  requestMethod: z.nativeEnum(RequestMethod).optional().nullable(),
  requestorName: z.string().max(200).optional().transform(val => val?.trim()),
  requestorPhone: z.string().max(50).optional().transform(val => val?.trim()),
  requestorEmail: z.string().email().max(255).optional().or(z.literal('')),
  poNumber: z.string().max(100).optional().transform(val => val?.trim()),
  // Event Instructions & Documents
  preEventInstructions: z.string().max(10000).optional().transform(val => val?.trim()),
  eventDocuments: z.array(z.object({
    name: z.string(),
    url: z.string().url(),
    type: z.string().optional(),
    size: z.number().optional(),
  })).optional(),
  // Onsite Contact & Meeting Point
  meetingPoint: z.string().max(300).optional().transform(val => val?.trim()),
  onsitePocName: z.string().max(200).optional().transform(val => val?.trim()),
  onsitePocPhone: z.string().max(50).optional().transform(val => val?.trim()),
  onsitePocEmail: z.string().email().max(255).optional().or(z.literal('')),
}).refine((data) => data.endDate >= data.startDate, {
  message: "End date must be after or equal to start date",
  path: ["endDate"],
});

type CreateFormInput = z.input<typeof createFormSchema>;
type EditFormInput = z.input<typeof editFormSchema>;
type FormInput = (CreateFormInput | EditFormInput) & {
  startTimeTBD?: boolean;
  endTimeTBD?: boolean;
};
type CreateFormOutput = z.infer<typeof createFormSchema>;
type EditFormOutput = z.infer<typeof editFormSchema>;
type FormOutput = CreateFormOutput | EditFormOutput;
type FormFieldName = keyof FormInput;

interface Event {
  id: string;
  eventId: string;
  title: string;
  description?: string | null;
  requirements?: string | null;
  privateComments?: string | null;
  clientId?: string | null;
  venueName: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  latitude?: number | null;
  longitude?: number | null;
  startDate: Date;
  startTime?: string | null;
  endDate: Date;
  endTime?: string | null;
  timezone: string;
  dailyDigestMode: boolean;
  requireStaff: boolean;
  status: EventStatus;
  fileLinks?: FileLink[] | null;
  // Request Information
  requestMethod?: RequestMethod | null;
  requestorName?: string | null;
  requestorPhone?: string | null;
  requestorEmail?: string | null;
  poNumber?: string | null;
  // Event Instructions & Documents
  preEventInstructions?: string | null;
  eventDocuments?: EventDocument[] | null;
  // Onsite Contact & Meeting Point
  meetingPoint?: string | null;
  onsitePocName?: string | null;
  onsitePocPhone?: string | null;
  onsitePocEmail?: string | null;
}

interface EventFormModalProps {
  event: Event | null;
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateEventInput | Omit<UpdateEventInput, 'id'>) => void;
  isSubmitting: boolean;
  backendErrors?: Array<{ field: string; message: string }>;
}

const STATUSES: Array<{ value: EventStatus; label: string }> = [
  { value: EventStatus.DRAFT, label: 'Draft' },
  { value: EventStatus.PUBLISHED, label: 'Published' },
  { value: EventStatus.CONFIRMED, label: 'Confirmed' },
  { value: EventStatus.IN_PROGRESS, label: 'In Progress' },
  { value: EventStatus.COMPLETED, label: 'Completed' },
  { value: EventStatus.CANCELLED, label: 'Cancelled' },
];

export function EventFormModal({
  event,
  open,
  onClose,
  onSubmit,
  isSubmitting,
  backendErrors = [],
}: EventFormModalProps) {
  const { terminology } = useTerminology();
  const isEdit = !!event;
  const [startTimeTBD, setStartTimeTBD] = useState(false);
  const [endTimeTBD, setEndTimeTBD] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

  // Fetch clients for dropdown
  const { data: clientsData } = trpc.clients.getAll.useQuery({
    page: 1,
    limit: 100
  });

  // Fetch templates for dropdown (only in create mode)
  const { data: templatesData } = trpc.eventTemplate.getForSelection.useQuery(undefined, {
    enabled: !isEdit,
  });

  // Fetch full template data when selected
  const { data: selectedTemplateData } = trpc.eventTemplate.getById.useQuery(
    { id: selectedTemplateId },
    { enabled: !!selectedTemplateId && !isEdit }
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setError,
    setValue,
    control,
  } = useForm<FormInput, undefined, FormOutput>({
    resolver: zodResolver(isEdit ? editFormSchema : createFormSchema),
    defaultValues: {
      title: '',
      description: '',
      requirements: '',
      privateComments: '',
      clientId: '',
      venueName: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      startDate: new Date(),
      startTime: '',
      endDate: new Date(),
      endTime: '',
      timezone: 'America/New_York',
      dailyDigestMode: false,
      requireStaff: false,
      status: EventStatus.DRAFT,
      fileLinks: [],
      // Request Information
      requestMethod: undefined,
      requestorName: '',
      requestorPhone: '',
      requestorEmail: '',
      poNumber: '',
      // Event Instructions & Documents
      preEventInstructions: '',
      eventDocuments: [],
      // Onsite Contact & Meeting Point
      meetingPoint: '',
      onsitePocName: '',
      onsitePocPhone: '',
      onsitePocEmail: '',
    },
  });

  const { fields, append, remove } = useFieldArray<FormInput, "fileLinks">({
    control,
    name: "fileLinks",
  });

  useEffect(() => {
    if (event) {
      const fileLinksData = event.fileLinks as FileLink[] | null;

      // Format dates to YYYY-MM-DD for date inputs
      const formatDateForInput = (date: Date | string) => {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      const eventDocsData = event.eventDocuments as EventDocument[] | null;
      reset({
        title: event.title,
        description: event.description || '',
        requirements: event.requirements || '',
        privateComments: event.privateComments || '',
        clientId: event.clientId || '',
        venueName: event.venueName,
        address: event.address,
        city: event.city,
        state: event.state,
        zipCode: event.zipCode,
        latitude: event.latitude || undefined,
        longitude: event.longitude || undefined,
        startDate: formatDateForInput(event.startDate) as any,
        startTime: event.startTime === 'TBD' ? '' : (event.startTime || ''),
        endDate: formatDateForInput(event.endDate) as any,
        endTime: event.endTime === 'TBD' ? '' : (event.endTime || ''),
        timezone: event.timezone,
        dailyDigestMode: event.dailyDigestMode,
        requireStaff: event.requireStaff,
        status: event.status,
        fileLinks: fileLinksData || [],
        // Request Information
        requestMethod: event.requestMethod || undefined,
        requestorName: event.requestorName || '',
        requestorPhone: event.requestorPhone || '',
        requestorEmail: event.requestorEmail || '',
        poNumber: event.poNumber || '',
        // Event Instructions & Documents
        preEventInstructions: event.preEventInstructions || '',
        eventDocuments: eventDocsData || [],
        // Onsite Contact & Meeting Point
        meetingPoint: event.meetingPoint || '',
        onsitePocName: event.onsitePocName || '',
        onsitePocPhone: event.onsitePocPhone || '',
        onsitePocEmail: event.onsitePocEmail || '',
      });
      setStartTimeTBD(event.startTime === 'TBD');
      setEndTimeTBD(event.endTime === 'TBD');
    } else {
      // Format today's date to YYYY-MM-DD for date inputs
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const todayFormatted = `${year}-${month}-${day}`;

      reset({
        title: '',
        description: '',
        requirements: '',
        privateComments: '',
        clientId: '',
        venueName: '',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        startDate: todayFormatted as any,
        startTime: '',
        endDate: todayFormatted as any,
        endTime: '',
        timezone: 'America/New_York',
        dailyDigestMode: false,
        requireStaff: false,
        status: EventStatus.DRAFT,
        fileLinks: [],
        // Request Information
        requestMethod: undefined,
        requestorName: '',
        requestorPhone: '',
        requestorEmail: '',
        poNumber: '',
        // Event Instructions & Documents
        preEventInstructions: '',
        eventDocuments: [],
        // Onsite Contact & Meeting Point
        meetingPoint: '',
        onsitePocName: '',
        onsitePocPhone: '',
        onsitePocEmail: '',
      });
      setStartTimeTBD(false);
      setEndTimeTBD(false);
    }
  }, [event, reset, open]);

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

  // Apply template data when a template is selected
  useEffect(() => {
    if (selectedTemplateData && !isEdit) {
      const template = selectedTemplateData;

      // Format date for input
      const formatDateForInput = (date: Date | string | null | undefined) => {
        if (!date) return undefined;
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      // Get today's date as fallback
      const today = new Date();
      const todayFormatted = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

      const fileLinksData = template.fileLinks as FileLink[] | null;

      const templateDocsData = template.eventDocuments as EventDocument[] | null;
      reset({
        title: template.title || '',
        description: template.eventDescription || '',
        requirements: template.requirements || '',
        privateComments: template.privateComments || '',
        clientId: template.clientId || '',
        venueName: template.venueName || '',
        address: template.address || '',
        city: template.city || '',
        state: template.state || '',
        zipCode: template.zipCode || '',
        latitude: template.latitude || undefined,
        longitude: template.longitude || undefined,
        startDate: (formatDateForInput(template.startDate) || todayFormatted) as any,
        startTime: template.startTime === 'TBD' ? '' : (template.startTime || ''),
        endDate: (formatDateForInput(template.endDate) || todayFormatted) as any,
        endTime: template.endTime === 'TBD' ? '' : (template.endTime || ''),
        timezone: template.timezone || 'America/New_York',
        dailyDigestMode: false,
        requireStaff: false,
        status: EventStatus.DRAFT,
        fileLinks: fileLinksData || [],
        // Request Information
        requestMethod: template.requestMethod || undefined,
        requestorName: template.requestorName || '',
        requestorPhone: template.requestorPhone || '',
        requestorEmail: template.requestorEmail || '',
        poNumber: template.poNumber || '',
        // Event Instructions & Documents
        preEventInstructions: template.preEventInstructions || '',
        eventDocuments: templateDocsData || [],
        // Onsite Contact & Meeting Point
        meetingPoint: template.meetingPoint || '',
        onsitePocName: template.onsitePocName || '',
        onsitePocPhone: template.onsitePocPhone || '',
        onsitePocEmail: template.onsitePocEmail || '',
      });
      setStartTimeTBD(template.startTime === 'TBD');
      setEndTimeTBD(template.endTime === 'TBD');
    }
  }, [selectedTemplateData, isEdit, reset]);

  // Reset template selection when modal closes
  useEffect(() => {
    if (!open) {
      setSelectedTemplateId('');
    }
  }, [open]);

  const handleFormSubmit: SubmitHandler<FormOutput> = (data) => {
    const normalizedData = {
      ...data,
      startTime: startTimeTBD ? 'TBD' : (data.startTime || undefined),
      endTime: endTimeTBD ? 'TBD' : (data.endTime || undefined),
    };

    if (isEdit) {
      const finalData = editFormSchema.parse(normalizedData);
      onSubmit(finalData);
    } else {
      const finalData = createFormSchema.parse(normalizedData);
      onSubmit(finalData);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} className="max-w-4xl">
      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>{isEdit ? `Edit ${terminology.event.singular}` : `Create New ${terminology.event.singular}`}</DialogTitle>
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
          {/* Event ID (Read-only in edit mode) */}
          {isEdit && (
            <div className="mb-6 p-3 bg-muted/30 rounded-md border border-border">
              <p className="text-sm text-muted-foreground">{terminology.event.singular} ID</p>
              <p className="text-base font-medium">{event?.eventId}</p>
            </div>
          )}

          {/* Template Selector (only in create mode) */}
          {!isEdit && templatesData && templatesData.length > 0 && (
            <div className="mb-6 p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <Label htmlFor="templateSelect">Start from Template (Optional)</Label>
              <div className="flex gap-2 mt-1">
                <Select
                  id="templateSelect"
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  <option value="">Select a template...</option>
                  {templatesData.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </Select>
                {selectedTemplateId && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedTemplateId('');
                      // Reset to default values
                      const today = new Date();
                      const todayFormatted = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                      reset({
                        title: '',
                        description: '',
                        requirements: '',
                        privateComments: '',
                        clientId: '',
                        venueName: '',
                        address: '',
                        city: '',
                        state: '',
                        zipCode: '',
                        startDate: todayFormatted as any,
                        startTime: '',
                        endDate: todayFormatted as any,
                        endTime: '',
                        timezone: 'America/New_York',
                        dailyDigestMode: false,
                        requireStaff: false,
                        status: EventStatus.DRAFT,
                        fileLinks: [],
                        requestMethod: undefined,
                        requestorName: '',
                        requestorPhone: '',
                        requestorEmail: '',
                        poNumber: '',
                        preEventInstructions: '',
                        eventDocuments: [],
                        meetingPoint: '',
                        onsitePocName: '',
                        onsitePocPhone: '',
                        onsitePocEmail: '',
                      });
                      setStartTimeTBD(false);
                      setEndTimeTBD(false);
                    }}
                  >
                    Clear
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Select a template to prefill the form. You can modify any field before saving.
              </p>
            </div>
          )}

          {/* Basic Information */}
          <div className="bg-accent/5 border border-border/30 p-5 rounded-lg mb-6">
            <h3 className="text-lg font-semibold border-b border-border pb-2 mb-4">Basic Information</h3>
            <div className="space-y-4">

              <div>
                <Label htmlFor="title" required>Title</Label>
                <Input
                  id="title"
                  {...register('title')}
                  error={!!errors.title}
                  disabled={isSubmitting}
                  placeholder={`${terminology.event.singular} title`}
                />
                {errors.title && (
                  <p className="text-sm text-destructive mt-1">{errors.title.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="clientId">Client</Label>
                  <Select
                    id="clientId"
                    {...register('clientId')}
                    disabled={isSubmitting}
                  >
                    <option value="">Not applicable</option>
                    {clientsData?.data.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.businessName}
                      </option>
                    ))}
                  </Select>
                  {errors.clientId && (
                    <p className="text-sm text-destructive mt-1">{errors.clientId.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="status" required>Status</Label>
                  <Select
                    id="status"
                    {...register('status')}
                    disabled={isSubmitting}
                  >
                    {STATUSES.map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </Select>
                  {errors.status && (
                    <p className="text-sm text-destructive mt-1">{errors.status.message}</p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  {...register('description')}
                  disabled={isSubmitting}
                  rows={3}
                  placeholder={`${terminology.event.singular} description`}
                />
                {errors.description && (
                  <p className="text-sm text-destructive mt-1">{errors.description.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="requirements">Requirements</Label>
                <Textarea
                  id="requirements"
                  {...register('requirements')}
                  disabled={isSubmitting}
                  rows={3}
                  placeholder="e.g., Business casual attire, Steel-toed boots required, Must have valid driver's license"
                />
                {errors.requirements && (
                  <p className="text-sm text-destructive mt-1">{errors.requirements.message}</p>
                )}
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
                    // Auto-fill the address fields
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
                <Label htmlFor="venueName" required>Venue Name</Label>
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
                <Label htmlFor="address" required>Address</Label>
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
                  <Label htmlFor="city" required>City</Label>
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
                  <Label htmlFor="state" required>State</Label>
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
                  <Label htmlFor="zipCode" required>ZIP Code</Label>
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

          {/* Date & Time */}
          <div className="bg-accent/5 border border-border/30 p-5 rounded-lg mb-6">
            <h3 className="text-lg font-semibold border-b border-border pb-2 mb-4">Date & Time</h3>
            <div className="space-y-4">

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDate" required>Start Date</Label>
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
                  <Label htmlFor="endDate" required>End Date</Label>
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
                <Label htmlFor="timezone" required>Timezone</Label>
                <Select
                  id="timezone"
                  {...register('timezone')}
                  disabled={isSubmitting}
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz}
                    </option>
                  ))}
                </Select>
                {errors.timezone && (
                  <p className="text-sm text-destructive mt-1">{errors.timezone.message}</p>
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
                  <Select
                    id="requestMethod"
                    {...register('requestMethod')}
                    disabled={isSubmitting}
                  >
                    <option value="">Select method...</option>
                    <option value="EMAIL">Email</option>
                    <option value="TEXT_SMS">Text/SMS</option>
                    <option value="PHONE_CALL">Phone Call</option>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="poNumber">PO Number</Label>
                  <Input
                    id="poNumber"
                    {...register('poNumber')}
                    disabled={isSubmitting}
                    placeholder="Purchase Order Number"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="requestorName">Requestor Name</Label>
                  <Input
                    id="requestorName"
                    {...register('requestorName')}
                    disabled={isSubmitting}
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <Label htmlFor="requestorPhone">Requestor Phone</Label>
                  <Input
                    id="requestorPhone"
                    type="tel"
                    {...register('requestorPhone')}
                    disabled={isSubmitting}
                    placeholder="(555) 123-4567"
                  />
                </div>

                <div>
                  <Label htmlFor="requestorEmail">Requestor Email</Label>
                  <Input
                    id="requestorEmail"
                    type="email"
                    {...register('requestorEmail')}
                    disabled={isSubmitting}
                    placeholder="john@example.com"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Onsite Contact */}
          <div className="bg-accent/5 border border-border/30 p-5 rounded-lg mb-6">
            <h3 className="text-lg font-semibold border-b border-border pb-2 mb-4">Onsite Contact</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="meetingPoint">Meeting Point</Label>
                <Input
                  id="meetingPoint"
                  {...register('meetingPoint')}
                  disabled={isSubmitting}
                  placeholder="Where to meet on arrival (e.g., Main lobby, Loading dock)"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="onsitePocName">POC Name</Label>
                  <Input
                    id="onsitePocName"
                    {...register('onsitePocName')}
                    disabled={isSubmitting}
                    placeholder="Point of Contact name"
                  />
                </div>

                <div>
                  <Label htmlFor="onsitePocPhone">POC Phone</Label>
                  <Input
                    id="onsitePocPhone"
                    type="tel"
                    {...register('onsitePocPhone')}
                    disabled={isSubmitting}
                    placeholder="(555) 123-4567"
                  />
                </div>

                <div>
                  <Label htmlFor="onsitePocEmail">POC Email</Label>
                  <Input
                    id="onsitePocEmail"
                    type="email"
                    {...register('onsitePocEmail')}
                    disabled={isSubmitting}
                    placeholder="poc@example.com"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Pre-Event Instructions */}
          <div className="bg-accent/5 border border-border/30 p-5 rounded-lg mb-6">
            <h3 className="text-lg font-semibold border-b border-border pb-2 mb-4">Pre-Event Instructions</h3>
            <div>
              <Textarea
                id="preEventInstructions"
                {...register('preEventInstructions')}
                disabled={isSubmitting}
                rows={4}
                placeholder="Instructions for staff before the event..."
              />
            </div>
          </div>

          {/* Event Documents */}
          <div className="bg-accent/5 border border-border/30 p-5 rounded-lg mb-6">
            <h3 className="text-lg font-semibold border-b border-border pb-2 mb-4">Event Documents</h3>
            <EventDocumentUpload
              documents={watch('eventDocuments') || []}
              onChange={(docs) => setValue('eventDocuments', docs)}
              disabled={isSubmitting}
            />
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
        </DialogContent>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : isEdit ? `Update ${terminology.event.singular}` : `Create ${terminology.event.singular}`}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
