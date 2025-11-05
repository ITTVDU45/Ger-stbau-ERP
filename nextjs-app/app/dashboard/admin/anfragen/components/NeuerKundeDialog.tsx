'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'

interface NeuerKundeDialogProps {
  onKundeErstellt: () => void
}

export default function NeuerKundeDialog({ onKundeErstellt }: NeuerKundeDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    firmenname: '',
    ansprechpartner: '',
    email: '',
    telefon: '',
    strasse: '',
    plz: '',
    ort: ''
  })

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async () => {
    if (!formData.firmenname) {
      toast.error('Validierung fehlgeschlagen', {
        description: 'Bitte geben Sie einen Firmennamen ein'
      })
      return
    }

    try {
      setLoading(true)
      const response = await fetch('/api/kunden', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          status: 'aktiv',
          typ: 'Geschäftskunde'
        })
      })

      const data = await response.json()

      if (data.erfolg) {
        toast.success('Kunde erfolgreich erstellt')
        setOpen(false)
        setFormData({
          firmenname: '',
          ansprechpartner: '',
          email: '',
          telefon: '',
          strasse: '',
          plz: '',
          ort: ''
        })
        onKundeErstellt()
      } else {
        toast.error('Fehler', {
          description: data.fehler
        })
      }
    } catch (error) {
      console.error('Fehler beim Erstellen des Kunden:', error)
      toast.error('Fehler beim Erstellen')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" className="border-gray-300 text-gray-700 hover:bg-gray-50">
          <Plus className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-white max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-gray-900">Neuen Kunden anlegen</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="firmenname" className="text-gray-900 font-medium">Firmenname *</Label>
            <Input
              id="firmenname"
              value={formData.firmenname}
              onChange={(e) => handleChange('firmenname', e.target.value)}
              placeholder="Musterfirma GmbH"
              className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ansprechpartner" className="text-gray-900 font-medium">Ansprechpartner</Label>
              <Input
                id="ansprechpartner"
                value={formData.ansprechpartner}
                onChange={(e) => handleChange('ansprechpartner', e.target.value)}
                placeholder="Max Mustermann"
                className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-900 font-medium">E-Mail</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="info@musterfirma.de"
                className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-500"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="telefon" className="text-gray-900 font-medium">Telefon</Label>
            <Input
              id="telefon"
              type="tel"
              value={formData.telefon}
              onChange={(e) => handleChange('telefon', e.target.value)}
              placeholder="+49 123 456789"
              className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-500"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="strasse" className="text-gray-900 font-medium">Straße</Label>
            <Input
              id="strasse"
              value={formData.strasse}
              onChange={(e) => handleChange('strasse', e.target.value)}
              placeholder="Musterstraße 123"
              className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-500"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="plz" className="text-gray-900 font-medium">PLZ</Label>
              <Input
                id="plz"
                value={formData.plz}
                onChange={(e) => handleChange('plz', e.target.value)}
                placeholder="12345"
                className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-500"
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="ort" className="text-gray-900 font-medium">Ort</Label>
              <Input
                id="ort"
                value={formData.ort}
                onChange={(e) => handleChange('ort', e.target.value)}
                placeholder="Musterstadt"
                className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              className="border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Abbrechen
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loading ? 'Wird erstellt...' : 'Kunde erstellen'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

