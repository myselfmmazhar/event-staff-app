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
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import {
  RATE_TYPE_LABELS,
  type CreateCallTimeInput,
  type UpdateCallTimeInput,
} from '@/lib/schemas/call-time.schema';
import { SkillLevel, RateType } from '@prisma/client';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { CloseIcon } from '@/components/ui/icons';
import { trpc } from '@/lib/client/trpc';
import { useStaffTerm } from '@/lib/hooks/use-terminology';

// Form schema for UI (handles TBD checkboxes)
const formSchema = z
  .object({
    positionId: z.string().min(1, 'Position is required'),
    numberOfStaffRequired: z.coerce.number().int().min(1, 'At least 1 staff required'),
    skillLevel: z.nativeEnum(SkillLevel),
    startDate: z.string().min(1, 'Start date is required'),
    startTime: z.string().optional(),
    startTimeTBD: z.boolean().default(false),
    endDate: z.string().min(1, 'End date is required'),
    endTime: z.string().optional(),
    endTimeTBD: z.boolean().default(false),
    payRate: z.coerce.number().positive('Pay rate must be positive'),
    payRateType: z.nativeEnum(RateType),
    billRate: z.coerce.number().positive('Bill rate must be positive'),
    billRateType: z.nativeEnum(RateType),
    notes: z.string().optional(),
  })
  .refine((data) => data.payRateType === data.billRateType, {
    message: 'Pay rate type and bill rate type must match',
    path: ['billRateType'],
  })
  .refine((data) => new Date(data.endDate) >= new Date(data.startDate), {
    message: 'End date must be after or equal to start date',
    path: ['endDate'],
  });

type FormData = z.infer<typeof formSchema>;

interface CallTime {
  id: string;
  callTimeId: string;
  positionId: string;
  numberOfStaffRequired: number;
  skillLevel: SkillLevel;
  startDate: Date;
  startTime: string | null;
  endDate: Date;
  endTime: string | null;
  payRate: number | { toNumber: () => number };
  payRateType: RateType;
  billRate: number | { toNumber: () => number };
  billRateType: RateType;
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

const SKILL_LEVELS: Array<{ value: SkillLevel; label: string }> = [
  { value: SkillLevel.BEGINNER, label: 'Beginner' },
  { value: SkillLevel.INTERMEDIATE, label: 'Intermediate' },
  { value: SkillLevel.ADVANCED, label: 'Advanced' },
];

const RATE_TYPES: Array<{ value: RateType; label: string }> = Object.entries(
  RATE_TYPE_LABELS
).map(([value, label]) => ({ value: value as RateType, label }));

export function CallTimeFormModal({
  callTime,
  eventId,
  open,
  onClose,
  onSubmit,
  isSubmitting,
  backendErrors = [],
}: CallTimeFormModalProps) {
  const staffTerm = useStaffTerm();
  const isEdit = !!callTime;
  const [startTimeTBD, setStartTimeTBD] = useState(false);
  const [endTimeTBD, setEndTimeTBD] = useState(false);

  // Fetch positions for dropdown
  const { data: positionsData } = trpc.staff.getPositions.useQuery(undefined, {
    enabled: open,
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setError,
    setValue,
    watch,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      positionId: '',
      numberOfStaffRequired: 1,
      skillLevel: SkillLevel.BEGINNER,
      startDate: '',
      startTime: '',
      startTimeTBD: false,
      endDate: '',
      endTime: '',
      endTimeTBD: false,
      payRate: 0,
      payRateType: RateType.PER_HOUR,
      billRate: 0,
      billRateType: RateType.PER_HOUR,
      notes: '',
    },
  });

  const payRateType = watch('payRateType');

  // Sync billRateType with payRateType
  useEffect(() => {
    setValue('billRateType', payRateType);
  }, [payRateType, setValue]);

  useEffect(() => {
    if (callTime) {
      const payRateValue =
        typeof callTime.payRate === 'object'
          ? callTime.payRate.toNumber()
          : callTime.payRate;
      const billRateValue =
        typeof callTime.billRate === 'object'
          ? callTime.billRate.toNumber()
          : callTime.billRate;

      reset({
        positionId: callTime.positionId,
        numberOfStaffRequired: callTime.numberOfStaffRequired,
        skillLevel: callTime.skillLevel,
        startDate: new Date(callTime.startDate).toISOString().split('T')[0],
        startTime: callTime.startTime || '',
        startTimeTBD: !callTime.startTime,
        endDate: new Date(callTime.endDate).toISOString().split('T')[0],
        endTime: callTime.endTime || '',
        endTimeTBD: !callTime.endTime,
        payRate: payRateValue,
        payRateType: callTime.payRateType,
        billRate: billRateValue,
        billRateType: callTime.billRateType,
        notes: callTime.notes || '',
      });
      setStartTimeTBD(!callTime.startTime);
      setEndTimeTBD(!callTime.endTime);
    } else {
      const today = new Date().toISOString().split('T')[0];
      reset({
        positionId: '',
        numberOfStaffRequired: 1,
        skillLevel: SkillLevel.BEGINNER,
        startDate: today,
        startTime: '',
        startTimeTBD: false,
        endDate: today,
        endTime: '',
        endTimeTBD: false,
        payRate: 0,
        payRateType: RateType.PER_HOUR,
        billRate: 0,
        billRateType: RateType.PER_HOUR,
        notes: '',
      });
      setStartTimeTBD(false);
      setEndTimeTBD(false);
    }
  }, [callTime, reset, open]);

  // Map backend errors to form fields
  useEffect(() => {
    if (backendErrors && backendErrors.length > 0) {
      backendErrors.forEach((error) => {
        setError(error.field as keyof FormData, {
          type: 'manual',
          message: error.message,
        });
      });
    }
  }, [backendErrors, setError]);

  const handleFormSubmit = (data: FormData) => {
    const submitData = {
      ...(isEdit ? {} : { eventId }),
      positionId: data.positionId,
      numberOfStaffRequired: data.numberOfStaffRequired,
      skillLevel: data.skillLevel,
      startDate: new Date(data.startDate),
      startTime: startTimeTBD ? null : data.startTime || null,
      endDate: new Date(data.endDate),
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
    <Dialog open={open} onClose={onClose} className="max-w-2xl">
      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>
              {isEdit ? 'Edit Call Time' : 'Create Call Time'}
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

        <DialogContent className="max-h-[calc(100vh-280px)] overflow-y-auto">
          {/* Call Time ID (Read-only in edit mode) */}
          {isEdit && callTime && (
            <div className="mb-6 p-3 bg-muted/30 rounded-md border border-border">
              <p className="text-sm text-muted-foreground">Call Time ID</p>
              <p className="text-base font-medium">{callTime.callTimeId}</p>
            </div>
          )}

          {/* Position & Staff Requirements */}
          <div className="bg-accent/5 border border-border/30 p-5 rounded-lg mb-6">
            <h3 className="text-lg font-semibold border-b border-border pb-2 mb-4">
              Position & Requirements
            </h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="positionId" required>
                  Position
                </Label>
                <Select
                  id="positionId"
                  {...register('positionId')}
                  disabled={isSubmitting}
                >
                  <option value="">Select a position</option>
                  {positionsData?.map((position) => (
                    <option key={position.id} value={position.id}>
                      {position.name}
                    </option>
                  ))}
                </Select>
                {errors.positionId && (
                  <p className="text-sm text-destructive mt-1">
                    {errors.positionId.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="numberOfStaffRequired" required>
                    Number of {staffTerm.plural} Required
                  </Label>
                  <Input
                    id="numberOfStaffRequired"
                    type="number"
                    min={1}
                    {...register('numberOfStaffRequired')}
                    error={!!errors.numberOfStaffRequired}
                    disabled={isSubmitting}
                  />
                  {errors.numberOfStaffRequired && (
                    <p className="text-sm text-destructive mt-1">
                      {errors.numberOfStaffRequired.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="skillLevel" required>
                    Minimum Skill Level
                  </Label>
                  <Select
                    id="skillLevel"
                    {...register('skillLevel')}
                    disabled={isSubmitting}
                  >
                    {SKILL_LEVELS.map((level) => (
                      <option key={level.value} value={level.value}>
                        {level.label}
                      </option>
                    ))}
                  </Select>
                  {errors.skillLevel && (
                    <p className="text-sm text-destructive mt-1">
                      {errors.skillLevel.message}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Date & Time */}
          <div className="bg-accent/5 border border-border/30 p-5 rounded-lg mb-6">
            <h3 className="text-lg font-semibold border-b border-border pb-2 mb-4">
              Date & Time
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDate" required>
                    Start Date
                  </Label>
                  <Input
                    id="startDate"
                    type="date"
                    {...register('startDate')}
                    error={!!errors.startDate}
                    disabled={isSubmitting}
                  />
                  {errors.startDate && (
                    <p className="text-sm text-destructive mt-1">
                      {errors.startDate.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="startTime">Start Time</Label>
                  <div className="flex gap-2">
                    <Input
                      id="startTime"
                      type="time"
                      {...register('startTime')}
                      error={!!errors.startTime}
                      disabled={isSubmitting || startTimeTBD}
                      className="flex-1"
                    />
                    <label className="flex items-center gap-2 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={startTimeTBD}
                        onChange={(e) => {
                          setStartTimeTBD(e.target.checked);
                          if (e.target.checked) setValue('startTime', '');
                        }}
                        disabled={isSubmitting}
                        className="rounded border-input"
                      />
                      <span className="text-sm">TBD</span>
                    </label>
                  </div>
                  {errors.startTime && (
                    <p className="text-sm text-destructive mt-1">
                      {errors.startTime.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="endDate" required>
                    End Date
                  </Label>
                  <Input
                    id="endDate"
                    type="date"
                    {...register('endDate')}
                    error={!!errors.endDate}
                    disabled={isSubmitting}
                  />
                  {errors.endDate && (
                    <p className="text-sm text-destructive mt-1">
                      {errors.endDate.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="endTime">End Time</Label>
                  <div className="flex gap-2">
                    <Input
                      id="endTime"
                      type="time"
                      {...register('endTime')}
                      error={!!errors.endTime}
                      disabled={isSubmitting || endTimeTBD}
                      className="flex-1"
                    />
                    <label className="flex items-center gap-2 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={endTimeTBD}
                        onChange={(e) => {
                          setEndTimeTBD(e.target.checked);
                          if (e.target.checked) setValue('endTime', '');
                        }}
                        disabled={isSubmitting}
                        className="rounded border-input"
                      />
                      <span className="text-sm">TBD</span>
                    </label>
                  </div>
                  {errors.endTime && (
                    <p className="text-sm text-destructive mt-1">
                      {errors.endTime.message}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Rates */}
          <div className="bg-accent/5 border border-border/30 p-5 rounded-lg mb-6">
            <h3 className="text-lg font-semibold border-b border-border pb-2 mb-4">
              Pay & Bill Rates
            </h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="payRateType" required>
                  Rate Type
                </Label>
                <Select
                  id="payRateType"
                  {...register('payRateType')}
                  disabled={isSubmitting}
                >
                  {RATE_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  This applies to both pay and bill rates
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="payRate" required>
                    Pay Rate ($)
                  </Label>
                  <Input
                    id="payRate"
                    type="number"
                    step="0.01"
                    min={0}
                    {...register('payRate')}
                    error={!!errors.payRate}
                    disabled={isSubmitting}
                    placeholder="0.00"
                  />
                  {errors.payRate && (
                    <p className="text-sm text-destructive mt-1">
                      {errors.payRate.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="billRate" required>
                    Bill Rate ($)
                  </Label>
                  <Input
                    id="billRate"
                    type="number"
                    step="0.01"
                    min={0}
                    {...register('billRate')}
                    error={!!errors.billRate}
                    disabled={isSubmitting}
                    placeholder="0.00"
                  />
                  {errors.billRate && (
                    <p className="text-sm text-destructive mt-1">
                      {errors.billRate.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Hidden field to keep billRateType in sync */}
              <input type="hidden" {...register('billRateType')} />
            </div>
          </div>

          {/* Notes */}
          <div className="bg-accent/5 border border-border/30 p-5 rounded-lg">
            <h3 className="text-lg font-semibold border-b border-border pb-2 mb-4">
              Notes
            </h3>
            <div>
              <Label htmlFor="notes">Internal Notes</Label>
              <Textarea
                id="notes"
                {...register('notes')}
                disabled={isSubmitting}
                rows={3}
                placeholder="Any additional notes about this call time..."
              />
              {errors.notes && (
                <p className="text-sm text-destructive mt-1">
                  {errors.notes.message}
                </p>
              )}
            </div>
          </div>
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
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? 'Saving...'
              : isEdit
                ? 'Update Call Time'
                : 'Create Call Time'}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
