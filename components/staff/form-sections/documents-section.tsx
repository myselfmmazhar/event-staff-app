'use client';

import { cn } from '@/lib/utils';
import { StaffDocumentUpload } from '../staff-document-upload';
import type { DocumentsSectionProps } from './types';

export function DocumentsSection({
  watch,
  setValue,
  disabled = false,
  className,
}: DocumentsSectionProps) {
  return (
    <div className={cn(className)}>
      <h3 className="text-lg font-semibold border-b border-border pb-2 mb-4">
        Documents
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StaffDocumentUpload
          documents={watch('documents') || []}
          onChange={(docs) => setValue('documents', docs)}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
