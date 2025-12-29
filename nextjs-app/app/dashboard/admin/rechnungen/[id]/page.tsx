'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Edit, Download, Send, CheckCircle, XCircle, Eye, FileText, AlertTriangle, FileWarning } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import MahnungenBereich from '../components/MahnungenBereich'

export default function RechnungDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  
  const [rechnung, setRechnung] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [statusDialogOpen, setStatusDialogOpen] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState<string>('')
  const [bezahltAm, setBezahltAm] = useState<string>(format(new Date(), 'yyyy-MM-dd'))
  const [bezahltBetrag, setBezahltBetrag] = useState<string>('')
  const [zahlungsnotiz, setZahlungsnotiz] = useState<string>('')
  const [statusLoading, setStatusLoading] = useState(false)

  useEffect(() => {
    if (id) {
      loadRechnung()
    }
  }, [id])

  const loadRechnung = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/rechnungen/${id}`)
      const data = await response.json()
      
      if (data.erfolg) {
        setRechnung(data.rechnung)
        setBezahltBetrag(data.rechnung.brutto.toString())
      } else {
        toast.error('Fehler beim Laden der Rechnung')
        router.push('/dashboard/admin/rechnungen')
      }
    } catch (error) {
      console.error('Fehler:', error)
      toast.error('Fehler beim Laden')
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async () => {
    if (!selectedStatus) {
      toast.error('Bitte wählen Sie einen Status aus')
      return
    }

    try {
      setStatusLoading(true)
      const response = await fetch(`/api/rechnungen/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: selectedStatus,
          bezahltAm: selectedStatus === 'bezahlt' ? new Date(bezahltAm) : undefined,
          bezahltBetrag: selectedStatus === 'bezahlt' || selectedStatus === 'teilweise_bezahlt' 
            ? parseFloat(bezahltBetrag) 
            : undefined,
          zahlungsnotiz: zahlungsnotiz || undefined
        })
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Status erfolgreich aktualisiert')
        setStatusDialogOpen(false)
        loadRechnung()
      } else {
        toast.error(data.error || 'Fehler beim Aktualisieren des Status')
      }
    } catch (error) {
      console.error('Fehler:', error)
      toast.error('Fehler beim Aktualisieren')
    } finally {
      setStatusLoading(false)
    }
  }

  const openStatusDialog = (status: string) => {
    setSelectedStatus(status)
    setStatusDialogOpen(true)
  }

  const getStatusBadge = (status: string) => {
    const config: any = {
      entwurf: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-300', label: 'Entwurf', icon: Edit },
      gesendet: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-300', label: 'Gesendet', icon: Send },
      offen: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-300', label: 'Offen', icon: AlertTriangle },
      bezahlt: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-300', label: 'Bezahlt', icon: CheckCircle },
      teilweise_bezahlt: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-300', label: 'Teilweise bezahlt', icon: CheckCircle },
      ueberfaellig: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-300', label: 'Überfällig', icon: XCircle },
      storniert: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-300', label: 'Storniert', icon: XCircle },
    }
    const c = config[status] || config.entwurf
    const Icon = c.icon
    return (
      <Badge variant="outline" className={`${c.bg} ${c.text} ${c.border} flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {c.label}
      </Badge>
    )
  }

  const getTypBadge = (typ: string) => {
    return typ === 'teilrechnung' 
      ? <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">Teilrechnung</Badge>
      : <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-300">Schlussrechnung</Badge>
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!rechnung) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p className="text-gray-600">Rechnung nicht gefunden</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => router.push('/dashboard/admin/rechnungen')}
            className="text-gray-700 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Zurück
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-gray-900">{rechnung.rechnungsnummer}</h1>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  {getStatusBadge(rechnung.status)}
                  {getTypBadge(rechnung.typ)}
                  <Select value={rechnung.status} onValueChange={openStatusDialog}>
                    <SelectTrigger className="w-[160px] h-8 text-xs">
                      <SelectValue placeholder="Status ändern" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="offen">Offen</SelectItem>
                      <SelectItem value="bezahlt">Bezahlt</SelectItem>
                      <SelectItem value="teilweise_bezahlt">Teilweise bezahlt</SelectItem>
                      <SelectItem value="storniert">Storniert</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {rechnung.hatOffeneMahnung && rechnung.status !== 'bezahlt' && (
                  <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-300 flex items-center gap-1 w-fit">
                    <AlertTriangle className="h-3 w-3" />
                    Nicht bezahlt (Mahnung offen)
                  </Badge>
                )}
                {rechnung.hoechsteMahnstufe && (
                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300 flex items-center gap-1 w-fit">
                    <FileWarning className="h-3 w-3" />
                    Mahnung {rechnung.hoechsteMahnstufe}
                  </Badge>
                )}
              </div>
            </div>
            <p className="text-gray-600 mt-1">
              {rechnung.kundeName} {rechnung.projektId && `• Projekt: ${rechnung.projektnummer}`}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            className="border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            <Download className="mr-2 h-4 w-4" />
            PDF herunterladen
          </Button>
          
          {rechnung.status === 'entwurf' && (
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Send className="mr-2 h-4 w-4" />
              Rechnung versenden
            </Button>
          )}
        </div>
      </div>

      {/* Status-Änderungs-Dialog */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle className="text-gray-900">Rechnungsstatus ändern</DialogTitle>
            <DialogDescription className="text-gray-600">
              Ändern Sie den Status der Rechnung {rechnung.rechnungsnummer}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="status" className="text-gray-900">Neuer Status</Label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger id="status" className="bg-white border-gray-300">
                  <SelectValue placeholder="Status auswählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="offen">Offen</SelectItem>
                  <SelectItem value="bezahlt">Bezahlt</SelectItem>
                  <SelectItem value="teilweise_bezahlt">Teilweise bezahlt</SelectItem>
                  <SelectItem value="storniert">Storniert</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(selectedStatus === 'bezahlt' || selectedStatus === 'teilweise_bezahlt') && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="bezahltAm" className="text-gray-900">Zahlungsdatum</Label>
                  <Input
                    id="bezahltAm"
                    type="date"
                    value={bezahltAm}
                    onChange={(e) => setBezahltAm(e.target.value)}
                    className="bg-white border-gray-300"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bezahltBetrag" className="text-gray-900">
                    {selectedStatus === 'bezahlt' ? 'Bezahlter Betrag' : 'Teilbetrag'}
                  </Label>
                  <Input
                    id="bezahltBetrag"
                    type="number"
                    step="0.01"
                    value={bezahltBetrag}
                    onChange={(e) => setBezahltBetrag(e.target.value)}
                    className="bg-white border-gray-300"
                  />
                  <p className="text-xs text-gray-600">
                    Rechnungsbetrag: {rechnung.brutto.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="zahlungsnotiz" className="text-gray-900">Notiz (optional)</Label>
                  <Textarea
                    id="zahlungsnotiz"
                    value={zahlungsnotiz}
                    onChange={(e) => setZahlungsnotiz(e.target.value)}
                    placeholder="z.B. Überweisung, Bankeinzug, etc."
                    className="bg-white border-gray-300"
                    rows={3}
                  />
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setStatusDialogOpen(false)}
              disabled={statusLoading}
              className="border-gray-300 text-gray-700"
            >
              Abbrechen
            </Button>
            <Button
              onClick={handleStatusChange}
              disabled={statusLoading || !selectedStatus}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {statusLoading ? 'Wird gespeichert...' : 'Status ändern'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tabs */}
      <Tabs defaultValue="details" className="space-y-6">
        <TabsList className="grid w-full md:w-auto grid-cols-2 bg-gray-100">
          <TabsTrigger value="details" className="data-[state=active]:bg-white flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Details
          </TabsTrigger>
          <TabsTrigger value="vorschau" className="data-[state=active]:bg-white flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Vorschau
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-6">
          {/* Rechnungsdetails */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Rechnungsinformationen */}
        <Card className="bg-white border-gray-200">
          <CardHeader>
            <CardTitle className="text-gray-900 font-semibold">Rechnungsinformationen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-gray-600">Rechnungsdatum</p>
              <p className="text-base font-medium text-gray-900">
                {rechnung.datum ? format(new Date(rechnung.datum), 'dd.MM.yyyy', { locale: de }) : '-'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Fälligkeitsdatum</p>
              <p className="text-base font-medium text-gray-900">
                {rechnung.faelligkeitsdatum ? format(new Date(rechnung.faelligkeitsdatum), 'dd.MM.yyyy', { locale: de }) : '-'}
              </p>
            </div>
            {rechnung.angebotsnummer && (
              <div>
                <p className="text-sm text-gray-600">Angebotsnummer</p>
                <p className="text-base font-medium text-gray-900">{rechnung.angebotsnummer}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Beträge */}
        <Card className="bg-white border-gray-200">
          <CardHeader>
            <CardTitle className="text-gray-900 font-semibold">Beträge</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-gray-600">Netto</p>
              <p className="text-base font-medium text-gray-900">
                {rechnung.netto.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">MwSt. ({rechnung.mwstSatz}%)</p>
              <p className="text-base font-medium text-gray-900">
                {(rechnung.mwstBetrag || 0).toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Brutto</p>
              <p className="text-2xl font-bold text-gray-900">
                {rechnung.brutto.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Kunde & Projekt */}
        <Card className="bg-white border-gray-200">
          <CardHeader>
            <CardTitle className="text-gray-900 font-semibold">Kunde & Projekt</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-gray-600">Kunde</p>
              <p className="text-base font-medium text-gray-900">{rechnung.kundeName}</p>
            </div>
            {rechnung.projektId && (
              <>
                <div>
                  <p className="text-sm text-gray-600">Projektnummer</p>
                  <p className="text-base font-medium text-gray-900">{rechnung.projektnummer}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/dashboard/admin/projekte/${rechnung.projektId}`)}
                  className="w-full border-blue-300 text-blue-700 hover:bg-blue-50"
                >
                  Zum Projekt
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Positionen */}
      <Card className="bg-white border-gray-200">
        <CardHeader>
          <CardTitle className="text-gray-900 font-semibold">Rechnungspositionen</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Pos.</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Beschreibung</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-900">Menge</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Einheit</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-900">Einzelpreis</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-900">Gesamtpreis</th>
                </tr>
              </thead>
              <tbody>
                {rechnung.positionen && rechnung.positionen.map((pos: any, index: number) => {
                  const gesamt = pos.gesamtpreis || pos.gesamt || 0
                  return (
                    <tr key={index} className="border-b border-gray-200">
                      <td className="py-3 px-4 text-sm text-gray-700">{pos.position || index + 1}</td>
                      <td className="py-3 px-4 text-sm text-gray-900">{pos.beschreibung}</td>
                      <td className="py-3 px-4 text-sm text-gray-700 text-right">{pos.menge}</td>
                      <td className="py-3 px-4 text-sm text-gray-700">{pos.einheit}</td>
                      <td className="py-3 px-4 text-sm text-gray-700 text-right">
                        {(pos.einzelpreis || 0).toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-900 font-semibold text-right">
                        {gesamt.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Summen */}
          <div className="mt-6 flex justify-end">
            <div className="w-full md:w-1/3 space-y-2">
              <div className="flex justify-between py-2">
                <span className="text-gray-700">Netto</span>
                <span className="font-medium text-gray-900">
                  {rechnung.netto.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-700">MwSt. ({rechnung.mwstSatz}%)</span>
                <span className="font-medium text-gray-900">
                  {(rechnung.mwstBetrag || 0).toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
                </span>
              </div>
              <div className="flex justify-between py-3 border-t-2 border-gray-300">
                <span className="font-semibold text-gray-900 text-lg">Brutto</span>
                <span className="text-xl font-bold text-gray-900">
                  {rechnung.brutto.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

          {/* Zahlungsbedingungen */}
          {rechnung.zahlungsbedingungen && (
            <Card className="bg-white border-gray-200">
              <CardHeader>
                <CardTitle className="text-gray-900 font-semibold">Zahlungsbedingungen</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700">{rechnung.zahlungsbedingungen}</p>
              </CardContent>
            </Card>
          )}

          {/* Mahnungen */}
          <MahnungenBereich 
            rechnungId={id} 
            rechnungStatus={rechnung.status}
            rechnungBrutto={rechnung.brutto}
          />
        </TabsContent>

        <TabsContent value="vorschau">
          {/* Vorschau */}
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-4xl mx-auto">
            {/* Firmenlogo & Header */}
            <div className="border-b-2 border-gray-300 pb-6 mb-6">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">RECHNUNG</h1>
              <p className="text-gray-600">{rechnung.rechnungsnummer}</p>
            </div>

            {/* Adressen */}
            <div className="grid grid-cols-2 gap-8 mb-8">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">RECHNUNGSEMPFÄNGER</h3>
                <p className="text-gray-700">{rechnung.kundeName}</p>
              </div>
              <div className="text-right">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">IHR UNTERNEHMEN</h3>
                <p className="text-gray-700">Ihre Firmenadresse</p>
                <p className="text-gray-700">Straße & Hausnummer</p>
                <p className="text-gray-700">PLZ & Ort</p>
              </div>
            </div>

            {/* Rechnungsinformationen */}
            <div className="grid grid-cols-2 gap-4 mb-8 bg-gray-50 p-4 rounded-lg">
              <div>
                <p className="text-sm text-gray-600">Rechnungsdatum</p>
                <p className="font-medium text-gray-900">
                  {rechnung.datum ? format(new Date(rechnung.datum), 'dd.MM.yyyy', { locale: de }) : '-'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Fälligkeitsdatum</p>
                <p className="font-medium text-gray-900">
                  {rechnung.faelligkeitsdatum ? format(new Date(rechnung.faelligkeitsdatum), 'dd.MM.yyyy', { locale: de }) : '-'}
                </p>
              </div>
              {rechnung.projektnummer && (
                <>
                  <div>
                    <p className="text-sm text-gray-600">Projektnummer</p>
                    <p className="font-medium text-gray-900">{rechnung.projektnummer}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Rechnungstyp</p>
                    <p className="font-medium text-gray-900">
                      {rechnung.typ === 'teilrechnung' ? 'Teilrechnung' : 'Schlussrechnung'}
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Positionen Tabelle */}
            <div className="mb-8">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-900 text-white">
                    <th className="text-left py-3 px-4 text-sm font-semibold">Pos.</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold">Beschreibung</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold">Menge</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold">Einheit</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold">Einzelpreis</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold">Gesamtpreis</th>
                  </tr>
                </thead>
                <tbody>
                  {rechnung.positionen && rechnung.positionen.map((pos: any, index: number) => {
                    const gesamt = pos.gesamtpreis || pos.gesamt || 0
                    return (
                      <tr key={index} className="border-b border-gray-200">
                        <td className="py-3 px-4 text-sm text-gray-700">{pos.position || index + 1}</td>
                        <td className="py-3 px-4 text-sm text-gray-900">{pos.beschreibung}</td>
                        <td className="py-3 px-4 text-sm text-gray-700 text-right">{pos.menge}</td>
                        <td className="py-3 px-4 text-sm text-gray-700">{pos.einheit}</td>
                        <td className="py-3 px-4 text-sm text-gray-700 text-right">
                          {(pos.einzelpreis || 0).toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-900 font-semibold text-right">
                          {gesamt.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Summen */}
            <div className="flex justify-end mb-8">
              <div className="w-80">
                <div className="flex justify-between py-2 text-gray-700">
                  <span>Nettosumme</span>
                  <span className="font-medium">
                    {rechnung.netto.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
                  </span>
                </div>
                <div className="flex justify-between py-2 text-gray-700">
                  <span>MwSt. ({rechnung.mwstSatz}%)</span>
                  <span className="font-medium">
                    {(rechnung.mwstBetrag || 0).toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
                  </span>
                </div>
                <div className="flex justify-between py-3 border-t-2 border-gray-900 text-gray-900">
                  <span className="text-lg font-bold">Rechnungsbetrag</span>
                  <span className="text-xl font-bold">
                    {rechnung.brutto.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
                  </span>
                </div>
              </div>
            </div>

            {/* Zahlungsbedingungen */}
            {rechnung.zahlungsbedingungen && (
              <div className="bg-gray-50 p-4 rounded-lg mb-8">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">ZAHLUNGSBEDINGUNGEN</h3>
                <p className="text-sm text-gray-700">{rechnung.zahlungsbedingungen}</p>
              </div>
            )}

            {/* Fußzeile */}
            <div className="border-t-2 border-gray-300 pt-6 text-center text-sm text-gray-600">
              <p>Vielen Dank für Ihr Vertrauen!</p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

