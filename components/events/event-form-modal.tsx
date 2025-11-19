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
import { EventSchema, TIMEZONES } from '@/lib/schemas/event.schema';
import type { CreateEventInput, UpdateEventInput, FileLink } from '@/lib/schemas/event.schema';
import { EventStatus } from '@prisma/client';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import { CloseIcon, PlusIcon, XIcon } from '@/components/ui/icons';
import { trpc } from '@/lib/client/trpc';

// Use the create schema directly for create mode
const createFormSchema = EventSchema.create;

// Build edit form schema (all fields optional except those being updated)
const editFormSchema = z.object({
  title: z.string().min(1, "Event title is required").max(200).transform(val => val.trim()),
  description: z.string().max(5000).optional().transform(val => val?.trim()),
  dressCode: z.string().max(200).optional().transform(val => val?.trim()),
  privateComments: z.string().max(5000).optional().transform(val => val?.trim()),
  clientId: z.string().optional(),
  venueName: z.string().min(1, "Venue name is required").max(200).transform(val => val.trim()),
  address: z.string().min(1, "Address is required").max(300).transform(val => val.trim()),
  room: z.string().min(1, "Room/Place is required").max(100).transform(val => val.trim()),
  city: z.string().min(1, "City is required").max(100).transform(val => val.trim()),
  state: z.string().min(1, "State is required").max(50).transform(val => val.trim()),
  zipCode: z.string().min(1, "ZIP code is required").max(20).transform(val => val.trim()),
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
}).refine((data) => data.endDate >= data.startDate, {
  message: "End date must be after or equal to start date",
  path: ["endDate"],
});

type CreateFormData = z.input<typeof createFormSchema> & {
  startTimeTBD?: boolean;
  endTimeTBD?: boolean;
};

type EditFormData = z.input<typeof editFormSchema>;
type FormData = CreateFormData | EditFormData;
type FormFieldName = keyof FormData;

interface Event {
  id: string;
  eventId: string;
  title: string;
  description?: string | null;
  dressCode?: string | null;
  privateComments?: string | null;
  clientId?: string | null;
  venueName: string;
  address: string;
  room: string;
  city: string;
  state: string;
  zipCode: string;
  startDate: Date;
  startTime?: string | null;
  endDate: Date;
  endTime?: string | null;
  timezone: string;
  dailyDigestMode: boolean;
  requireStaff: boolean;
  status: EventStatus;
  fileLinks?: FileLink[] | null;
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
  const isEdit = !!event;
  const [startTimeTBD, setStartTimeTBD] = useState(false);
  const [endTimeTBD, setEndTimeTBD] = useState(false);

  // Fetch clients for dropdown
  const { data: clientsData } = trpc.client.getAll.useQuery({
    page: 1,
    limit: 100
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setError,
    setValue,
    control,
  } = useForm<FormData>({
    resolver: zodResolver(isEdit ? editFormSchema : createFormSchema),
    defaultValues: {
      title: '',
      description: '',
      dressCode: '',
      privateComments: '',
      clientId: '',
      venueName: '',
      address: '',
      room: '',
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
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "fileLinks" as any,
  });

  useEffect(() => {
    if (event) {
      const fileLinksData = event.fileLinks as FileLink[] | null;

      reset({
        title: event.title,
        description: event.description || '',
        dressCode: event.dressCode || '',
        privateComments: event.privateComments || '',
        clientId: event.clientId || '',
        venueName: event.venueName,
        address: event.address,
        room: event.room,
        city: event.city,
        state: event.state,
        zipCode: event.zipCode,
        startDate: new Date(event.startDate),
        startTime: event.startTime === 'TBD' ? '' : (event.startTime || ''),
        endDate: new Date(event.endDate),
        endTime: event.endTime === 'TBD' ? '' : (event.endTime || ''),
        timezone: event.timezone,
        dailyDigestMode: event.dailyDigestMode,
        requireStaff: event.requireStaff,
        status: event.status,
        fileLinks: fileLinksData || [],
      });
      setStartTimeTBD(event.startTime === 'TBD');
      setEndTimeTBD(event.endTime === 'TBD');
    } else {
      reset({
        title: '',
        description: '',
        dressCode: '',
        privateComments: '',
        clientId: '',
        venueName: '',
        address: '',
        room: '',
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

  const handleFormSubmit = (data: FormData) => {
    // Transform TBD checkboxes to "TBD" string or empty
    const submitData = {
      ...data,
      startTime: startTimeTBD ? 'TBD' : (data.startTime || undefined),
      endTime: endTimeTBD ? 'TBD' : (data.endTime || undefined),
    };

    // Remove TBD flags from submit data
    const { startTimeTBD: _st, endTimeTBD: _et, ...finalData } = submitData as any;

    onSubmit(finalData);
  };

  return (
    <Dialog open={open} onClose={onClose} className="max-w-4xl">
      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>{isEdit ? 'Edit Event' : 'Create New Event'}</DialogTitle>
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
              <p className="text-sm text-muted-foreground">Event ID</p>
              <p className="text-base font-medium">{event?.eventId}</p>
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
                placeholder="Event title"
              />
              {errors.title && (
                <p className="text-sm text-destructive mt-1">{errors.title.message}</p>
              )}
            </div>

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
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...register('description')}
                disabled={isSubmitting}
                rows={3}
                placeholder="Event description"
              />
              {errors.description && (
                <p className="text-sm text-destructive mt-1">{errors.description.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            </div>
          </div>

          {/* Venue Information */}
          <div className="bg-accent/5 border border-border/30 p-5 rounded-lg mb-6">
            <h3 className="text-lg font-semibold border-b border-border pb-2 mb-4">Venue Information</h3>
            <div className="space-y-4">

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

            <div>
              <Label htmlFor="room" required>Room/Place</Label>
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

          {/* Settings */}
          <div className="bg-accent/5 border border-border/30 p-5 rounded-lg mb-6">
            <h3 className="text-lg font-semibold border-b border-border pb-2 mb-4">Settings</h3>
            <div className="space-y-4">

            <div className="space-y-3">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  {...register('dailyDigestMode')}
                  disabled={isSubmitting}
                  className="rounded border-input"
                />
                <div>
                  <span className="text-sm font-medium">Daily Digest Mode</span>
                  <p className="text-xs text-muted-foreground">Send daily digest emails for this event</p>
                </div>
              </label>

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  {...register('requireStaff')}
                  disabled={isSubmitting}
                  className="rounded border-input"
                />
                <div>
                  <span className="text-sm font-medium">Require Staff</span>
                  <p className="text-xs text-muted-foreground">This event requires staff assignment</p>
                </div>
              </label>
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
            {isSubmitting ? 'Saving...' : isEdit ? 'Update Event' : 'Create Event'}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
