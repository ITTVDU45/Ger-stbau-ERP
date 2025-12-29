'use client'

import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface FloatingActionButtonProps {
  onClick: () => void
  label?: string
  icon?: React.ReactNode
}

export function FloatingActionButton({ 
  onClick, 
  label = 'Neu', 
  icon = <Plus className="h-6 w-6" />
}: FloatingActionButtonProps) {
  return (
    <Button
      onClick={onClick}
      className="md:hidden fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-shadow bg-blue-600 hover:bg-blue-700"
      size="icon"
      aria-label={label}
    >
      {icon}
    </Button>
  )
}

