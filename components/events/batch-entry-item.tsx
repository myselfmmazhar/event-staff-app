'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrashIcon } from '@/components/ui/icons';
import { AccordionItem, AccordionHeader, AccordionContent } from '@/components/ui/accordion';
import { EventFormFields } from './event-form-fields';
import { EventStatus } from '@prisma/client';
import type { RowValidationResult } from '@/lib/utils/event-import';
import type { ImportEventRow } from '@/lib/schemas/event-import.schema';
import type { ClientOption, TerminologyConfig, EventFormData } from './form-sections';

interface BatchEntryItemProps {
  entry: RowValidationResult;
  index: number;
  onUpdate: (index: number, data: Partial<ImportEventRow>) => void;
  onRemove: (index: number) => void;
  clients: ClientOption[];
  terminology: TerminologyConfig;
}

function mapEntryToFormData(data: ImportEventRow | null): Partial<EventFormData> {
  if (!data) return {};

  // Format date for HTML date input (YYYY-MM-DD string)
  const formatDateForInput = (date: Date | string | null | undefined): string => {
    const toDateString = (d: Date): string => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    if (!date) {
      return toDateString(new Date());
    }
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) {
      return toDateString(new Date());
    }
    return toDateString(d);
  };

  return {
    title: data.title || '',
    description: data.description || '',
    requirements: data.requirements || '',
    privateComments: data.privateComments || '',
    clientId: undefined, // Will be resolved from clientName
    venueName: data.venueName || '',
    address: data.address || '',
    city: data.city || '',
    state: data.state || '',
    zipCode: data.zipCode || '',
    latitude: data.latitude || undefined,
    longitude: data.longitude || undefined,
    startDate: formatDateForInput(data.startDate),
    startTime: data.startTime || '',
    endDate: formatDateForInput(data.endDate),
    endTime: data.endTime || '',
    timezone: data.timezone || 'America/New_York',
    status: (data.status as EventStatus) || EventStatus.DRAFT,
    fileLinks: data.fileLinks || [],
    requestMethod: data.requestMethod || undefined,
    requestorName: data.requestorName || '',
    requestorPhone: data.requestorPhone || '',
    requestorEmail: data.requestorEmail || '',
    poNumber: data.poNumber || '',
    preEventInstructions: data.preEventInstructions || '',
    eventDocuments: data.eventDocuments || [],
    meetingPoint: data.meetingPoint || '',
    onsitePocName: data.onsitePocName || '',
    onsitePocPhone: data.onsitePocPhone || '',
    onsitePocEmail: data.onsitePocEmail || '',
  };
}

export function BatchEntryItem({
  entry,
  index,
  onUpdate,
  onRemove,
  clients,
  terminology,
}: BatchEntryItemProps) {
  const [startTimeTBD, setStartTimeTBD] = useState(false);
  const [endTimeTBD, setEndTimeTBD] = useState(false);

  // Note: We don't use zodResolver here because validation happens at the parent level
  // via validateRow(). This form is purely for editing convenience.
  const form = useForm<EventFormData>({
    defaultValues: mapEntryToFormData(entry.data),
    mode: 'onChange',
  });

  const { register, control, formState: { errors }, watch, setValue } = form;

  // Watch for form changes and propagate to parent
  const watchedValues = watch();

  const handleUpdate = useCallback(() => {
    const values = form.getValues();

    // Helper to ensure date is a Date object
    const toDate = (val: Date | string | undefined): Date | undefined => {
      if (!val) return undefined;
      if (val instanceof Date) return val;
      const d = new Date(val);
      return isNaN(d.getTime()) ? undefined : d;
    };

    const updateData: Partial<ImportEventRow> = {
      title: values.title,
      description: values.description,
      requirements: values.requirements,
      privateComments: values.privateComments,
      venueName: values.venueName,
      address: values.address,
      city: values.city,
      state: values.state,
      zipCode: values.zipCode,
      latitude: values.latitude,
      longitude: values.longitude,
      startDate: toDate(values.startDate),
      startTime: startTimeTBD ? 'TBD' : values.startTime,
      endDate: toDate(values.endDate),
      endTime: endTimeTBD ? 'TBD' : values.endTime,
      timezone: values.timezone,
      status: values.status,
      requestMethod: values.requestMethod,
      requestorName: values.requestorName,
      requestorPhone: values.requestorPhone,
      requestorEmail: values.requestorEmail,
      poNumber: values.poNumber,
      preEventInstructions: values.preEventInstructions,
      meetingPoint: values.meetingPoint,
      onsitePocName: values.onsitePocName,
      onsitePocPhone: values.onsitePocPhone,
      onsitePocEmail: values.onsitePocEmail,
    };

    // Map clientId to clientName for validation
    if (values.clientId) {
      const client = clients.find(c => c.id === values.clientId);
      if (client) {
        (updateData as any).clientName = client.businessName;
      }
    }

    onUpdate(index, updateData);
  }, [form, index, onUpdate, startTimeTBD, endTimeTBD, clients]);

  // Debounce updates
  useEffect(() => {
    const timeout = setTimeout(handleUpdate, 500);
    return () => clearTimeout(timeout);
  }, [watchedValues, handleUpdate]);

  const title = entry.data?.title || 'Untitled Event';

  return (
    <AccordionItem value={`entry-${index}`}>
      <AccordionHeader
        action={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onRemove(index)}
            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
          >
            <TrashIcon className="h-4 w-4" />
          </Button>
        }
      >
        <div className="flex items-center gap-3">
          <Badge variant={entry.valid ? 'default' : 'destructive'}>
            #{index + 1}
          </Badge>
          <span className="text-sm font-medium truncate max-w-[400px]">
            {title}
          </span>
          {!entry.valid && entry.errors.length > 0 && (
            <span className="text-xs text-destructive">
              ({entry.errors.length} error{entry.errors.length > 1 ? 's' : ''})
            </span>
          )}
        </div>
      </AccordionHeader>
      <AccordionContent className="pt-4">
        {/* Validation errors summary */}
        {entry.errors.length > 0 && (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
            <p className="text-sm font-medium text-destructive mb-1">Validation Errors:</p>
            <ul className="list-disc list-inside text-sm text-destructive">
              {entry.errors.map((error, i) => (
                <li key={i}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Full form fields */}
        <EventFormFields
          register={register}
          control={control}
          errors={errors}
          watch={watch}
          setValue={setValue}
          clients={clients}
          terminology={terminology}
          startTimeTBD={startTimeTBD}
          setStartTimeTBD={setStartTimeTBD}
          endTimeTBD={endTimeTBD}
          setEndTimeTBD={setEndTimeTBD}
          disabled={false}
          compact={true}
        />
      </AccordionContent>
    </AccordionItem>
  );
}
