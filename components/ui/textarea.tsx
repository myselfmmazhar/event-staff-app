import { forwardRef } from 'react'
import type { TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean
  error?: boolean
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, invalid, error, ...props }, ref) => {
    const hasError = invalid || error;
    return (
      <textarea
        ref={ref}
        className={cn(
          'flex w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground shadow-sm transition-all duration-200 placeholder:text-muted-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-0',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'min-h-[80px] resize-y',
          hasError
            ? 'border-destructive bg-destructive/5 focus-visible:border-destructive focus-visible:ring-destructive/20'
            : 'border-input focus-visible:border-primary focus-visible:ring-primary/20',
          className,
        )}
        {...props}
      />
    );
  }
)

Textarea.displayName = 'Textarea'
