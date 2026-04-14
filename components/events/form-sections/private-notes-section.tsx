'use client';

import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { FormSectionProps } from './types';

export function PrivateNotesSection({
  register,
  errors,
  disabled = false,
  className,
}: FormSectionProps) {
  return (
    <div className={cn('h-fit', className)}>
      <h3 className="text-lg font-semibold border-b border-border pb-2 mb-3">Private Notes</h3>
      <div>
        <Label htmlFor="privateComments" className="mb-1 block">Private Comments</Label>
        <Textarea
          id="privateComments"
          {...register('privateComments')}
          disabled={disabled}
          rows={3}
          placeholder="Internal notes (not visible to clients)"
        />
        {errors.privateComments && (
          <p className="text-sm text-destructive mt-1">{errors.privateComments.message}</p>
        )}
      </div>
    </div>
  );
}
