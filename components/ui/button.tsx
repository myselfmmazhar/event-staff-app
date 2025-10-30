import { forwardRef } from 'react'
import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type Variant = 'default' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'premium'
type Size = 'sm' | 'md' | 'lg'

const base =
  'inline-flex items-center justify-center gap-2 font-semibold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none relative overflow-hidden group active:scale-[0.98]'

const variants: Record<Variant, string> = {
  default:
    'bg-primary text-primary-foreground shadow-lg hover:shadow-xl hover:bg-primary/90 hover:-translate-y-0.5',
  premium:
    'bg-gradient-to-br from-primary via-primary to-primary/80 text-primary-foreground shadow-xl hover:shadow-2xl hover:-translate-y-1 before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/30 before:via-transparent before:to-white/10 before:opacity-0 hover:before:opacity-100 before:transition-all before:duration-500',
  secondary:
    'bg-secondary text-secondary-foreground shadow-md hover:shadow-lg hover:bg-secondary/90 hover:-translate-y-0.5',
  outline:
    'border-2 border-primary/30 bg-background text-primary shadow-sm hover:shadow-md hover:border-primary/50 hover:bg-accent hover:-translate-y-0.5',
  ghost:
    'bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground shadow-none',
  danger:
    'bg-destructive text-destructive-foreground shadow-lg hover:shadow-xl hover:bg-destructive/90 hover:-translate-y-0.5',
}

const sizes: Record<Size, string> = {
  sm: 'h-9 px-4 text-xs font-semibold tracking-wide rounded-xl',
  md: 'h-11 px-6 text-sm font-semibold rounded-xl',
  lg: 'h-12 px-8 text-base font-bold rounded-2xl',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  isLoading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'md', isLoading, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(base, variants[variant], sizes[size], className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <svg
            className="h-4 w-4 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span className="relative z-10">Loading...</span>
        </>
      ) : (
        <span className="relative z-10">{children}</span>
      )}
    </button>
  ),
)

Button.displayName = 'Button'
