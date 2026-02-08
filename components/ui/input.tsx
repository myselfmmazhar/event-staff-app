import { forwardRef } from 'react'
import type { InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean
  error?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, invalid, error, type = 'text', ...props }, ref) => {
    const hasError = invalid || error;
    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          'flex w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground shadow-sm transition-all duration-200 placeholder:text-muted-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-0',
          'disabled:cursor-not-allowed disabled:opacity-50',
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

Input.displayName = 'Input'
