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

export interface EventFormFieldsProps {
  register: UseFormRegister<EventFormData>;
  control: Control<EventFormData>;
  errors: FieldErrors<EventFormData>;
  watch: UseFormWatch<EventFormData>;
  setValue: UseFormSetValue<EventFormData>;
  clients: ClientOption[];
  terminology: TerminologyConfig;
  startTimeTBD: boolean;
  setStartTimeTBD: (value: boolean) => void;
  endTimeTBD: boolean;
  setEndTimeTBD: (value: boolean) => void;
  assignments?: Assignment[];
  onAssignmentsChange?: (assignments: Assignment[]) => void;
  disabled?: boolean;
  compact?: boolean;
}

export function EventFormFields({
  register,
  control,
  errors,
  watch,
  setValue,
  clients,
  terminology,
  startTimeTBD,
  setStartTimeTBD,
  endTimeTBD,
  setEndTimeTBD,
  assignments = [],
  onAssignmentsChange,
  disabled = false,
  compact = false,
}: EventFormFieldsProps) {
  // File links field array
  const fileLinksFieldArray = useFieldArray<EventFormData, 'fileLinks'>({
    control,
    name: 'fileLinks',
  });

  // Custom fields field array
  const customFieldsFieldArray = useFieldArray<EventFormData, 'customFields'>({
    control,
    name: 'customFields',
  });

  const spacing = compact ? 'mb-4' : 'mb-6';
  const gridGap = compact ? 'gap-4' : 'gap-6';

  return (
    <>
      {/* === ROW 1: Basic Information + Date & Time === */}
      <div className={`grid grid-cols-1 lg:grid-cols-5 ${gridGap} ${spacing}`}>
        <BasicInfoSection
          register={register}
          control={control}
          errors={errors}
          watch={watch}
          setValue={setValue}
          clients={clients}
          terminology={terminology}
          disabled={disabled}
          className="lg:col-span-3"
        />
        <DateTimeSection
          register={register}
          control={control}
          errors={errors}
          watch={watch}
          setValue={setValue}
          startTimeTBD={startTimeTBD}
          setStartTimeTBD={setStartTimeTBD}
          endTimeTBD={endTimeTBD}
          setEndTimeTBD={setEndTimeTBD}
          disabled={disabled}
          className="lg:col-span-2"
        />
      </div>

      {/* === ROW 2: Venue Information (full width) === */}
      <VenueSection
        register={register}
        control={control}
        errors={errors}
        watch={watch}
        setValue={setValue}
        disabled={disabled}
        className={spacing}
      />

      {/* === ROW 3: Assignments (full width) === */}
      {onAssignmentsChange ? (
        <AssignmentsSection
          assignments={assignments}
          onAssignmentsChange={onAssignmentsChange}
          disabled={disabled}
          className={spacing}
        />
      ) : (
        <div className={`bg-accent/5 border border-border/30 p-5 rounded-lg ${spacing}`}>
          <h3 className="text-lg font-semibold border-b border-border pb-2 mb-4">Assignments</h3>
          <p className="text-sm text-muted-foreground">
            Assignments can be added after saving the event.
          </p>
        </div>
      )}

      {/* === ROW 4: Request Information + Onsite Contact === */}
      <div className={`grid grid-cols-1 lg:grid-cols-2 ${gridGap} ${spacing}`}>
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

      {/* === ROW 5: Pre-Event Instructions + Documents & Files === */}
      <div className={`grid grid-cols-1 lg:grid-cols-2 ${gridGap} ${spacing}`}>
        <PreEventSection
          register={register}
          control={control}
          errors={errors}
          watch={watch}
          setValue={setValue}
          disabled={disabled}
        />
        <DocumentsSection
          register={register}
          control={control}
          errors={errors}
          watch={watch}
          setValue={setValue}
          fileLinksFieldArray={fileLinksFieldArray}
          disabled={disabled}
        />
      </div>

      {/* === ROW 6: Billing & Rate Settings === */}
      <BillingSection
        register={register}
        control={control}
        errors={errors}
        watch={watch}
        setValue={setValue}
        disabled={disabled}
        className={spacing}
      />

      {/* === ROW 7: Private Notes + Custom Fields === */}
      <div className={`grid grid-cols-1 lg:grid-cols-2 ${gridGap} ${spacing}`}>
        <PrivateNotesSection
          register={register}
          control={control}
          errors={errors}
          watch={watch}
          setValue={setValue}
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
        />
      </div>
    </>
  );
}
