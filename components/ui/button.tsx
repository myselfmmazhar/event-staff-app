import { forwardRef } from 'react'
import type { ButtonHTMLAttributes } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

type Variant = 'default' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'premium'
type Size = 'sm' | 'md' | 'lg'

export const buttonBase =
  'inline-flex flex-row items-center justify-center gap-0.5 font-semibold transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed relative overflow-hidden group active:scale-[0.97] will-change-transform'

export const buttonVariants: Record<Variant, string> = {
  default:
    'bg-primary text-primary-foreground shadow-md shadow-primary/25 hover:shadow-lg hover:shadow-primary/30 hover:bg-primary/95 hover:-translate-y-0.5 hover:scale-[1.02] after:absolute after:inset-0 after:bg-gradient-to-br after:from-white/20 after:via-transparent after:to-transparent after:opacity-0 hover:after:opacity-100 after:transition-opacity after:duration-200',
  premium:
    'bg-gradient-to-br from-primary via-primary/95 to-primary/90 text-primary-foreground shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 hover:-translate-y-1 hover:scale-[1.03] before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/25 before:via-white/10 before:to-transparent before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300 after:absolute after:inset-0 after:bg-gradient-to-r after:from-transparent after:via-white/10 after:to-transparent after:-translate-x-full hover:after:translate-x-full after:transition-transform after:duration-700 after:ease-in-out',
  secondary:
    'bg-secondary text-secondary-foreground shadow-sm shadow-secondary/20 hover:shadow-md hover:shadow-secondary/25 hover:bg-secondary/95 hover:-translate-y-0.5 hover:scale-[1.02] after:absolute after:inset-0 after:bg-gradient-to-br after:from-white/15 after:via-transparent after:to-transparent after:opacity-0 hover:after:opacity-100 after:transition-opacity after:duration-200',
  outline:
    'border-2 border-primary/40 bg-background/50 backdrop-blur-sm text-primary shadow-sm shadow-primary/10 hover:shadow-md hover:shadow-primary/20 hover:border-primary/60 hover:bg-accent/50 hover:-translate-y-0.5 hover:scale-[1.02] transition-all duration-200',
  ghost:
    'bg-transparent text-foreground hover:bg-accent/50 hover:text-accent-foreground shadow-none hover:shadow-sm rounded-xl transition-all duration-200',
  danger:
    'bg-destructive text-destructive-foreground shadow-md shadow-destructive/25 hover:shadow-lg hover:shadow-destructive/30 hover:bg-destructive/95 hover:-translate-y-0.5 hover:scale-[1.02] after:absolute after:inset-0 after:bg-gradient-to-br after:from-white/20 after:via-transparent after:to-transparent after:opacity-0 hover:after:opacity-100 after:transition-opacity after:duration-200',
}

export const buttonSizes: Record<Size, string> = {
  sm: 'h-9 px-2 text-xs font-semibold tracking-wide rounded-lg',
  md: 'h-11 px-3 text-sm font-semibold rounded-xl',
  lg: 'h-14 px-4 text-base font-bold rounded-2xl',
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
      className={cn(buttonBase, buttonVariants[variant], buttonSizes[size], className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <svg
            className="h-4 w-4 animate-spin shrink-0"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-20"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-80"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span className="relative z-10 opacity-90 whitespace-nowrap">Loading...</span>
        </>
      ) : (
        <span className="relative z-10 inline-flex items-center gap-0.5">{children}</span>
      )}
    </button>
  ),
)

Button.displayName = 'Button'

// LinkButton component for navigation with button styling
export interface LinkButtonProps {
  href: string
  variant?: Variant
  size?: Size
  className?: string
  children: React.ReactNode
}

export function LinkButton({ href, variant = 'default', size = 'md', className, children }: LinkButtonProps) {
  return (
    <Link
      href={href}
      className={cn(buttonBase, buttonVariants[variant], buttonSizes[size], className)}
    >
      <span className="relative z-10 inline-flex items-center gap-0.5">{children}</span>
    </Link>
  )
}
