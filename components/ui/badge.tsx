import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type Variant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'primary' | 'secondary'
type Size = 'sm' | 'md' | 'lg'

const variants: Record<Variant, string> = {
  default:
    'bg-muted text-muted-foreground border-border',
  success:
    'bg-success/10 text-success border-success/20',
  warning:
    'bg-warning/10 text-warning-foreground border-warning/20',
  danger:
    'bg-destructive/10 text-destructive border-destructive/20',
  info:
    'bg-info/10 text-info border-info/20',
  purple:
    'bg-primary/10 text-primary border-primary/20',
  primary:
    'bg-primary/10 text-primary border-primary/20',
  secondary:
    'bg-secondary/10 text-secondary border-secondary/20',
}

const sizes: Record<Size, string> = {
  sm: 'px-2 py-0.5 text-xs rounded-md',
  md: 'px-3 py-1 text-xs rounded-lg',
  lg: 'px-4 py-1.5 text-sm rounded-xl',
}

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: Variant
  size?: Size
  dot?: boolean
  pulse?: boolean
}

export const Badge = ({
  className,
  variant = 'default',
  size = 'md',
  dot = false,
  pulse = false,
  children,
  ...props
}: BadgeProps) => (
  <span
    className={cn(
      'inline-flex items-center gap-1.5 font-semibold border shadow-sm transition-all duration-200 hover:scale-105',
      variants[variant],
      sizes[size],
      className,
    )}
    {...props}
  >
    {(dot || pulse) && <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />}
    {children}
  </span>
)
