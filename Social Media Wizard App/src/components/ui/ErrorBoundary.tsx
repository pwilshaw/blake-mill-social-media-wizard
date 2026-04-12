// T084 — Error boundary + Toaster

import { Component, useReducer, useEffect, useCallback } from 'react'
import type { ReactNode, ErrorInfo } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

// ===========================================================================
// ErrorBoundary
// ===========================================================================

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[ErrorBoundary] Caught error:', error, info)
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null })
  }

  render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children
    }

    if (this.props.fallback !== undefined) {
      return this.props.fallback
    }

    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-destructive/30 bg-destructive/5 px-6 py-12 text-center">
        <div className="flex items-center justify-center h-12 w-12 rounded-full bg-destructive/10 text-destructive">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
          </svg>
        </div>

        <div className="space-y-1.5 max-w-sm">
          <h3 className="text-base font-semibold text-foreground">Something went wrong</h3>
          {this.state.error !== null && (
            <p className="text-sm text-muted-foreground font-mono break-all">
              {this.state.error.message}
            </p>
          )}
        </div>

        <Button variant="outline" onClick={this.handleReset} className="mt-2">
          Try again
        </Button>
      </div>
    )
  }
}

// ===========================================================================
// Toaster
// ===========================================================================

type ToastVariant = 'success' | 'error' | 'info'

interface Toast {
  id: string
  variant: ToastVariant
  message: string
}

type ToastAction =
  | { type: 'ADD'; toast: Toast }
  | { type: 'REMOVE'; id: string }

function toastReducer(state: Toast[], action: ToastAction): Toast[] {
  switch (action.type) {
    case 'ADD':
      return [...state, action.toast]
    case 'REMOVE':
      return state.filter((t) => t.id !== action.id)
  }
}

// ---------------------------------------------------------------------------
// Shared event bus (module-level singleton)
// ---------------------------------------------------------------------------

type ToastListener = (toast: Omit<Toast, 'id'>) => void
const listeners: Set<ToastListener> = new Set()

function emitToast(toast: Omit<Toast, 'id'>): void {
  listeners.forEach((l) => l(toast))
}

// Public imperative API
const toast = {
  success: (message: string) => emitToast({ variant: 'success', message }),
  error: (message: string) => emitToast({ variant: 'error', message }),
  info: (message: string) => emitToast({ variant: 'info', message }),
}

// ---------------------------------------------------------------------------
// Toast item
// ---------------------------------------------------------------------------

const TOAST_ICONS: Record<ToastVariant, ReactNode> = {
  success: (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  ),
  error: (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  ),
  info: (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  ),
}

const TOAST_STYLES: Record<ToastVariant, string> = {
  success: 'bg-card border-green-500/30 text-foreground [&_[data-icon]]:text-green-500',
  error: 'bg-card border-destructive/30 text-foreground [&_[data-icon]]:text-destructive',
  info: 'bg-card border-primary/30 text-foreground [&_[data-icon]]:text-primary',
}

interface ToastItemProps {
  toast: Toast
  onDismiss: (id: string) => void
}

function ToastItem({ toast: t, onDismiss }: ToastItemProps) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(t.id), 5000)
    return () => clearTimeout(timer)
  }, [t.id, onDismiss])

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        'flex items-start gap-3 min-w-[280px] max-w-sm rounded-lg border px-4 py-3 shadow-lg',
        'animate-in slide-in-from-right-full fade-in duration-300',
        TOAST_STYLES[t.variant],
      )}
    >
      <span data-icon="" className="mt-0.5 shrink-0">
        {TOAST_ICONS[t.variant]}
      </span>
      <p className="flex-1 text-sm leading-snug">{t.message}</p>
      <button
        onClick={() => onDismiss(t.id)}
        className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Dismiss notification"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </svg>
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Toaster component — render once near the app root
// ---------------------------------------------------------------------------

function Toaster() {
  const [toasts, dispatch] = useReducer(toastReducer, [])

  useEffect(() => {
    const listener: ToastListener = (incoming) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`
      dispatch({ type: 'ADD', toast: { id, ...incoming } })
    }
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }, [])

  const dismiss = useCallback((id: string) => {
    dispatch({ type: 'REMOVE', id })
  }, [])

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 items-end"
      aria-label="Notifications"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
      ))}
    </div>
  )
}

export { ErrorBoundary, Toaster, toast }
export type { Toast, ToastVariant }
