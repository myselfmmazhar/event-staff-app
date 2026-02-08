import type { ButtonHTMLAttributes, HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type Variant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'primary' | 'secondary' | 'outline' | 'destructive'
type Size = 'sm' | 'md' | 'lg'

const variants: Record<Variant, string> = {
  default:
    'bg-muted text-muted-foreground border-border',
  success:
    'bg-success/10 text-success border-success/20',
  warning:
    // 'bg-warning/15 text-warning border-warning/30',
    '[background-color:rgb(254,243,199)] [color:rgb(146,64,14)] [border-color:rgb(253,224,71)] dark:[background-color:rgb(69,26,3)] dark:[color:rgb(251,191,36)] dark:[border-color:rgb(120,53,15)]',
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
  outline:
    'bg-transparent text-foreground border-border',
  destructive:
    'bg-destructive/10 text-destructive border-destructive/20',
}

const sizes: Record<Size, string> = {
  sm: 'px-2 py-0.5 text-xs rounded-md',
  md: 'px-3 py-1 text-xs rounded-lg',
  lg: 'px-4 py-1.5 text-sm rounded-xl',
}

export interface BadgeProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  variant?: Variant
  size?: Size
  dot?: boolean
  pulse?: boolean
  asSpan?: boolean  // Opt-in for non-interactive badges
}

export const Badge = ({
  className,
  variant = 'default',
  size = 'md',
  dot = false,
  pulse = false,
  asSpan = false,
  children,
  onClick,
  ...props
}: BadgeProps) => {
  const isInteractive = !!onClick

  const baseStyles = cn(
    'inline-flex items-center gap-1.5 font-semibold border shadow-sm transition-all duration-200',
    variants[variant],
    sizes[size],
    isInteractive && 'hover:scale-105 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/50',
    className,
  )

  const content = (
    <>
      {(dot || pulse) && <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />}
      {children}
    </>
  )

  // Render as span if explicitly requested or not interactive
  if (asSpan || !isInteractive) {
    return (
      <span
        className={baseStyles}
        {...(props as HTMLAttributes<HTMLSpanElement>)}
      >
        {content}
      </span>
    )
  }

  // Render as button for interactive badges
  return (
    <button
      type="button"
      className={baseStyles}
      onClick={onClick}
      {...(props as ButtonHTMLAttributes<HTMLButtonElement>)}
    >
      {content}
    </button>
  )
}
