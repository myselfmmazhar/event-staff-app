import type {
  Control,
  FieldErrors,
  UseFormRegister,
  UseFormWatch,
  UseFormSetValue,
  UseFieldArrayReturn,
} from 'react-hook-form';
import type { EventStatus, RequestMethod, AmountType } from '@prisma/client';
import type { FileLink, EventDocument, CustomField } from '@/lib/schemas/event.schema';

/**
 * Form data structure for event creation/editing
 * This matches the schema used in event-form-modal
 */
export interface EventFormData {
  eventId?: string;
  title: string;
  description?: string;
  requirements?: string;
  privateComments?: string;
  clientId?: string;
  venueName: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  latitude?: number;
  longitude?: number;
  startDate: Date | string;
  startTime?: string;
  endDate: Date | string;
  endTime?: string;
  timezone: string;
  dailyDigestMode?: boolean;
  requireStaff?: boolean;
  status: EventStatus;
  fileLinks?: FileLink[];
  requestMethod?: RequestMethod | null;
  requestorName?: string;
  requestorPhone?: string;
  requestorEmail?: string;
  poNumber?: string;
  preEventInstructions?: string;
  eventDocuments?: EventDocument[];
  customFields?: CustomField[];
  meetingPoint?: string;
  onsitePocName?: string;
  onsitePocPhone?: string;
  onsitePocEmail?: string;
  estimate?: boolean;
  taskRateType?: AmountType | null;
  commission?: boolean;
  commissionAmount?: number | null;
  commissionAmountType?: AmountType | null;
  approveForOvertime?: boolean;
  overtimeRate?: number | null;
  overtimeRateType?: AmountType | null;
}

/**
 * Base props for all form sections
 * Provides access to react-hook-form methods
 */
export interface FormSectionProps {
  register: UseFormRegister<EventFormData>;
  control: Control<EventFormData>;
  errors: FieldErrors<EventFormData>;
  watch: UseFormWatch<EventFormData>;
  setValue: UseFormSetValue<EventFormData>;
  disabled?: boolean;
  className?: string;
}

/**
 * Client option for dropdown selectors
 */
export interface ClientOption {
  id: string;
  businessName: string;
  requirements?: string | null;
}

/**
 * Terminology configuration
 */
export interface TerminologyConfig {
  event: {
    singular: string;
    plural: string;
  };
}

/**
 * Props for BasicInfoSection
 */
export interface BasicInfoSectionProps extends FormSectionProps {
  clients: ClientOption[];
  terminology: TerminologyConfig;
}

/**
 * Props for DateTimeSection
 */
export interface DateTimeSectionProps extends FormSectionProps {
  startTimeTBD: boolean;
  setStartTimeTBD: (value: boolean) => void;
  endTimeTBD: boolean;
  setEndTimeTBD: (value: boolean) => void;
}

/**
 * Props for DocumentsSection
 * Includes useFieldArray return for file links management
 */
export interface DocumentsSectionProps extends FormSectionProps {
  fileLinksFieldArray: UseFieldArrayReturn<EventFormData, 'fileLinks'>;
}

/**
 * Props for CustomFieldsSection
 * Includes useFieldArray return for custom fields management
 */
export interface CustomFieldsSectionProps extends FormSectionProps {
  customFieldsFieldArray: UseFieldArrayReturn<EventFormData, 'customFields'>;
}
