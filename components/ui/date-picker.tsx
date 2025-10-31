'use client';

import * as React from 'react';
import { format } from 'date-fns';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';

interface DateRangePickerProps {
  fromDate?: string;
  toDate?: string;
  onFromDateChange: (date: string) => void;
  onToDateChange: (date: string) => void;
  label?: string;
}

export function DateRangePicker({
  fromDate = '',
  toDate = '',
  onFromDateChange,
  onToDateChange,
  label = 'Date Range',
}: DateRangePickerProps) {
  const [startDate, setStartDate] = React.useState<Date | null>(
    fromDate ? new Date(fromDate + 'T00:00:00') : null
  );
  const [endDate, setEndDate] = React.useState<Date | null>(
    toDate ? new Date(toDate + 'T00:00:00') : null
  );

  // Sync with external state changes
  React.useEffect(() => {
    setStartDate(fromDate ? new Date(fromDate + 'T00:00:00') : null);
  }, [fromDate]);

  React.useEffect(() => {
    setEndDate(toDate ? new Date(toDate + 'T00:00:00') : null);
  }, [toDate]);

  const handleStartDateChange = (date: Date | null) => {
    setStartDate(date);
    if (date) {
      const normalizedDate = new Date(date);
      normalizedDate.setHours(0, 0, 0, 0);
      onFromDateChange(format(normalizedDate, 'yyyy-MM-dd'));
    } else {
      onFromDateChange('');
    }
  };

  const handleEndDateChange = (date: Date | null) => {
    setEndDate(date);
    if (date) {
      const normalizedDate = new Date(date);
      normalizedDate.setHours(0, 0, 0, 0);
      onToDateChange(format(normalizedDate, 'yyyy-MM-dd'));
    } else {
      onToDateChange('');
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <div className="relative w-full sm:w-auto">
          <DatePicker
            selected={startDate}
            onChange={handleStartDateChange}
            selectsStart
            startDate={startDate}
            endDate={endDate}
            placeholderText="Start date"
            className={cn(
              'w-full sm:w-[140px] h-11 px-3 rounded-xl border-2 border-input bg-background text-sm font-medium',
              'hover:border-primary/60 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none',
              'transition-all duration-200'
            )}
            dateFormat="MMM dd, yyyy"
            calendarClassName="!rounded-xl !border-2 !border-border !shadow-lg"
            wrapperClassName="w-full sm:w-auto"
            popperClassName="react-datepicker-popper-custom"
            popperPlacement="bottom-start"
            withPortal={true}
            portalId="datepicker-portal"
          />
        </div>
        <span className="text-muted-foreground text-sm self-center sm:self-auto">to</span>
        <div className="relative w-full sm:w-auto">
          <DatePicker
            selected={endDate}
            onChange={handleEndDateChange}
            selectsEnd
            startDate={startDate}
            endDate={endDate}
            minDate={startDate || undefined}
            placeholderText="End date"
            className={cn(
              'w-full sm:w-[140px] h-11 px-3 rounded-xl border-2 border-input bg-background text-sm font-medium',
              'hover:border-primary/60 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none',
              'transition-all duration-200'
            )}
            dateFormat="MMM dd, yyyy"
            calendarClassName="!rounded-xl !border-2 !border-border !shadow-lg"
            wrapperClassName="w-full sm:w-auto"
            popperClassName="react-datepicker-popper-custom"
            popperPlacement="bottom-start"
            withPortal={true}
            portalId="datepicker-portal"
          />
        </div>
      </div>
    </div>
  );
}
