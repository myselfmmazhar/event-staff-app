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
  type EventFormData,
  type ClientOption,
  type TerminologyConfig,
} from './form-sections';
import {
  EventAttachmentsSection,
  type AttachedServiceItem,
  type AttachedProductItem,
} from './event-attachments-section';

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
  attachedServices?: AttachedServiceItem[];
  attachedProducts?: AttachedProductItem[];
  onServicesChange?: (services: AttachedServiceItem[]) => void;
  onProductsChange?: (products: AttachedProductItem[]) => void;
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
  attachedServices = [],
  attachedProducts = [],
  onServicesChange,
  onProductsChange,
  disabled = false,
  compact = false,
}: EventFormFieldsProps) {
  // File links field array
  const fileLinksFieldArray = useFieldArray<EventFormData, 'fileLinks'>({
    control,
    name: 'fileLinks',
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

      {/* === ROW 3: Request Information + Onsite Contact === */}
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

      {/* === ROW 4: Pre-Event Instructions + Documents & Files === */}
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

      {/* === ROW 5: Billing & Rate Settings + Services & Products === */}
      <div className={`grid grid-cols-1 lg:grid-cols-2 ${gridGap} ${spacing}`}>
        <BillingSection
          register={register}
          control={control}
          errors={errors}
          watch={watch}
          setValue={setValue}
          disabled={disabled}
        />
        {onServicesChange && onProductsChange ? (
          <EventAttachmentsSection
            attachedServices={attachedServices}
            attachedProducts={attachedProducts}
            onServicesChange={onServicesChange}
            onProductsChange={onProductsChange}
            disabled={disabled}
          />
        ) : (
          <div className="bg-accent/5 border border-border/30 p-5 rounded-lg">
            <h3 className="text-lg font-semibold border-b border-border pb-2 mb-4">Services & Products</h3>
            <p className="text-sm text-muted-foreground">
              Services and products can be added after saving the event.
            </p>
          </div>
        )}
      </div>

      {/* === ROW 6: Private Notes (full width) === */}
      <PrivateNotesSection
        register={register}
        control={control}
        errors={errors}
        watch={watch}
        setValue={setValue}
        disabled={disabled}
        className="lg:max-w-2xl"
      />
    </>
  );
}
