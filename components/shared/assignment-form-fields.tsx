'use client';

import { useState, useMemo, useEffect } from 'react';
import { useForm, Controller, type UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { SearchIcon, ChevronDownIcon, PlusIcon } from '@/components/ui/icons';
import { SkillLevel, RateType, StaffRating, AmountType } from '@prisma/client';
import { STAFF_RATING_OPTIONS, RATE_TYPE_OPTIONS, AMOUNT_TYPE_OPTIONS } from '@/lib/constants/enums';
import { trpc } from '@/lib/client/trpc';
import { useStaffTerm } from '@/lib/hooks/use-terminology';

// Skill level options
const SKILL_LEVELS: Array<{ value: SkillLevel; label: string }> = [
  { value: SkillLevel.BEGINNER, label: 'Beginner' },
  { value: SkillLevel.INTERMEDIATE, label: 'Intermediate' },
  { value: SkillLevel.ADVANCED, label: 'Advanced' },
];

// Rate type options
const RATE_TYPES: Array<{ value: RateType; label: string }> = RATE_TYPE_OPTIONS;

// Staff rating options for form (string literals for browser compatibility)
const staffRatingValues = ['NA', 'A', 'B', 'C', 'D'] as const;

// Form schema for UI (handles TBD/UBD checkboxes)
export const assignmentFieldsSchema = z
  .object({
    serviceId: z.string().min(1, 'Service is required'),
    numberOfStaffRequired: z.coerce.number().int().min(1, 'At least 1 staff required'),
    skillLevel: z.nativeEnum(SkillLevel),
    ratingRequired: z.enum([...staffRatingValues, 'ANY']).default('ANY'),
    startDate: z.string().optional(),
    startDateUBD: z.boolean().default(false),
    startTime: z.string().optional(),
    startTimeTBD: z.boolean().default(false),
    endDate: z.string().optional(),
    endDateUBD: z.boolean().default(false),
    endTime: z.string().optional(),
    endTimeTBD: z.boolean().default(false),
    payRate: z.coerce.number().min(0, 'Pay rate must be non-negative'),
    payRateType: z.nativeEnum(RateType),
    billRate: z.coerce.number().min(0, 'Bill rate must be non-negative'),
    billRateType: z.nativeEnum(RateType),
    approveOvertime: z.boolean().default(false),
    overtimeRate: z.coerce.number().min(0).optional().nullable(),
    overtimeRateType: z.nativeEnum(AmountType).optional().nullable(),
    commission: z.boolean().default(false),
    commissionAmount: z.coerce.number().min(0).optional().nullable(),
    commissionAmountType: z.nativeEnum(AmountType).optional().nullable(),
    expenditure: z.boolean().default(false),
    expenditureCost: z.coerce.number().min(0).optional().nullable(),
    expenditurePrice: z.coerce.number().min(0).optional().nullable(),
    expenditureAmountType: z.nativeEnum(AmountType).optional().nullable(),
    travelInMinimum: z.boolean().default(false),
    notes: z.string().optional(),
  })
  .refine((data) => data.payRateType === data.billRateType, {
    message: 'Pay rate type and bill rate type must match',
    path: ['billRateType'],
  })
  .refine((data) => data.startDateUBD || (data.startDate && data.startDate.length > 0), {
    message: 'Start date is required unless UBD is checked',
    path: ['startDate'],
  })
  .refine((data) => data.endDateUBD || (data.endDate && data.endDate.length > 0), {
    message: 'End date is required unless UBD is checked',
    path: ['endDate'],
  })
  .refine((data) => {
    if (data.startDateUBD || data.endDateUBD) return true;
    if (!data.startDate || !data.endDate) return true;
    return new Date(data.endDate) >= new Date(data.startDate);
  }, {
    message: 'End date must be after or equal to start date',
    path: ['endDate'],
  });

export type AssignmentFieldsInput = z.input<typeof assignmentFieldsSchema>;
export type AssignmentFieldsOutput = z.infer<typeof assignmentFieldsSchema>;

export type ServiceOption = {
  id: string;
  title: string;
  cost?: number | null;
  price?: number | null;
  serviceId?: string;
};

export interface AssignmentFormFieldsProps {
  /** Form instance from react-hook-form */
  form: UseFormReturn<AssignmentFieldsInput, undefined, AssignmentFieldsOutput>;
  /** Whether the form is disabled */
  disabled?: boolean;
  /** External services list (if provided, won't fetch internally) */
  services?: ServiceOption[];
  /** Whether services are loading (when provided externally) */
  servicesLoading?: boolean;
  /** Callback when a service is selected */
  onServiceSelect?: (service: ServiceOption) => void;
  /** Callback to create a new service */
  onCreateService?: () => void;
  /** UBD/TBD state (managed externally for form submission) */
  startDateUBD: boolean;
  setStartDateUBD: (value: boolean) => void;
  endDateUBD: boolean;
  setEndDateUBD: (value: boolean) => void;
  startTimeTBD: boolean;
  setStartTimeTBD: (value: boolean) => void;
  endTimeTBD: boolean;
  setEndTimeTBD: (value: boolean) => void;
  /** Selected service (for display in popover) */
  selectedService: ServiceOption | null;
  setSelectedService: (service: ServiceOption | null) => void;
  /** Parent event ID to fetch task date/time */
  eventId?: string;
}

export function AssignmentFormFields({
  form,
  disabled = false,
  services: externalServices,
  servicesLoading: externalServicesLoading,
  onServiceSelect,
  onCreateService,
  startDateUBD,
  setStartDateUBD,
  endDateUBD,
  setEndDateUBD,
  startTimeTBD,
  setStartTimeTBD,
  endTimeTBD,
  setEndTimeTBD,
  selectedService,
  setSelectedService,
  eventId,
}: AssignmentFormFieldsProps) {
  const staffTerm = useStaffTerm();
  const [serviceSelectorOpen, setServiceSelectorOpen] = useState(false);
  const [serviceSearch, setServiceSearch] = useState('');

  const { register, control, watch, setValue, getValues, formState: { errors } } = form;

  const [useTaskDateTime, setUseTaskDateTime] = useState(false);

  // Fetch event details if eventId is provided
  const { data: eventData } = trpc.event.getById.useQuery(
    { id: eventId as string },
    { enabled: !!eventId && useTaskDateTime }
  );

  // Sync with task date/time when useTaskDateTime is toggled on or event data changes
  useEffect(() => {
    if (useTaskDateTime && eventData) {
      if (eventData.startDate) {
        const dateStr = new Date(eventData.startDate).toISOString().split('T')[0];
        setValue('startDate', dateStr);
        setValue('startDateUBD', false);
        setStartDateUBD(false);
      } else {
        setValue('startDateUBD', true);
        setStartDateUBD(true);
      }

      if (eventData.startTime) {
        setValue('startTime', eventData.startTime);
        setValue('startTimeTBD', false);
        setStartTimeTBD(false);
      } else {
        setValue('startTimeTBD', true);
        setStartTimeTBD(true);
      }

      if (eventData.endDate) {
        const dateStr = new Date(eventData.endDate).toISOString().split('T')[0];
        setValue('endDate', dateStr);
        setValue('endDateUBD', false);
        setEndDateUBD(false);
      } else {
        setValue('endDateUBD', true);
        setEndDateUBD(true);
      }

      if (eventData.endTime) {
        setValue('endTime', eventData.endTime);
        setValue('endTimeTBD', false);
        setEndTimeTBD(false);
      } else {
        setValue('endTimeTBD', true);
        setEndTimeTBD(true);
      }
    }
  }, [useTaskDateTime, eventData, setValue, setStartDateUBD, setEndDateUBD, setStartTimeTBD, setEndTimeTBD]);

  // Fetch services internally if not provided externally
  const { data: internalServicesData, isLoading: internalServicesLoading } = trpc.staff.getServices.useQuery(
    undefined,
    { enabled: !externalServices }
  );

  const services = externalServices ?? (internalServicesData ?? []) as ServiceOption[];
  const servicesLoading = externalServicesLoading ?? internalServicesLoading;

  // Filter services based on search
  const filteredServices = useMemo(() => {
    if (!serviceSearch.trim()) return services;
    const searchLower = serviceSearch.toLowerCase();
    return services.filter(
      (s) => s.title.toLowerCase().includes(searchLower) ||
        (s.serviceId && s.serviceId.toLowerCase().includes(searchLower))
    );
  }, [services, serviceSearch]);

  // Sync billRateType with payRateType
  const payRateType = watch('payRateType');
  useEffect(() => {
    setValue('billRateType', payRateType);
  }, [payRateType, setValue]);

  // Sync end date with start date
  const startDate = watch('startDate');
  useEffect(() => {
    if (startDate && !startDateUBD) {
      setValue('endDate', startDate);
    }
  }, [startDate, startDateUBD, setValue]);

  // Sync end time with start time
  const startTime = watch('startTime');
  useEffect(() => {
    if (startTime && !startTimeTBD) {
      setValue('endTime', startTime);
    }
  }, [startTime, startTimeTBD, setValue]);

  // Handle service selection
  const handleServiceSelect = (service: ServiceOption) => {
    setSelectedService(service);
    setValue('serviceId', service.id);
    // Auto-fill rates from service
    if (service.cost !== null && service.cost !== undefined) {
      setValue('payRate', Number(service.cost));
    }
    if (service.price !== null && service.price !== undefined) {
      setValue('billRate', Number(service.price));
    }
    
    // Auto-fill expenditure values from service
    // @ts-ignore
    setValue('expenditure', service.expenditure || false);
    // @ts-ignore
    setValue('expenditureCost', service.expenditureCost ? Number(service.expenditureCost) : null);
    // @ts-ignore
    setValue('expenditurePrice', service.expenditurePrice ? Number(service.expenditurePrice) : null);
    // @ts-ignore
    setValue('expenditureAmountType', service.expenditureAmountType || null);

    setServiceSelectorOpen(false);
    setServiceSearch('');
    onServiceSelect?.(service);
  };

  return (
    <div className="space-y-6">
      {/* Service & Requirements Section */}
      <div className="bg-accent/5 border border-border/30 p-5 rounded-lg">
        <h3 className="text-lg font-semibold border-b border-border pb-2 mb-4">
          Service & Requirements
        </h3>
        <div className="space-y-4">
          {/* Service selector with search */}
          <div className="grid grid-cols-1 md:grid-cols-[1fr_120px] gap-4 items-end">
            <div>
              <Label className="text-sm font-medium mb-2 block" required>Select Service</Label>
              <Popover open={serviceSelectorOpen} onOpenChange={setServiceSelectorOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-between"
                    disabled={disabled}
                  >
                    {selectedService ? selectedService.title : 'Add new or type saved selection'}
                    <ChevronDownIcon className="h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0" align="start">
                  <div className="p-2 border-b">
                    <div className="relative">
                      <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search services..."
                        value={serviceSearch}
                        onChange={(e) => setServiceSearch(e.target.value)}
                        className="pl-8 h-9"
                      />
                    </div>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {servicesLoading ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">Loading...</div>
                    ) : filteredServices.length === 0 ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        {serviceSearch ? 'No services found' : 'No services available'}
                      </div>
                    ) : (
                      <div className="py-1">
                        {filteredServices.map((service) => (
                          <button
                            key={service.id}
                            type="button"
                            className="w-full flex items-start gap-3 px-3 py-2 text-left hover:bg-accent/50 transition-colors"
                            onClick={() => handleServiceSelect(service)}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm truncate">{service.title}</div>
                              {service.serviceId && (
                                <div className="text-xs text-muted-foreground truncate">
                                  {service.serviceId}
                                </div>
                              )}
                            </div>
                            {service.cost !== null && service.cost !== undefined && (
                              <div className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                                ${Number(service.cost).toFixed(2)}
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {onCreateService && (
                    <div className="border-t p-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start gap-2"
                        onClick={() => {
                          onCreateService();
                          setServiceSelectorOpen(false);
                        }}
                      >
                        <PlusIcon className="h-4 w-4" />
                        Create New Service
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
              {errors.serviceId && (
                <p className="text-sm text-destructive mt-1">
                  {errors.serviceId.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="numberOfStaffRequired" className="text-sm font-medium mb-2 block" required>Qty Needed</Label>
              <Input
                id="numberOfStaffRequired"
                type="number"
                min={1}
                {...register('numberOfStaffRequired')}
                onFocus={() => {
                  const current = getValues('numberOfStaffRequired') as any;
                  if (current === 0 || current === '0') {
                    setValue('numberOfStaffRequired', '' as any);
                  }
                }}
                error={!!errors.numberOfStaffRequired}
                disabled={disabled}
              />
              {errors.numberOfStaffRequired && (
                <p className="text-sm text-destructive mt-1">
                  {errors.numberOfStaffRequired.message}
                </p>
              )}
            </div>
          </div>

          {/* Experience & Rating */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">Experience</Label>
              <Controller
                name="skillLevel"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={disabled}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Any" />
                    </SelectTrigger>
                    <SelectContent>
                      {SKILL_LEVELS.map((level) => (
                        <SelectItem key={level.value} value={level.value}>
                          {level.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div>
              <Label className="text-sm font-medium mb-2 block">Rating</Label>
              <Controller
                name="ratingRequired"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={disabled}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Any" />
                    </SelectTrigger>
                    <SelectContent>
                      {STAFF_RATING_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

        </div>
      </div>

      {/* Date & Time Section */}
      <div className="bg-accent/5 border border-border/30 p-5 rounded-lg">
        <div className="flex items-center justify-between border-b border-border pb-2 mb-4">
          <h3 className="text-lg font-semibold">
            Date &amp; Time
          </h3>
          {eventId && (
            <label className="flex items-center gap-2 cursor-pointer bg-primary/5 px-3 py-1 rounded-full border border-primary/20 hover:bg-primary/10 transition-colors">
              <input
                type="checkbox"
                checked={useTaskDateTime}
                onChange={(e) => setUseTaskDateTime(e.target.checked)}
                disabled={disabled}
                className="accent-primary h-4 w-4"
              />
              <span className="text-xs font-medium text-primary">Use Task Date &amp; Time</span>
            </label>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label htmlFor="startDate" className="text-sm font-medium">Start Date</Label>
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={startDateUBD}
                  onChange={(e) => {
                    setStartDateUBD(e.target.checked);
                    setValue('startDateUBD', e.target.checked);
                    if (e.target.checked) setValue('startDate', '');
                  }}
                  disabled={disabled}
                  className="accent-primary h-3 w-3"
                />
                <span className="text-xs text-muted-foreground">TBD</span>
              </label>
            </div>
            <Input
              id="startDate"
              type="date"
              {...register('startDate')}
              error={!!errors.startDate}
              disabled={disabled || startDateUBD}
              className={startDateUBD ? 'opacity-50' : ''}
            />
            {errors.startDate && (
              <p className="text-sm text-destructive mt-1">
                {errors.startDate.message}
              </p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label htmlFor="startTime" className="text-sm font-medium">Start Time</Label>
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={startTimeTBD}
                  onChange={(e) => {
                    setStartTimeTBD(e.target.checked);
                    setValue('startTimeTBD', e.target.checked);
                    if (e.target.checked) setValue('startTime', '');
                  }}
                  disabled={disabled}
                  className="accent-primary h-3 w-3"
                />
                <span className="text-xs text-muted-foreground">TBD</span>
              </label>
            </div>
            <Input
              id="startTime"
              type="time"
              {...register('startTime')}
              error={!!errors.startTime}
              disabled={disabled || startTimeTBD}
              className={startTimeTBD ? 'opacity-50' : ''}
            />
            {errors.startTime && (
              <p className="text-sm text-destructive mt-1">
                {errors.startTime.message}
              </p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label htmlFor="endDate" className="text-sm font-medium">End Date</Label>
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={endDateUBD}
                  onChange={(e) => {
                    setEndDateUBD(e.target.checked);
                    setValue('endDateUBD', e.target.checked);
                    if (e.target.checked) setValue('endDate', '');
                  }}
                  disabled={disabled}
                  className="accent-primary h-3 w-3"
                />
                <span className="text-xs text-muted-foreground">TBD</span>
              </label>
            </div>
            <Input
              id="endDate"
              type="date"
              {...register('endDate')}
              error={!!errors.endDate}
              disabled={disabled || endDateUBD}
              className={endDateUBD ? 'opacity-50' : ''}
            />
            {errors.endDate && (
              <p className="text-sm text-destructive mt-1">
                {errors.endDate.message}
              </p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label htmlFor="endTime" className="text-sm font-medium">End Time</Label>
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={endTimeTBD}
                  onChange={(e) => {
                    setEndTimeTBD(e.target.checked);
                    setValue('endTimeTBD', e.target.checked);
                    if (e.target.checked) setValue('endTime', '');
                  }}
                  disabled={disabled}
                  className="accent-primary h-3 w-3"
                />
                <span className="text-xs text-muted-foreground">TBD</span>
              </label>
            </div>
            <Input
              id="endTime"
              type="time"
              {...register('endTime')}
              error={!!errors.endTime}
              disabled={disabled || endTimeTBD}
              className={endTimeTBD ? 'opacity-50' : ''}
            />
            {errors.endTime && (
              <p className="text-sm text-destructive mt-1">
                {errors.endTime.message}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Cost & Price Section */}
      <div className="bg-accent/5 border border-border/30 p-5 rounded-lg">
        <h3 className="text-lg font-semibold border-b border-border pb-2 mb-4">
          Cost &amp; Price
        </h3>
        <div className="space-y-4">
          {/* Cost, Price, Rate Type in 3 columns */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="payRate" className="text-sm font-medium mb-2 block">Cost</Label>
              <Input
                id="payRate"
                type="number"
                step="0.01"
                min={0}
                {...register('payRate')}
                onFocus={() => {
                  const current = getValues('payRate') as any;
                  if (current === 0 || current === '0') {
                    setValue('payRate', '' as any);
                  }
                }}
                error={!!errors.payRate}
                disabled={disabled}
                placeholder="0.00"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Cost paid to {staffTerm.lower}
              </p>
              {errors.payRate && (
                <p className="text-sm text-destructive mt-1">
                  {errors.payRate.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="billRate" className="text-sm font-medium mb-2 block">Price</Label>
              <Input
                id="billRate"
                type="number"
                step="0.01"
                min={0}
                {...register('billRate')}
                onFocus={() => {
                  const current = getValues('billRate') as any;
                  if (current === 0 || current === '0') {
                    setValue('billRate', '' as any);
                  }
                }}
                error={!!errors.billRate}
                disabled={disabled}
                placeholder="0.00"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Price billed to client
              </p>
              {errors.billRate && (
                <p className="text-sm text-destructive mt-1">
                  {errors.billRate.message}
                </p>
              )}
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">Rate Type</Label>
              <Controller
                name="payRateType"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={disabled}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select rate type" />
                    </SelectTrigger>
                    <SelectContent>
                      {RATE_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          {/* Commission */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">Commission?</Label>
              <div className="flex items-center gap-4 h-10">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={watch('commission') === true}
                    onChange={() => setValue('commission', true)}
                    disabled={disabled}
                    className="accent-primary"
                  />
                  <span className="text-sm">Yes</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={watch('commission') === false}
                    onChange={() => {
                      setValue('commission', false);
                      setValue('commissionAmount', null);
                      setValue('commissionAmountType', null);
                    }}
                    disabled={disabled}
                    className="accent-primary"
                  />
                  <span className="text-sm">No</span>
                </label>
              </div>
            </div>
            {watch('commission') && (
              <>
                <div>
                  <Label className="text-sm font-medium mb-2 block">If Yes, enter amount</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    {...register('commissionAmount')}
                    onFocus={() => {
                      const current = getValues('commissionAmount') as any;
                      if (current === 0 || current === '0') {
                        setValue('commissionAmount', '' as any);
                      }
                    }}
                    disabled={disabled}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium mb-2 block">Amount Type</Label>
                  <Controller
                    name="commissionAmountType"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={field.value ?? ''}
                        onValueChange={(val) => field.onChange(val || null)}
                        disabled={disabled}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          {AMOUNT_TYPE_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </>
            )}
          </div>

          {/* Expenditures Section */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">Travel?</Label>
              <div className="flex items-center gap-4 h-10">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={watch('expenditure') === true}
                    onChange={() => setValue('expenditure', true)}
                    disabled={disabled}
                    className="accent-primary"
                  />
                  <span className="text-sm">Yes</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={watch('expenditure') === false}
                    onChange={() => {
                      setValue('expenditure', false);
                      setValue('expenditureCost', null);
                      setValue('expenditurePrice', null);
                    }}
                    disabled={disabled}
                    className="accent-primary"
                  />
                  <span className="text-sm">No</span>
                </label>
              </div>
            </div>
            {watch('expenditure') && (
              <>
                <div>
                  <Label className="text-sm font-medium mb-2 block">Travel Cost (to Talent)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    {...register('expenditureCost')}
                    onFocus={() => {
                      const current = getValues('expenditureCost') as any;
                      if (current === 0 || current === '0') {
                        setValue('expenditureCost', '' as any);
                      }
                    }}
                    disabled={disabled}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium mb-2 block">Travel Price (to Client)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    {...register('expenditurePrice')}
                    onFocus={() => {
                      const current = getValues('expenditurePrice') as any;
                      if (current === 0 || current === '0') {
                        setValue('expenditurePrice', '' as any);
                      }
                    }}
                    disabled={disabled}
                    placeholder="0.00"
                  />
                </div>
                <div>
                    <Label className="text-sm font-medium mb-2 block">Type</Label>
                    <Controller
                      name="expenditureAmountType"
                      control={control}
                      render={({ field }) => (
                        <Select
                          value={field.value ?? ''}
                          onValueChange={(val) => field.onChange(val || null)}
                          disabled={disabled}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            {AMOUNT_TYPE_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                </div>
              </>
            )}
          </div>

          {/* Approve Overtime */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">Approve Overtime?</Label>
              <div className="flex items-center gap-4 h-10">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={watch('approveOvertime') === true}
                    onChange={() => setValue('approveOvertime', true)}
                    disabled={disabled}
                    className="accent-primary"
                  />
                  <span className="text-sm">Yes</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={watch('approveOvertime') === false}
                    onChange={() => {
                      setValue('approveOvertime', false);
                      setValue('overtimeRate', null);
                      setValue('overtimeRateType', null);
                    }}
                    disabled={disabled}
                    className="accent-primary"
                  />
                  <span className="text-sm">No</span>
                </label>
              </div>
            </div>
            {watch('approveOvertime') && (
              <>
                <div>
                  <Label className="text-sm font-medium mb-2 block">If Yes, enter rate</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    {...register('overtimeRate')}
                    onFocus={() => {
                      const current = getValues('overtimeRate') as any;
                      if (current === 0 || current === '0') {
                        setValue('overtimeRate', '' as any);
                      }
                    }}
                    disabled={disabled}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium mb-2 block">Rate Type</Label>
                  <Controller
                    name="overtimeRateType"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={field.value ?? ''}
                        onValueChange={(val) => field.onChange(val || null)}
                        disabled={disabled}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          {AMOUNT_TYPE_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </>
            )}
          </div>

          {/* Hidden field to keep billRateType in sync */}
          <input type="hidden" {...register('billRateType')} />
        </div>
      </div>

      {/* Notes */}
      <div>
        <Label htmlFor="notes" className="text-sm font-medium mb-2 block">Notes</Label>
        <Textarea
          id="notes"
          {...register('notes')}
          disabled={disabled}
          rows={3}
          placeholder="Internal notes for this assignment..."
        />
        {errors.notes && (
          <p className="text-sm text-destructive mt-1">
            {errors.notes.message}
          </p>
        )}
      </div>
    </div>
  );
}

// Helper to get default form values
export function getDefaultAssignmentValues(today?: string): AssignmentFieldsInput {
  const todayStr = today || new Date().toISOString().split('T')[0];
  return {
    serviceId: '',
    numberOfStaffRequired: 1,
    skillLevel: SkillLevel.BEGINNER,
    ratingRequired: 'ANY',
    startDate: todayStr,
    startDateUBD: false,
    startTime: '',
    startTimeTBD: false,
    endDate: todayStr,
    endDateUBD: false,
    endTime: '',
    endTimeTBD: false,
    payRate: 0,
    payRateType: RateType.PER_HOUR,
    billRate: 0,
    billRateType: RateType.PER_HOUR,
    approveOvertime: false,
    overtimeRate: null,
    overtimeRateType: null,
    commission: false,
    commissionAmount: null,
    commissionAmountType: null,
    expenditure: false,
    expenditureCost: null,
    expenditurePrice: null,
    expenditureAmountType: null,
    notes: '',
  };
}

// Hook to create form with proper typing
export function useAssignmentForm(defaultValues?: Partial<AssignmentFieldsInput>) {
  return useForm<AssignmentFieldsInput, undefined, AssignmentFieldsOutput>({
    resolver: zodResolver(assignmentFieldsSchema),
    defaultValues: {
      ...getDefaultAssignmentValues(),
      ...defaultValues,
    },
  });
}
