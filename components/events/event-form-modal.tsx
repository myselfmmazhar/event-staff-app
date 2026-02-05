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
import { EventStatus, RequestMethod, AmountType } from '@prisma/client';
import { AMOUNT_TYPE_OPTIONS } from '@/lib/constants/enums';
import { EventDocumentUpload } from './event-document-upload';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm, useFieldArray, type SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { CloseIcon, EyeIcon, PlusIcon, XIcon } from '@/components/ui/icons';
import { trpc } from '@/lib/client/trpc';
import { useTerminology } from '@/lib/hooks/use-terminology';
import { AddressAutocomplete } from '@/components/maps/address-autocomplete';
import {
  EventAttachmentsSection,
  type AttachedServiceItem,
  type AttachedProductItem,
} from './event-attachments-section';

// Use the create schema directly for create mode
const createFormSchema = EventSchema.create;

// Build edit form schema (all fields optional except those being updated)
const editFormSchema = z.object({
  eventId: z.string().min(1, "Event ID is required").optional(),
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
  // Billing & Rate Settings
  estimate: z.boolean().optional(),
  taskRateType: z.nativeEnum(AmountType).optional().nullable(),
  commission: z.boolean().optional(),
  commissionAmount: z.number().min(0).optional().nullable(),
  commissionAmountType: z.nativeEnum(AmountType).optional().nullable(),
  approveForOvertime: z.boolean().optional(),
  overtimeRate: z.number().min(0).optional().nullable(),
  overtimeRateType: z.nativeEnum(AmountType).optional().nullable(),
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
  // Billing & Rate Settings
  estimate?: boolean | null;
  taskRateType?: AmountType | null;
  commission?: boolean | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  commissionAmount?: number | any | null;
  commissionAmountType?: AmountType | null;
  approveForOvertime?: boolean | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  overtimeRate?: number | any | null;
  overtimeRateType?: AmountType | null;
}

interface EventFormModalProps {
  event: Event | null;
  open: boolean;
  onClose: () => void;
  onSubmit: (
    data: CreateEventInput | Omit<UpdateEventInput, 'id'>,
    attachments?: {
      services: Array<{ serviceId: string; quantity: number; customPrice?: number | null; notes?: string | null }>;
      products: Array<{ productId: string; quantity: number; customPrice?: number | null; notes?: string | null }>;
    }
  ) => void;
  isSubmitting: boolean;
  backendErrors?: Array<{ field: string; message: string }>;
  onViewDetails?: () => void;
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
  onViewDetails,
}: EventFormModalProps) {
  const { terminology } = useTerminology();
  const isEdit = !!event;
  const [startTimeTBD, setStartTimeTBD] = useState(false);
  const [endTimeTBD, setEndTimeTBD] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [attachedServices, setAttachedServices] = useState<AttachedServiceItem[]>([]);
  const [attachedProducts, setAttachedProducts] = useState<AttachedProductItem[]>([]);

  // Fetch clients for dropdown
  const { data: clientsData } = trpc.clients.getAll.useQuery({
    page: 1,
    limit: 100
  });

  // Fetch templates for dropdown (only in create mode)
  const { data: templatesData } = trpc.eventTemplate.getForSelection.useQuery(undefined, {
    enabled: !isEdit,
  });

  // Fetch full event data when editing (ensures eventDocuments and all fields are present)
  const { data: fullEventData } = trpc.event.getById.useQuery(
    { id: event?.id || '' },
    { enabled: isEdit && !!event?.id && open }
  );

  // Fetch full template data when selected
  const { data: selectedTemplateData } = trpc.eventTemplate.getById.useQuery(
    { id: selectedTemplateId },
    { enabled: !!selectedTemplateId && !isEdit }
  );

  // Fetch existing attachments when editing
  const { data: existingAttachments } = trpc.eventAttachment.getByEventId.useQuery(
    { eventId: event?.id || '' },
    { enabled: isEdit && !!event?.id }
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
      // Billing & Rate Settings
      estimate: false,
      taskRateType: undefined,
      commission: false,
      commissionAmount: undefined,
      commissionAmountType: undefined,
      approveForOvertime: false,
      overtimeRate: undefined,
      overtimeRateType: undefined,
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

      // Use full event data from getById if available, otherwise fall back to list data
      const eventDocsSource = fullEventData?.eventDocuments ?? event.eventDocuments;
      const eventDocsData = Array.isArray(eventDocsSource) ? (eventDocsSource as EventDocument[]) : null;
      reset({
        eventId: event.eventId,
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
        // Billing & Rate Settings
        estimate: event.estimate ?? false,
        taskRateType: event.taskRateType || undefined,
        commission: event.commission ?? false,
        commissionAmount: event.commissionAmount ? Number(event.commissionAmount) : undefined,
        commissionAmountType: event.commissionAmountType || undefined,
        approveForOvertime: event.approveForOvertime ?? false,
        overtimeRate: event.overtimeRate ? Number(event.overtimeRate) : undefined,
        overtimeRateType: event.overtimeRateType || undefined,
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
        // Billing & Rate Settings
        estimate: false,
        taskRateType: undefined,
        commission: false,
        commissionAmount: undefined,
        commissionAmountType: undefined,
        approveForOvertime: false,
        overtimeRate: undefined,
        overtimeRateType: undefined,
      });
      setStartTimeTBD(false);
      setEndTimeTBD(false);
    }
  }, [event, reset, open, fullEventData]);

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

  // Auto-fill requirements when a client is selected
  const selectedClientId = watch('clientId');
  useEffect(() => {
    if (!selectedClientId || !clientsData?.data) return;
    const selectedClient = clientsData.data.find(c => c.id === selectedClientId);
    if (selectedClient?.requirements) {
      const currentRequirements = watch('requirements');
      if (!currentRequirements) {
        setValue('requirements', selectedClient.requirements);
      }
    }
  }, [selectedClientId, clientsData, setValue, watch]);

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
        // Billing & Rate Settings (templates don't have these, use defaults)
        estimate: false,
        taskRateType: undefined,
        commission: false,
        commissionAmount: undefined,
        commissionAmountType: undefined,
        approveForOvertime: false,
        overtimeRate: undefined,
        overtimeRateType: undefined,
      });
      setStartTimeTBD(template.startTime === 'TBD');
      setEndTimeTBD(template.endTime === 'TBD');
    }
  }, [selectedTemplateData, isEdit, reset]);

  // Reset template selection when modal closes
  useEffect(() => {
    if (!open) {
      setSelectedTemplateId('');
      setAttachedServices([]);
      setAttachedProducts([]);
    }
  }, [open]);

  // Populate attachments when editing
  useEffect(() => {
    if (existingAttachments && isEdit) {
      // Map existing services to AttachedServiceItem format
      const services: AttachedServiceItem[] = existingAttachments.services.map((s) => ({
        serviceId: s.serviceId,
        quantity: s.quantity,
        customPrice: s.customPrice ? Number(s.customPrice) : null,
        notes: s.notes,
        service: {
          id: s.service.id,
          serviceId: s.service.serviceId,
          title: s.service.title,
          cost: s.service.cost ? Number(s.service.cost) : null,
          price: s.service.price ? Number(s.service.price) : null,
          costUnitType: s.service.costUnitType,
          description: s.service.description,
          isActive: s.service.isActive,
        },
      }));

      // Map existing products to AttachedProductItem format
      const products: AttachedProductItem[] = existingAttachments.products.map((p) => ({
        productId: p.productId,
        quantity: p.quantity,
        customPrice: p.customPrice ? Number(p.customPrice) : null,
        notes: p.notes,
        product: {
          id: p.product.id,
          productId: p.product.productId,
          title: p.product.title,
          cost: p.product.cost ? Number(p.product.cost) : null,
          price: p.product.price ? Number(p.product.price) : null,
          priceUnitType: p.product.priceUnitType,
          description: p.product.description,
          category: p.product.category,
          isActive: p.product.isActive,
        },
      }));

      setAttachedServices(services);
      setAttachedProducts(products);
    }
  }, [existingAttachments, isEdit]);

  const handleFormSubmit: SubmitHandler<FormOutput> = (data) => {
    const normalizedData = {
      ...data,
      startTime: startTimeTBD ? 'TBD' : (data.startTime || undefined),
      endTime: endTimeTBD ? 'TBD' : (data.endTime || undefined),
    };

    // Prepare attachments data
    const attachments = {
      services: attachedServices.map((s) => ({
        serviceId: s.serviceId,
        quantity: s.quantity,
        customPrice: s.customPrice,
        notes: s.notes,
      })),
      products: attachedProducts.map((p) => ({
        productId: p.productId,
        quantity: p.quantity,
        customPrice: p.customPrice,
        notes: p.notes,
      })),
    };

    if (isEdit) {
      const finalData = editFormSchema.parse(normalizedData);
      onSubmit(finalData, attachments);
    } else {
      const finalData = createFormSchema.parse(normalizedData);
      onSubmit(finalData, attachments);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullScreen>
      <form onSubmit={handleSubmit(handleFormSubmit)} className="h-full flex flex-col">
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

        <DialogContent className="flex-1 overflow-y-auto">
          {/* Event ID (Editable in edit mode) */}
          {isEdit && (
            <div className="mb-6">
              <Label htmlFor="eventId">{terminology.event.singular} ID</Label>
              <Input
                id="eventId"
                {...register('eventId' as FormFieldName)}
                placeholder="EVT-YYYY-NNN"
                className="font-mono"
              />
              {(errors as any).eventId && (
                <p className="text-destructive text-sm mt-1">{(errors as any).eventId.message}</p>
              )}
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
                        // Billing & Rate Settings
                        estimate: false,
                        taskRateType: undefined,
                        commission: false,
                        commissionAmount: undefined,
                        commissionAmountType: undefined,
                        approveForOvertime: false,
                        overtimeRate: undefined,
                        overtimeRateType: undefined,
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

          {/* === ROW 1: Basic Information + Date & Time === */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
            {/* Basic Information */}
            <div className="lg:col-span-3 bg-accent/5 border border-border/30 p-5 rounded-lg">
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

            {/* Date & Time */}
            <div className="lg:col-span-2 bg-accent/5 border border-border/30 p-5 rounded-lg">
              <h3 className="text-lg font-semibold border-b border-border pb-2 mb-4">Date & Time</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="startDate" required>Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    {...register('startDate', {
                      onChange: (e) => {
                        setValue('endDate', e.target.value);
                      },
                    })}
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
          </div>

          {/* === ROW 2: Venue Information (full width) === */}
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

          {/* === ROW 3: Request Information + Onsite Contact === */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Request Information */}
            <div className="bg-accent/5 border border-border/30 p-5 rounded-lg">
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

                <div>
                  <Label htmlFor="requestorName">Requestor Name</Label>
                  <Input
                    id="requestorName"
                    {...register('requestorName')}
                    disabled={isSubmitting}
                    placeholder="John Doe"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <div className="bg-accent/5 border border-border/30 p-5 rounded-lg">
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

                <div>
                  <Label htmlFor="onsitePocName">POC Name</Label>
                  <Input
                    id="onsitePocName"
                    {...register('onsitePocName')}
                    disabled={isSubmitting}
                    placeholder="Point of Contact name"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          </div>

          {/* === ROW 4: Pre-Event Instructions + Documents & Files === */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Pre-Event Instructions */}
            <div className="bg-accent/5 border border-border/30 p-5 rounded-lg">
              <h3 className="text-lg font-semibold border-b border-border pb-2 mb-4">Pre-Event Instructions</h3>
              <Textarea
                id="preEventInstructions"
                {...register('preEventInstructions')}
                disabled={isSubmitting}
                rows={4}
                placeholder="Instructions for staff before the event..."
              />
            </div>

            {/* Documents & File Links Column */}
            <div className="space-y-6">
              {/* Event Documents */}
              <div className="bg-accent/5 border border-border/30 p-5 rounded-lg">
                <h3 className="text-lg font-semibold border-b border-border pb-2 mb-4">Event Documents</h3>
                <EventDocumentUpload
                  documents={watch('eventDocuments') || []}
                  onChange={(docs) => setValue('eventDocuments', docs)}
                  disabled={isSubmitting}
                />
              </div>

              {/* File Links */}
              <div className="bg-accent/5 border border-border/30 p-5 rounded-lg">
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
            </div>
          </div>

          {/* === ROW 5: Billing & Rate Settings + Services & Products === */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Billing & Rate Settings */}
            <div className="bg-accent/5 border border-border/30 p-5 rounded-lg">
              <h3 className="text-lg font-semibold border-b border-border pb-2 mb-4">Billing & Rate Settings</h3>
              <div className="space-y-4">
                {/* Estimate Flag */}
                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      {...register('estimate')}
                      disabled={isSubmitting}
                      className="rounded border-input"
                    />
                    <span className="text-sm font-medium">This is an estimate</span>
                  </label>
                </div>

                {/* Task Rate Type */}
                <div>
                  <Label htmlFor="taskRateType">Task Rate Type</Label>
                  <Select
                    id="taskRateType"
                    {...register('taskRateType')}
                    disabled={isSubmitting}
                  >
                    <option value="">Select type...</option>
                    {AMOUNT_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </div>

                {/* Commission Section */}
                <div className="border-t border-border/30 pt-4">
                  <h4 className="text-sm font-medium mb-3">Commission</h4>
                  <div className="mb-3">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        {...register('commission')}
                        disabled={isSubmitting}
                        className="rounded border-input"
                      />
                      <span className="text-sm">Has commission</span>
                    </label>
                  </div>

                  {watch('commission') && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                      <div>
                        <Label htmlFor="commissionAmount">Commission Amount</Label>
                        <Input
                          id="commissionAmount"
                          type="number"
                          step="0.01"
                          min="0"
                          {...register('commissionAmount', { valueAsNumber: true })}
                          disabled={isSubmitting}
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <Label htmlFor="commissionAmountType">Commission Type</Label>
                        <Select
                          id="commissionAmountType"
                          {...register('commissionAmountType')}
                          disabled={isSubmitting}
                        >
                          <option value="">Select type...</option>
                          {AMOUNT_TYPE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </Select>
                      </div>
                    </div>
                  )}
                </div>

                {/* Overtime Section */}
                <div className="border-t border-border/30 pt-4">
                  <h4 className="text-sm font-medium mb-3">Overtime</h4>
                  <div className="mb-3">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        {...register('approveForOvertime')}
                        disabled={isSubmitting}
                        className="rounded border-input"
                      />
                      <span className="text-sm">Approved for overtime</span>
                    </label>
                  </div>

                  {watch('approveForOvertime') && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                      <div>
                        <Label htmlFor="overtimeRate">Overtime Rate</Label>
                        <Input
                          id="overtimeRate"
                          type="number"
                          step="0.01"
                          min="0"
                          {...register('overtimeRate', { valueAsNumber: true })}
                          disabled={isSubmitting}
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <Label htmlFor="overtimeRateType">Overtime Rate Type</Label>
                        <Select
                          id="overtimeRateType"
                          {...register('overtimeRateType')}
                          disabled={isSubmitting}
                        >
                          <option value="">Select type...</option>
                          {AMOUNT_TYPE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </Select>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Services & Products */}
            <EventAttachmentsSection
              attachedServices={attachedServices}
              attachedProducts={attachedProducts}
              onServicesChange={setAttachedServices}
              onProductsChange={setAttachedProducts}
              disabled={isSubmitting}
            />
          </div>

          {/* === ROW 6: Private Notes (full width) === */}
          <div className="bg-accent/5 border border-border/30 p-5 rounded-lg mb-6 lg:max-w-2xl">
            <h3 className="text-lg font-semibold border-b border-border pb-2 mb-4">Private Notes</h3>
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
        </DialogContent>

        <DialogFooter>
          {isEdit && onViewDetails && (
            <Button type="button" variant="outline" onClick={onViewDetails} className="mr-auto">
              <EyeIcon className="h-4 w-4 mr-1" />
              View Details
            </Button>
          )}
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
