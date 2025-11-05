"use client"

import React from 'react'
import { CheckCircle, AlertCircle, X } from 'lucide-react'
import colors from '@/lib/theme/colors'

interface ToastProps {
  id: string
  title: string
  description?: string
  variant?: 'success' | 'error' | 'default'
  onClose: () => void
}

export function Toast({ title, description, variant = 'default', onClose }: ToastProps) {
  const bgColor = variant === 'success' 
    ? colors.background.gradientGreen
    : variant === 'error'
    ? 'linear-gradient(135deg, #ef4444, #dc2626)'
    : colors.background.gradientBlue

  const icon = variant === 'success' 
    ? <CheckCircle className="h-5 w-5 text-white" />
    : variant === 'error'
    ? <AlertCircle className="h-5 w-5 text-white" />
    : null

  return (
    <div
      className="flex items-start gap-3 p-4 rounded-lg shadow-lg min-w-[300px] max-w-md animate-slide-in"
      style={{ background: bgColor }}
    >
      {icon && <div className="flex-shrink-0 mt-0.5">{icon}</div>}
      <div className="flex-1">
        <h3 className="font-semibold text-white text-sm">{title}</h3>
        {description && (
          <p className="text-white/90 text-sm mt-1">{description}</p>
        )}
      </div>
      <button
        onClick={onClose}
        className="flex-shrink-0 text-white/80 hover:text-white transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

export function Toaster({ toasts }: { toasts: Array<{ id: string; title: string; description?: string; variant?: 'success' | 'error' | 'default' }> }) {
  const [visibleToasts, setVisibleToasts] = React.useState(toasts)

  React.useEffect(() => {
    setVisibleToasts(toasts)
  }, [toasts])

  const handleClose = (id: string) => {
    setVisibleToasts((prev) => prev.filter((t) => t.id !== id))
  }

  if (visibleToasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2">
      {visibleToasts.map((toast) => (
        <Toast
          key={toast.id}
          id={toast.id}
          title={toast.title}
          description={toast.description}
          variant={toast.variant}
          onClose={() => handleClose(toast.id)}
        />
      ))}
    </div>
  )
}

