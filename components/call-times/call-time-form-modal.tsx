'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CloseIcon } from '@/components/ui/icons';
import {
  type CreateCallTimeInput,
  type UpdateCallTimeInput,
} from '@/lib/schemas/call-time.schema';
import { isDateNullOrUBD } from '@/lib/utils/date-formatter';
import { SkillLevel, RateType, StaffRating } from '@prisma/client';
import { trpc } from '@/lib/client/trpc';
import {
  AssignmentFormFields,
  useAssignmentForm,
  type AssignmentFieldsOutput,
  type ServiceOption,
} from '@/components/shared/assignment-form-fields';

interface CallTime {
  id: string;
  callTimeId: string;
  serviceId: string;
  numberOfStaffRequired: number;
  skillLevel: SkillLevel;
  ratingRequired: StaffRating | null;
  startDate: Date | null;
  startTime: string | null;
  endDate: Date | null;
  endTime: string | null;
  payRate: number | { toNumber: () => number };
  payRateType: RateType;
  billRate: number | { toNumber: () => number };
  billRateType: RateType;
  customCost: number | { toNumber: () => number } | null;
  customPrice: number | { toNumber: () => number } | null;
  approveOvertime: boolean;
  commission: boolean;
  notes: string | null;
}

interface CallTimeFormModalProps {
  callTime: CallTime | null;
  eventId: string;
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateCallTimeInput | Omit<UpdateCallTimeInput, 'id'>) => void;
  isSubmitting: boolean;
  backendErrors?: Array<{ field: string; message: string }>;
}

const formatDateInputValue = (value: Date | string): string => {
  const [datePart = ''] = new Date(value).toISOString().split('T');
  return datePart;
};

const toNumber = (val: number | { toNumber: () => number } | null | undefined): number | null => {
  if (val === null || val === undefined) return null;
  return typeof val === 'object' ? val.toNumber() : val;
};

export function CallTimeFormModal({
  callTime,
  eventId,
  open,
  onClose,
  onSubmit,
  isSubmitting,
  backendErrors = [],
}: CallTimeFormModalProps) {
  const isEdit = !!callTime;

  // UBD/TBD state
  const [startDateUBD, setStartDateUBD] = useState(false);
  const [endDateUBD, setEndDateUBD] = useState(false);
  const [startTimeTBD, setStartTimeTBD] = useState(false);
  const [endTimeTBD, setEndTimeTBD] = useState(false);
  const [selectedService, setSelectedService] = useState<ServiceOption | null>(null);

  // Fetch services for the selector
  const { data: servicesData, isLoading: servicesLoading } = trpc.staff.getServices.useQuery(
    undefined,
    { enabled: open }
  );
  const services = (servicesData ?? []) as ServiceOption[];

  // Form setup using shared hook
  const form = useAssignmentForm();
  const { reset, setError, handleSubmit } = form;

  // Load existing call time data
  useEffect(() => {
    if (callTime) {
      const payRateValue = toNumber(callTime.payRate) ?? 0;
      const billRateValue = toNumber(callTime.billRate) ?? 0;
      const customCostValue = toNumber(callTime.customCost);
      const customPriceValue = toNumber(callTime.customPrice);

      // Check if dates are null/undefined/epoch (UBD was checked)
      // Note: superjson may deserialize null dates as epoch dates, so we check for that too
      const startDateIsUBD = isDateNullOrUBD(callTime.startDate);
      const endDateIsUBD = isDateNullOrUBD(callTime.endDate);

      reset({
        serviceId: callTime.serviceId,
        numberOfStaffRequired: callTime.numberOfStaffRequired,
        skillLevel: callTime.skillLevel,
        ratingRequired: callTime.ratingRequired ?? 'ANY',
        startDate: !startDateIsUBD ? formatDateInputValue(callTime.startDate!) : '',
        startDateUBD: startDateIsUBD,
        startTime: callTime.startTime || '',
        startTimeTBD: !callTime.startTime,
        endDate: !endDateIsUBD ? formatDateInputValue(callTime.endDate!) : '',
        endDateUBD: endDateIsUBD,
        endTime: callTime.endTime || '',
        endTimeTBD: !callTime.endTime,
        payRate: payRateValue,
        payRateType: callTime.payRateType,
        billRate: billRateValue,
        billRateType: callTime.billRateType,
        customCost: customCostValue,
        customPrice: customPriceValue,
        approveOvertime: callTime.approveOvertime,
        commission: callTime.commission,
        notes: callTime.notes || '',
      });
      setStartDateUBD(startDateIsUBD);
      setEndDateUBD(endDateIsUBD);
      setStartTimeTBD(!callTime.startTime);
      setEndTimeTBD(!callTime.endTime);
    } else {
      const today = formatDateInputValue(new Date());
      reset({
        serviceId: '',
        numberOfStaffRequired: 1,
        skillLevel: SkillLevel.BEGINNER,
        ratingRequired: 'ANY',
        startDate: today,
        startDateUBD: false,
        startTime: '',
        startTimeTBD: false,
        endDate: today,
        endDateUBD: false,
        endTime: '',
        endTimeTBD: false,
        payRate: 0,
        payRateType: RateType.PER_HOUR,
        billRate: 0,
        billRateType: RateType.PER_HOUR,
        customCost: null,
        customPrice: null,
        approveOvertime: false,
        commission: false,
        notes: '',
      });
      setStartDateUBD(false);
      setEndDateUBD(false);
      setStartTimeTBD(false);
      setEndTimeTBD(false);
      setSelectedService(null);
    }
  }, [callTime, reset, open]);

  // Set selected service when services are loaded (for edit mode)
  useEffect(() => {
    if (callTime && services.length > 0 && !selectedService) {
      const existingService = services.find(s => s.id === callTime.serviceId);
      if (existingService) {
        setSelectedService(existingService);
      }
    }
  }, [callTime, services, selectedService]);

  // Map backend errors to form fields
  useEffect(() => {
    if (backendErrors && backendErrors.length > 0) {
      backendErrors.forEach((error) => {
        setError(error.field as any, {
          type: 'manual',
          message: error.message,
        });
      });
    }
  }, [backendErrors, setError]);

  const handleFormSubmit = (data: AssignmentFieldsOutput) => {
    const submitData = {
      ...(isEdit ? {} : { eventId }),
      serviceId: data.serviceId,
      numberOfStaffRequired: data.numberOfStaffRequired,
      skillLevel: data.skillLevel,
      startDate: startDateUBD ? null : (data.startDate ? new Date(data.startDate) : null),
      startTime: startTimeTBD ? null : data.startTime || null,
      endDate: endDateUBD ? null : (data.endDate ? new Date(data.endDate) : null),
      endTime: endTimeTBD ? null : data.endTime || null,
      payRate: data.payRate,
      payRateType: data.payRateType,
      billRate: data.billRate,
      billRateType: data.billRateType,
      notes: data.notes || undefined,
    };

    onSubmit(submitData as CreateCallTimeInput | Omit<UpdateCallTimeInput, 'id'>);
  };

  return (
    <Dialog open={open} onClose={onClose} fullScreen>
      <form onSubmit={handleSubmit(handleFormSubmit)} className="h-full flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>
              {isEdit ? 'Edit Assignment' : 'Create Assignment'}
            </DialogTitle>
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
          {/* Assignment ID (Read-only in edit mode) */}
          {isEdit && callTime && (
            <div className="mb-6 p-3 bg-muted/30 rounded-md border border-border">
              <p className="text-sm text-muted-foreground">Assignment ID</p>
              <p className="text-base font-medium">{callTime.callTimeId}</p>
            </div>
          )}

          {/* Shared Form Fields */}
          <AssignmentFormFields
            form={form}
            disabled={isSubmitting}
            services={services}
            servicesLoading={servicesLoading}
            startDateUBD={startDateUBD}
            setStartDateUBD={setStartDateUBD}
            endDateUBD={endDateUBD}
            setEndDateUBD={setEndDateUBD}
            startTimeTBD={startTimeTBD}
            setStartTimeTBD={setStartTimeTBD}
            endTimeTBD={endTimeTBD}
            setEndTimeTBD={setEndTimeTBD}
            selectedService={selectedService}
            setSelectedService={setSelectedService}
          />
        </DialogContent>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting
              ? 'Saving...'
              : isEdit
                ? 'Update Assignment'
                : 'Create Assignment'}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
