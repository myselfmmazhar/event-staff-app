import { forwardRef, useEffect, useRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  error?: boolean
  indeterminate?: boolean
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, error = false, indeterminate = false, ...props }, forwardedRef) => {
    const internalRef = useRef<HTMLInputElement>(null)

    // Handle both forwarded ref and internal ref
    const ref = forwardedRef || internalRef

    useEffect(() => {
      if (typeof ref === 'object' && ref?.current) {
        ref.current.indeterminate = indeterminate
      }
    }, [indeterminate, ref])

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
