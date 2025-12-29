'use client'

import { useState, useEffect } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Building2 } from 'lucide-react'

interface MandantenAuswahlProps {
  value: string | null
  onChange: (mandantId: string | null) => void
}

export default function MandantenAuswahl({ value, onChange }: MandantenAuswahlProps) {
  const [mandanten, setMandanten] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadMandanten()
  }, [])

  const loadMandanten = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/finanzen/mandanten?aktiv=true')
      const data = await res.json()

      if (data.erfolg) {
        setMandanten(data.mandanten)
      }
    } catch (error) {
      console.error('Fehler beim Laden der Mandanten:', error)
    } finally {
      setLoading(false)
    }
  }

  // Wenn keine Mandanten vorhanden sind, zeige das Select nicht an
  if (!loading && mandanten.length === 0) {
    return null
  }

  return (
    <div className="flex items-center gap-2">
      <Building2 className="h-4 w-4 text-gray-500" />
      <Label htmlFor="mandant" className="text-sm font-medium text-gray-700">
        Mandant:
      </Label>
      <Select 
        value={value || 'alle'} 
        onValueChange={(val) => onChange(val === 'alle' ? null : val)}
        disabled={loading}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder={loading ? 'Lade...' : 'Mandant wählen'} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="alle">Alle Mandanten</SelectItem>
          {mandanten.map((mandant) => (
            <SelectItem key={mandant._id} value={mandant._id}>
              {mandant.kurzbezeichnung} - {mandant.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

