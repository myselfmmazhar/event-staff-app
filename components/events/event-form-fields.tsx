'use client';

import { useFieldArray, type Control, type FieldErrors, type UseFormRegister, type UseFormWatch, type UseFormSetValue } from 'react-hook-form';
import {
  BasicInfoSection,
  DateTimeSection,
  VenueSection,
  RequestInfoSection,
  OnsiteContactSection,
  PreEventSection,
  DocumentsSection,
  BillingSection,
  PrivateNotesSection,
  CustomFieldsSection,
  AssignmentsSection,
  type EventFormData,
  type ClientOption,
  type TerminologyConfig,
  type Assignment,
} from './form-sections';

export type EventFormTab = 'basic' | 'venue' | 'staff' | 'instructions' | 'documents';

export interface EventFormFieldsProps {
  register: UseFormRegister<EventFormData>;
  control: Control<EventFormData>;
  errors: FieldErrors<EventFormData>;
  watch: UseFormWatch<EventFormData>;
  setValue: UseFormSetValue<EventFormData>;
  clients: ClientOption[];
  terminology: TerminologyConfig;
  startDateUBD: boolean;
  setStartDateUBD: (value: boolean) => void;
  endDateUBD: boolean;
  setEndDateUBD: (value: boolean) => void;
  startTimeTBD: boolean;
  setStartTimeTBD: (value: boolean) => void;
  endTimeTBD: boolean;
  setEndTimeTBD: (value: boolean) => void;
  assignments?: Assignment[];
  onAssignmentsChange?: (assignments: Assignment[]) => void;
  onClientCreated?: (clientId: string) => void;
  disabled?: boolean;
  compact?: boolean;
  activeTab?: EventFormTab;
}

export function EventFormFields({
  register,
  control,
  errors,
  watch,
  setValue,
  clients,
  terminology,
  startDateUBD,
  setStartDateUBD,
  endDateUBD,
  setEndDateUBD,
  startTimeTBD,
  setStartTimeTBD,
  endTimeTBD,
  setEndTimeTBD,
  assignments = [],
  onAssignmentsChange,
  onClientCreated,
  disabled = false,
  compact = false,
  activeTab,
}: EventFormFieldsProps) {
  const fileLinksFieldArray = useFieldArray<EventFormData, 'fileLinks'>({
    control,
    name: 'fileLinks',
  });

  const customFieldsFieldArray = useFieldArray<EventFormData, 'customFields'>({
    control,
    name: 'customFields',
  });

  const divider = 'border-t border-slate-200 pt-6 mt-6';

  // ── Tab: Basic Info ──────────────────────────────────────────────────────
  if (activeTab === 'basic') {
    return (
      <>
        <BasicInfoSection
          register={register}
          control={control}
          errors={errors}
          watch={watch}
          setValue={setValue}
          clients={clients}
          terminology={terminology}
          onClientCreated={onClientCreated}
          disabled={disabled}
        />
        <DateTimeSection
          register={register}
          control={control}
          errors={errors}
          watch={watch}
          setValue={setValue}
          startDateUBD={startDateUBD}
          setStartDateUBD={setStartDateUBD}
          endDateUBD={endDateUBD}
          setEndDateUBD={setEndDateUBD}
          startTimeTBD={startTimeTBD}
          setStartTimeTBD={setStartTimeTBD}
          endTimeTBD={endTimeTBD}
          setEndTimeTBD={setEndTimeTBD}
          disabled={disabled}
          className={divider}
        />
      </>
    );
  }

  // ── Tab: Venue ───────────────────────────────────────────────────────────
  if (activeTab === 'venue') {
    return (
      <>
        <VenueSection
          register={register}
          control={control}
          errors={errors}
          watch={watch}
          setValue={setValue}
          disabled={disabled}
        />
        <OnsiteContactSection
          register={register}
          control={control}
          errors={errors}
          watch={watch}
          setValue={setValue}
          disabled={disabled}
          className={divider}
        />
      </>
    );
  }

  // ── Tab: Staff & Rates ───────────────────────────────────────────────────
  if (activeTab === 'staff') {
    return (
      <>
        {onAssignmentsChange ? (
          <AssignmentsSection
            assignments={assignments}
            onAssignmentsChange={onAssignmentsChange}
            watch={watch}
            setValue={setValue}
            disabled={disabled}
          />
        ) : (
          <div>
            <h3 className="text-base font-bold text-slate-900 mb-2">Assignments</h3>
            <p className="text-sm text-muted-foreground">
              Assignments can be added after saving the {terminology.event.singular.toLowerCase()}.
            </p>
          </div>
        )}
        <BillingSection
          register={register}
          control={control}
          errors={errors}
          watch={watch}
          setValue={setValue}
          disabled={disabled}
          className={divider}
        />
      </>
    );
  }

  // ── Tab: Instructions ────────────────────────────────────────────────────
  if (activeTab === 'instructions') {
    return (
      <>
        <PrivateNotesSection
          register={register}
          control={control}
          errors={errors}
          watch={watch}
          setValue={setValue}
          disabled={disabled}
        />
        <RequestInfoSection
          register={register}
          control={control}
          errors={errors}
          watch={watch}
          setValue={setValue}
          disabled={disabled}
          className={divider}
        />
      </>
    );
  }

  // ── Tab: Documents ───────────────────────────────────────────────────────
  if (activeTab === 'documents') {
    return (
      <>
        <DocumentsSection
          register={register}
          control={control}
          errors={errors}
          watch={watch}
          setValue={setValue}
          fileLinksFieldArray={fileLinksFieldArray}
          disabled={disabled}
        />
        <CustomFieldsSection
          register={register}
          control={control}
          errors={errors}
          watch={watch}
          setValue={setValue}
          customFieldsFieldArray={customFieldsFieldArray}
          disabled={disabled}
          className={divider}
        />
      </>
    );
  }

  // ── Fallback: all sections (no activeTab set) ────────────────────────────
  return (
    <div className="space-y-0">
      <BasicInfoSection
        register={register}
        control={control}
        errors={errors}
        watch={watch}
        setValue={setValue}
        clients={clients}
        terminology={terminology}
        onClientCreated={onClientCreated}
        disabled={disabled}
      />
      <DateTimeSection
        register={register}
        control={control}
        errors={errors}
        watch={watch}
        setValue={setValue}
        startDateUBD={startDateUBD}
        setStartDateUBD={setStartDateUBD}
        endDateUBD={endDateUBD}
        setEndDateUBD={setEndDateUBD}
        startTimeTBD={startTimeTBD}
        setStartTimeTBD={setStartTimeTBD}
        endTimeTBD={endTimeTBD}
        setEndTimeTBD={setEndTimeTBD}
        disabled={disabled}
        className={divider}
      />
      <VenueSection
        register={register}
        control={control}
        errors={errors}
        watch={watch}
        setValue={setValue}
        disabled={disabled}
        className={divider}
      />
      <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 ${divider}`}>
        <PreEventSection
          register={register}
          control={control}
          errors={errors}
          watch={watch}
          setValue={setValue}
          disabled={disabled}
        />
        <PrivateNotesSection
          register={register}
          control={control}
          errors={errors}
          watch={watch}
          setValue={setValue}
          disabled={disabled}
        />
      </div>
      <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 ${divider}`}>
        <RequestInfoSection
          register={register}
          control={control}
          errors={errors}
          watch={watch}
          setValue={setValue}
          disabled={disabled}
        />
        <OnsiteContactSection
          register={register}
          control={control}
          errors={errors}
          watch={watch}
          setValue={setValue}
          disabled={disabled}
        />
      </div>
      {onAssignmentsChange ? (
        <AssignmentsSection
          assignments={assignments}
          onAssignmentsChange={onAssignmentsChange}
          watch={watch}
          setValue={setValue}
          disabled={disabled}
          className={divider}
        />
      ) : (
        <div className={divider}>
          <h3 className="text-base font-bold text-slate-900 mb-2">Assignments</h3>
          <p className="text-sm text-muted-foreground">
            Assignments can be added after saving the {terminology.event.singular.toLowerCase()}.
          </p>
        </div>
      )}
      <DocumentsSection
        register={register}
        control={control}
        errors={errors}
        watch={watch}
        setValue={setValue}
        fileLinksFieldArray={fileLinksFieldArray}
        disabled={disabled}
        className={divider}
      />
      <CustomFieldsSection
        register={register}
        control={control}
        errors={errors}
        watch={watch}
        setValue={setValue}
        customFieldsFieldArray={customFieldsFieldArray}
        disabled={disabled}
        className={divider}
      />
      <BillingSection
        register={register}
        control={control}
        errors={errors}
        watch={watch}
        setValue={setValue}
        disabled={disabled}
        className={divider}
      />
    </div>
  );
}
