'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Download, FileSpreadsheet, FileText, FileJson } from 'lucide-react'
import { toast } from 'sonner'

interface KalkulationExportButtonProps {
  projektId: string
}

export default function KalkulationExportButton({ projektId }: KalkulationExportButtonProps) {
  const [exporting, setExporting] = useState(false)

  const exportKalkulation = async (format: 'csv' | 'pdf' | 'excel') => {
    setExporting(true)
    try {
      const response = await fetch(`/api/kalkulation/${projektId}/export?format=${format}`)
      
      if (!response.ok) {
        const data = await response.json()
        toast.error(data.fehler || 'Fehler beim Export')
        return
      }

      // Blob aus Response erstellen
      const blob = await response.blob()
      
      // Download triggern
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      
      const extension = format === 'csv' ? 'csv' : format === 'pdf' ? 'pdf' : 'xlsx'
      a.download = `Kalkulation_${projektId}_${new Date().toISOString().split('T')[0]}.${extension}`
      
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      
      toast.success(`Export als ${format.toUpperCase()} erfolgreich`)
    } catch (error) {
      console.error('Fehler beim Export:', error)
      toast.error('Fehler beim Export der Kalkulation')
    } finally {
      setExporting(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          disabled={exporting}
          className="border-gray-300 text-gray-700 hover:bg-gray-50"
        >
          {exporting ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Exportiere...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Exportieren
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem 
          onClick={() => exportKalkulation('csv')}
          className="cursor-pointer"
        >
          <FileSpreadsheet className="mr-2 h-4 w-4 text-green-600" />
          <span>Als CSV</span>
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => exportKalkulation('pdf')}
          className="cursor-pointer"
        >
          <FileText className="mr-2 h-4 w-4 text-red-600" />
          <span>Als PDF</span>
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => exportKalkulation('excel')}
          className="cursor-pointer"
        >
          <FileJson className="mr-2 h-4 w-4 text-blue-600" />
          <span>Als Excel</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

