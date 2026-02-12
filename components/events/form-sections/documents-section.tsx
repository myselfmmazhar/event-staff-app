'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlusIcon, XIcon } from '@/components/ui/icons';
import { EventDocumentUpload } from '../event-document-upload';
import { cn } from '@/lib/utils';
import { useTerminology } from '@/lib/hooks/use-terminology';
import type { DocumentsSectionProps } from './types';

export function DocumentsSection({
  register,
  errors,
  watch,
  setValue,
  disabled = false,
  className,
  fileLinksFieldArray,
}: DocumentsSectionProps) {
  const { fields, append, remove } = fileLinksFieldArray;
  const { terminology } = useTerminology();

  return (
    <div className={cn('space-y-6', className)}>
      {/* Event Documents */}
      <div className="bg-accent/5 border border-border/30 p-5 rounded-lg">
        <h3 className="text-lg font-semibold border-b border-border pb-2 mb-4">{terminology.event.singular} Documents</h3>
        <EventDocumentUpload
          documents={watch('eventDocuments') || []}
          onChange={(docs) => setValue('eventDocuments', docs)}
          disabled={disabled}
        />
      </div>

      {/* File Links */}
      <div className="bg-accent/5 border border-border/30 p-5 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold border-b border-border pb-2 flex-1">File Links</h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ name: '', link: '' })}
            disabled={disabled}
          >
            <PlusIcon className="h-4 w-4 mr-1" />
            Add File
          </Button>
        </div>

        {fields.length === 0 && (
          <p className="text-sm text-muted-foreground">No files added yet</p>
        )}

        <div className="space-y-3">
          {fields.map((field, index) => (
            <div key={field.id}>
              <div className="flex gap-2">
                <div className="flex-1 space-y-1">
                  <Input
                    {...register(`fileLinks.${index}.name` as const)}
                    placeholder="File name"
                    disabled={disabled}
                    error={!!(errors.fileLinks?.[index]?.name)}
                  />
                  {errors.fileLinks?.[index]?.name && (
                    <p className="text-sm text-destructive">
                      {errors.fileLinks[index]?.name?.message}
                    </p>
                  )}
                </div>
                <div className="flex-[2] space-y-1">
                  <Input
                    {...register(`fileLinks.${index}.link` as const)}
                    placeholder="https://example.com/file.pdf"
                    disabled={disabled}
                    error={!!(errors.fileLinks?.[index]?.link)}
                  />
                  {errors.fileLinks?.[index]?.link && (
                    <p className="text-sm text-destructive">
                      {errors.fileLinks[index]?.link?.message}
                    </p>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => remove(index)}
                  disabled={disabled}
                  className="self-start"
                >
                  <XIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
