'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { EventSchema } from '@/lib/schemas/event.schema';
import type { CreateEventInput, UpdateEventInput, FileLink, EventDocument, CustomField } from '@/lib/schemas/event.schema';
import { EventStatus, RequestMethod, AmountType } from '@prisma/client';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState, useCallback } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
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
import { EventFormFields, type EventFormTab } from './event-form-fields';
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
  addressLine2: z.string().max(200).transform(val => val?.trim()).optional(),
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
  addressLine2?: string | null;
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
}

type SaveAction = 'close' | 'new' | 'update-continue';

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
  ratingRequired?: 'ANY' | 'NA' | 'A' | 'B' | 'C' | 'D';
  approveOvertime?: boolean;
  overtimeRate?: number | null;
  overtimeRateType?: AmountType | null;
  commission?: boolean;
  commissionAmount?: number | null;
  commissionAmountType?: AmountType | null;
  payRate?: number | null;
  billRate?: number | null;
  rateType?: 'PER_HOUR' | 'PER_SHIFT' | 'PER_DAY' | 'PER_EVENT' | null;
  expenditure?: boolean;
  expenditureCost?: number | null;
  expenditurePrice?: number | null;
  expenditureAmount?: number | null;
  expenditureAmountType?: AmountType | null;
  minimum?: number | null;
  travelInMinimum?: boolean;
  notes?: string | null;
  instructions?: string | null;
};

interface EventFormModalProps {
  event: Event | null;
  open: boolean;
  onClose: () => void;
  onSubmit: (
    data: CreateEventInput | Omit<UpdateEventInput, 'id'>,
    attachments?: {
      callTimes: CallTimeAssignment[];
      products: Array<{ productId: string; quantity: number; notes?: string | null }>;
    },
    saveAction?: SaveAction
  ) => void;
  isSubmitting: boolean;
  backendErrors?: Array<{ field: string; message: string }>;
  onViewDetails?: () => void;
  /** Increment this key to reset the form for a new entry (used with Save & New) */
  resetKey?: number;
}

type EventModalTab = EventFormTab | 'batch';

const EVENT_FORM_TABS: { id: EventFormTab; label: string }[] = [
  { id: 'basic', label: 'Basic Info' },
  { id: 'venue', label: 'Venue' },
  { id: 'staff', label: 'Staff & Rates' },
  { id: 'instructions', label: 'Instructions' },
  { id: 'documents', label: 'Documents' },
];

const EVENT_FIELD_TO_TAB: Record<string, EventFormTab> = {
  // Basic Info
  title: 'basic', description: 'basic', requirements: 'basic',
  clientId: 'basic', status: 'basic', eventId: 'basic',
  startDate: 'basic', startTime: 'basic', endDate: 'basic', endTime: 'basic',
  timezone: 'basic', dailyDigestMode: 'basic', requireStaff: 'basic',
  // Venue
  venueName: 'venue', address: 'venue', addressLine2: 'venue',
  city: 'venue', state: 'venue', zipCode: 'venue',
  latitude: 'venue', longitude: 'venue', meetingPoint: 'venue',
  onsitePocName: 'venue', onsitePocPhone: 'venue', onsitePocEmail: 'venue',
  // Staff & Rates
  estimate: 'staff', taskRateType: 'staff',
  // Instructions
  preEventInstructions: 'instructions', privateComments: 'instructions',
  requestMethod: 'instructions', requestorName: 'instructions',
  requestorPhone: 'instructions', requestorEmail: 'instructions', poNumber: 'instructions',
  // Documents
  eventDocuments: 'documents', fileLinks: 'documents', customFields: 'documents',
};

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

  // Tab and batch state
  const [activeTab, setActiveTab] = useState<EventModalTab>('basic');
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

  // Save as template state
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');

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

  // Save as template mutation
  const createTemplateMutation = trpc.eventTemplate.create.useMutation({
    onSuccess: () => {
      toast({ title: 'Template saved successfully', type: 'success' });
      utils.eventTemplate.getForSelection.invalidate();
      utils.eventTemplate.getAll.invalidate();
    },
    onError: (error) => {
      toast({ title: `Failed to save template: ${error.message}`, type: 'error' });
    },
  });

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
      addressLine2: '',
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
        addressLine2: (event as any).addressLine2 || '',
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

  // Wizard step logic
  const EVENT_STEP_IDS = ['basic', 'venue', 'staff', 'instructions', 'documents'] as const;
  const eventTitle = watch('title');
  const eventVenueName = watch('venueName');
  const eventAddress = watch('address');
  const eventCity = watch('city');
  const eventState = watch('state');
  const eventZipCode = watch('zipCode');

  const formStepIndex = EVENT_STEP_IDS.indexOf(activeTab as typeof EVENT_STEP_IDS[number]);
  const isFormTab = formStepIndex >= 0;
  const isLastFormStep = activeTab === 'documents';

  const canContinueBasic = Boolean(eventTitle?.trim());
  const canContinueVenue =
    Boolean(eventVenueName?.trim()) &&
    Boolean(eventAddress?.trim()) &&
    Boolean(eventCity?.trim()) &&
    Boolean(eventState?.trim()) &&
    Boolean(eventZipCode?.trim());

  const canContinueForm =
    activeTab === 'basic' ? canContinueBasic :
    activeTab === 'venue' ? canContinueVenue :
    true;

  const goNextForm = () => {
    if (!canContinueForm) return;
    if (formStepIndex < EVENT_STEP_IDS.length - 1) {
      const nextTab = EVENT_STEP_IDS[formStepIndex + 1];
      if (nextTab) {
        setActiveTab(nextTab);
      }
    }
  };

  const goBackForm = () => {
    if (formStepIndex > 0) {
      const prevTab = EVENT_STEP_IDS[formStepIndex - 1];
      if (prevTab) {
        setActiveTab(prevTab);
      }
    }
  };

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
        addressLine2: (template as any).addressLine2 || '',
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
      setActiveTab('basic');
      setBatchFile(null);
      setBatchStep('upload');
      setBatchValidationResults([]);
      setSaveAsTemplate(false);
      setTemplateName('');
    }
  }, [open]);

  // Reset tab to 'basic' when dialog opens
  useEffect(() => {
    if (open) setActiveTab('basic');
  }, [open]);

  // Reset form when resetKey changes (triggered by Save & New)
  useEffect(() => {
    if (resetKey > 0 && !event) {
      reset(getDefaultValues());
      setActiveTab('basic');
      setStartDateUBD(false);
      setEndDateUBD(false);
      setStartTimeTBD(false);
      setEndTimeTBD(false);
      setSelectedTemplateId('');
      setAssignments([]);
      setPendingSaveAction('close');
      setSaveAsTemplate(false);
      setTemplateName('');
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
          commission: ct.commission ?? false,
          commissionAmount: ct.commissionAmount ? Number(ct.commissionAmount) : null,
          commissionAmountType: ct.commissionAmountType ?? null,
          expenditure: ct.expenditure ?? false,
          expenditureCost:
            ct.expenditureCost != null
              ? Number(ct.expenditureCost)
              : ct.expenditureAmount != null
                ? Number(ct.expenditureAmount)
                : null,
          expenditurePrice:
            ct.expenditurePrice != null
              ? Number(ct.expenditurePrice)
              : ct.expenditureAmount != null
                ? Number(ct.expenditureAmount)
                : null,
          expenditureAmount: ct.expenditureAmount != null ? Number(ct.expenditureAmount) : null,
          expenditureAmountType: ct.expenditureAmountType ?? null,
          startDate: formatDate(ct.startDate),
          startTime: ct.startTime ?? null,
          endDate: formatDate(ct.endDate),
          endTime: ct.endTime ?? null,
          experienceRequired: mapSkillToExperience(ct.skillLevel),
          ratingRequired: ct.ratingRequired ?? 'ANY',
          approveOvertime: ct.approveOvertime ?? false,
          overtimeRate: ct.overtimeRate ? Number(ct.overtimeRate) : null,
          overtimeRateType: ct.overtimeRateType ?? null,
          minimum: ct.minimum !== null && ct.minimum !== undefined,
          minimumAmount: ct.minimum ? Number(ct.minimum) : null,
          minimumAmountType: null,
          payRate: ct.payRate ? Number(ct.payRate) : null,
          billRate: ct.billRate ? Number(ct.billRate) : null,
          rateType: ct.payRateType ?? null,
          notes: ct.notes ?? null,
          instructions: ct.instructions ?? null,
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
          commission: extendedData.commission ?? false,
          commissionAmount: extendedData.commissionAmount ?? null,
          commissionAmountType: (extendedData.commissionAmountType as AmountType) ?? null,
          expenditure: false,
          expenditureCost: null,
          expenditurePrice: null,
          expenditureAmount: null,
          expenditureAmountType: null,
          minimum: false,
          minimumAmount: null,
          minimumAmountType: null,
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
        startDate: s.startDate,
        startTime: s.startTime,
        endDate: s.endDate,
        endTime: s.endTime,
        experienceRequired: s.experienceRequired,
        ratingRequired: s.ratingRequired,
        approveOvertime: s.approveOvertime,
        overtimeRate: s.overtimeRate,
        overtimeRateType: s.overtimeRateType,
        commission: s.commission,
        commissionAmount: s.commissionAmount,
        commissionAmountType: s.commissionAmountType,
        expenditure: s.expenditure,
        expenditureCost: s.expenditureCost,
        expenditurePrice: s.expenditurePrice,
        expenditureAmount: s.expenditureAmount,
        expenditureAmountType: s.expenditureAmountType,
        minimum: s.minimum ? s.minimumAmount ?? null : null,
        payRate: s.payRate,
        billRate: s.billRate,
        rateType: s.rateType,
        notes: s.notes,
        instructions: s.instructions,
      })),
      products: productAssignments.map((p) => {
        // Store extended data in notes as JSON
        const extendedData: ProductAssignmentExtendedData = {
          description: p.description,
          instructions: p.instructions,
          commission: p.commission,
          commissionAmount: p.commissionAmount,
          commissionAmountType: p.commissionAmountType,
        };
        return {
          productId: p.productId,
          quantity: p.quantity,
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
        // Navigate to next step after triggering update-and-continue
        if (pendingSaveAction === 'update-continue') {
          goNextForm();
        }
      } else {
        console.log('[EventFormModal] Parsing with createFormSchema...');
        const finalData = createFormSchema.parse(normalizedData);
        console.log('[EventFormModal] Parsed finalData:', finalData);
        console.log('[EventFormModal] Calling onSubmit...');
        onSubmit(finalData, attachments, pendingSaveAction);
        console.log('[EventFormModal] onSubmit called successfully');
      }

      // Save as template if requested
      if (saveAsTemplate && templateName.trim()) {
        createTemplateMutation.mutate({
          name: templateName.trim(),
          title: data.title || undefined,
          eventDescription: (data as any).description || undefined,
          requirements: (data as any).requirements || undefined,
          privateComments: (data as any).privateComments || undefined,
          clientId: (data as any).clientId || undefined,
          venueName: (data as any).venueName || undefined,
          address: (data as any).address || undefined,
          city: (data as any).city || undefined,
          state: (data as any).state || undefined,
          zipCode: (data as any).zipCode || undefined,
          latitude: (data as any).latitude || undefined,
          longitude: (data as any).longitude || undefined,
          startDate: normalizedData.startDate ?? undefined,
          startTime: normalizedData.startTime || undefined,
          endDate: normalizedData.endDate ?? undefined,
          endTime: normalizedData.endTime || undefined,
          timezone: (data as any).timezone || undefined,
          fileLinks: (data as any).fileLinks || undefined,
          requestMethod: (data as any).requestMethod || undefined,
          requestorName: (data as any).requestorName || undefined,
          requestorPhone: (data as any).requestorPhone || undefined,
          requestorEmail: (data as any).requestorEmail || undefined,
          poNumber: (data as any).poNumber || undefined,
          preEventInstructions: (data as any).preEventInstructions || undefined,
          eventDocuments: (data as any).eventDocuments || undefined,
          customFields: (data as any).customFields || undefined,
          meetingPoint: (data as any).meetingPoint || undefined,
          onsitePocName: (data as any).onsitePocName || undefined,
          onsitePocPhone: (data as any).onsitePocPhone || undefined,
          onsitePocEmail: (data as any).onsitePocEmail || undefined,
        });
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

  const handleUpdateAndContinue = () => {
    setPendingSaveAction('update-continue');
  };

  // Handle form validation errors from react-hook-form
  const handleFormError = (formErrors: any) => {
    const firstErrorKey = Object.keys(formErrors)[0];
    if (firstErrorKey) {
      const tab = EVENT_FIELD_TO_TAB[firstErrorKey];
      if (tab) setActiveTab(tab);
      const firstError = formErrors[firstErrorKey];
      const message = firstError?.message || `Invalid ${firstErrorKey}`;
      toast({ title: 'Validation error', description: message, type: 'error' });
    }
  };

  // Wrapper to ensure form submission doesn't bubble and is properly isolated
  const onFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();
    handleSubmit(handleFormSubmit, handleFormError)(e);
  };

  const clients = clientsData?.data || [];

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
                  {isEdit ? `Edit ${terminology.event.singular}` : `Create New ${terminology.event.singular}`}
                </h2>
                <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-500">
                  {isEdit
                    ? `Update the details for this ${terminology.event.singular.toLowerCase()}.`
                    : `Create a new ${terminology.event.singular.toLowerCase()} or import multiple ${terminology.event.plural.toLowerCase()} from a CSV or Excel file.`}
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
            {/* Tabs */}
            <div className="mt-6 flex gap-1 overflow-x-auto border-t border-slate-200/90 pt-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {EVENT_FORM_TABS.map(({ id, label }) => {
                const active = activeTab === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setActiveTab(id)}
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
              {/* Batch Import tab — create mode only */}
              {!isEdit && (() => {
                const active = activeTab === 'batch';
                return (
                  <button
                    type="button"
                    onClick={() => setActiveTab('batch')}
                    className={cn(
                      'relative shrink-0 whitespace-nowrap px-3 py-3 text-sm transition-colors',
                      active
                        ? 'font-bold text-slate-900'
                        : 'font-medium text-slate-500 hover:text-slate-700'
                    )}
                  >
                    Batch Import
                    {active && (
                      <span className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-slate-900" />
                    )}
                  </button>
                );
              })()}
            </div>
          </div>

          {/* Body */}
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6 sm:px-8">

            {/* Batch Entry Section */}
            {!isEdit && activeTab === 'batch' && (
              <div className="space-y-4">
                {batchStep === 'upload' && (
                  <>
                    <div
                      className="cursor-pointer rounded-lg border-2 border-dashed border-border p-8 text-center transition-colors hover:border-primary/50"
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
                      <UploadIcon className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                      <h3 className="mb-2 text-lg font-medium">Upload CSV or Excel File</h3>
                      <p className="mb-4 text-muted-foreground">Drag and drop your file here, or click to browse</p>
                      <p className="text-sm text-muted-foreground">Supported formats: .csv, .xlsx</p>
                    </div>
                    <div className="rounded-lg border border-border bg-muted/30 p-4">
                      <div className="mb-3 flex items-center gap-2">
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
            {activeTab !== 'batch' && (
              <div>
                {/* Event ID — shown on Basic Info tab in edit mode */}
                {isEdit && activeTab === 'basic' && (
                  <div className="mb-6">
                    <Label htmlFor="eventId" className="text-sm font-bold text-slate-900">
                      {terminology.event.singular} ID
                    </Label>
                    <Input
                      id="eventId"
                      {...register('eventId' as FormFieldName)}
                      placeholder="EVT-YYYY-NNN"
                      className="mt-2 rounded-lg border-slate-200 font-mono"
                    />
                    {(errors as any).eventId && (
                      <p className="mt-1 text-sm text-destructive">{(errors as any).eventId.message}</p>
                    )}
                  </div>
                )}

                {/* Template Selector — shown on Basic Info tab in create mode */}
                {!isEdit && activeTab === 'basic' && templatesData && templatesData.length > 0 && (
                  <div className="mb-6 rounded-lg border border-primary/20 bg-primary/5 p-4">
                    <Label htmlFor="templateSelect" className="text-sm font-bold text-slate-900">
                      Start from Template (Optional)
                    </Label>
                    <div className="mt-2 flex gap-2">
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

                {/* Form Fields — pass active tab for per-tab rendering */}
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
                  onClientCreated={(clientId) => setValue('clientId', clientId)}
                  disabled={isSubmitting}
                  activeTab={activeTab as EventFormTab}
                />
              </div>
            )}

          </div>

          {/* Save as Template strip */}
          {(isEdit || activeTab !== 'batch') && (
            <div className="shrink-0 border-t border-slate-200 bg-slate-50/50 px-6 py-3 sm:px-8">
              <div className="flex items-center gap-3">
                <label
                  htmlFor="save-as-template"
                  className="flex cursor-pointer select-none items-center gap-2"
                >
                  <Checkbox
                    id="save-as-template"
                    checked={saveAsTemplate}
                    onChange={(e) => setSaveAsTemplate(e.target.checked)}
                    disabled={isSubmitting}
                  />
                  <span className="text-sm font-medium text-foreground">Save as Template</span>
                </label>
                {saveAsTemplate && (
                  <Input
                    placeholder="Enter template name..."
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    className="h-8 max-w-xs rounded-lg border-slate-200 text-sm"
                    disabled={isSubmitting}
                    autoFocus
                  />
                )}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="shrink-0 border-t border-slate-200 px-6 py-4 sm:px-8">
            {!isEdit && activeTab === 'batch' ? (
              /* Batch tab footer — primary left, Cancel same row */
              <div className="flex w-full min-w-0 flex-row flex-wrap items-center justify-between gap-x-2 gap-y-2">
                <div className="min-w-0 shrink-0">
                  {batchStep === 'preview' ? (
                    <Button
                      type="button"
                      onClick={handleBatchSubmit}
                      disabled={batchImportMutation.isPending || batchValidCount === 0}
                      className="h-14 shrink-0 rounded-xl bg-slate-900 px-8 text-lg font-bold text-white shadow-lg shadow-slate-200 transition-all hover:bg-slate-800 hover:shadow-none sm:h-16 sm:px-12 sm:text-xl sm:min-w-[300px]"
                    >
                      {batchImportMutation.isPending ? 'Importing...' : `Import ${batchValidCount} ${terminology.event.plural}`}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setActiveTab('basic')}
                      className="h-12 shrink-0 rounded-xl border-slate-200 px-6 text-base font-semibold sm:h-14 sm:px-8 sm:text-lg sm:min-w-[220px]"
                    >
                      Back to Form
                    </Button>
                  )}
                </div>
                <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
                  <Button type="button" variant="outline" onClick={onClose} disabled={batchImportMutation.isPending} className="rounded-lg border-slate-200">
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              /* Form tabs wizard footer — Continue / save left; other actions same row */
              <div className="flex w-full min-w-0 flex-row flex-wrap items-center justify-between gap-x-2 gap-y-2">
                <div className="min-w-0 shrink-0">
                  {isFormTab && !isLastFormStep ? (
                    <Button
                      type="button"
                      onClick={goNextForm}
                      disabled={isSubmitting || !canContinueForm}
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
                          ? `Update ${terminology.event.singular}`
                          : 'Save & Close'}
                    </Button>
                  )}
                </div>
                <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
                  {isEdit && isFormTab && !isLastFormStep && (
                    <Button
                      type="submit"
                      variant="outline"
                      onClick={handleUpdateAndContinue}
                      disabled={isSubmitting || !canContinueForm}
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
                  {isFormTab && formStepIndex > 0 && (
                    <Button type="button" variant="outline" onClick={goBackForm} disabled={isSubmitting} className="rounded-lg border-slate-200">
                      Back
                    </Button>
                  )}
                  <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting} className="rounded-lg border-slate-200">
                    Cancel
                  </Button>
                  {!isEdit && (
                    <Button type="submit" variant="outline" disabled={isSubmitting} onClick={handleSaveAndNew} className="rounded-lg border-slate-200">
                      {isSubmitting && pendingSaveAction === 'new' ? 'Saving...' : 'Save & New'}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>

        </form>
      </DialogContent>
    </Dialog>
  );
}
