"use client"

import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog"
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, AlertCircle, Briefcase } from 'lucide-react'
import { Angebot } from '@/lib/db/types'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface StatusAenderungDialogProps {
  angebot: Angebot
  onUpdate: () => void
  children?: React.ReactNode
}

export default function StatusAenderungDialog({ angebot, onUpdate, children }: StatusAenderungDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleStatusAendern = async (status: 'angenommen' | 'abgelehnt') => {
    try {
      setLoading(true)
      const response = await fetch(`/api/angebote/${angebot._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...angebot,
          status
        })
      })

      if (!response.ok) {
        throw new Error('Fehler beim Aktualisieren des Status')
      }

      toast.success(`Angebot als ${status} markiert`)
      setOpen(false)
      onUpdate()
    } catch (error) {
      console.error('Fehler:', error)
      toast.error('Fehler beim Aktualisieren des Status')
    } finally {
      setLoading(false)
    }
  }

  const handleInProjektUmwandeln = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/angebote/${angebot._id}/zu-projekt`, {
        method: 'POST'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.fehler || error.error || 'Fehler beim Erstellen des Projekts')
      }

      const data = await response.json()
      toast.success('Projekt erfolgreich erstellt', {
        description: `Projektnummer: ${data.projektnummer}`
      })
      setOpen(false)
      
      // Weiterleitung zur Projektdetailseite
      router.push(`/dashboard/admin/projekte/${data.projektId}`)
    } catch (error: any) {
      console.error('Fehler beim Erstellen des Projekts:', error)
      toast.error(error.message || 'Fehler beim Erstellen des Projekts')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm" className="text-blue-600 border-blue-300 hover:bg-blue-50">
            <CheckCircle className="h-4 w-4 mr-2" />
            Status ändern
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-gray-900">Angebotsstatus ändern</DialogTitle>
          <DialogDescription className="text-gray-600">
            Angebot {angebot.angebotsnummer} für {angebot.kundeName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Info Alert */}
          <Alert className="bg-blue-50 border-blue-200">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-900">
              Markieren Sie das Angebot als angenommen oder abgelehnt. Angenommene Angebote können zu einem Projekt umgewandelt werden.
            </AlertDescription>
          </Alert>

          {/* Angebotsinformationen */}
          <div className="rounded-md border border-gray-200 p-4 bg-gray-50">
            <div className="grid gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Angebotsnummer:</span>
                <span className="font-semibold text-gray-900">{angebot.angebotsnummer}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Kunde:</span>
                <span className="font-semibold text-gray-900">{angebot.kundeName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Summe (Brutto):</span>
                <span className="font-semibold text-gray-900">
                  {angebot.brutto.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Aktueller Status:</span>
                <span className="font-semibold text-gray-900 capitalize">{angebot.status}</span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-col gap-2">
          {/* Button: Als angenommen markieren */}
          <Button
            onClick={() => handleStatusAendern('angenommen')}
            disabled={loading || angebot.status === 'angenommen'}
            className="w-full bg-green-600 hover:bg-green-700 text-white"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Als angenommen markieren
          </Button>

          {/* Button: In Projekt umwandeln (nur wenn angenommen) */}
          {angebot.status === 'angenommen' && (
            <Button
              onClick={handleInProjektUmwandeln}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Briefcase className="h-4 w-4 mr-2" />
              In Projekt umwandeln
            </Button>
          )}

          {/* Button: Als abgelehnt markieren */}
          <Button
            onClick={() => handleStatusAendern('abgelehnt')}
            disabled={loading || angebot.status === 'abgelehnt'}
            variant="outline"
            className="w-full border-red-300 text-red-600 hover:bg-red-50"
          >
            <AlertCircle className="h-4 w-4 mr-2" />
            Als abgelehnt markieren
          </Button>

          <Button
            onClick={() => setOpen(false)}
            variant="ghost"
            disabled={loading}
            className="w-full"
          >
            Abbrechen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}


