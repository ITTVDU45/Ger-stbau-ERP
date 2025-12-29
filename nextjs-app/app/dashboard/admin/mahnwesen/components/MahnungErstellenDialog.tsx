'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { FileWarning } from 'lucide-react'
import { toast } from 'sonner'
import { MahnwesenSettings } from '@/lib/db/types'

interface MahnungErstellenDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export default function MahnungErstellenDialog({
  open,
  onOpenChange,
  onSuccess
}: MahnungErstellenDialogProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [ueberfaelligeRechnungen, setUeberfaelligeRechnungen] = useState<any[]>([])
  const [selectedRechnungId, setSelectedRechnungId] = useState('')
  const [selectedRechnung, setSelectedRechnung] = useState<any>(null)
  const [mahnstufe, setMahnstufe] = useState<number>(1)
  const [mahngebuehren, setMahngebuehren] = useState('5.00')
  const [verzugszinsen, setVerzugszinsen] = useState('0.00')
  const [zahlungsziel, setZahlungsziel] = useState('7')
  const [mahnungstext, setMahnungstext] = useState('')
  const [settings, setSettings] = useState<MahnwesenSettings | null>(null)

  useEffect(() => {
    if (open) {
      loadSettings()
      loadUeberfaelligeRechnungen()
    }
  }, [open])

  useEffect(() => {
    if (selectedRechnungId) {
      const rechnung = ueberfaelligeRechnungen.find(
        (r) => r.rechnung._id === selectedRechnungId
      )
      setSelectedRechnung(rechnung)

      if (rechnung) {
        // Setze vorgeschlagene Mahnstufe
        const vorgeschlageneMahnstufe = rechnung.vorgeschlageneMahnstufe || 1
        setMahnstufe(vorgeschlageneMahnstufe)
        
        // Setze vorgeschlagene Mahngebühren aus Einstellungen
        updateMahngebuehrenFromSettings(vorgeschlageneMahnstufe)

        // Generiere Standard-Mahnungstext
        const text = generateMahnungstext(rechnung, vorgeschlageneMahnstufe)
        setMahnungstext(text)
      }
    }
  }, [selectedRechnungId, ueberfaelligeRechnungen, settings])

  // Aktualisiere Mahnungstext und Gebühren, wenn Mahnstufe geändert wird
  useEffect(() => {
    if (selectedRechnung) {
      // Aktualisiere Mahngebühren aus Einstellungen
      updateMahngebuehrenFromSettings(mahnstufe)

      // Aktualisiere Mahnungstext
      const text = generateMahnungstext(selectedRechnung, mahnstufe)
      setMahnungstext(text)
    }
  }, [mahnstufe, selectedRechnung, settings])

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/settings/mahnwesen')
      const data = await response.json()

      if (data.erfolg && data.settings) {
        setSettings(data.settings)
        // Setze Verzugszinssatz aus Einstellungen
        if (data.settings.verzugszinssatz) {
          setVerzugszinsen(data.settings.verzugszinssatz.toString())
        }
      }
    } catch (error) {
      console.error('Fehler beim Laden der Einstellungen:', error)
    }
  }

  const updateMahngebuehrenFromSettings = (stufe: number) => {
    if (!settings) {
      // Fallback auf Standard-Werte
      const gebuehren = stufe === 1 ? '5.00' : stufe === 2 ? '15.00' : '25.00'
      setMahngebuehren(gebuehren)
      setZahlungsziel('7')
      return
    }

    // Hole Werte aus Einstellungen
    const gebuehrenField = `mahngebuehrenStufe${stufe}` as keyof MahnwesenSettings
    const fristField = `zahlungsfristStufe${stufe}` as keyof MahnwesenSettings
    
    const gebuehren = (settings[gebuehrenField] as number) || 0
    const frist = (settings[fristField] as number) || 7
    
    setMahngebuehren(gebuehren.toFixed(2))
    setZahlungsziel(frist.toString())
  }

  const loadUeberfaelligeRechnungen = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/mahnwesen/ueberfaellige-rechnungen')
      const data = await response.json()

      if (data.erfolg) {
        setUeberfaelligeRechnungen(data.rechnungen)
      }
    } catch (error) {
      console.error('Fehler:', error)
      toast.error('Fehler beim Laden der überfälligen Rechnungen')
    } finally {
      setLoading(false)
    }
  }

  const generateMahnungstext = (rechnung: any, mahnstufe: number) => {
    const rechnungsnummer = rechnung.rechnung.rechnungsnummer
    const betrag = rechnung.rechnung.brutto.toLocaleString('de-DE', {
      minimumFractionDigits: 2
    })

    // Verwende Standard-Text aus Einstellungen, falls vorhanden
    if (settings) {
      const textField = `standardTextStufe${mahnstufe}` as keyof MahnwesenSettings
      const standardText = settings[textField] as string
      if (standardText && standardText.trim() !== '') {
        return standardText
      }
    }

    // Fallback auf eingebaute Texte
    const texte = {
      1: `Sehr geehrte Damen und Herren,

wir möchten Sie darauf aufmerksam machen, dass die Zahlung für die Rechnung ${rechnungsnummer} über ${betrag} € noch aussteht.

Sollten Sie die Zahlung bereits veranlasst haben, betrachten Sie dieses Schreiben bitte als gegenstandslos.

Andernfalls bitten wir Sie, den offenen Betrag zuzüglich Mahngebühren innerhalb von ${zahlungsziel} Tagen zu begleichen.

Mit freundlichen Grüßen`,

      2: `Sehr geehrte Damen und Herren,

trotz unserer ersten Mahnung haben wir bis heute keine Zahlung für die Rechnung ${rechnungsnummer} über ${betrag} € erhalten.

Wir fordern Sie hiermit erneut auf, den offenen Betrag zuzüglich Mahngebühren innerhalb von ${zahlungsziel} Tagen zu begleichen.

Sollte die Zahlung auch diesmal ausbleiben, behalten wir uns weitere rechtliche Schritte vor.

Mit freundlichen Grüßen`,

      3: `Sehr geehrte Damen und Herren,

trotz mehrmaliger Mahnung haben wir bis heute keine Zahlung für die Rechnung ${rechnungsnummer} über ${betrag} € erhalten.

Dies ist unsere letzte Mahnung. Sollte die Zahlung nicht innerhalb von ${zahlungsziel} Tagen erfolgen, werden wir rechtliche Schritte einleiten und ein gerichtliches Mahnverfahren einleiten.

Die Kosten des Mahnverfahrens und weitere Verzugszinsen gehen zu Ihren Lasten.

Mit freundlichen Grüßen`
    }

    return texte[mahnstufe as 1 | 2 | 3] || texte[1]
  }

  const handleSubmit = async () => {
    if (!selectedRechnungId) {
      toast.error('Bitte wählen Sie eine Rechnung aus')
      return
    }

    if (!mahngebuehren || parseFloat(mahngebuehren) < 0) {
      toast.error('Bitte geben Sie gültige Mahngebühren ein')
      return
    }

    if (!mahnungstext.trim()) {
      toast.error('Bitte geben Sie einen Mahnungstext ein')
      return
    }

    try {
      setLoading(true)

      const response = await fetch('/api/mahnwesen', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          rechnungId: selectedRechnungId,
          mahnstufe: mahnstufe,
          mahngebuehren: parseFloat(mahngebuehren),
          verzugszinsen: parseFloat(verzugszinsen),
          zahlungsziel: parseInt(zahlungsziel),
          mahnungstext
        })
      })

      const data = await response.json()

      if (data.erfolg) {
        toast.success('Mahnung erfolgreich erstellt')
        onSuccess?.()
        onOpenChange(false)
        // Navigiere zur Mahnungsdetailseite
        router.push(`/dashboard/admin/mahnwesen/${data.mahnung._id}`)
      } else {
        toast.error(data.fehler || 'Fehler beim Erstellen der Mahnung')
      }
    } catch (error) {
      console.error('Fehler:', error)
      toast.error('Fehler beim Erstellen der Mahnung')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] bg-white flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="text-gray-900">Neue Mahnung erstellen</DialogTitle>
          <DialogDescription className="text-gray-600">
            Wählen Sie eine überfällige Rechnung aus und erstellen Sie eine Mahnung
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 overflow-y-auto flex-1 px-1">
          {/* Rechnung auswählen */}
          <div className="space-y-2">
            <Label htmlFor="rechnung" className="text-base font-semibold text-gray-900">
              Rechnung auswählen
            </Label>
            <Select value={selectedRechnungId} onValueChange={setSelectedRechnungId}>
              <SelectTrigger id="rechnung">
                <SelectValue placeholder="Bitte wählen Sie eine Rechnung..." />
              </SelectTrigger>
              <SelectContent>
                {ueberfaelligeRechnungen.length === 0 ? (
                  <div className="p-4 text-center text-gray-600">
                    <FileWarning className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p>Keine überfälligen Rechnungen gefunden</p>
                  </div>
                ) : (
                  ueberfaelligeRechnungen.map((item) => (
                    <SelectItem
                      key={item.rechnung._id}
                      value={item.rechnung._id}
                    >
                      {item.rechnung.rechnungsnummer} · {item.kunde?.firma || item.kunde?.nachname} · {item.rechnung.brutto.toLocaleString('de-DE', { minimumFractionDigits: 2 })} € · {item.tageUeberfaellig} Tage überfällig
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Rechnungsdetails */}
          {selectedRechnung && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Kunde</p>
                  <p className="font-medium text-gray-900">
                    {selectedRechnung.kunde?.firma || selectedRechnung.kunde?.nachname}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Projekt</p>
                  <p className="font-medium text-gray-900">
                    {selectedRechnung.projekt?.projektname || '-'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Rechnungsbetrag</p>
                  <p className="font-medium text-gray-900">
                    {selectedRechnung.rechnung.brutto.toLocaleString('de-DE', {
                      minimumFractionDigits: 2
                    })}{' '}
                    €
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Vorgeschlagene Mahnstufe</p>
                  <p className="font-medium text-gray-900">
                    Stufe {selectedRechnung.vorgeschlageneMahnstufe}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Mahnstufe auswählen */}
          {selectedRechnung && (
            <div className="space-y-2">
              <Label htmlFor="mahnstufe" className="text-base font-semibold text-gray-900">
                Mahnstufe
              </Label>
              <Select 
                value={mahnstufe.toString()} 
                onValueChange={(value) => setMahnstufe(parseInt(value))}
              >
                <SelectTrigger id="mahnstufe" className="bg-white border-gray-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Mahnung 1</SelectItem>
                  <SelectItem value="2">Mahnung 2</SelectItem>
                  <SelectItem value="3">Mahnung 3</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-600">
                Die Mahnstufe bestimmt den Text und die Höhe der Mahngebühren. Werte werden automatisch aus den Einstellungen geladen.
              </p>
            </div>
          )}

          {/* Finanzen */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="mahngebuehren" className="font-semibold text-gray-900">
                Mahngebühren (€)
              </Label>
              <Input
                id="mahngebuehren"
                type="number"
                step="0.01"
                value={mahngebuehren}
                onChange={(e) => setMahngebuehren(e.target.value)}
                className="bg-white border-gray-300 text-gray-900"
              />
              <p className="text-xs text-gray-500">
                {settings ? 'Aus Einstellungen geladen' : 'Standard-Wert'}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="verzugszinsen" className="font-semibold text-gray-900">
                Verzugszinsen (€)
              </Label>
              <Input
                id="verzugszinsen"
                type="number"
                step="0.01"
                value={verzugszinsen}
                onChange={(e) => setVerzugszinsen(e.target.value)}
                className="bg-white border-gray-300 text-gray-900"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="zahlungsziel" className="font-semibold text-gray-900">
                Zahlungsziel (Tage)
              </Label>
              <Input
                id="zahlungsziel"
                type="number"
                value={zahlungsziel}
                onChange={(e) => setZahlungsziel(e.target.value)}
                className="bg-white border-gray-300 text-gray-900"
              />
              <p className="text-xs text-gray-500">
                {settings ? 'Aus Einstellungen geladen' : 'Standard-Wert'}
              </p>
            </div>
          </div>

          {/* Mahnungstext */}
          <div className="space-y-2">
            <Label htmlFor="mahnungstext" className="font-semibold text-gray-900">
              Mahnungstext
            </Label>
            <Textarea
              id="mahnungstext"
              value={mahnungstext}
              onChange={(e) => setMahnungstext(e.target.value)}
              rows={12}
              className="font-mono text-sm resize-none bg-white border-gray-300 text-gray-900"
            />
            <p className="text-xs text-gray-500">
              {settings && settings[`standardTextStufe${mahnstufe}` as keyof MahnwesenSettings] 
                ? 'Standard-Text aus Einstellungen geladen' 
                : 'Standard-Text verwendet'}
            </p>
          </div>
        </div>

        <DialogFooter className="shrink-0 border-t pt-4 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Abbrechen
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !selectedRechnungId}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {loading ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Erstelle...
              </>
            ) : (
              'Mahnung erstellen'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

