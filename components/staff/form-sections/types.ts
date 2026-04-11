import type {
  Control,
  FieldErrors,
  UseFormRegister,
  UseFormWatch,
  UseFormSetValue,
  UseFormReset,
} from 'react-hook-form';
import type {
  AccountStatus,
  StaffType,
  StaffRole,
  SkillLevel,
  StaffRating,
  AvailabilityStatus,
} from '@prisma/client';
import type { StaffFormInput } from '../staff-form-modal';

/**
 * Form data structure for staff creation/editing
 * Matches the form input type used in staff-form-modal.tsx
 */
export type StaffFormData = StaffFormInput;

/**
 * Base props for all form sections
 * Provides access to react-hook-form methods
 */
export interface StaffFormSectionProps {
  register: UseFormRegister<StaffFormData>;
  control: Control<StaffFormData>;
  errors: FieldErrors<StaffFormData>;
  watch: UseFormWatch<StaffFormData>;
  setValue: UseFormSetValue<StaffFormData>;
  reset: UseFormReset<StaffFormData>;
  disabled?: boolean;
  className?: string;
}

/**
 * Service option for dropdown/multi-select
 */
export interface ServiceOption {
  id: string;
  title: string;
}

/**
 * Company option for dropdown
 */
export interface CompanyOption {
  id: string;
  firstName: string;
  lastName: string;
  staffId: string;
}

/**
 * Team member input structure
 */
export interface TeamMemberInput {
  firstName: string;
  lastName?: string;
  email: string;
  phone?: string;
  serviceIds?: string[];
}

/**
 * Props for AccountDetailsSection
 */
export interface AccountDetailsSectionProps extends StaffFormSectionProps {
  companies: CompanyOption[];
  terminology: {
    staff: {
      singular: string;
      plural: string;
    };
  };
  labels: {
    global: {
      staffCustomFields: {
        customField1: string;
        customField2: string;
        customField3: string;
      };
    };
  };
  /** Hide custom field 1 & 2 when they are collected elsewhere (e.g. wizard basic step). */
  omitCustomBasicFields?: boolean;
}

/**
 * Props for ServiceDetailsSection
 */
export interface ServiceDetailsSectionProps extends StaffFormSectionProps {
  services: ServiceOption[];
  onCreateService?: () => void;
}

/**
 * Props for TalentDetailsSection
 */
export interface TalentDetailsSectionProps {
  register: UseFormRegister<StaffFormData>;
  errors: FieldErrors<StaffFormData>;
  setValue: UseFormSetValue<StaffFormData>;
  disabled?: boolean;
  className?: string;
  /** `contact` = name/email/phone only; `address` = address block only; default full section */
  fields?: 'all' | 'contact' | 'address';
}

/**
 * Props for TeamDetailsSection
 */
export interface TeamDetailsSectionProps {
  register: UseFormRegister<StaffFormData>;
  errors: FieldErrors<StaffFormData>;
  setValue: UseFormSetValue<StaffFormData>;
  disabled?: boolean;
  className?: string;
}

/**
 * Props for TeamMembersSection
 */
export interface TeamMembersSectionProps {
  teamMembers: TeamMemberInput[];
  newTeamMember: TeamMemberInput;
  onTeamMembersChange: (members: TeamMemberInput[]) => void;
  onNewTeamMemberChange: (member: TeamMemberInput) => void;
  onAddTeamMember: () => void;
  onRemoveTeamMember: (index: number) => void;
  services: ServiceOption[];
  disabled?: boolean;
  className?: string;
}

/**
 * Props for DocumentsSection
 */
export interface DocumentsSectionProps extends StaffFormSectionProps { }
