'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  ArrowLeft,
  CheckCircle,
  Send,
  Download,
  Edit,
  Save,
  ExternalLink,
  FileWarning,
  Info
} from 'lucide-react'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { toast } from 'sonner'
import ChronikTimeline from '../components/ChronikTimeline'
import GenehmigungDialog from '../components/GenehmigungDialog'
import FolgemahnungErstellenDialog from '../components/FolgemahnungErstellenDialog'

export default function MahnungsDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { id } = use(params)
  const [mahnung, setMahnung] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [editMode, setEditMode] = useState(false)
  const [mahnungstext, setMahnungstext] = useState('')
  const [genehmigungDialogOpen, setGenehmigungDialogOpen] = useState(false)
  const [folgemahnungDialogOpen, setFolgemahnungDialogOpen] = useState(false)
  const [versandEmail, setVersandEmail] = useState('')

  useEffect(() => {
    loadMahnung()
  }, [id])

  const loadMahnung = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/mahnwesen/${id}`)
      const data = await response.json()

      if (data.erfolg) {
        setMahnung(data.mahnung)
        setMahnungstext(data.mahnung.mahnungstext)
        setVersandEmail(data.kunde?.email || '')
      } else {
        toast.error('Fehler beim Laden der Mahnung')
      }
    } catch (error) {
      console.error('Fehler:', error)
      toast.error('Fehler beim Laden der Mahnung')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveMahnungstext = async () => {
    try {
      const response = await fetch(`/api/mahnwesen/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mahnungstext })
      })

      const data = await response.json()
      if (data.erfolg) {
        toast.success('Mahnungstext gespeichert')
        setEditMode(false)
        loadMahnung()
      } else {
        toast.error(data.fehler)
      }
    } catch (error) {
      toast.error('Fehler beim Speichern')
    }
  }

  const handleFolgemahnung = () => {
    if (mahnung.mahnstufe >= 3) {
      toast.error('Maximale Mahnstufe 3 erreicht')
      return
    }
    setFolgemahnungDialogOpen(true)
  }

  const handleFolgemahnungSuccess = () => {
    loadMahnung()
  }

  const handleVersenden = async (versandart: 'email' | 'pdf_download') => {
    if (versandart === 'email' && !versandEmail) {
      toast.error('Bitte E-Mail-Adresse angeben')
      return
    }

    try {
      const response = await fetch(`/api/mahnwesen/${id}/versenden`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          versandart,
          email: versandart === 'email' ? versandEmail : undefined
        })
      })

      const data = await response.json()
      if (data.erfolg) {
        toast.success(data.nachricht)
        if (data.pdfUrl) {
          window.open(data.pdfUrl, '_blank')
        }
        loadMahnung()
      } else {
        toast.error(data.fehler)
      }
    } catch (error) {
      toast.error('Fehler beim Versenden')
    }
  }

  const handleMahnstufeChange = async (neueMahnstufe: string) => {
    try {
      const response = await fetch(`/api/mahnwesen/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mahnstufe: parseInt(neueMahnstufe) })
      })

      const data = await response.json()
      if (data.erfolg) {
        toast.success('Mahnstufe aktualisiert')
        loadMahnung()
      } else {
        toast.error(data.fehler)
      }
    } catch (error) {
      toast.error('Fehler beim Aktualisieren der Mahnstufe')
    }
  }

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; className: string }> = {
      erstellt: { label: 'Erstellt', className: 'bg-gray-100 text-gray-800' },
      zur_genehmigung: {
        label: 'Zur Genehmigung',
        className: 'bg-yellow-100 text-yellow-800'
      },
      genehmigt: { label: 'Genehmigt', className: 'bg-green-100 text-green-800' },
      abgelehnt: { label: 'Abgelehnt', className: 'bg-red-100 text-red-800' },
      versendet: { label: 'Versendet', className: 'bg-blue-100 text-blue-800' },
      bezahlt: { label: 'Bezahlt', className: 'bg-green-100 text-green-800' },
      storniert: { label: 'Storniert', className: 'bg-gray-100 text-gray-800' }
    }
    const c = config[status] || config.erstellt
    return <Badge className={c.className}>{c.label}</Badge>
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    )
  }

  if (!mahnung) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-gray-600">Mahnung nicht gefunden</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">
                {mahnung.mahnungsnummer}
              </h1>
              {/* Mahnstufe nur änderbar, wenn noch nicht versendet */}
              {mahnung.status !== 'versendet' && mahnung.status !== 'bezahlt' && mahnung.status !== 'storniert' ? (
                <Select 
                  value={mahnung.mahnstufe.toString()} 
                  onValueChange={handleMahnstufeChange}
                >
                  <SelectTrigger className="w-[140px] bg-white border-gray-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Mahnung 1</SelectItem>
                    <SelectItem value="2">Mahnung 2</SelectItem>
                    <SelectItem value="3">Mahnung 3</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-300 text-sm px-3 py-1">
                  Mahnung {mahnung.mahnstufe}
                </Badge>
              )}
            </div>
            <div className="text-sm text-gray-600 mt-1">
              {getStatusBadge(mahnung.status)}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          {mahnung.genehmigung?.status === 'ausstehend' && (
            <Button
              onClick={() => setGenehmigungDialogOpen(true)}
              variant="outline"
              className="border-purple-600 text-purple-600 hover:bg-purple-50"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Genehmigen/Ablehnen
            </Button>
          )}

          {mahnung.status === 'genehmigt' && (
            <>
              <Button
                onClick={() => handleVersenden('email')}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Send className="h-4 w-4 mr-2" />
                Per E-Mail versenden
              </Button>
              <Button
                onClick={() => handleVersenden('pdf_download')}
                variant="outline"
              >
                <Download className="h-4 w-4 mr-2" />
                PDF herunterladen
              </Button>
            </>
          )}

          {mahnung.status === 'versendet' && mahnung.mahnstufe < 3 && (
            <Button
              onClick={handleFolgemahnung}
              variant="outline"
              className="border-orange-600 text-orange-600 hover:bg-orange-50"
            >
              <FileWarning className="h-4 w-4 mr-2" />
              Mahnung {mahnung.mahnstufe + 1} erstellen
            </Button>
          )}
        </div>
      </div>

      {/* Status-Hinweis bei versendeten Mahnungen */}
      {mahnung.status === 'versendet' && mahnung.versandtAm && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-900 font-semibold">Mahnung versendet</AlertTitle>
          <AlertDescription className="text-green-800">
            Diese Mahnung wurde am {format(new Date(mahnung.versandtAm), 'dd.MM.yyyy HH:mm', { locale: de })} Uhr versendet.
            Änderungen sind nicht mehr möglich.
          </AlertDescription>
        </Alert>
      )}

      {/* Status-Hinweis bei bezahlten/erledigten Mahnungen */}
      {mahnung.status === 'settled' && (
        <Alert className="bg-blue-50 border-blue-200">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-900 font-semibold">Mahnung erledigt</AlertTitle>
          <AlertDescription className="text-blue-800">
            Diese Mahnung wurde als erledigt markiert, da die zugehörige Rechnung bezahlt wurde.
          </AlertDescription>
        </Alert>
      )}

      {/* Status-Hinweis bei abgelehnten Mahnungen */}
      {mahnung.status === 'abgelehnt' && mahnung.genehmigung?.ablehnungsgrund && (
        <Alert className="bg-red-50 border-red-200">
          <FileWarning className="h-4 w-4 text-red-600" />
          <AlertTitle className="text-red-900 font-semibold">Mahnung abgelehnt</AlertTitle>
          <AlertDescription className="text-red-800">
            <strong>Grund:</strong> {mahnung.genehmigung.ablehnungsgrund}
          </AlertDescription>
        </Alert>
      )}

      {/* Kopfdaten */}
      <Card className="bg-white border-gray-200">
        <CardHeader>
          <CardTitle className="text-gray-900 font-semibold">Mahnungsdetails</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label className="text-gray-600 text-sm">Kunde</Label>
              <p className="font-medium text-gray-900 mt-1">{mahnung.kundeName}</p>
              <Button
                variant="link"
                className="h-auto p-0 text-blue-600"
                onClick={() => router.push(`/dashboard/admin/kunden/${mahnung.kundeId}`)}
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                Details
              </Button>
            </div>

            <div>
              <Label className="text-gray-600 text-sm">Projekt</Label>
              <p className="font-medium text-gray-900 mt-1">
                {mahnung.projektName || '-'}
              </p>
              {mahnung.projektId && (
                <Button
                  variant="link"
                  className="h-auto p-0 text-blue-600"
                  onClick={() =>
                    router.push(`/dashboard/admin/projekte/${mahnung.projektId}`)
                  }
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Details
                </Button>
              )}
            </div>

            <div>
              <Label className="text-gray-600 text-sm">Rechnung</Label>
              <p className="font-medium text-gray-900 mt-1">
                {mahnung.rechnungsnummer}
              </p>
              <Button
                variant="link"
                className="h-auto p-0 text-blue-600"
                onClick={() =>
                  router.push(`/dashboard/admin/rechnungen/${mahnung.rechnungId}`)
                }
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                Details
              </Button>
            </div>

            <div>
              <Label className="text-gray-600 text-sm">Fällig am</Label>
              <p className="font-medium text-gray-900 mt-1">
                {format(new Date(mahnung.faelligAm), 'dd.MM.yyyy', { locale: de })}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t">
            <div>
              <Label className="text-gray-600 text-sm">Rechnungsbetrag</Label>
              <p className="font-bold text-gray-900 mt-1 text-lg">
                {mahnung.rechnungsbetrag.toLocaleString('de-DE', {
                  minimumFractionDigits: 2
                })}{' '}
                €
              </p>
            </div>

            <div>
              <Label className="text-gray-600 text-sm">Mahngebühren</Label>
              <p className="font-bold text-orange-600 mt-1 text-lg">
                + {mahnung.mahngebuehren.toLocaleString('de-DE', {
                  minimumFractionDigits: 2
                })}{' '}
                €
              </p>
            </div>

            {mahnung.verzugszinsen > 0 && (
              <div>
                <Label className="text-gray-600 text-sm">Verzugszinsen</Label>
                <p className="font-bold text-orange-600 mt-1 text-lg">
                  +{' '}
                  {mahnung.verzugszinsen.toLocaleString('de-DE', {
                    minimumFractionDigits: 2
                  })}{' '}
                  €
                </p>
              </div>
            )}

            <div>
              <Label className="text-gray-600 text-sm">Gesamtforderung</Label>
              <p className="font-bold text-red-600 mt-1 text-lg">
                {mahnung.gesamtforderung.toLocaleString('de-DE', {
                  minimumFractionDigits: 2
                })}{' '}
                €
              </p>
            </div>
          </div>

          {/* Parent/Child-Mahnung Referenzen */}
          {(mahnung.parentMahnungId || mahnung.childMahnungId) && (
            <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t">
              {mahnung.parentMahnungId && (
                <div className="col-span-2 md:col-span-1">
                  <Label className="text-gray-600 text-sm">Vorherige Mahnung</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="font-medium text-gray-900">Mahnung {mahnung.mahnstufe - 1}</p>
                    <Button
                      variant="link"
                      className="h-auto p-0 text-blue-600"
                      onClick={() => router.push(`/dashboard/admin/mahnwesen/${mahnung.parentMahnungId}`)}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Ansehen
                    </Button>
                  </div>
                </div>
              )}

              {mahnung.childMahnungId && (
                <div className="col-span-2 md:col-span-1">
                  <Label className="text-gray-600 text-sm">Folgemahnung</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="font-medium text-gray-900">Mahnung {mahnung.mahnstufe + 1}</p>
                    <Button
                      variant="link"
                      className="h-auto p-0 text-blue-600"
                      onClick={() => router.push(`/dashboard/admin/mahnwesen/${mahnung.childMahnungId}`)}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Ansehen
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="uebersicht" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 bg-gray-100">
          <TabsTrigger value="uebersicht" className="data-[state=active]:bg-white data-[state=active]:text-gray-900">Übersicht</TabsTrigger>
          <TabsTrigger value="chronik" className="data-[state=active]:bg-white data-[state=active]:text-gray-900">Chronik</TabsTrigger>
          <TabsTrigger value="vorschau" className="data-[state=active]:bg-white data-[state=active]:text-gray-900">Vorschau</TabsTrigger>
        </TabsList>

        <TabsContent value="uebersicht" className="space-y-4">
          {/* Mahnungstext */}
          <Card className="bg-white border-gray-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-gray-900 font-semibold">Mahnungstext</CardTitle>
                {!editMode && mahnung.status !== 'versendet' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditMode(true)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Bearbeiten
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {editMode ? (
                <div className="space-y-4">
                  <Textarea
                    value={mahnungstext}
                    onChange={(e) => setMahnungstext(e.target.value)}
                    rows={10}
                    className="font-mono text-sm bg-white border-gray-300 text-gray-900"
                  />
                  <div className="flex gap-2">
                    <Button onClick={handleSaveMahnungstext}>
                      <Save className="h-4 w-4 mr-2" />
                      Speichern
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEditMode(false)
                        setMahnungstext(mahnung.mahnungstext)
                      }}
                    >
                      Abbrechen
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="whitespace-pre-wrap font-mono text-sm text-gray-900 bg-gray-50 p-4 rounded-lg border border-gray-200">
                  {mahnung.mahnungstext}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Versand-Optionen */}
          {mahnung.status === 'genehmigt' && (
            <Card className="bg-white border-gray-200">
              <CardHeader>
                <CardTitle className="text-gray-900 font-semibold">Versand-Optionen</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="email" className="text-gray-700 font-medium">E-Mail-Adresse</Label>
                  <Input
                    id="email"
                    type="email"
                    value={versandEmail}
                    onChange={(e) => setVersandEmail(e.target.value)}
                    placeholder="kunde@beispiel.de"
                    className="mt-2 bg-white border-gray-300 text-gray-900"
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="chronik">
          <Card className="bg-white border-gray-200">
            <CardHeader>
              <CardTitle className="text-gray-900 font-semibold">Aktivitätschronik</CardTitle>
              <CardDescription className="text-gray-600">
                Alle Aktionen und Statusänderungen zu dieser Mahnung
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChronikTimeline chronik={mahnung.chronik || []} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vorschau">
          <Card className="bg-white border-gray-200">
            <CardHeader>
              <CardTitle className="text-gray-900 font-semibold">PDF-Vorschau</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
                <p className="text-gray-600">
                  PDF-Vorschau wird nach der Implementierung der PDF-Generierung verfügbar
                  sein
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Genehmigungsdialog */}
      <GenehmigungDialog
        open={genehmigungDialogOpen}
        onOpenChange={setGenehmigungDialogOpen}
        mahnungId={id}
        kundeName={mahnung.kundeName}
        onSuccess={loadMahnung}
      />

      {/* Folgemahnung Erstellen Dialog */}
      {mahnung && (
        <FolgemahnungErstellenDialog
          open={folgemahnungDialogOpen}
          onOpenChange={setFolgemahnungDialogOpen}
          parentMahnungId={id}
          aktuellerMahnstufe={mahnung.mahnstufe}
          kundeName={mahnung.kundeName}
          rechnungsnummer={mahnung.rechnungsnummer}
          offenerBetrag={mahnung.offenerBetrag || mahnung.gesamtforderung}
          parentMahnungDatum={mahnung.datum ? new Date(mahnung.datum) : undefined}
          parentMahnungFaelligAm={mahnung.faelligAm ? new Date(mahnung.faelligAm) : undefined}
          parentMahnungVersandtAm={mahnung.versandtAm ? new Date(mahnung.versandtAm) : undefined}
          onSuccess={handleFolgemahnungSuccess}
        />
      )}
    </div>
  )
}

