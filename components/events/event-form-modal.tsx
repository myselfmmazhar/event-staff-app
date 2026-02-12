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
import { EventSchema } from '@/lib/schemas/event.schema';
import type { CreateEventInput, UpdateEventInput, FileLink, EventDocument, CustomField } from '@/lib/schemas/event.schema';
import { EventStatus, RequestMethod, AmountType } from '@prisma/client';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState, useCallback } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { CloseIcon, EyeIcon, UploadIcon, FileTextIcon, FileSpreadsheetIcon } from '@/components/ui/icons';
import { Badge } from '@/components/ui/badge';
import {
  parseImportFile,
  autoDetectColumnMapping,
  applyColumnMapping,
  validateRow,
  mapRowToCreateInput,
  type RowValidationResult,
} from '@/lib/utils/event-import';
import type { ImportEventRow } from '@/lib/schemas/event-import.schema';
import { downloadSampleEventTemplate } from '@/lib/utils/event-export';
import { toast } from '@/components/ui/use-toast';
import { trpc } from '@/lib/client/trpc';
import { useTerminology } from '@/lib/hooks/use-terminology';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EventFormFields } from './event-form-fields';
import { BatchEntryList } from './batch-entry-list';
import type { Assignment, ProductAssignment, ServiceAssignment, ProductAssignmentExtendedData } from '@/lib/types/assignment.types';
import { isDateNullOrUBD } from '@/lib/utils/date-formatter';

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
  // Date and Time (nullable for UBD support)
  // Empty string or null both map to null (UBD). z.null() must come first.
  startDate: z.preprocess(
    (val) => (val === '' || val === undefined ? null : val),
    z.union([z.null(), z.coerce.date()])
  ).optional(),
  startTime: z.string().optional(),
  startTimeTBD: z.boolean().default(false),
  endDate: z.preprocess(
    (val) => (val === '' || val === undefined ? null : val),
    z.union([z.null(), z.coerce.date()])
  ).optional(),
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
  requestMethod: z.nativeEnum(RequestMethod).optional().nullable(),
  requestorName: z.string().max(200).optional().transform(val => val?.trim()),
  requestorPhone: z.string().max(50).optional().transform(val => val?.trim()),
  requestorEmail: z.string().email().max(255).optional().or(z.literal('')),
  poNumber: z.string().max(100).optional().transform(val => val?.trim()),
  preEventInstructions: z.string().max(10000).optional().transform(val => val?.trim()),
  eventDocuments: z.array(z.object({
    name: z.string(),
    url: z.string().url(),
    type: z.string().optional(),
    size: z.number().optional(),
  })).optional(),
  customFields: z.array(z.object({
    label: z.string().min(1, "Label is required").max(100),
    value: z.string().max(1000),
  })).optional(),
  meetingPoint: z.string().max(300).optional().transform(val => val?.trim()),
  onsitePocName: z.string().max(200).optional().transform(val => val?.trim()),
  onsitePocPhone: z.string().max(50).optional().transform(val => val?.trim()),
  onsitePocEmail: z.string().email().max(255).optional().or(z.literal('')),
  estimate: z.boolean().optional(),
  taskRateType: z.nativeEnum(AmountType).optional().nullable(),
  commission: z.boolean().optional(),
  commissionAmount: z.union([
    z.number().min(0),
    z.literal(''),
    z.nan(),
  ]).optional().nullable().transform((val) => {
    if (val === '' || val === undefined || val === null || (typeof val === 'number' && Number.isNaN(val))) return undefined;
    return val;
  }),
  commissionAmountType: z.nativeEnum(AmountType).optional().nullable(),
  approveForOvertime: z.boolean().optional(),
  overtimeRate: z.union([
    z.number().min(0),
    z.literal(''),
    z.nan(),
  ]).optional().nullable().transform((val) => {
    if (val === '' || val === undefined || val === null || (typeof val === 'number' && Number.isNaN(val))) return undefined;
    return val;
  }),
  overtimeRateType: z.nativeEnum(AmountType).optional().nullable(),
}).refine((data) => {
  // Only validate if both dates are provided (not UBD)
  if (data.startDate && data.endDate) {
    return data.endDate >= data.startDate;
  }
  return true;
}, {
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
  startDate: Date | null;
  startTime?: string | null;
  endDate: Date | null;
  endTime?: string | null;
  timezone: string;
  dailyDigestMode: boolean;
  requireStaff: boolean;
  status: EventStatus;
  fileLinks?: FileLink[] | null;
  requestMethod?: RequestMethod | null;
  requestorName?: string | null;
  requestorPhone?: string | null;
  requestorEmail?: string | null;
  poNumber?: string | null;
  preEventInstructions?: string | null;
  eventDocuments?: EventDocument[] | null;
  customFields?: CustomField[] | null;
  meetingPoint?: string | null;
  onsitePocName?: string | null;
  onsitePocPhone?: string | null;
  onsitePocEmail?: string | null;
  estimate?: boolean | null;
  taskRateType?: AmountType | null;
  commission?: boolean | null;
  commissionAmount?: number | any | null;
  commissionAmountType?: AmountType | null;
  approveForOvertime?: boolean | null;
  overtimeRate?: number | any | null;
  overtimeRateType?: AmountType | null;
}

type SaveAction = 'close' | 'new';

// Type for CallTime assignments from Event Form
type CallTimeAssignment = {
  serviceId: string;
  quantity: number;
  customCost?: number | null;
  customPrice?: number | null;
  startDate?: string | null;
  startTime?: string | null;
  endDate?: string | null;
  endTime?: string | null;
  experienceRequired?: 'ANY' | 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  ratingRequired?: 'ANY' | 'NA' | 'A' | 'B' | 'C';
  approveOvertime?: boolean;
  commission?: boolean;
  payRate?: number | null;
  billRate?: number | null;
  rateType?: 'PER_HOUR' | 'PER_SHIFT' | 'PER_DAY' | 'PER_EVENT' | null;
  notes?: string | null;
};

interface EventFormModalProps {
  event: Event | null;
  open: boolean;
  onClose: () => void;
  onSubmit: (
    data: CreateEventInput | Omit<UpdateEventInput, 'id'>,
    attachments?: {
      callTimes: CallTimeAssignment[];
      products: Array<{ productId: string; quantity: number; customPrice?: number | null; notes?: string | null }>;
    },
    saveAction?: SaveAction
  ) => void;
  isSubmitting: boolean;
  backendErrors?: Array<{ field: string; message: string }>;
  onViewDetails?: () => void;
  /** Increment this key to reset the form for a new entry (used with Save & New) */
  resetKey?: number;
}

type EntryType = 'single' | 'batch';

export function EventFormModal({
  event,
  open,
  onClose,
  onSubmit,
  isSubmitting,
  backendErrors = [],
  onViewDetails,
  resetKey = 0,
}: EventFormModalProps) {
  const { terminology } = useTerminology();
  const utils = trpc.useUtils();
  const isEdit = !!event;

  // Entry type and batch state
  const [entryType, setEntryType] = useState<EntryType>('single');
  const [batchFile, setBatchFile] = useState<File | null>(null);
  const [batchStep, setBatchStep] = useState<'upload' | 'preview'>('upload');
  const [batchValidationResults, setBatchValidationResults] = useState<RowValidationResult[]>([]);

  // Date UBD and Time TBD state
  const [startDateUBD, setStartDateUBD] = useState(false);
  const [endDateUBD, setEndDateUBD] = useState(false);
  const [startTimeTBD, setStartTimeTBD] = useState(false);
  const [endTimeTBD, setEndTimeTBD] = useState(false);

  // Template and attachments state
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  // Save action state (for Save & Close vs Save & New)
  const [pendingSaveAction, setPendingSaveAction] = useState<SaveAction>('close');

  // Data queries
  const { data: clientsData } = trpc.clients.getAll.useQuery({ page: 1, limit: 100 });
  const { data: templatesData } = trpc.eventTemplate.getForSelection.useQuery(undefined, { enabled: !isEdit });
  const { data: fullEventData } = trpc.event.getById.useQuery(
    { id: event?.id || '' },
    { enabled: isEdit && !!event?.id && open }
  );
  const { data: selectedTemplateData } = trpc.eventTemplate.getById.useQuery(
    { id: selectedTemplateId },
    { enabled: !!selectedTemplateId && !isEdit }
  );
  // Query CallTimes for service assignments (replaces EventService)
  const { data: existingCallTimes } = trpc.callTime.getByEventForBilling.useQuery(
    { eventId: event?.id || '' },
    { enabled: isEdit && !!event?.id }
  );
  // Query products (still uses EventProduct)
  const { data: existingProducts } = trpc.eventAttachment.getProductsByEventId.useQuery(
    { eventId: event?.id || '' },
    { enabled: isEdit && !!event?.id }
  );
  const { data: companyProfile } = trpc.settings.getCompanyProfile.useQuery();

  // Client map for batch validation
  const clientMap = new Map<string, string>();
  clientsData?.data.forEach((c) => {
    clientMap.set(c.businessName.toLowerCase(), c.id);
  });

  // Batch import mutation
  const batchImportMutation = trpc.event.bulkImport.useMutation({
    onSuccess: (result) => {
      const created = result.created ?? 0;
      const errors = result.errors?.length ?? 0;
      if (errors === 0) {
        toast({ title: `Created ${created} ${terminology.event.plural.toLowerCase()} successfully`, type: 'success' });
      } else {
        toast({ title: `Created ${created} ${terminology.event.plural.toLowerCase()} with ${errors} errors`, type: 'info' });
      }
      // Invalidate event queries to refresh the list
      utils.event.getAll.invalidate();
      utils.event.getByDateRange.invalidate();
      onClose();
    },
    onError: (error) => {
      toast({ title: `Import failed: ${error.message}`, type: 'error' });
    },
  });

  // Form setup
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
    defaultValues: getDefaultValues(),
  });

  function getDefaultValues(): Partial<FormInput> {
    const today = new Date();
    const todayFormatted = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    return {
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
      timezone: companyProfile?.companyTimezone || 'America/New_York',
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
      customFields: [],
      meetingPoint: '',
      onsitePocName: '',
      onsitePocPhone: '',
      onsitePocEmail: '',
      estimate: false,
      taskRateType: undefined,
      commission: false,
      commissionAmount: undefined,
      commissionAmountType: undefined,
      approveForOvertime: false,
      overtimeRate: undefined,
      overtimeRateType: undefined,
    };
  }

  // Reset form when event changes
  useEffect(() => {
    if (event) {
      const formatDateForInput = (date: Date | string | null) => {
        if (!date) return '';
        const d = new Date(date);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      };

      // Check for UBD dates (null or epoch date from superjson bug)
      const startDateIsUBD = isDateNullOrUBD(event.startDate);
      const endDateIsUBD = isDateNullOrUBD(event.endDate);

      const eventDocsSource = fullEventData?.eventDocuments ?? event.eventDocuments;
      const eventDocsData = Array.isArray(eventDocsSource) ? eventDocsSource as EventDocument[] : null;
      const fileLinksData = event.fileLinks as FileLink[] | null;

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
        startDate: !startDateIsUBD ? formatDateForInput(event.startDate) as any : '',
        startTime: event.startTime === 'TBD' ? '' : (event.startTime || ''),
        endDate: !endDateIsUBD ? formatDateForInput(event.endDate) as any : '',
        endTime: event.endTime === 'TBD' ? '' : (event.endTime || ''),
        timezone: event.timezone,
        dailyDigestMode: event.dailyDigestMode,
        requireStaff: event.requireStaff,
        status: event.status,
        fileLinks: fileLinksData || [],
        requestMethod: event.requestMethod || undefined,
        requestorName: event.requestorName || '',
        requestorPhone: event.requestorPhone || '',
        requestorEmail: event.requestorEmail || '',
        poNumber: event.poNumber || '',
        preEventInstructions: event.preEventInstructions || '',
        eventDocuments: eventDocsData || [],
        customFields: (event.customFields as CustomField[]) || [],
        meetingPoint: event.meetingPoint || '',
        onsitePocName: event.onsitePocName || '',
        onsitePocPhone: event.onsitePocPhone || '',
        onsitePocEmail: event.onsitePocEmail || '',
        estimate: event.estimate ?? false,
        taskRateType: event.taskRateType || undefined,
        commission: event.commission ?? false,
        commissionAmount: event.commissionAmount ? Number(event.commissionAmount) : undefined,
        commissionAmountType: event.commissionAmountType || undefined,
        approveForOvertime: event.approveForOvertime ?? false,
        overtimeRate: event.overtimeRate ? Number(event.overtimeRate) : undefined,
        overtimeRateType: event.overtimeRateType || undefined,
      });
      // Set UBD/TBD state
      setStartDateUBD(startDateIsUBD);
      setEndDateUBD(endDateIsUBD);
      setStartTimeTBD(event.startTime === 'TBD');
      setEndTimeTBD(event.endTime === 'TBD');
    } else {
      reset(getDefaultValues());
      setStartDateUBD(false);
      setEndDateUBD(false);
      setStartTimeTBD(false);
      setEndTimeTBD(false);
    }
  }, [event, reset, open, fullEventData, companyProfile]);

  // Map backend errors to form fields
  useEffect(() => {
    if (backendErrors && backendErrors.length > 0) {
      backendErrors.forEach((error) => {
        setError(error.field as FormFieldName, { type: 'manual', message: error.message });
      });
    }
  }, [backendErrors, setError]);

  // Auto-fill requirements when client is selected
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

  // Apply template data
  useEffect(() => {
    if (selectedTemplateData && !isEdit) {
      const template = selectedTemplateData;
      const formatDateForInput = (date: Date | string | null | undefined) => {
        if (!date) return undefined;
        const d = new Date(date);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      };

      const today = new Date();
      const todayFormatted = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const fileLinksData = template.fileLinks as FileLink[] | null;
      const templateDocsData = template.eventDocuments as EventDocument[] | null;
      const templateCustomFields = template.customFields as CustomField[] | null;

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
        requestMethod: template.requestMethod || undefined,
        requestorName: template.requestorName || '',
        requestorPhone: template.requestorPhone || '',
        requestorEmail: template.requestorEmail || '',
        poNumber: template.poNumber || '',
        preEventInstructions: template.preEventInstructions || '',
        eventDocuments: templateDocsData || [],
        customFields: templateCustomFields || [],
        meetingPoint: template.meetingPoint || '',
        onsitePocName: template.onsitePocName || '',
        onsitePocPhone: template.onsitePocPhone || '',
        onsitePocEmail: template.onsitePocEmail || '',
        estimate: false,
        taskRateType: undefined,
        commission: false,
        commissionAmount: undefined,
        commissionAmountType: undefined,
        approveForOvertime: false,
        overtimeRate: undefined,
        overtimeRateType: undefined,
      });
      setStartDateUBD(template.startDate === null);
      setEndDateUBD(template.endDate === null);
      setStartTimeTBD(template.startTime === 'TBD');
      setEndTimeTBD(template.endTime === 'TBD');
    }
  }, [selectedTemplateData, isEdit, reset]);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setSelectedTemplateId('');
      setAssignments([]);
      setEntryType('single');
      setBatchFile(null);
      setBatchStep('upload');
      setBatchValidationResults([]);
    }
  }, [open]);

  // Reset form when resetKey changes (triggered by Save & New)
  useEffect(() => {
    if (resetKey > 0 && !event) {
      reset(getDefaultValues());
      setStartDateUBD(false);
      setEndDateUBD(false);
      setStartTimeTBD(false);
      setEndTimeTBD(false);
      setSelectedTemplateId('');
      setAssignments([]);
      setPendingSaveAction('close');
    }
  }, [resetKey, event, reset]);

  // Populate assignments when editing - service assignments from CallTimes
  useEffect(() => {
    if (isEdit && (existingCallTimes || existingProducts)) {
      // Map CallTimes to ServiceAssignments
      const serviceAssignments: Assignment[] = (existingCallTimes || []).map((ct) => {
        // Format dates for the form (YYYY-MM-DD)
        const formatDate = (date: Date | string | null): string | null => {
          if (!date) return null;
          const d = new Date(date);
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        };

        // Map SkillLevel to ExperienceRequirement
        const mapSkillToExperience = (skillLevel: string): 'ANY' | 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' => {
          switch (skillLevel) {
            case 'INTERMEDIATE': return 'INTERMEDIATE';
            case 'ADVANCED': return 'ADVANCED';
            default: return 'ANY';
          }
        };

        return {
          id: crypto.randomUUID(),
          type: 'SERVICE' as const,
          serviceId: ct.serviceId || '',
          service: ct.service ? {
            id: ct.service.id,
            serviceId: ct.service.serviceId,
            title: ct.service.title,
            cost: ct.service.cost ? Number(ct.service.cost) : null,
            price: ct.service.price ? Number(ct.service.price) : null,
            costUnitType: ct.service.costUnitType,
            description: ct.service.description,
            isActive: ct.service.isActive,
          } : null,
          quantity: ct.numberOfStaffRequired,
          customCost: ct.customCost ? Number(ct.customCost) : null,
          customPrice: ct.customPrice ? Number(ct.customPrice) : null,
          costUnitType: ct.service?.costUnitType || null,
          commission: ct.commission ?? false,
          startDate: formatDate(ct.startDate),
          startTime: ct.startTime ?? null,
          endDate: formatDate(ct.endDate),
          endTime: ct.endTime ?? null,
          experienceRequired: mapSkillToExperience(ct.skillLevel),
          ratingRequired: ct.ratingRequired ?? 'ANY',
          approveOvertime: ct.approveOvertime ?? false,
          payRate: ct.payRate ? Number(ct.payRate) : null,
          billRate: ct.billRate ? Number(ct.billRate) : null,
          rateType: ct.payRateType ?? null,
          notes: ct.notes ?? null,
        };
      });

      // Map EventProducts to ProductAssignments
      const productAssignments: Assignment[] = (existingProducts || []).map((p) => {
        // Parse extended data from notes if available
        let extendedData: ProductAssignmentExtendedData = {};
        try {
          if (p.notes) {
            extendedData = JSON.parse(p.notes);
          }
        } catch {
          // Notes is plain text, not JSON
        }

        return {
          id: crypto.randomUUID(),
          type: 'PRODUCT' as const,
          productId: p.productId,
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
          quantity: p.quantity,
          customCost: p.customPrice ? Number(p.customPrice) : null,
          customPrice: p.customPrice ? Number(p.customPrice) : null,
          costUnitType: p.product.priceUnitType || null,
          commission: extendedData.commission ?? false,
          description: extendedData.description ?? p.product.description ?? null,
          instructions: extendedData.instructions ?? null,
        };
      });

      setAssignments([...serviceAssignments, ...productAssignments]);
    }
  }, [existingCallTimes, existingProducts, isEdit]);

  // Batch file handling
  const handleBatchFileSelect = useCallback(async (selectedFile: File) => {
    setBatchFile(selectedFile);

    const result = await parseImportFile(selectedFile);
    if (!result.success) {
      toast({ title: result.error || 'Failed to parse file', type: 'error' });
      return;
    }
    if (result.rows.length === 0) {
      toast({ title: 'No data rows found in file', type: 'error' });
      return;
    }

    const autoMapping = autoDetectColumnMapping(result.headers);
    const mappedRows = applyColumnMapping(result.rows, autoMapping);
    const results = mappedRows.map((row, index) => validateRow(row, index, clientMap));
    setBatchValidationResults(results);
    setBatchStep('preview');
  }, [clientMap]);

  const handleBatchFileDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.csv') || file.name.endsWith('.xlsx'))) {
      handleBatchFileSelect(file);
    } else {
      toast({ title: 'Please upload a CSV or Excel file', type: 'error' });
    }
  }, [handleBatchFileSelect]);

  const handleBatchFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleBatchFileSelect(file);
  }, [handleBatchFileSelect]);

  const handleUpdateBatchEntry = useCallback((index: number, data: Partial<ImportEventRow>) => {
    setBatchValidationResults((prev) =>
      prev.map((r) => {
        if (r.rowIndex !== index) return r;
        const updatedData = { ...r.data, ...data };
        return validateRow(updatedData as any, index, clientMap);
      })
    );
  }, [clientMap]);

  const handleRemoveBatchEntry = useCallback((index: number) => {
    setBatchValidationResults((prev) => prev.filter((r) => r.rowIndex !== index));
  }, []);

  const handleBatchSubmit = () => {
    const validRows = batchValidationResults
      .filter((r) => r.valid && r.data)
      .map((r) => mapRowToCreateInput(r.data!, clientMap));

    if (validRows.length === 0) {
      toast({ title: 'No valid entries to import', type: 'error' });
      return;
    }

    batchImportMutation.mutate({ events: validRows, mode: 'create' });
  };

  const batchValidCount = batchValidationResults.filter((r) => r.valid).length;

  // Form submission
  const handleFormSubmit: SubmitHandler<FormOutput> = (data) => {
    console.log('[EventFormModal] handleFormSubmit called');
    console.log('[EventFormModal] isEdit:', isEdit);
    console.log('[EventFormModal] form data:', data);
    console.log('[EventFormModal] pendingSaveAction:', pendingSaveAction);

    const normalizedData = {
      ...data,
      // Handle UBD dates - send null when UBD is checked
      startDate: startDateUBD ? null : (data.startDate ? new Date(data.startDate) : null),
      endDate: endDateUBD ? null : (data.endDate ? new Date(data.endDate) : null),
      startTime: startTimeTBD ? 'TBD' : (data.startTime || undefined),
      endTime: endTimeTBD ? 'TBD' : (data.endTime || undefined),
    };

    // Transform assignments back to backend format
    const serviceAssignments = assignments.filter((a): a is ServiceAssignment => a.type === 'SERVICE');
    const productAssignments = assignments.filter((a): a is ProductAssignment => a.type === 'PRODUCT');

    const attachments = {
      // Service assignments now create CallTime records
      callTimes: serviceAssignments.map((s) => ({
        serviceId: s.serviceId,
        quantity: s.quantity,
        customCost: s.customCost,
        customPrice: s.customPrice,
        startDate: s.startDate,
        startTime: s.startTime,
        endDate: s.endDate,
        endTime: s.endTime,
        experienceRequired: s.experienceRequired,
        ratingRequired: s.ratingRequired,
        approveOvertime: s.approveOvertime,
        commission: s.commission,
        payRate: s.payRate,
        billRate: s.billRate,
        rateType: s.rateType,
        notes: s.notes,
      })),
      products: productAssignments.map((p) => {
        // Store extended data in notes as JSON
        const extendedData: ProductAssignmentExtendedData = {
          description: p.description,
          instructions: p.instructions,
          commission: p.commission,
        };
        return {
          productId: p.productId,
          quantity: p.quantity,
          customPrice: p.customPrice,
          notes: JSON.stringify(extendedData),
        };
      }),
    };

    console.log('[EventFormModal] normalizedData:', normalizedData);
    console.log('[EventFormModal] attachments:', attachments);

    try {
      if (isEdit) {
        console.log('[EventFormModal] Parsing with editFormSchema...');
        const finalData = editFormSchema.parse(normalizedData);
        console.log('[EventFormModal] Parsed finalData:', finalData);
        console.log('[EventFormModal] Calling onSubmit...');
        onSubmit(finalData, attachments, pendingSaveAction);
        console.log('[EventFormModal] onSubmit called successfully');
      } else {
        console.log('[EventFormModal] Parsing with createFormSchema...');
        const finalData = createFormSchema.parse(normalizedData);
        console.log('[EventFormModal] Parsed finalData:', finalData);
        console.log('[EventFormModal] Calling onSubmit...');
        onSubmit(finalData, attachments, pendingSaveAction);
        console.log('[EventFormModal] onSubmit called successfully');
      }
    } catch (error) {
      console.error('[EventFormModal] Form validation error:', error);
      if (error instanceof z.ZodError) {
        const firstError = error.issues[0];
        console.error('[EventFormModal] Zod validation issues:', error.issues);
        toast({ title: 'Validation error', description: firstError?.message || 'Please check the form', type: 'error' });
      }
    }
  };

  const handleSaveAndClose = () => {
    console.log('[EventFormModal] handleSaveAndClose clicked');
    setPendingSaveAction('close');
  };

  const handleSaveAndNew = () => {
    console.log('[EventFormModal] handleSaveAndNew clicked');
    setPendingSaveAction('new');
  };

  // Handle form validation errors from react-hook-form
  const handleFormError = (formErrors: any) => {
    console.error('[EventFormModal] Form validation errors:', formErrors);
    // Find the first error and show it
    const firstErrorKey = Object.keys(formErrors)[0];
    if (firstErrorKey) {
      const firstError = formErrors[firstErrorKey];
      const message = firstError?.message || `Invalid ${firstErrorKey}`;
      console.error('[EventFormModal] First error:', firstErrorKey, message);
      toast({ title: 'Validation error', description: message, type: 'error' });
    }
  };

  const clients = clientsData?.data || [];

  return (
    <Dialog open={open} onClose={onClose} fullScreen>
      <form onSubmit={handleSubmit(handleFormSubmit, handleFormError)} className="h-full flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>
              {isEdit ? `Edit ${terminology.event.singular}` : `Create New ${terminology.event.singular}`}
            </DialogTitle>
            <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <CloseIcon className="h-5 w-5" />
            </button>
          </div>
        </DialogHeader>

        <DialogContent className="flex-1 overflow-y-auto">
          {/* Entry Type Toggle (only in create mode) */}
          {!isEdit && (
            <div className="mb-6 p-4 bg-muted/30 border border-border rounded-lg">
              <Label className="mb-3 block">Entry Type</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="entryType"
                    value="single"
                    checked={entryType === 'single'}
                    onChange={() => setEntryType('single')}
                    className="accent-primary"
                  />
                  <span className="text-sm font-medium">Single Entry</span>
                  <span className="text-xs text-muted-foreground">- Create one {terminology.event.singular.toLowerCase()}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="entryType"
                    value="batch"
                    checked={entryType === 'batch'}
                    onChange={() => setEntryType('batch')}
                    className="accent-primary"
                  />
                  <span className="text-sm font-medium">Batch Entry</span>
                  <span className="text-xs text-muted-foreground">- Import from CSV/Excel</span>
                </label>
              </div>
            </div>
          )}

          {/* Batch Entry Section */}
          {!isEdit && entryType === 'batch' && (
            <div className="space-y-4">
              {batchStep === 'upload' && (
                <>
                  <div
                    className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    onDrop={handleBatchFileDrop}
                    onClick={() => document.getElementById('batch-file-input')?.click()}
                  >
                    <input
                      id="batch-file-input"
                      type="file"
                      accept=".csv,.xlsx"
                      onChange={handleBatchFileInputChange}
                      className="hidden"
                    />
                    <UploadIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">Upload CSV or Excel File</h3>
                    <p className="text-muted-foreground mb-4">Drag and drop your file here, or click to browse</p>
                    <p className="text-sm text-muted-foreground">Supported formats: .csv, .xlsx</p>
                  </div>

                  <div className="p-4 bg-muted/30 rounded-lg border border-border">
                    <div className="flex items-center gap-2 mb-3">
                      <FileTextIcon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Need a template?</span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          downloadSampleEventTemplate('csv');
                          toast({ title: 'Sample CSV template downloaded', type: 'success' });
                        }}
                        className="gap-2"
                      >
                        <FileTextIcon className="h-4 w-4" />
                        Download CSV
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          downloadSampleEventTemplate('xlsx');
                          toast({ title: 'Sample Excel template downloaded', type: 'success' });
                        }}
                        className="gap-2"
                      >
                        <FileSpreadsheetIcon className="h-4 w-4" />
                        Download Excel
                      </Button>
                    </div>
                  </div>
                </>
              )}

              {batchStep === 'preview' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileTextIcon className="h-5 w-5 text-muted-foreground" />
                      <span className="font-medium">{batchFile?.name}</span>
                      <Badge variant="secondary">{batchValidationResults.length} rows</Badge>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setBatchStep('upload');
                        setBatchFile(null);
                        setBatchValidationResults([]);
                      }}
                    >
                      Change File
                    </Button>
                  </div>

                  <BatchEntryList
                    entries={batchValidationResults}
                    onUpdateEntry={handleUpdateBatchEntry}
                    onRemoveEntry={handleRemoveBatchEntry}
                    clients={clients}
                    terminology={terminology}
                  />
                </div>
              )}
            </div>
          )}

          {/* Single Entry Form */}
          {(isEdit || entryType === 'single') && (
            <>
              {/* Event ID (edit mode only) */}
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

              {/* Template Selector (create mode only) */}
              {!isEdit && templatesData && templatesData.length > 0 && (
                <div className="mb-6 p-4 bg-primary/5 border border-primary/20 rounded-lg">
                  <Label htmlFor="templateSelect">Start from Template (Optional)</Label>
                  <div className="flex gap-2 mt-1">
                    <Select
                      value={selectedTemplateId}
                      onValueChange={setSelectedTemplateId}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger id="templateSelect" className="flex-1">
                        <SelectValue placeholder="Select a template..." />
                      </SelectTrigger>
                      <SelectContent>
                        {templatesData.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedTemplateId && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedTemplateId('');
                          reset(getDefaultValues());
                        }}
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Form Fields */}
              <EventFormFields
                register={register as any}
                control={control as any}
                errors={errors as any}
                watch={watch as any}
                setValue={setValue as any}
                clients={clients}
                terminology={terminology}
                startDateUBD={startDateUBD}
                setStartDateUBD={setStartDateUBD}
                endDateUBD={endDateUBD}
                setEndDateUBD={setEndDateUBD}
                startTimeTBD={startTimeTBD}
                setStartTimeTBD={setStartTimeTBD}
                endTimeTBD={endTimeTBD}
                setEndTimeTBD={setEndTimeTBD}
                assignments={assignments}
                onAssignmentsChange={setAssignments}
                disabled={isSubmitting}
              />
            </>
          )}
        </DialogContent>

        <DialogFooter>
          {isEdit && onViewDetails && (
            <Button type="button" variant="outline" onClick={onViewDetails} className="mr-auto">
              <EyeIcon className="h-4 w-4 mr-1" />
              View Details
            </Button>
          )}
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting || batchImportMutation.isPending}>
            Cancel
          </Button>
          {!isEdit && entryType === 'batch' && batchStep === 'preview' ? (
            <Button
              type="button"
              onClick={handleBatchSubmit}
              disabled={batchImportMutation.isPending || batchValidCount === 0}
            >
              {batchImportMutation.isPending ? 'Importing...' : `Import ${batchValidCount} ${terminology.event.plural}`}
            </Button>
          ) : (
            (isEdit || entryType === 'single') && (
              <>
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
                  {isSubmitting && pendingSaveAction === 'close' ? 'Saving...' : isEdit ? `Update ${terminology.event.singular}` : 'Save & Close'}
                </Button>
              </>
            )
          )}
        </DialogFooter>
      </form>
    </Dialog>
  );
}
