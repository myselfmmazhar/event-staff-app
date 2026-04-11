'use client'

import { useToast } from './use-toast'
import { Toast } from './toast'

export function Toaster() {
  const { toasts, dismiss } = useToast()

  return (
    <aside className="pointer-events-none fixed right-4 top-4 z-[9999] flex w-full max-w-sm flex-col gap-3 sm:right-6 sm:top-6">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onDismiss={() => dismiss(toast.id)} />
      ))}
    </aside>
  )
}
