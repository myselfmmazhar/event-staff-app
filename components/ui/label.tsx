import { forwardRef } from 'react'
import type { LabelHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  requiredMark?: boolean
  required?: boolean
}

export const Label = forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, children, requiredMark, required, ...props }, ref) => (
    <label
      ref={ref}
      className={cn(
        'block text-sm font-medium text-foreground leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
        className,
      )}
      {...props}
    >
      {children}
      {(requiredMark || required) && <span className="text-destructive ml-1">*</span>}
    </label>
  ),
)

Label.displayName = 'Label'
