'use client';

import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { FormSectionProps } from './types';

export function PreEventSection({
  register,
  disabled = false,
  className,
}: FormSectionProps) {
  return (
    <div className={cn('bg-accent/5 border border-border/30 p-5 rounded-lg', className)}>
      <h3 className="text-lg font-semibold border-b border-border pb-2 mb-4">Pre-Event Instructions</h3>
      <Textarea
        id="preEventInstructions"
        {...register('preEventInstructions')}
        disabled={disabled}
        rows={4}
        placeholder="Instructions for staff before the event..."
      />
    </div>
  );
}
