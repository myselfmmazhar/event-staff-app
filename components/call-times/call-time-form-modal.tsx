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
import { SkillLevel, RateType, StaffRating, AmountType } from '@prisma/client';
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
  customCost: number | { toNumber: () => number } | null; // kept for backward compat with DB
  customPrice: number | { toNumber: () => number } | null; // kept for backward compat with DB
  approveOvertime: boolean;
  overtimeRate: number | { toNumber: () => number } | null;
  overtimeRateType: AmountType | null;
  commission: boolean;
  commissionAmount: number | { toNumber: () => number } | null;
  commissionAmountType: AmountType | null;
  notes: string | null;
  applyMinimum?: boolean | null;
  minimum?: number | { toNumber: () => number } | null;
  travelInMinimum?: boolean | null;
  expenditure?: boolean | null;
  expenditureCost?: number | { toNumber: () => number } | null;
  expenditurePrice?: number | { toNumber: () => number } | null;
  expenditureAmountType?: AmountType | null;
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

  // Duplicate-assignment warning state
  const [duplicateWarningActive, setDuplicateWarningActive] = useState(false);
  const [duplicateMatchLabel, setDuplicateMatchLabel] = useState<string | null>(null);
  const [duplicateAcknowledge, setDuplicateAcknowledge] = useState(false);

  // Fetch services for the selector
  const { data: servicesData, isLoading: servicesLoading } = trpc.staff.getServices.useQuery(
    undefined,
    { enabled: open }
  );
  const services = (servicesData ?? []) as ServiceOption[];

  // Fetch existing call times for this event to detect potential duplicates on create
  const { data: existingCallTimes } = trpc.callTime.getAll.useQuery(
    {
      page: 1,
      limit: 100,
      eventId,
      staffingStatus: 'all',
    },
    {
      enabled: open && !isEdit,
    }
  );

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
        approveOvertime: callTime.approveOvertime,
        overtimeRate: toNumber(callTime.overtimeRate) ?? null,
        overtimeRateType: callTime.overtimeRateType ?? null,
        commission: callTime.commission,
        commissionAmount: toNumber(callTime.commissionAmount) ?? null,
        commissionAmountType: callTime.commissionAmountType ?? null,
        minimum: (() => {
          const minVal = toNumber(callTime.minimum);
          if (callTime.applyMinimum === true) return true;
          if (callTime.applyMinimum === false) return false;
          return minVal != null && minVal > 0;
        })(),
        minimumAmount: toNumber(callTime.minimum),
        minimumRateType: callTime.billRateType ?? null,
        travelInMinimum: callTime.travelInMinimum ?? false,
        expenditure: callTime.expenditure ?? false,
        expenditureCost: toNumber(callTime.expenditureCost),
        expenditurePrice: toNumber(callTime.expenditurePrice),
        expenditureAmountType: callTime.expenditureAmountType ?? null,
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
        approveOvertime: false,
        overtimeRate: null,
        overtimeRateType: null,
        commission: false,
        commissionAmount: null,
        commissionAmountType: null,
        minimum: false,
        minimumAmount: null,
        minimumRateType: null,
        travelInMinimum: false,
        expenditure: false,
        expenditureCost: null,
        expenditurePrice: null,
        expenditureAmountType: null,
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
    const applyMinimum = data.minimum === true;
    const minimumDollars =
      applyMinimum && data.minimumAmount != null
        ? parseFloat(Number(data.minimumAmount).toFixed(2))
        : null;

    const submitData = {
      ...(isEdit ? {} : { eventId }),
      serviceId: data.serviceId,
      numberOfStaffRequired: data.numberOfStaffRequired,
      skillLevel: data.skillLevel,
      ratingRequired: data.ratingRequired,
      startDate: startDateUBD ? null : (data.startDate ? new Date(data.startDate) : null),
      startTime: startTimeTBD ? null : data.startTime || null,
      endDate: endDateUBD ? null : (data.endDate ? new Date(data.endDate) : null),
      endTime: endTimeTBD ? null : data.endTime || null,
      payRate: data.payRate,
      payRateType: data.payRateType,
      billRate: data.billRate,
      billRateType: data.billRateType,
      notes: data.notes || undefined,
      // Commission & Overtime details
      approveOvertime: data.approveOvertime ?? false,
      overtimeRate: data.overtimeRate ?? undefined,
      overtimeRateType: data.overtimeRateType ?? undefined,
      commission: data.commission ?? false,
      commissionAmount: data.commissionAmount ?? undefined,
      commissionAmountType: data.commissionAmountType ?? undefined,
      applyMinimum,
      minimum: minimumDollars,
      travelInMinimum: data.travelInMinimum ?? false,
      expenditure: data.expenditure ?? false,
      expenditureCost: data.expenditure ? (data.expenditureCost ?? null) : null,
      expenditurePrice: data.expenditure ? (data.expenditurePrice ?? null) : null,
      expenditureAmountType: data.expenditure ? (data.expenditureAmountType ?? null) : null,
    };

    // When creating a new assignment, check for an existing one with the same
    // event + service + start/end date + start/end time + pay rate + staff required.
    if (!isEdit && existingCallTimes?.data) {
      const normalizeDate = (value: unknown): string | null => {
        if (!value) return null;
        const d = typeof value === 'string' || value instanceof Date ? new Date(value) : null;
        if (!d || Number.isNaN(d.getTime())) return null;
        return d.toISOString().slice(0, 10);
      };

      const targetStartDate = submitData.startDate ? normalizeDate(submitData.startDate) : null;
      const targetEndDate = submitData.endDate ? normalizeDate(submitData.endDate) : null;
      const targetStartTime = submitData.startTime ?? null;
      const targetEndTime = submitData.endTime ?? null;
      const targetPayRate = submitData.payRate;
      const targetStaffRequired = submitData.numberOfStaffRequired;

      const duplicate = existingCallTimes.data.find((ct: any) => {
        const ctStartDate = normalizeDate(ct.startDate);
        const ctEndDate = normalizeDate(ct.endDate);
        const ctStartTime = ct.startTime ?? null;
        const ctEndTime = ct.endTime ?? null;
        const ctPayRate =
          typeof ct.payRate === 'number'
            ? ct.payRate
            : typeof ct.payRate === 'string'
              ? parseFloat(ct.payRate)
              : (ct.payRate as any)?.toNumber?.() ?? 0;

        return (
          ct.serviceId === submitData.serviceId &&
          ctStartDate === targetStartDate &&
          ctEndDate === targetEndDate &&
          ctStartTime === targetStartTime &&
          ctEndTime === targetEndTime &&
          ctPayRate === targetPayRate &&
          ct.numberOfStaffRequired === targetStaffRequired
        );
      });

      if (duplicate) {
        // First time we detect a duplicate for this data: show warning and require checkbox
        if (!duplicateWarningActive) {
          setDuplicateWarningActive(true);
          setDuplicateAcknowledge(false);
          setDuplicateMatchLabel(
            `${duplicate.service?.title ?? 'Service'} for this event with the same time, rate and staff count already exists.`
          );
          return;
        }

        // Duplicate exists and warning is shown, but user hasn't acknowledged yet
        if (!duplicateAcknowledge) {
          return;
        }
      } else if (duplicateWarningActive) {
        // No longer a duplicate (user changed fields) – reset warning state
        setDuplicateWarningActive(false);
        setDuplicateAcknowledge(false);
        setDuplicateMatchLabel(null);
      }
    }

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
            eventId={eventId}
          />
        </DialogContent>

        <DialogFooter className="flex items-center gap-4">
          {duplicateWarningActive && (
            <div className="flex-1 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
              <p className="font-semibold">Similar assignment already exists.</p>
              {duplicateMatchLabel && (
                <p className="mt-1">
                  {duplicateMatchLabel}
                </p>
              )}
              <label className="flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  checked={duplicateAcknowledge}
                  onChange={(e) => setDuplicateAcknowledge(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-xs">
                  Add this assignment into the same row (it will be grouped with the existing one).
                </span>
              </label>
            </div>
          )}

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
            disabled={isSubmitting || (duplicateWarningActive && !duplicateAcknowledge)}
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
