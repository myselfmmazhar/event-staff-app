'use client';

import { useEffect, useState } from 'react';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { RequestMethod } from '@prisma/client';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CloseIcon, ChevronLeftIcon, SpinnerIcon, PlusIcon, XIcon } from '@/components/ui/icons';
import { AddressAutocomplete } from '@/components/maps/address-autocomplete';
import { EventDocumentUpload } from '@/components/events/event-document-upload';
import { TIMEZONES } from '@/lib/schemas/event.schema';
import { trpc } from '@/lib/client/trpc';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const fileLinkSchema = z.object({
  name: z.string().min(1, 'File name is required'),
  link: z.string().url('Invalid URL'),
});

const eventDocumentSchema = z.object({
  name: z.string(),
  url: z.string().url('Invalid document URL'),
  type: z.string().optional(),
  size: z.number().optional(),
});

const customFieldSchema = z.object({
  label: z.string().min(1, 'Label is required').max(100),
  value: z.string().max(1000),
});

const formSchema = z.object({
  // Basic Info
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(2000),
  requirements: z.string().max(2000),
  // Date & Time
  startDate: z.string(),
  startTime: z.string(),
  endDate: z.string(),
  endTime: z.string(),
  timezone: z.string().min(1, 'Timezone is required'),
  // Venue
  venueName: z.string().min(1, 'Location name is required').max(200),
  address: z.string().min(1, 'Address is required').max(300),
  addressLine2: z.string().max(200),
  city: z.string().min(1, 'City is required').max(100),
  state: z.string().min(1, 'State is required').max(50),
  zipCode: z.string().min(1, 'ZIP code is required').max(20),
  // Onsite Contact
  meetingPoint: z.string().max(300),
  onsitePocName: z.string().max(200),
  onsitePocPhone: z.string().max(50),
  onsitePocEmail: z.string().max(255),
  // Staff & Rates
  estimate: z.boolean().nullable(),
  // Instructions
  preEventInstructions: z.string().max(10000),
  requestMethod: z.nativeEnum(RequestMethod).nullable(),
  poNumber: z.string().max(100),
  requestorName: z.string().max(200),
  requestorPhone: z.string().max(50),
  requestorEmail: z.string().max(255),
  // Documents
  fileLinks: z.array(fileLinkSchema),
  eventDocuments: z.array(eventDocumentSchema),
  customFields: z.array(customFieldSchema),
});

type FormData = z.infer<typeof formSchema>;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Tab = 'basic' | 'venue' | 'staff' | 'instructions' | 'documents';

const TABS: { id: Tab; label: string }[] = [
  { id: 'basic', label: 'Basic Info' },
  { id: 'venue', label: 'Venue' },
  { id: 'staff', label: 'Staff & Rates' },
  { id: 'instructions', label: 'Instructions' },
  { id: 'documents', label: 'Documents' },
];

export interface EventRequestData {
  id: string;
  title: string;
  description?: string | null;
  requirements?: string | null;
  venueName?: string | null;
  address?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  meetingPoint?: string | null;
  onsitePocName?: string | null;
  onsitePocPhone?: string | null;
  onsitePocEmail?: string | null;
  startDate?: Date | string | null;
  startTime?: string | null;
  endDate?: Date | string | null;
  endTime?: string | null;
  timezone?: string | null;
  estimate?: boolean | null;
  preEventInstructions?: string | null;
  requestMethod?: RequestMethod | null;
  poNumber?: string | null;
  requestorName?: string | null;
  requestorPhone?: string | null;
  requestorEmail?: string | null;
  fileLinks?: Array<{ name: string; link: string }> | null;
  eventDocuments?: Array<{ name: string; url: string; type?: string; size?: number }> | null;
  customFields?: Array<{ label: string; value: string }> | null;
}

interface EventRequestFormModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  request?: EventRequestData;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toDateString(val: Date | string | null | undefined): string {
  if (!val) return '';
  const d = val instanceof Date ? val : new Date(val);
  return isNaN(d.getTime()) ? '' : format(d, 'yyyy-MM-dd');
}

function defaultValues(request?: EventRequestData): FormData {
  return {
    title: request?.title ?? '',
    description: request?.description ?? '',
    requirements: request?.requirements ?? '',
    startDate: toDateString(request?.startDate),
    startTime: request?.startTime ?? '',
    endDate: toDateString(request?.endDate),
    endTime: request?.endTime ?? '',
    timezone: request?.timezone ?? 'UTC',
    venueName: request?.venueName ?? '',
    address: request?.address ?? '',
    addressLine2: request?.addressLine2 ?? '',
    city: request?.city ?? '',
    state: request?.state ?? '',
    zipCode: request?.zipCode ?? '',
    meetingPoint: request?.meetingPoint ?? '',
    onsitePocName: request?.onsitePocName ?? '',
    onsitePocPhone: request?.onsitePocPhone ?? '',
    onsitePocEmail: request?.onsitePocEmail ?? '',
    estimate: request?.estimate ?? null,
    preEventInstructions: request?.preEventInstructions ?? '',
    requestMethod: request?.requestMethod ?? null,
    poNumber: request?.poNumber ?? '',
    requestorName: request?.requestorName ?? '',
    requestorPhone: request?.requestorPhone ?? '',
    requestorEmail: request?.requestorEmail ?? '',
    fileLinks: request?.fileLinks ?? [],
    eventDocuments: request?.eventDocuments ?? [],
    customFields: request?.customFields ?? [],
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EventRequestFormModal({
  open,
  onClose,
  onSuccess,
  request,
}: EventRequestFormModalProps) {
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const isEditMode = !!request;

  const [activeTab, setActiveTab] = useState<Tab>('basic');
  const [startDateTBD, setStartDateTBD] = useState(false);
  const [endDateTBD, setEndDateTBD] = useState(false);
  const [startTimeTBD, setStartTimeTBD] = useState(false);
  const [endTimeTBD, setEndTimeTBD] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultValues(request),
  });

  const fileLinksArray = useFieldArray({ control, name: 'fileLinks' });
  const customFieldsArray = useFieldArray({ control, name: 'customFields' });

  const estimate = watch('estimate');

  // Reset form when modal opens / request changes
  useEffect(() => {
    if (open) {
      reset(defaultValues(request));
      setActiveTab('basic');
      setStartDateTBD(request ? !request.startDate : false);
      setEndDateTBD(request ? !request.endDate : false);
      setStartTimeTBD(request ? !request.startTime : false);
      setEndTimeTBD(request ? !request.endTime : false);
    }
  }, [open, request]);

  // -------------------------------------------------------------------------
  // Mutations
  // -------------------------------------------------------------------------

  const createMutation = trpc.eventRequest.create.useMutation({
    onSuccess: () => {
      toast({
        title: 'Request submitted',
        description: 'Your event request has been submitted. The admin team will review it shortly.',
        variant: 'success',
      });
      utils.eventRequest.getMyRequests.invalidate();
      onClose();
      onSuccess?.();
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message || 'Failed to submit event request', variant: 'destructive' });
    },
  });

  const updateMutation = trpc.eventRequest.update.useMutation({
    onSuccess: () => {
      toast({
        title: 'Request updated',
        description: 'Your event request has been updated.',
        variant: 'success',
      });
      utils.eventRequest.getMyRequests.invalidate();
      onClose();
      onSuccess?.();
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message || 'Failed to update event request', variant: 'destructive' });
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  const handleClose = () => {
    if (isPending) return;
    onClose();
  };

  const onSubmit = (data: FormData) => {
    const payload = {
      title: data.title,
      description: data.description || undefined,
      requirements: data.requirements || undefined,
      venueName: data.venueName,
      address: data.address,
      addressLine2: data.addressLine2 || undefined,
      city: data.city,
      state: data.state,
      zipCode: data.zipCode,
      meetingPoint: data.meetingPoint || undefined,
      onsitePocName: data.onsitePocName || undefined,
      onsitePocPhone: data.onsitePocPhone || undefined,
      onsitePocEmail: data.onsitePocEmail || undefined,
      startDate: startDateTBD ? null : data.startDate || null,
      startTime: startTimeTBD ? null : data.startTime || null,
      endDate: endDateTBD ? null : data.endDate || null,
      endTime: endTimeTBD ? null : data.endTime || null,
      timezone: data.timezone,
      estimate: data.estimate ?? undefined,
      preEventInstructions: data.preEventInstructions || undefined,
      requestMethod: data.requestMethod ?? undefined,
      poNumber: data.poNumber || undefined,
      requestorName: data.requestorName || undefined,
      requestorPhone: data.requestorPhone || undefined,
      requestorEmail: data.requestorEmail || undefined,
      fileLinks: data.fileLinks?.length ? data.fileLinks : undefined,
      eventDocuments: data.eventDocuments?.length ? data.eventDocuments : undefined,
      customFields: data.customFields?.length ? data.customFields : undefined,
    };

    if (isEditMode) {
      updateMutation.mutate({ id: request.id, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const currentTabIndex = TABS.findIndex((t) => t.id === activeTab);
  const isLastTab = currentTabIndex === TABS.length - 1;

  const handleNext = () => {
    if (!isLastTab) {
      const nextTab = TABS[currentTabIndex + 1];
      if (nextTab) setActiveTab(nextTab.id);
    }
  };

  const handleBack = () => {
    if (currentTabIndex > 0) {
      const prevTab = TABS[currentTabIndex - 1];
      if (prevTab) setActiveTab(prevTab.id);
    }
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      className="mx-4 flex h-[min(94vh,1000px)] w-full max-h-[min(94vh,1000px)] max-w-[1400px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-card p-0 shadow-xl"
    >
      <DialogContent className="flex h-full min-h-0 flex-1 flex-col overflow-hidden p-0">
        {/* Header */}
        <div className="shrink-0 border-b border-slate-200 px-6 pb-0 pt-5 sm:px-8">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                {isEditMode ? 'Edit Event Request' : 'Request an Event'}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">
                {isEditMode
                  ? 'Update the details of your pending event request'
                  : "Tell us about your event and we'll get you staffed up"}
              </p>
            </div>
            <button
              onClick={handleClose}
              disabled={isPending}
              className="shrink-0 rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50"
              aria-label="Close"
            >
              <CloseIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Tab bar */}
          <div className="mt-6 flex gap-1 overflow-x-auto border-t border-slate-200/90 pt-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {TABS.map(({ id, label }) => {
              const active = activeTab === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveTab(id)}
                  disabled={isPending}
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
        <form
          id="event-request-form"
          onSubmit={handleSubmit(onSubmit)}
          className="min-h-0 flex-1 overflow-y-auto px-6 py-6 sm:px-8"
        >
          {/* ----------------------------------------------------------------
              Tab: Basic Info
          ---------------------------------------------------------------- */}
          {activeTab === 'basic' && (
            <div className="space-y-8">
              {/* Basic Information */}
              <div>
                <h3 className="text-base font-bold text-slate-900 mb-5">Basic Information</h3>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title" required>Title</Label>
                    <Input
                      id="title"
                      {...register('title')}
                      error={!!errors.title}
                      disabled={isPending}
                      placeholder="Event title"
                      autoFocus
                    />
                    {errors.title && (
                      <p className="text-sm text-destructive mt-1">{errors.title.message}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        {...register('description')}
                        disabled={isPending}
                        rows={3}
                        placeholder="Event description"
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
                        disabled={isPending}
                        rows={3}
                        placeholder="e.g., Business casual attire, Steel-toed boots required"
                      />
                      {errors.requirements && (
                        <p className="text-sm text-destructive mt-1">{errors.requirements.message}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Date & Time */}
              <div className="border-t border-slate-200 pt-6">
                <h3 className="text-base font-bold text-slate-900 mb-5">Date & Time</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="startDate" required={!startDateTBD}>Start Date</Label>
                      <div className="flex gap-2">
                        <Input
                          id="startDate"
                          type="date"
                          {...register('startDate', {
                            onChange: (e) => {
                              if (!endDateTBD && e.target.value) {
                                setValue('endDate', e.target.value);
                              }
                            },
                          })}
                          error={!!errors.startDate}
                          disabled={isPending || startDateTBD}
                          className="flex-1"
                        />
                        <label className="flex items-center gap-2 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={startDateTBD}
                            onChange={(e) => {
                              setStartDateTBD(e.target.checked);
                              if (e.target.checked) setValue('startDate', '');
                            }}
                            disabled={isPending}
                            className="rounded border-input"
                          />
                          <span className="text-sm">TBD</span>
                        </label>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="startTime">Start Time</Label>
                      <div className="flex gap-2">
                        <Input
                          id="startTime"
                          type="time"
                          {...register('startTime', {
                            onChange: (e) => {
                              if (!endTimeTBD && e.target.value) {
                                setValue('endTime', e.target.value);
                              }
                            },
                          })}
                          disabled={isPending || startTimeTBD}
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
                            disabled={isPending}
                            className="rounded border-input"
                          />
                          <span className="text-sm">TBD</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="endDate" required={!endDateTBD}>End Date</Label>
                      <div className="flex gap-2">
                        <Input
                          id="endDate"
                          type="date"
                          {...register('endDate')}
                          error={!!errors.endDate}
                          disabled={isPending || endDateTBD}
                          className="flex-1"
                        />
                        <label className="flex items-center gap-2 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={endDateTBD}
                            onChange={(e) => {
                              setEndDateTBD(e.target.checked);
                              if (e.target.checked) setValue('endDate', '');
                            }}
                            disabled={isPending}
                            className="rounded border-input"
                          />
                          <span className="text-sm">TBD</span>
                        </label>
                      </div>
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
                          disabled={isPending || endTimeTBD}
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
                            disabled={isPending}
                            className="rounded border-input"
                          />
                          <span className="text-sm">TBD</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="timezone" required>Timezone</Label>
                    <Controller
                      name="timezone"
                      control={control}
                      render={({ field }) => (
                        <Select
                          value={field.value ?? ''}
                          onValueChange={field.onChange}
                          disabled={isPending}
                        >
                          <SelectTrigger id="timezone">
                            <SelectValue placeholder="Select timezone..." />
                          </SelectTrigger>
                          <SelectContent>
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
            </div>
          )}

          {/* ----------------------------------------------------------------
              Tab: Venue
          ---------------------------------------------------------------- */}
          {activeTab === 'venue' && (
            <div className="space-y-8">
              {/* Location Information */}
              <div>
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
                      }}
                    />
                  </div>

                  <div>
                    <Label htmlFor="venueName" required>Location Name</Label>
                    <Input
                      id="venueName"
                      {...register('venueName')}
                      error={!!errors.venueName}
                      disabled={isPending}
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
                      disabled={isPending}
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
                      disabled={isPending}
                      placeholder="Suite 200"
                    />
                  </div>

                  <div>
                    <Label htmlFor="city" required>City</Label>
                    <Input
                      id="city"
                      {...register('city')}
                      error={!!errors.city}
                      disabled={isPending}
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
                      disabled={isPending}
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
                      disabled={isPending}
                      placeholder="10001"
                    />
                    {errors.zipCode && (
                      <p className="text-sm text-destructive mt-1">{errors.zipCode.message}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Onsite Contact */}
              <div className="border-t border-slate-200 pt-6">
                <h3 className="text-base font-bold text-slate-900 mb-5">Onsite Contact</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="meetingPoint">Meeting Point</Label>
                    <Input
                      id="meetingPoint"
                      {...register('meetingPoint')}
                      disabled={isPending}
                      placeholder="e.g., Main lobby"
                    />
                  </div>

                  <div>
                    <Label htmlFor="onsitePocName">POC Name</Label>
                    <Input
                      id="onsitePocName"
                      {...register('onsitePocName')}
                      disabled={isPending}
                      placeholder="Point of Contact name"
                    />
                  </div>

                  <div>
                    <Label htmlFor="onsitePocPhone">POC Phone</Label>
                    <Input
                      id="onsitePocPhone"
                      type="tel"
                      {...register('onsitePocPhone')}
                      disabled={isPending}
                      placeholder="(555) 123-4567"
                    />
                  </div>

                  <div>
                    <Label htmlFor="onsitePocEmail">POC Email</Label>
                    <Input
                      id="onsitePocEmail"
                      type="email"
                      {...register('onsitePocEmail')}
                      disabled={isPending}
                      placeholder="poc@example.com"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ----------------------------------------------------------------
              Tab: Staff & Rates
          ---------------------------------------------------------------- */}
          {activeTab === 'staff' && (
            <div className="space-y-8">
              {/* Assignments */}
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="bg-slate-50/50 px-5 py-3 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-slate-900 tracking-tight uppercase">Assignments</h3>
                </div>
                <div className="p-5">
                  <p className="text-sm text-slate-500">
                    Staff assignments will be configured by the admin team after your request is reviewed and approved.
                  </p>
                </div>
              </div>

              {/* Task Settings */}
              <div className="border-t border-slate-200 pt-6">
                <h3 className="text-base font-bold text-slate-900 mb-5">Task Settings</h3>
                <div>
                  <Label className="text-sm font-medium mb-3 block">Create an estimate?</Label>
                  <div className="flex items-center gap-4 h-10">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="estimate"
                        checked={estimate === true}
                        onChange={() => setValue('estimate', true)}
                        disabled={isPending}
                        className="accent-primary"
                      />
                      <span className="text-sm">Yes</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="estimate"
                        checked={estimate === false || estimate === null}
                        onChange={() => setValue('estimate', false)}
                        disabled={isPending}
                        className="accent-primary"
                      />
                      <span className="text-sm">No</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ----------------------------------------------------------------
              Tab: Instructions
          ---------------------------------------------------------------- */}
          {activeTab === 'instructions' && (
            <div className="space-y-8">
              {/* Pre-Event Instructions */}
              <div>
                <h3 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-2 mb-4">
                  Pre-Event Instructions
                </h3>
                <Textarea
                  id="preEventInstructions"
                  {...register('preEventInstructions')}
                  disabled={isPending}
                  rows={4}
                  placeholder="Instructions for staff before the event..."
                />
              </div>

              {/* Request Information */}
              <div className="border-t border-slate-200 pt-6">
                <h3 className="text-base font-bold text-slate-900 mb-5">Request Information</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="requestMethod">Request Method</Label>
                      <Controller
                        name="requestMethod"
                        control={control}
                        render={({ field }) => (
                          <Select
                            value={field.value ?? ''}
                            onValueChange={(val) => field.onChange(val || null)}
                            disabled={isPending}
                          >
                            <SelectTrigger id="requestMethod">
                              <SelectValue placeholder="Select method..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="EMAIL">Email</SelectItem>
                              <SelectItem value="TEXT_SMS">Text/SMS</SelectItem>
                              <SelectItem value="PHONE_CALL">Phone Call</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>

                    <div>
                      <Label htmlFor="poNumber">PO Number</Label>
                      <Input
                        id="poNumber"
                        {...register('poNumber')}
                        disabled={isPending}
                        placeholder="Purchase Order Number"
                      />
                    </div>

                    <div>
                      <Label htmlFor="requestorName">Requestor Name</Label>
                      <Input
                        id="requestorName"
                        {...register('requestorName')}
                        disabled={isPending}
                        placeholder="John Doe"
                      />
                    </div>

                    <div>
                      <Label htmlFor="requestorPhone">Requestor Phone</Label>
                      <Input
                        id="requestorPhone"
                        type="tel"
                        {...register('requestorPhone')}
                        disabled={isPending}
                        placeholder="(555) 123-4567"
                      />
                    </div>

                    <div>
                      <Label htmlFor="requestorEmail">Requestor Email</Label>
                      <Input
                        id="requestorEmail"
                        type="email"
                        {...register('requestorEmail')}
                        disabled={isPending}
                        placeholder="john@example.com"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ----------------------------------------------------------------
              Tab: Documents
          ---------------------------------------------------------------- */}
          {activeTab === 'documents' && (
            <div className="space-y-8">
              {/* Event Documents + File Links */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Event Documents */}
                <div>
                  <h3 className="text-base font-bold text-slate-900 mb-5">Event Documents</h3>
                  <EventDocumentUpload
                    documents={watch('eventDocuments') || []}
                    onChange={(docs) => setValue('eventDocuments', docs)}
                    disabled={isPending}
                  />
                </div>

                {/* File Links */}
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="text-base font-bold text-slate-900">File Links</h3>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileLinksArray.append({ name: '', link: '' })}
                      disabled={isPending}
                    >
                      <PlusIcon className="h-4 w-4 mr-1" />
                      Add File
                    </Button>
                  </div>

                  {fileLinksArray.fields.length === 0 && (
                    <p className="text-sm text-muted-foreground">No files added yet</p>
                  )}

                  <div className="space-y-3">
                    {fileLinksArray.fields.map((field, index) => (
                      <div key={field.id} className="flex gap-2">
                        <div className="flex-1 space-y-1">
                          <Input
                            {...register(`fileLinks.${index}.name` as const)}
                            placeholder="File name"
                            disabled={isPending}
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
                            disabled={isPending}
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
                          onClick={() => fileLinksArray.remove(index)}
                          disabled={isPending}
                          className="self-start"
                        >
                          <XIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Custom Fields */}
              <div className="border-t border-slate-200 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-2 flex-1">
                    Custom Fields
                  </h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => customFieldsArray.append({ label: '', value: '' })}
                    disabled={isPending || customFieldsArray.fields.length >= 20}
                  >
                    <PlusIcon className="h-4 w-4 mr-1" />
                    Add Field
                  </Button>
                </div>

                {customFieldsArray.fields.length === 0 && (
                  <p className="text-sm text-muted-foreground">No custom fields added yet</p>
                )}

                <div className="space-y-3">
                  {customFieldsArray.fields.map((field, index) => (
                    <div key={field.id} className="flex gap-2">
                      <div className="flex-1 space-y-1">
                        <Input
                          {...register(`customFields.${index}.label` as const)}
                          placeholder="Field label"
                          disabled={isPending}
                          error={!!(errors.customFields?.[index]?.label)}
                        />
                        {errors.customFields?.[index]?.label && (
                          <p className="text-sm text-destructive">
                            {errors.customFields[index]?.label?.message}
                          </p>
                        )}
                      </div>
                      <div className="flex-[2] space-y-1">
                        <Input
                          {...register(`customFields.${index}.value` as const)}
                          placeholder="Field value"
                          disabled={isPending}
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
                        onClick={() => customFieldsArray.remove(index)}
                        disabled={isPending}
                        className="self-start"
                      >
                        <XIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                {customFieldsArray.fields.length >= 20 && (
                  <p className="text-sm text-muted-foreground mt-2">Maximum of 20 custom fields reached</p>
                )}
              </div>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="shrink-0 border-t border-slate-200 px-6 py-4 sm:px-8">
          <div className="flex w-full items-center justify-between gap-x-2">
            <div>
              {!isLastTab ? (
                <Button
                  type="button"
                  onClick={handleNext}
                  disabled={isPending}
                  className="h-12 shrink-0 rounded-lg bg-slate-900 px-8 text-base font-semibold text-white shadow-lg shadow-slate-200 transition-all hover:bg-slate-800 hover:shadow-none sm:h-14 sm:px-10 sm:min-w-[220px]"
                >
                  Continue
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={() => handleSubmit(onSubmit)()}
                  disabled={isPending}
                  className="h-12 shrink-0 rounded-lg bg-slate-900 px-8 text-base font-semibold text-white shadow-lg shadow-slate-200 transition-all hover:bg-slate-800 hover:shadow-none sm:h-14 sm:px-10 sm:min-w-[220px]"
                >
                  {isPending && <SpinnerIcon className="h-4 w-4 animate-spin mr-2" />}
                  {isEditMode ? 'Save Changes' : 'Submit Request'}
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {currentTabIndex > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBack}
                  disabled={isPending}
                  className="rounded-lg border-slate-200"
                >
                  <ChevronLeftIcon className="h-4 w-4 mr-2" />
                  Back
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isPending}
                className="rounded-lg border-slate-200"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
