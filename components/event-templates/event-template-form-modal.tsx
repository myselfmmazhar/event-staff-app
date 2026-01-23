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
import type { CreateEventTemplateInput, UpdateEventTemplateInput, FileLink } from '@/lib/schemas/event-template.schema';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm, useFieldArray, type SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { CloseIcon, PlusIcon, XIcon } from '@/components/ui/icons';
import { trpc } from '@/lib/client/trpc';
import { useTerminology } from '@/lib/hooks/use-terminology';
import { AddressAutocomplete } from '@/components/maps/address-autocomplete';

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

// Form schema - define directly to avoid refinement extension issues
const formSchema = z.object({
  // Template metadata
  name: z.string().min(1, "Template name is required").max(200).transform((val) => val.trim()),
  description: z.string().max(500).optional().transform((val) => val?.trim()),

  // Event fields to prefill
  title: z.string().max(200).optional().transform((val) => val?.trim()),
  eventDescription: z.string().max(5000).optional().transform((val) => val?.trim()),
  dressCode: z.string().max(200).optional().transform((val) => val?.trim()),
  privateComments: z.string().max(5000).optional().transform((val) => val?.trim()),

  // Client relationship
  clientId: z.string().uuid().optional().or(z.literal("")),

  // Venue Information
  venueName: z.string().max(200).optional().transform((val) => val?.trim()),
  address: z.string().max(300).optional().transform((val) => val?.trim()),
  room: z.string().max(100).optional().transform((val) => val?.trim()),
  city: z.string().max(100).optional().transform((val) => val?.trim()),
  state: z.string().max(50).optional().transform((val) => val?.trim()),
  zipCode: z.string().max(20).optional().transform((val) => val?.trim()),

  // Location Coordinates
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),

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

  // File Links
  fileLinks: z.array(fileLinkSchema).max(20).optional(),

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
  dressCode?: string | null;
  privateComments?: string | null;
  clientId?: string | null;
  venueName?: string | null;
  address?: string | null;
  room?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  startDate?: Date | null;
  startTime?: string | null;
  endDate?: Date | null;
  endTime?: string | null;
  timezone?: string | null;
  fileLinks?: FileLink[] | null;
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

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setError,
    setValue,
    control,
  } = useForm<FormInput, undefined, FormOutput>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      title: '',
      eventDescription: '',
      dressCode: '',
      privateComments: '',
      clientId: '',
      venueName: '',
      address: '',
      room: '',
      city: '',
      state: '',
      zipCode: '',
      startDate: undefined,
      startTime: '',
      endDate: undefined,
      endTime: '',
      timezone: '',
      fileLinks: [],
      startTimeTBD: false,
      endTimeTBD: false,
    },
  });

  const { fields, append, remove } = useFieldArray<FormInput, "fileLinks">({
    control,
    name: "fileLinks",
  });

  useEffect(() => {
    if (template) {
      const fileLinksData = template.fileLinks as FileLink[] | null;

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
        dressCode: template.dressCode || '',
        privateComments: template.privateComments || '',
        clientId: template.clientId || '',
        venueName: template.venueName || '',
        address: template.address || '',
        room: template.room || '',
        city: template.city || '',
        state: template.state || '',
        zipCode: template.zipCode || '',
        latitude: template.latitude || undefined,
        longitude: template.longitude || undefined,
        startDate: formatDateForInput(template.startDate) as any,
        startTime: template.startTime === 'TBD' ? '' : (template.startTime || ''),
        endDate: formatDateForInput(template.endDate) as any,
        endTime: template.endTime === 'TBD' ? '' : (template.endTime || ''),
        timezone: template.timezone || '',
        fileLinks: fileLinksData || [],
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
        dressCode: '',
        privateComments: '',
        clientId: '',
        venueName: '',
        address: '',
        room: '',
        city: '',
        state: '',
        zipCode: '',
        startDate: undefined,
        startTime: '',
        endDate: undefined,
        endTime: '',
        timezone: '',
        fileLinks: [],
        startTimeTBD: false,
        endTimeTBD: false,
      });
      setStartTimeTBD(false);
      setEndTimeTBD(false);
    }
  }, [template, reset, open]);

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

        <DialogContent className="max-h-[calc(100vh-280px)] overflow-y-auto">
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
                <Select
                  id="clientId"
                  {...register('clientId')}
                  disabled={isSubmitting}
                >
                  <option value="">No default client</option>
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
                <Label htmlFor="dressCode">Dress Code</Label>
                <Input
                  id="dressCode"
                  {...register('dressCode')}
                  error={!!errors.dressCode}
                  disabled={isSubmitting}
                  placeholder="e.g., Business Casual"
                />
                {errors.dressCode && (
                  <p className="text-sm text-destructive mt-1">{errors.dressCode.message}</p>
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

              <div>
                <Label htmlFor="room">Room/Place</Label>
                <Input
                  id="room"
                  {...register('room')}
                  error={!!errors.room}
                  disabled={isSubmitting}
                  placeholder="Grand Ballroom"
                />
                {errors.room && (
                  <p className="text-sm text-destructive mt-1">{errors.room.message}</p>
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
                <Select
                  id="timezone"
                  {...register('timezone')}
                  disabled={isSubmitting}
                >
                  <option value="">No default timezone</option>
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
            {isSubmitting ? 'Saving...' : isEdit ? 'Update Template' : 'Create Template'}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
