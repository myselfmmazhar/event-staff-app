'use client'

import { useEffect } from 'react'
import type { ComponentType, SVGProps } from 'react'
import { cn } from '@/lib/utils'
import type { Toast as ToastType } from './use-toast'

const AUTO_DISMISS_MS = 4000

interface ToastProps {
  toast: ToastType
  onDismiss: () => void
}

export function Toast({ toast, onDismiss }: ToastProps) {
  const type = ((toast.variant as any) === 'destructive' ? 'error' : (toast.variant ?? toast.type ?? 'info')) as keyof typeof TOAST_THEMES
  const theme = TOAST_THEMES[type] || TOAST_THEMES['info']
  const { icon: Icon, background, badge } = theme

  useEffect(() => {
    const timer = setTimeout(onDismiss, AUTO_DISMISS_MS)
    return () => clearTimeout(timer)
  }, [onDismiss])

  return (
    <div
      className={cn(
        'pointer-events-auto overflow-hidden rounded-2xl border border-border bg-card shadow-lg backdrop-blur-xl transition-all duration-300 animate-slide-in hover:shadow-xl',
      )}
    >
      <div className="relative flex items-start gap-3 px-4 py-3.5">
        <div
          className="absolute -left-16 top-1/2 hidden h-16 w-16 -translate-y-1/2 rounded-full blur-2xl sm:block"
          style={{ background }}
        />
        <div
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-white shadow-lg"
          style={{ background }}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {badge}
          </div>
          <div className="mt-1 grid gap-1">
            {toast.title && <div className="text-sm font-semibold text-foreground">{toast.title}</div>}
            {toast.description && <div className="text-sm text-muted-foreground break-words">{toast.description}</div>}
            {toast.message && <div className="text-sm text-foreground break-words">{toast.message}</div>}
          </div>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className={cn(
            'ml-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-all hover:bg-accent hover:text-accent-foreground active:scale-95',
          )}
          aria-label="Dismiss notification"
        >
          <CloseIcon className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="h-1 w-full bg-gradient-to-r" style={{ background }} />
    </div>
  )
}

const TOAST_THEMES: Record<
  'success' | 'error' | 'info',
  { icon: ComponentType<SVGProps<SVGSVGElement>>; background: string; badge: string }
> = {
  success: {
    icon: CheckIcon,
    background: 'linear-gradient(135deg, hsl(var(--success)), hsl(var(--success)) 80%)',
    badge: 'Success',
  },
  error: {
    icon: ErrorIcon,
    background: 'linear-gradient(135deg, hsl(var(--destructive)), hsl(var(--destructive)) 80%)',
    badge: 'Error',
  },
  info: {
    icon: InfoIcon,
    background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary)) 80%)',
    badge: 'Info',
  },
}

function CheckIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  )
}

function ErrorIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v4m0 4h.01M10.34 3.94L1.82 18a1 1 0 00.86 1.5h18.64a1 1 0 00.86-1.5L12.86 3.94a1 1 0 00-1.72 0z"
      />
    </svg>
  )
}

function InfoIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 17v-5m0-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  )
}

function CloseIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M6 18L18 6" />
    </svg>
  )
}
