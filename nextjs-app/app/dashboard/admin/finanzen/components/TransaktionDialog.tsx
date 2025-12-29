'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { Loader2, Upload, Sparkles, Paperclip, X, Plus, FileText, ExternalLink } from 'lucide-react'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import KategorieErstellenDialog from './KategorieErstellenDialog'

interface TransaktionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  typ: 'einnahme' | 'ausgabe'
  mandantId?: string | null
  transaktion?: any // Für Edit-Modus
  onSuccess?: () => void
}

export default function TransaktionDialog({
  open,
  onOpenChange,
  typ,
  mandantId,
  transaktion,
  onSuccess
}: TransaktionDialogProps) {
  const [loading, setLoading] = useState(false)
  const [kategorien, setKategorien] = useState<any[]>([])
  const [alleKategorien, setAlleKategorien] = useState<any[]>([]) // Alle Kategorien (Einnahme + Ausgabe)
  const [kunden, setKunden] = useState<any[]>([])
  const [projekte, setProjekte] = useState<any[]>([])
  const [rechnungen, setRechnungen] = useState<any[]>([])

  // NEU: Dokumente & KI
  const [dokumente, setDokumente] = useState<any[]>(transaktion?.dokumente || [])
  const [kiAuslese, setKiAuslese] = useState(false)
  const [kiLoading, setKiLoading] = useState(false)
  const [kiConfidence, setKiConfidence] = useState(0)
  const [kategorieDialogOpen, setKategorieDialogOpen] = useState(false)
  const [uploadLoading, setUploadLoading] = useState(false)
  const [kiBildUrl, setKiBildUrl] = useState<string | null>(null)
  const [kiDateiName, setKiDateiName] = useState<string | null>(null)
  const [kiDateiTyp, setKiDateiTyp] = useState<string | null>(null)
  const [kiDatenRaw, setKiDatenRaw] = useState<any>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [dokumentToDelete, setDokumentToDelete] = useState<number | null>(null)

  const [formData, setFormData] = useState({
    typ,
    datum: transaktion?.datum || new Date().toISOString().split('T')[0],
    betrag: transaktion?.betrag || '',
    nettobetrag: transaktion?.nettobetrag || '',
    mwstSatz: transaktion?.mwstSatz || '19',
    mwstBetrag: transaktion?.mwstBetrag || '',
    kategorieId: transaktion?.kategorieId || '',
    beschreibung: transaktion?.beschreibung || '',
    zahlungsart: transaktion?.zahlungsart || 'ueberweisung',
    kundeId: transaktion?.kundeId || '',
    projektId: transaktion?.projektId || '',
    rechnungId: transaktion?.rechnungId || '',
    steuerrelevant: transaktion?.steuerrelevant ?? true,
    notizen: transaktion?.notizen || ''
  })

  const [berechnungsRichtung, setBerechnungsRichtung] = useState<'brutto' | 'netto'>('brutto')

  // Helper: Prüfen ob Personal-Kategorie ausgewählt
  const istPersonalKategorie = kategorien.find(k => k._id === formData.kategorieId)?.name === 'Personal'

  // Formular aktualisieren wenn transaktion sich ändert
  useEffect(() => {
    if (transaktion) {
      setFormData({
        typ: transaktion.typ,
        datum: transaktion.datum ? new Date(transaktion.datum).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        betrag: transaktion.betrag?.toString() || '',
        nettobetrag: transaktion.nettobetrag?.toString() || '',
        mwstSatz: transaktion.mwstSatz?.toString() || '19',
        mwstBetrag: transaktion.mwstBetrag?.toString() || '',
        kategorieId: transaktion.kategorieId || '',
        beschreibung: transaktion.beschreibung || '',
        zahlungsart: transaktion.zahlungsart || 'ueberweisung',
        kundeId: transaktion.kundeId || '',
        projektId: transaktion.projektId || '',
        rechnungId: transaktion.rechnungId || '',
        steuerrelevant: transaktion.steuerrelevant ?? true,
        notizen: transaktion.notizen || ''
      })
      setDokumente(transaktion.dokumente || [])
      setKiAuslese(transaktion.kiAusgelesen || false)
      setKiConfidence(transaktion.kiAusleseDaten?.confidence || 0)
    }
  }, [transaktion])

  useEffect(() => {
    if (open) {
      loadKategorien() // Lädt Kategorien für aktuellen Typ
      loadAlleKategorien() // Lädt auch ALLE Kategorien für KI-Auslese
      loadKunden()
      loadProjekte()
      if (typ === 'einnahme') {
        loadRechnungen()
      }
    }
  }, [open, typ])

  // Auto-Set MwSt-Satz auf 40% und entferne Verknüpfungen wenn Personal-Kategorie ausgewählt
  useEffect(() => {
    if (istPersonalKategorie) {
      if (formData.mwstSatz !== '40' || formData.kundeId || formData.projektId || formData.rechnungId) {
        setFormData(prev => ({
          ...prev,
          mwstSatz: '40',
          kundeId: '',
          projektId: '',
          rechnungId: ''
        }))
      }
    }
  }, [istPersonalKategorie])

  useEffect(() => {
    // Auto-Berechnung MwSt
    if (berechnungsRichtung === 'brutto' && formData.betrag && formData.mwstSatz) {
      const brutto = parseFloat(formData.betrag)
      const mwstSatz = parseFloat(formData.mwstSatz)
      const netto = brutto / (1 + mwstSatz / 100)
      const mwstBetrag = brutto - netto

      setFormData(prev => ({
        ...prev,
        nettobetrag: netto.toFixed(2),
        mwstBetrag: mwstBetrag.toFixed(2)
      }))
    } else if (berechnungsRichtung === 'netto' && formData.nettobetrag && formData.mwstSatz) {
      const netto = parseFloat(formData.nettobetrag)
      const mwstSatz = parseFloat(formData.mwstSatz)
      const brutto = netto * (1 + mwstSatz / 100)
      const mwstBetrag = brutto - netto

      setFormData(prev => ({
        ...prev,
        betrag: brutto.toFixed(2),
        mwstBetrag: mwstBetrag.toFixed(2)
      }))
    }
  }, [formData.betrag, formData.nettobetrag, formData.mwstSatz, berechnungsRichtung])

  const loadKategorien = async (spezifischerTyp?: 'einnahme' | 'ausgabe') => {
    try {
      const zielTyp = spezifischerTyp || typ
      const res = await fetch(`/api/finanzen/kategorien?typ=${zielTyp}&aktiv=true`)
      const data = await res.json()
      if (data.erfolg) {
        setKategorien(data.kategorien)
        console.log(`📋 ${data.kategorien.length} ${zielTyp}-Kategorien geladen:`, data.kategorien.map((k: any) => k.name).join(', '))
        return data.kategorien // Gib Kategorien zurück für sofortige Verwendung
      }
      return []
    } catch (error) {
      console.error('Fehler beim Laden der Kategorien:', error)
      return []
    }
  }

  const loadAlleKategorien = async () => {
    try {
      // Lade BEIDE Typen für KI-Auslese
      const [einnahmeRes, ausgabeRes] = await Promise.all([
        fetch('/api/finanzen/kategorien?typ=einnahme&aktiv=true'),
        fetch('/api/finanzen/kategorien?typ=ausgabe&aktiv=true')
      ])
      
      const [einnahmeData, ausgabeData] = await Promise.all([
        einnahmeRes.json(),
        ausgabeRes.json()
      ])
      
      const alle = [
        ...(einnahmeData.erfolg ? einnahmeData.kategorien.map((k: any) => ({ ...k, kategorieTyp: 'einnahme' })) : []),
        ...(ausgabeData.erfolg ? ausgabeData.kategorien.map((k: any) => ({ ...k, kategorieTyp: 'ausgabe' })) : [])
      ]
      
      setAlleKategorien(alle)
      console.log(`📋 ${alle.length} Kategorien (Einnahme + Ausgabe) geladen`)
      return alle
    } catch (error) {
      console.error('Fehler beim Laden aller Kategorien:', error)
      return []
    }
  }

  const loadKunden = async () => {
    try {
      const res = await fetch('/api/kunden')
      const data = await res.json()
      if (data.success) setKunden(data.kunden)
    } catch (error) {
      console.error('Fehler beim Laden der Kunden:', error)
    }
  }

  const loadProjekte = async () => {
    try {
      const res = await fetch('/api/projekte')
      const data = await res.json()
      if (data.success) setProjekte(data.projekte)
    } catch (error) {
      console.error('Fehler beim Laden der Projekte:', error)
    }
  }

  const loadRechnungen = async () => {
    try {
      const res = await fetch('/api/rechnungen')
      const data = await res.json()
      if (data.success) setRechnungen(data.rechnungen)
    } catch (error) {
      console.error('Fehler beim Laden der Rechnungen:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Validierung
      if (!formData.kategorieId) {
        toast.error('Bitte wählen Sie eine Kategorie')
        return
      }
      if (!formData.betrag || parseFloat(formData.betrag) <= 0) {
        toast.error('Bitte geben Sie einen gültigen Betrag ein')
        return
      }
      if (!formData.beschreibung) {
        toast.error('Bitte geben Sie eine Beschreibung ein')
        return
      }

      // Kategorie-Namen ermitteln
      const kategorie = kategorien.find(k => k._id === formData.kategorieId)
      const kunde = kunden.find(k => k._id === formData.kundeId)
      const projekt = projekte.find(p => p._id === formData.projektId)
      const rechnung = rechnungen.find(r => r._id === formData.rechnungId)

      const payload = {
        mandantId,
        typ,
        datum: new Date(formData.datum),
        betrag: parseFloat(formData.betrag),
        nettobetrag: formData.nettobetrag ? parseFloat(formData.nettobetrag) : undefined,
        mwstSatz: formData.mwstSatz ? parseFloat(formData.mwstSatz) : undefined,
        mwstBetrag: formData.mwstBetrag ? parseFloat(formData.mwstBetrag) : undefined,
        kategorieId: formData.kategorieId,
        kategorieName: kategorie?.name || 'Unbekannt',
        beschreibung: formData.beschreibung,
        zahlungsart: formData.zahlungsart,
        kundeId: formData.kundeId || undefined,
        kundeName: kunde?.name || undefined,
        projektId: formData.projektId || undefined,
        projektName: projekt?.name || undefined,
        rechnungId: formData.rechnungId || undefined,
        rechnungsnummer: rechnung?.rechnungsnummer || undefined,
        status: 'gebucht',
        istWiederkehrend: false,
        quelle: kiAuslese ? 'ki_automatisch' : 'manuell',
        steuerrelevant: formData.steuerrelevant,
        notizen: formData.notizen || undefined,
        // NEU: Dokumente
        dokumente: dokumente.length > 0 ? dokumente : undefined,
        // NEU: KI-Auslese Daten
        kiAusgelesen: kiAuslese,
        kiAusleseDaten: kiAuslese ? {
          confidence: kiConfidence,
          extrahierteDaten: formData,
          verarbeitetAm: new Date()
        } : undefined,
        erstelltVon: 'user-id' // TODO: aus Session
      }

      const url = transaktion
        ? `/api/finanzen/transaktionen/${transaktion._id}`
        : '/api/finanzen/transaktionen'
      
      const method = transaktion ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await res.json()

      if (data.erfolg) {
        toast.success(transaktion ? 'Transaktion aktualisiert' : 'Transaktion erstellt')
        onSuccess?.()
        onOpenChange(false)
        resetForm()
      } else {
        toast.error(data.fehler || 'Fehler beim Speichern')
      }
    } catch (error) {
      console.error('Fehler:', error)
      toast.error('Fehler beim Speichern der Transaktion')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      typ,
      datum: new Date().toISOString().split('T')[0],
      betrag: '',
      nettobetrag: '',
      mwstSatz: '19',
      mwstBetrag: '',
      kategorieId: '',
      beschreibung: '',
      zahlungsart: 'ueberweisung',
      kundeId: '',
      projektId: '',
      rechnungId: '',
      steuerrelevant: true,
      notizen: ''
    })
    setBerechnungsRichtung('brutto')
    setDokumente([])
    setKiAuslese(false)
    setKiConfidence(0)
    setKiBildUrl(null)
    setKiDateiName(null)
    setKiDateiTyp(null)
    setKiDatenRaw(null)
    setKiBildUrl(null)
    setKiDatenRaw(null)
  }

  // NEU: Dokumenten-Upload Handler
  const handleDokumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploadLoading(true)
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('uploadedBy', 'current-user') // TODO: aus Session

        const res = await fetch('/api/finanzen/upload', {
          method: 'POST',
          body: formData
        })

        const data = await res.json()

        if (res.ok && data.erfolg) {
          setDokumente(prev => [...prev, data.dokument])
          toast.success(`${file.name} hochgeladen`)
        } else {
          toast.error(`Fehler beim Hochladen von ${file.name}: ${data.fehler}`)
        }
      }
    } catch (error) {
      console.error('Upload-Fehler:', error)
      toast.error('Fehler beim Hochladen der Dateien')
    } finally {
      setUploadLoading(false)
      // Input zurücksetzen
      e.target.value = ''
    }
  }

  // NEU: Öffne Bestätigungs-Dialog für Dokument-Löschung
  const handleDokumentEntfernenClick = (index: number) => {
    setDokumentToDelete(index)
    setDeleteConfirmOpen(true)
  }

  // NEU: Dokument tatsächlich entfernen (nach Bestätigung)
  const confirmDokumentEntfernen = async () => {
    if (dokumentToDelete === null) return
    
    const dokument = dokumente[dokumentToDelete]
    
    // Wenn das Dokument bereits gespeichert ist (_id vorhanden), aus MinIO löschen
    if (dokument._id) {
      try {
        // Optional: Vom Server löschen (falls Sie das möchten)
        // await fetch(`/api/finanzen/dokumente/${dokument._id}`, { method: 'DELETE' })
        
        // Warnung bei bereits gespeichertem Dokument
        toast.warning('Dokument wird beim Speichern der Transaktion entfernt')
      } catch (error) {
        console.error('Fehler beim Löschen:', error)
        toast.error('Fehler beim Löschen des Dokuments')
        setDeleteConfirmOpen(false)
        setDokumentToDelete(null)
        return
      }
    }
    
    // Aus lokaler Liste entfernen
    setDokumente(prev => prev.filter((_, i) => i !== dokumentToDelete))
    toast.success('Dokument entfernt')
    
    // Dialog schließen
    setDeleteConfirmOpen(false)
    setDokumentToDelete(null)
  }

  // NEU: KI-Bild/PDF Upload & Auslese
  const handleKIBildUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setKiLoading(true)
    setKiAuslese(false)

    try {
      // Sicherstellen, dass ALLE Kategorien geladen sind (Einnahme + Ausgabe)
      let aktuelleKategorien = alleKategorien
      if (alleKategorien.length === 0) {
        console.log('📥 Lade ALLE Kategorien (Einnahme + Ausgabe) vor KI-Auslese...')
        aktuelleKategorien = await loadAlleKategorien()
        console.log(`✅ ${aktuelleKategorien.length} Kategorien geladen`)
      } else {
        console.log(`✅ Alle Kategorien bereits geladen: ${alleKategorien.length} Kategorien`)
      }
      
      // Datei-Info speichern
      setKiDateiName(file.name)
      setKiDateiTyp(file.type)

      // 1. Datei für Vorschau speichern (nur bei Bildern)
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onloadend = () => {
          setKiBildUrl(reader.result as string)
        }
        reader.readAsDataURL(file)
      } else {
        // Für PDF kein Vorschaubild
        setKiBildUrl(null)
      }

      // 2. KI-Auslese durchführen
      const formDataKI = new FormData()
      formDataKI.append('file', file)
      formDataKI.append('typ', typ)

      const resKI = await fetch('/api/finanzen/ki-auslese', {
        method: 'POST',
        body: formDataKI
      })

      const dataKI = await resKI.json()

      // Fehlerbehandlung für KI-Auslese
      if (!resKI.ok || !dataKI.erfolg) {
        // Zeige spezifische Fehlermeldung vom Server
        const errorMessage = dataKI.fehler || 'KI-Auslese fehlgeschlagen'
        toast.error(errorMessage, { duration: 6000 })
        setKiLoading(false)
        return
      }

      if (dataKI.erfolg) {
        // 3. Original-Datei hochladen und speichern
        const formDataUpload = new FormData()
        formDataUpload.append('file', file)
        formDataUpload.append('uploadedBy', 'current-user') // TODO: aus Session

        const resUpload = await fetch('/api/finanzen/upload', {
          method: 'POST',
          body: formDataUpload
        })

        const dataUpload = await resUpload.json()

        if (resUpload.ok && dataUpload.erfolg) {
          setDokumente([dataUpload.dokument])
        }

        // 4. KI-Daten speichern
        setKiDatenRaw(dataKI.daten)

        // 5. Erkannten Typ verwenden (falls vorhanden)
        const erkannterTyp = dataKI.daten.typ || typ
        console.log(`🔍 Erkannter Typ: "${erkannterTyp}" (Original-Typ: "${typ}")`)
        
        // Wenn erkannter Typ anders ist, lade richtige Kategorien nach
        if (erkannterTyp !== typ) {
          console.log(`⚠️ Typ-Wechsel erkannt: ${typ} → ${erkannterTyp}. Lade passende Kategorien...`)
          const neueKategorien = await loadKategorien(erkannterTyp as 'einnahme' | 'ausgabe')
          aktuelleKategorien = neueKategorien
          // Aktualisiere auch die aktuell angezeigten Kategorien im Dropdown
          setKategorien(neueKategorien)
          // Typ wird später im finalen setFormData gesetzt
        }
        
        // Filtere Kategorien nach erkanntem Typ
        const relevanteKategorien = aktuelleKategorien.filter(k => 
          k.kategorieTyp === erkannterTyp || !k.kategorieTyp // Falls kategorieTyp nicht gesetzt (alte Daten)
        )
        
        // 6. Suche nach passender Kategorie
        let kategorieId = formData.kategorieId
        if (dataKI.daten.kategorieVorschlag && relevanteKategorien.length > 0) {
          const vorschlag = dataKI.daten.kategorieVorschlag.toLowerCase().trim()
          
          console.log(`🔍 Suche Kategorie für Vorschlag: "${dataKI.daten.kategorieVorschlag}"`)
          console.log(`📋 Verfügbare ${erkannterTyp}-Kategorien (${relevanteKategorien.length}):`, relevanteKategorien.map(k => k.name).join(', '))
          
          // Versuche exakte Übereinstimmung (case-insensitive)
          let passendeKategorie = relevanteKategorien.find(k => 
            k.name.toLowerCase().trim() === vorschlag
          )
          
          // Falls keine exakte Übereinstimmung, versuche partielle Übereinstimmung
          if (!passendeKategorie) {
            passendeKategorie = relevanteKategorien.find(k => {
              const katName = k.name.toLowerCase().trim()
              return katName.includes(vorschlag) || vorschlag.includes(katName)
            })
          }
          
          // Falls immer noch keine Übereinstimmung, versuche Wort für Wort
          if (!passendeKategorie) {
            const vorschlagWorte = vorschlag.split(/\s+/)
            passendeKategorie = relevanteKategorien.find(k => {
              const katName = k.name.toLowerCase().trim()
              return vorschlagWorte.some((wort: string) => katName.includes(wort) || wort.includes(katName))
            })
          }
          
          if (passendeKategorie) {
            kategorieId = passendeKategorie._id
            console.log(`✅ Kategorie gefunden: "${passendeKategorie.name}" (Typ: ${erkannterTyp}, ID: ${kategorieId})`)
            console.log(`✅ kategorieId gesetzt:`, kategorieId)
            toast.success(`${erkannterTyp === 'einnahme' ? 'Einnahme' : 'Ausgabe'} erkannt! Kategorie: ${passendeKategorie.name}`)
          } else {
            console.log(`⚠️ Keine passende Kategorie für "${dataKI.daten.kategorieVorschlag}" gefunden`)
            console.log(`⚠️ kategorieId bleibt leer:`, kategorieId)
            toast.warning(`Kategorie "${dataKI.daten.kategorieVorschlag}" nicht gefunden. Bitte manuell auswählen.`)
          }
        } else if (dataKI.daten.kategorieVorschlag && relevanteKategorien.length === 0) {
          console.log('⚠️ Keine Kategorien für Typ verfügbar')
          toast.warning('Bitte wählen Sie eine Kategorie manuell aus')
        }

        // 6. Datum-Logik: Wenn Datum älter als 1 Jahr, verwende heutiges Datum
        let verwendetesDatum = dataKI.daten.datum || formData.datum
        if (dataKI.daten.datum) {
          const belegDatum = new Date(dataKI.daten.datum)
          const heute = new Date()
          const einJahrZurueck = new Date()
          einJahrZurueck.setFullYear(heute.getFullYear() - 1)
          
          if (belegDatum < einJahrZurueck) {
            verwendetesDatum = heute.toISOString().split('T')[0]
            console.log(`⏰ Datum ${dataKI.daten.datum} ist älter als 1 Jahr, verwende heutiges Datum: ${verwendetesDatum}`)
            toast.info(`Hinweis: Belegdatum (${dataKI.daten.datum}) wurde auf heute (${verwendetesDatum}) gesetzt`)
          }
        }

        // 7. Formular mit KI-Daten vorausfüllen
        const neueFormDaten = {
          ...formData,
          typ: erkannterTyp, // WICHTIG: Erkannten Typ setzen!
          datum: verwendetesDatum,
          betrag: dataKI.daten.bruttobetrag?.toString() || formData.betrag,
          nettobetrag: dataKI.daten.nettobetrag?.toString() || formData.nettobetrag,
          mwstSatz: dataKI.daten.mwstSatz?.toString() || formData.mwstSatz,
          mwstBetrag: dataKI.daten.mwstBetrag?.toString() || formData.mwstBetrag,
          beschreibung: `${dataKI.daten.name || ''} ${dataKI.daten.beschreibung || ''}`.trim() || formData.beschreibung,
          zahlungsart: dataKI.daten.zahlungsart || formData.zahlungsart,
          kategorieId: kategorieId || formData.kategorieId
        }
        
        console.log('📝 Setze Formular-Daten:', {
          typ: neueFormDaten.typ,
          kategorieId: neueFormDaten.kategorieId,
          betrag: neueFormDaten.betrag,
          beschreibung: neueFormDaten.beschreibung?.substring(0, 50) + '...'
        })
        
        // WICHTIG: Prüfe ob kategorieId gesetzt ist
        if (!neueFormDaten.kategorieId) {
          console.error('❌ FEHLER: kategorieId ist leer!', {
            kategorieId,
            formDataKategorieId: formData.kategorieId,
            relevanteKategorienCount: relevanteKategorien.length,
            kategorieVorschlag: dataKI.daten.kategorieVorschlag
          })
        }
        
        setFormData(neueFormDaten)
        
        setKiAuslese(true)
        setKiConfidence(dataKI.confidence)
        
        // Erfolgs-Toast mit Details
        const kategorieName = relevanteKategorien.find(k => k._id === kategorieId)?.name
        const typAnzeige = erkannterTyp === 'einnahme' ? 'Einnahme' : 'Ausgabe'
        if (kategorieName) {
          toast.success(`${typAnzeige} erkannt! Kategorie: ${kategorieName}, Betrag: ${dataKI.daten.bruttobetrag} €`)
        } else {
          toast.success(`${typAnzeige} ausgelesen (Konfidenz: ${Math.round(dataKI.confidence * 100)}%)`)
        }
        
        // Hinweis bei niedriger Konfidenz
        if (dataKI.confidence < 0.7) {
          toast.warning('Niedrige Konfidenz - Bitte Daten sorgfältig prüfen')
        }
      } else {
        toast.error(dataKI.fehler || 'Fehler bei KI-Auslese')
      }
    } catch (error) {
      console.error('KI-Auslese Fehler:', error)
      toast.error('Fehler bei der KI-gestützten Auslese')
    } finally {
      setKiLoading(false)
      // Input NICHT zurücksetzen, damit Vorschau bleibt
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(open) => {
        onOpenChange(open)
        if (!open) resetForm()
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {transaktion ? 'Transaktion bearbeiten' : `Neue ${typ === 'einnahme' ? 'Einnahme' : 'Ausgabe'}`}
            </DialogTitle>
            <DialogDescription>
              {transaktion 
                ? 'Bearbeiten Sie die Details dieser Transaktion.' 
                : `Erfassen Sie eine neue ${typ === 'einnahme' ? 'Einnahme' : 'Ausgabe'} manuell oder per KI-gestützter Belegerfassung.`
              }
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="manuell" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="manuell">
                <Paperclip className="w-4 h-4 mr-2" />
                Manuelle Eingabe
              </TabsTrigger>
              <TabsTrigger value="ki">
                <Sparkles className="w-4 h-4 mr-2" />
                KI-gestützte Erfassung
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: Manuelle Eingabe */}
            <TabsContent value="manuell">
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Datum */}
                <div>
                  <Label htmlFor="datum">Datum *</Label>
                  <Input
                    id="datum"
                    type="date"
                    value={formData.datum}
                    onChange={(e) => setFormData(prev => ({ ...prev, datum: e.target.value }))}
                    required
                  />
                </div>

                {/* Kategorie mit + Button */}
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <Label htmlFor="kategorie">Kategorie *</Label>
                    <Select value={formData.kategorieId} onValueChange={(value) => setFormData(prev => ({ ...prev, kategorieId: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Kategorie wählen" />
                      </SelectTrigger>
                      <SelectContent>
                        {kategorien.map(kat => (
                          <SelectItem key={kat._id} value={kat._id}>
                            {kat.icon} {kat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="mt-6"
                    onClick={() => setKategorieDialogOpen(true)}
                    title="Neue Kategorie erstellen"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

          {/* Beträge & MwSt */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="berechnungsRichtung">Berechnung</Label>
              <Select value={berechnungsRichtung} onValueChange={(v: any) => setBerechnungsRichtung(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="brutto">Von Brutto</SelectItem>
                  <SelectItem value="netto">Von Netto</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="mwstSatz">
                {istPersonalKategorie ? 'Lohnnebenkosten (%)' : 'MwSt-Satz (%)'}
              </Label>
              {istPersonalKategorie ? (
                <Input
                  id="mwstSatz"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.mwstSatz}
                  onChange={(e) => setFormData(prev => ({ ...prev, mwstSatz: e.target.value }))}
                  placeholder="z.B. 40"
                />
              ) : (
                <Select value={formData.mwstSatz} onValueChange={(value) => setFormData(prev => ({ ...prev, mwstSatz: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0% (Keine MwSt)</SelectItem>
                    <SelectItem value="7">7% (Ermäßigt)</SelectItem>
                    <SelectItem value="19">19% (Standard)</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="betrag">
                {istPersonalKategorie ? 'Gesamtkosten (€) *' : 'Bruttobetrag (€) *'}
              </Label>
              <Input
                id="betrag"
                type="number"
                step="0.01"
                value={formData.betrag}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, betrag: e.target.value }))
                  setBerechnungsRichtung('brutto')
                }}
                disabled={berechnungsRichtung === 'netto'}
                required
              />
            </div>
            <div>
              <Label htmlFor="nettobetrag">
                {istPersonalKategorie ? 'Grundlohn (€)' : 'Nettobetrag (€)'}
              </Label>
              <Input
                id="nettobetrag"
                type="number"
                step="0.01"
                value={formData.nettobetrag}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, nettobetrag: e.target.value }))
                  setBerechnungsRichtung('netto')
                }}
                disabled={berechnungsRichtung === 'brutto'}
              />
            </div>
            <div>
              <Label htmlFor="mwstBetrag">
                {istPersonalKategorie ? 'Lohnnebenkosten (€)' : 'MwSt-Betrag (€)'}
              </Label>
              <Input
                id="mwstBetrag"
                type="number"
                step="0.01"
                value={formData.mwstBetrag}
                disabled
              />
            </div>
          </div>

          {/* Beschreibung */}
          <div>
            <Label htmlFor="beschreibung">Beschreibung *</Label>
            <Textarea
              id="beschreibung"
              value={formData.beschreibung}
              onChange={(e) => setFormData(prev => ({ ...prev, beschreibung: e.target.value }))}
              rows={3}
              required
            />
          </div>

          {/* Zahlungsart */}
          <div>
            <Label htmlFor="zahlungsart">Zahlungsart</Label>
            <Select value={formData.zahlungsart} onValueChange={(value) => setFormData(prev => ({ ...prev, zahlungsart: value }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ueberweisung">Überweisung</SelectItem>
                <SelectItem value="bar">Bar</SelectItem>
                <SelectItem value="karte">Karte</SelectItem>
                <SelectItem value="paypal">PayPal</SelectItem>
                <SelectItem value="lastschrift">Lastschrift</SelectItem>
                <SelectItem value="sonstige">Sonstige</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Hinweis bei Personal-Kategorie */}
          {istPersonalKategorie && typ === 'ausgabe' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="bg-blue-100 rounded-full p-2 shrink-0">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-blue-900 mb-1">Personalkosten-Modus</p>
                  <p className="text-xs text-blue-700">
                    Bei Personalkosten werden die Lohnnebenkosten automatisch mit {formData.mwstSatz}% berechnet. 
                    Kunden- und Projektverknüpfungen sind für allgemeine Personalkosten nicht verfügbar.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Verknüpfungen - nur anzeigen wenn nicht Personal */}
          {!istPersonalKategorie && (
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="kunde">Kunde (optional)</Label>
                <Select value={formData.kundeId || undefined} onValueChange={(value) => setFormData(prev => ({ ...prev, kundeId: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Kunde wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {kunden.map(kunde => (
                      <SelectItem key={kunde._id} value={kunde._id}>{kunde.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="projekt">Projekt (optional)</Label>
                <Select value={formData.projektId || undefined} onValueChange={(value) => setFormData(prev => ({ ...prev, projektId: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Projekt wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {projekte.map(projekt => (
                      <SelectItem key={projekt._id} value={projekt._id}>{projekt.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {typ === 'einnahme' && (
                <div>
                  <Label htmlFor="rechnung">Rechnung (optional)</Label>
                  <Select value={formData.rechnungId || undefined} onValueChange={(value) => setFormData(prev => ({ ...prev, rechnungId: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Rechnung wählen" />
                    </SelectTrigger>
                    <SelectContent>
                      {rechnungen.map(rechnung => (
                        <SelectItem key={rechnung._id} value={rechnung._id}>
                          {rechnung.rechnungsnummer}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

                {/* Notizen */}
                <div>
                  <Label htmlFor="notizen">Notizen (optional)</Label>
                  <Textarea
                    id="notizen"
                    value={formData.notizen}
                    onChange={(e) => setFormData(prev => ({ ...prev, notizen: e.target.value }))}
                    rows={2}
                  />
                </div>

                {/* NEU: Dokumenten-Upload */}
                <div className="space-y-2 border-t pt-4">
                  <Label>Dokumente anhängen (optional)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      multiple
                      accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx,.xls,.xlsx"
                      onChange={handleDokumentUpload}
                      className="flex-1"
                      disabled={uploadLoading}
                    />
                    {uploadLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  </div>
                  
                  {dokumente.length > 0 && (
                    <div className="space-y-2 mt-2">
                      {dokumente.map((dok, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded border border-gray-200 hover:bg-gray-100 transition-colors">
                          <div className="flex items-center gap-3 flex-1">
                            <FileText className="w-5 h-5 text-blue-600" />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-900 truncate">{dok.filename}</div>
                              <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                                <span>{(dok.size / 1024).toFixed(1)} KB</span>
                                {dok.uploadedAt && (
                                  <>
                                    <span>•</span>
                                    <span>{format(new Date(dok.uploadedAt), 'dd.MM.yyyy HH:mm', { locale: de })}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            {dok._id && (
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => window.open(`/api/finanzen/dokumente/${dok._id}`, '_blank')}
                                title="Dokument öffnen"
                              >
                                <ExternalLink className="w-4 h-4 text-blue-600" />
                              </Button>
                            )}
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDokumentEntfernenClick(i)}
                              title="Dokument entfernen"
                              className="hover:bg-red-50"
                            >
                              <X className="w-4 h-4 text-red-600" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                    Abbrechen
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {transaktion ? 'Aktualisieren' : 'Erstellen'}
                  </Button>
                </DialogFooter>
              </form>
            </TabsContent>

            {/* TAB 2: KI-gestützte Erfassung */}
            <TabsContent value="ki">
              <div className="space-y-4 py-4">
                {/* Info-Box */}
                <div className="text-center p-6 bg-blue-50 rounded-lg border border-blue-200">
                  <Sparkles className="w-12 h-12 mx-auto text-blue-500 mb-3" />
                  <h3 className="font-semibold text-lg mb-2">KI-gestützte Belegerfassung</h3>
                  <p className="text-sm text-gray-600 mb-2">
                    Laden Sie ein <strong>Foto, Screenshot oder PDF</strong> einer Rechnung oder Quittung hoch.<br />
                    Die KI erkennt automatisch alle wichtigen Informationen.
                  </p>
                  <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                    <div className="bg-green-50 border border-green-200 rounded px-3 py-2">
                      <strong>📷 Bilder:</strong> Werden visuell analysiert (OCR)
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded px-3 py-2">
                      <strong>📄 PDFs:</strong> Werden zu Bild konvertiert & analysiert
                    </div>
                  </div>
                </div>

                {/* Upload-Bereich */}
                {!kiBildUrl && !kiLoading && (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
                    <input
                      type="file"
                      id="ki-upload"
                      accept="image/*,application/pdf"
                      onChange={handleKIBildUpload}
                      disabled={kiLoading}
                      className="hidden"
                    />
                    <label htmlFor="ki-upload" className="cursor-pointer">
                      <Upload className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                      <p className="text-sm font-medium text-gray-700 mb-1">
                        Beleg hochladen für KI-Analyse
                      </p>
                      <p className="text-xs text-gray-500">
                        Unterstützt: JPG, PNG, WebP, PDF (max. 5MB)
                      </p>
                    </label>
                  </div>
                )}

                {/* Dateivorschau (Bild oder PDF) */}
                {(kiBildUrl || kiDateiName) && !kiLoading && (
                  <div className="border-2 border-gray-300 rounded-lg p-4 bg-white">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-semibold text-gray-900">
                        {kiDateiTyp?.startsWith('image/') ? 'Hochgeladenes Bild:' : 'Hochgeladenes Dokument:'}
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setKiBildUrl(null)
                          setKiDateiName(null)
                          setKiDateiTyp(null)
                          setKiAuslese(false)
                          setDokumente([])
                        }}
                      >
                        <X className="w-4 h-4 mr-1" />
                        Entfernen
                      </Button>
                    </div>
                    
                    {/* Bildvorschau für Images */}
                    {kiBildUrl && kiDateiTyp?.startsWith('image/') && (
                      <img
                        src={kiBildUrl}
                        alt="Hochgeladener Beleg"
                        className="w-full h-auto max-h-96 object-contain rounded-lg border border-gray-200"
                      />
                    )}
                    
                    {/* PDF-Vorschau */}
                    {kiDateiTyp === 'application/pdf' && (
                      <div className="flex items-center justify-center p-8 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="text-center">
                          <FileText className="w-16 h-16 mx-auto text-red-500 mb-3" />
                          <p className="text-sm font-medium text-gray-900">{kiDateiName}</p>
                          <p className="text-xs text-gray-500 mt-1">PDF-Dokument hochgeladen</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Loading */}
                {kiLoading && (
                  <div className="text-center p-6 bg-gray-50 rounded-lg">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-500 mb-3" />
                    <p className="text-sm font-medium text-gray-700">
                      KI analysiert Beleg...
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Dies kann einige Sekunden dauern
                    </p>
                  </div>
                )}

                {/* Vorschau der erfassten Daten */}
                {kiAuslese && !kiLoading && (
                  <div className="space-y-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="w-5 h-5 text-green-600" />
                        <p className="text-sm font-semibold text-green-800">
                          Beleg erfolgreich ausgelesen
                        </p>
                      </div>
                      <p className="text-xs text-green-700">
                        Konfidenz: {Math.round(kiConfidence * 100)}% 
                        {kiConfidence < 0.7 && ' - Bitte Daten sorgfältig prüfen!'}
                      </p>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-sm font-semibold mb-3 text-gray-900">Erfasste Daten:</p>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        {kiDatenRaw?.name && (
                          <div className="col-span-2">
                            <span className="text-gray-700 font-medium">Name:</span>
                            <span className="ml-2 font-semibold text-gray-900">{kiDatenRaw.name}</span>
                          </div>
                        )}
                        {kiDatenRaw?.lieferant && (
                          <div className="col-span-2">
                            <span className="text-gray-700 font-medium">Lieferant:</span>
                            <span className="ml-2 font-semibold text-gray-900">{kiDatenRaw.lieferant}</span>
                          </div>
                        )}
                        <div>
                          <span className="text-gray-700 font-medium">Datum:</span>
                          <span className="ml-2 font-semibold text-gray-900">{formData.datum || '-'}</span>
                        </div>
                        <div>
                          <span className="text-gray-700 font-medium">Betrag:</span>
                          <span className="ml-2 font-semibold text-gray-900">{formData.betrag ? `${formData.betrag} €` : '-'}</span>
                        </div>
                        {kiDatenRaw?.kategorieVorschlag && (
                          <div>
                            <span className="text-gray-700 font-medium">Kategorie:</span>
                            <span className="ml-2 font-semibold text-gray-900">{kiDatenRaw.kategorieVorschlag}</span>
                          </div>
                        )}
                        <div>
                          <span className="text-gray-700 font-medium">Zahlungsart:</span>
                          <span className="ml-2 font-semibold text-gray-900">{formData.zahlungsart || '-'}</span>
                        </div>
                        {formData.beschreibung && (
                          <div className="col-span-2">
                            <span className="text-gray-700 font-medium">Beschreibung:</span>
                            <span className="ml-2 font-semibold text-gray-900">{formData.beschreibung}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setKiAuslese(false)
                          setKiConfidence(0)
                          setKiBildUrl(null)
                          setKiDatenRaw(null)
                          setDokumente([])
                        }}
                        className="flex-1"
                      >
                        Neuer Scan
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          // Wechsle zum manuellen Tab zur finalen Prüfung (ohne Toast)
                          const tabsList = document.querySelector('[role="tablist"]')
                          const manuellerTab = tabsList?.querySelector('[value="manuell"]') as HTMLButtonElement
                          if (manuellerTab) {
                            manuellerTab.click()
                          }
                        }}
                        className="flex-1"
                      >
                        Daten prüfen
                      </Button>
                      <Button
                        type="button"
                        onClick={async () => {
                          // Validierung vor dem Speichern
                          if (!formData.kategorieId) {
                            toast.error('Bitte wählen Sie eine Kategorie')
                            return
                          }
                          if (!formData.betrag || parseFloat(formData.betrag) <= 0) {
                            toast.error('Bitte geben Sie einen gültigen Betrag ein')
                            return
                          }
                          if (!formData.beschreibung) {
                            toast.error('Bitte geben Sie eine Beschreibung ein')
                            return
                          }

                          // Simuliere Form Submit Event
                          const fakeEvent = { preventDefault: () => {} } as React.FormEvent
                          await handleSubmit(fakeEvent)
                        }}
                        disabled={loading}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                      >
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Direkt speichern
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Bestätigungs-Dialog für Dokument-Löschung */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Dokument entfernen?</AlertDialogTitle>
            <AlertDialogDescription>
              Sind Sie sicher, dass Sie dieses Dokument entfernen möchten? 
              {dokumentToDelete !== null && dokumente[dokumentToDelete]?._id 
                ? ' Das Dokument wird beim Speichern der Transaktion dauerhaft gelöscht.'
                : ' Diese Aktion kann nicht rückgängig gemacht werden.'
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setDeleteConfirmOpen(false)
              setDokumentToDelete(null)
            }}>
              Abbrechen
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDokumentEntfernen}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Entfernen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Kategorie-Erstellen Dialog */}
      <KategorieErstellenDialog
        open={kategorieDialogOpen}
        onOpenChange={setKategorieDialogOpen}
        typ={typ}
        onSuccess={loadKategorien}
      />
    </>
  )
}

