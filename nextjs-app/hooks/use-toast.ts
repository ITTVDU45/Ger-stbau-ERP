import { useState, useCallback } from 'react'

interface ToastProps {
  title: string
  description?: string
  variant?: 'default' | 'destructive' | 'success' | 'error'
}

interface ToastItem extends ToastProps {
  id: string
}

let toastCount = 0

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const toast = useCallback(({ title, description, variant = 'default' }: ToastProps) => {
    const id = `toast-${++toastCount}-${Date.now()}`
    
    // Map 'destructive' to 'error' for consistency
    const mappedVariant = variant === 'destructive' ? 'error' : variant

    const newToast: ToastItem = {
      id,
      title,
      description,
      variant: mappedVariant as 'default' | 'success' | 'error'
    }

    setToasts((prev) => [...prev, newToast])

    // Auto-remove after 5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 5000)
  }, [])

  return { toast, toasts }
}

