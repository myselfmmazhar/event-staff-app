import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, error = false, ...props }, ref) => {
    return (
      <input
        ref={ref}
        type="checkbox"
        className={cn(
          'h-4 w-4 rounded border border-input bg-background',
          'cursor-pointer accent-primary',
          'transition-colors duration-200',
          'hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          error && 'border-destructive focus:ring-destructive/50',
          className,
        )}
        {...props}
      />
    )
  }
)

Checkbox.displayName = 'Checkbox'
