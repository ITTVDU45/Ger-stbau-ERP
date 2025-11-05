'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface AngebotErstellenDialogProps {
  anfrageId: string
  anfragenummer: string
  kundeName: string
  onSuccess: () => void
  children: React.ReactNode
}

export default function AngebotErstellenDialog({
  anfrageId,
  anfragenummer,
  kundeName,
  onSuccess,
  children
}: AngebotErstellenDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleConfirm = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/anfragen/${anfrageId}/angebot-erstellen`, {
        method: 'POST'
      })

      const data = await response.json()

      if (data.erfolg) {
        toast.success('Angebot erstellt', {
          description: `Angebot ${data.angebotsnummer} wurde erfolgreich erstellt`
        })
        setOpen(false)
        onSuccess()
        router.push(`/dashboard/admin/angebote/neu?id=${data.angebotId}`)
      } else {
        toast.error('Fehler', {
          description: data.fehler
        })
      }
    } catch (error) {
      console.error('Fehler beim Erstellen des Angebots:', error)
      toast.error('Fehler beim Erstellen des Angebots')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-gray-900">Angebot erstellen</DialogTitle>
          <DialogDescription className="text-gray-600">
            Möchten Sie ein Angebot für diese Anfrage erstellen?
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="rounded-md bg-blue-50 border border-blue-200 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-900 mb-2">
                  Angebotsinformationen
                </p>
                <div className="space-y-1 text-sm text-blue-800">
                  <div className="flex justify-between">
                    <span className="text-blue-700">Anfragenummer:</span>
                    <span className="font-semibold">{anfragenummer}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">Kunde:</span>
                    <span className="font-semibold">{kundeName}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <p className="text-sm text-gray-600 mt-4">
            Ein neues Angebot wird erstellt und Sie werden zur Bearbeitungsseite weitergeleitet.
          </p>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={loading}
            className="border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Abbrechen
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {loading ? 'Wird erstellt...' : 'Angebot erstellen'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

