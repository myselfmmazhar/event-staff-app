'use client'

import { useState, useCallback } from 'react'

export type ToastType = 'success' | 'error' | 'info'
export type ToastVariant = 'success' | 'error' | 'info'

export interface Toast {
  id: string
  message?: string
  title?: string
  description?: string
  type?: ToastType
  variant?: ToastVariant
}

type ToastActionType =
  | { type: 'ADD_TOAST'; toast: Toast }
  | { type: 'REMOVE_TOAST'; id: string }
  | { type: 'DISMISS_TOAST'; id: string }

let toastCount = 0

function genId() {
  toastCount = (toastCount + 1) % Number.MAX_VALUE
  return toastCount.toString()
}

const listeners: Array<(state: Toast[]) => void> = []
let memoryState: Toast[] = []

function dispatch(action: ToastActionType) {
  switch (action.type) {
    case 'ADD_TOAST':
      memoryState = [...memoryState, action.toast]
      break
    case 'REMOVE_TOAST':
    case 'DISMISS_TOAST':
      memoryState = memoryState.filter((t) => t.id !== action.id)
      break
  }

  listeners.forEach((listener) => {
    listener(memoryState)
  })
}

export function toast(props: Omit<Toast, 'id'>) {
  const id = genId()

  const dismiss = () => dispatch({ type: 'DISMISS_TOAST', id })

  dispatch({
    type: 'ADD_TOAST',
    toast: {
      ...props,
      id,
    },
  })

  return {
    id,
    dismiss,
  }
}

export function useToast() {
  const [state, setState] = useState<Toast[]>(memoryState)

  useState(() => {
    listeners.push(setState)
    return () => {
      const index = listeners.indexOf(setState)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  })

  const dismiss = useCallback((toastId?: string) => {
    if (!toastId) {
      memoryState.forEach((t) => {
        dispatch({ type: 'DISMISS_TOAST', id: t.id })
      })
      return
    }
    dispatch({ type: 'DISMISS_TOAST', id: toastId })
  }, [])

  return {
    toasts: state,
    toast,
    dismiss,
  }
}
