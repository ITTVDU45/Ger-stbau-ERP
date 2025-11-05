'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, Edit, FileText, Trash2, Home, Building2, Layers, Wrench, Briefcase, RefreshCw } from 'lucide-react'
import { Anfrage } from '@/lib/db/types'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import AktivitaetenFeed from '../components/AktivitaetenFeed'

export default function AnfrageDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  
  const [anfrage, setAnfrage] = useState<Anfrage | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) {
      loadAnfrage()
    }
  }, [id])

  // Reload-Funktion für Window-Events
  useEffect(() => {
    const handleFocus = () => {
      if (id) {
        loadAnfrage()
      }
    }
    
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [id])

  const loadAnfrage = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/anfragen/${id}`)
      const data = await response.json()
      
      if (data.erfolg) {
        setAnfrage(data.anfrage)
        console.log('Anfrage geladen:', {
          status: data.anfrage.status,
          angebotId: data.anfrage.angebotId,
          projektId: data.anfrage.projektId
        })
      } else {
        toast.error('Fehler beim Laden der Anfrage')
        router.push('/dashboard/admin/anfragen')
      }
    } catch (error) {
      console.error('Fehler:', error)
      toast.error('Fehler beim Laden')
    } finally {
      setLoading(false)
    }
  }

  const handleAngebotErstellen = async () => {
    try {
      const response = await fetch(`/api/anfragen/${id}/angebot-erstellen`, {
        method: 'POST'
      })

      const data = await response.json()

      if (data.erfolg) {
        toast.success('Angebot erstellt', {
          description: `Angebot ${data.angebotsnummer} wurde erfolgreich erstellt`
        })
        router.push(`/dashboard/admin/angebote/neu?id=${data.angebotId}`)
      } else {
        toast.error('Fehler', {
          description: data.fehler
        })
      }
    } catch (error) {
      console.error('Fehler beim Erstellen des Angebots:', error)
      toast.error('Fehler beim Erstellen des Angebots')
    }
  }

  const handleLoeschen = async () => {
    if (!confirm('Möchten Sie diese Anfrage wirklich löschen?')) return

    try {
      const response = await fetch(`/api/anfragen/${id}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (data.erfolg) {
        toast.success('Anfrage gelöscht')
        router.push('/dashboard/admin/anfragen')
      } else {
        toast.error('Fehler', {
          description: data.fehler
        })
      }
    } catch (error) {
      console.error('Fehler beim Löschen:', error)
      toast.error('Fehler beim Löschen')
    }
  }

  const getStatusBadge = (status: Anfrage['status']) => {
    switch (status) {
      case 'offen':
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-300">Offen</Badge>
      case 'in_bearbeitung':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">In Bearbeitung</Badge>
      case 'angebot_in_bearbeitung':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">Angebot in Bearbeitung</Badge>
      case 'angebot_erstellt':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">Angebot versendet</Badge>
      default:
        return <Badge variant="outline">Unbekannt</Badge>
    }
  }

  const getArbeitstypenIcons = (artDerArbeiten: Anfrage['artDerArbeiten']) => {
    const badges = []
    
    if (artDerArbeiten.dachdecker) {
      badges.push(
        <Badge key="dachdecker" variant="outline" className="bg-orange-50 text-orange-700 border-orange-300 flex items-center gap-1">
          <Home className="h-3 w-3" />
          Dachdecker
        </Badge>
      )
    }
    
    if (artDerArbeiten.fassade) {
      badges.push(
        <Badge key="fassade" variant="outline" className="bg-purple-50 text-purple-700 border-purple-300 flex items-center gap-1">
          <Building2 className="h-3 w-3" />
          Fassade
        </Badge>
      )
    }
    
    if (artDerArbeiten.daemmung) {
      badges.push(
        <Badge key="daemmung" variant="outline" className="bg-teal-50 text-teal-700 border-teal-300 flex items-center gap-1">
          <Layers className="h-3 w-3" />
          Dämmung
        </Badge>
      )
    }
    
    if (artDerArbeiten.sonstige) {
      badges.push(
        <Badge key="sonstige" variant="outline" className="bg-gray-50 text-gray-700 border-gray-300 flex items-center gap-1">
          <Wrench className="h-3 w-3" />
          {artDerArbeiten.sonstigeText || 'Sonstige'}
        </Badge>
      )
    }
    
    return badges
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!anfrage) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p className="text-gray-600">Anfrage nicht gefunden</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => router.push('/dashboard/admin/anfragen')}
            className="text-gray-700 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Zurück
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-gray-900">{anfrage.anfragenummer}</h1>
              {getStatusBadge(anfrage.status)}
            </div>
            <p className="text-gray-600 mt-1">Anfrage von {anfrage.kundeName}</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={loadAnfrage}
            className="border-gray-300 text-gray-700 hover:bg-gray-50"
            disabled={loading}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Aktualisieren
          </Button>
          
          <Button
            variant="outline"
            onClick={() => router.push(`/dashboard/admin/anfragen/neu?id=${id}`)}
            className="border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            <Edit className="mr-2 h-4 w-4" />
            Bearbeiten
          </Button>
          
          {anfrage.status !== 'angebot_erstellt' && anfrage.status !== 'angebot_in_bearbeitung' && (
            <Button
              onClick={handleAngebotErstellen}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <FileText className="mr-2 h-4 w-4" />
              Angebot erstellen
            </Button>
          )}
          
          {anfrage.status === 'angebot_in_bearbeitung' && anfrage.angebotId && (
            <Button
              onClick={() => router.push(`/dashboard/admin/angebote/neu?id=${anfrage.angebotId}`)}
              className="bg-yellow-600 hover:bg-yellow-700 text-white"
            >
              <FileText className="mr-2 h-4 w-4" />
              Angebot bearbeiten
            </Button>
          )}
          
          {anfrage.status === 'angebot_erstellt' && anfrage.angebotId && (
            <Button
              onClick={() => router.push(`/dashboard/admin/angebote/neu?id=${anfrage.angebotId}`)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <FileText className="mr-2 h-4 w-4" />
              Zum Angebot
            </Button>
          )}
          
          {/* "Zum Projekt" Button - erscheint immer wenn projektId vorhanden ist */}
          {anfrage.projektId && (
            <Button
              onClick={() => router.push(`/dashboard/admin/projekte/${anfrage.projektId}`)}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Briefcase className="mr-2 h-4 w-4" />
              Zum Projekt
            </Button>
          )}
          
          <Button
            variant="outline"
            onClick={handleLoeschen}
            className="border-red-300 text-red-700 hover:bg-red-50"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Löschen
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="uebersicht" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-gray-100">
          <TabsTrigger value="uebersicht" className="data-[state=active]:bg-white">Übersicht</TabsTrigger>
          <TabsTrigger value="dokumente" className="data-[state=active]:bg-white">
            Dokumente ({anfrage.dokumente?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="aktivitaeten" className="data-[state=active]:bg-white">
            Aktivitäten ({anfrage.aktivitaeten?.length || 0})
          </TabsTrigger>
        </TabsList>

        {/* Tab: Übersicht */}
        <TabsContent value="uebersicht">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Kundendaten */}
            <Card className="bg-white border-gray-200">
              <CardHeader>
                <CardTitle className="text-gray-900">Kundendaten</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Firma</p>
                  <p className="text-base font-medium text-gray-900">{anfrage.kundeName}</p>
                </div>
                {anfrage.ansprechpartner && (
                  <div>
                    <p className="text-sm text-gray-600">Ansprechpartner</p>
                    <p className="text-base font-medium text-gray-900">{anfrage.ansprechpartner}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-600">Erstelldatum</p>
                  <p className="text-base font-medium text-gray-900">
                    {anfrage.erstelltAm ? format(new Date(anfrage.erstelltAm), 'dd.MM.yyyy HH:mm', { locale: de }) + ' Uhr' : '-'}
                  </p>
                </div>
                {anfrage.zustaendig && (
                  <div>
                    <p className="text-sm text-gray-600">Verantwortlich</p>
                    <p className="text-base font-medium text-gray-900">{anfrage.zustaendig}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Bauvorhaben */}
            <Card className="bg-white border-gray-200">
              <CardHeader>
                <CardTitle className="text-gray-900">Bauvorhaben</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Objektname</p>
                  <p className="text-base font-medium text-gray-900">{anfrage.bauvorhaben.objektname}</p>
                </div>
                {anfrage.bauvorhaben.strasse && (
                  <div>
                    <p className="text-sm text-gray-600">Adresse</p>
                    <p className="text-base font-medium text-gray-900">
                      {anfrage.bauvorhaben.strasse}
                      <br />
                      {anfrage.bauvorhaben.plz} {anfrage.bauvorhaben.ort}
                    </p>
                  </div>
                )}
                {anfrage.bauvorhaben.besonderheiten && (
                  <div>
                    <p className="text-sm text-gray-600">Besonderheiten</p>
                    <p className="text-base text-gray-900">{anfrage.bauvorhaben.besonderheiten}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Art der Arbeiten */}
            <Card className="bg-white border-gray-200">
              <CardHeader>
                <CardTitle className="text-gray-900">Art der Arbeiten</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {getArbeitstypenIcons(anfrage.artDerArbeiten)}
                </div>
              </CardContent>
            </Card>

            {/* Gerüstseiten */}
            <Card className="bg-white border-gray-200">
              <CardHeader>
                <CardTitle className="text-gray-900">Gerüstseiten</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${anfrage.geruestseiten.vorderseite ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    <span className="text-sm text-gray-900">Vorderseite</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${anfrage.geruestseiten.rueckseite ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    <span className="text-sm text-gray-900">Rückseite</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${anfrage.geruestseiten.rechteSeite ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    <span className="text-sm text-gray-900">Rechte Seite</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${anfrage.geruestseiten.linkeSeite ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    <span className="text-sm text-gray-900">Linke Seite</span>
                  </div>
                </div>
                {anfrage.geruestseiten.gesamtflaeche && anfrage.geruestseiten.gesamtflaeche > 0 && (
                  <div className="pt-3 border-t border-gray-200">
                    <p className="text-sm text-gray-600">Gesamtfläche</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {anfrage.geruestseiten.gesamtflaeche} m²
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Anmerkungen */}
            {anfrage.anmerkungen && (
              <Card className="bg-white border-gray-200 lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-gray-900">Anmerkungen</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-900 whitespace-pre-wrap">{anfrage.anmerkungen}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Tab: Dokumente */}
        <TabsContent value="dokumente">
          <Card className="bg-white border-gray-200">
            <CardHeader>
              <CardTitle className="text-gray-900">Dokumente</CardTitle>
            </CardHeader>
            <CardContent>
              {anfrage.dokumente && anfrage.dokumente.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {anfrage.dokumente.map((dok, index) => (
                    <Card key={index} className="p-4 bg-gray-50 border-gray-200 hover:shadow-md transition-shadow">
                      <div className="flex items-start gap-3">
                        <FileText className="h-5 w-5 text-blue-600 flex-shrink-0 mt-1" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {dok.name}
                          </p>
                          <p className="text-xs text-gray-600 mt-1">
                            {dok.hochgeladenAm ? format(new Date(dok.hochgeladenAm), 'dd.MM.yyyy', { locale: de }) : '-'}
                          </p>
                          <Button
                            variant="link"
                            size="sm"
                            onClick={() => window.open(dok.url, '_blank')}
                            className="text-blue-600 hover:text-blue-700 p-0 h-auto mt-2"
                          >
                            Herunterladen
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Keine Dokumente vorhanden</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Bearbeiten Sie die Anfrage, um Dokumente hochzuladen
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Aktivitäten */}
        <TabsContent value="aktivitaeten">
          <Card className="bg-white border-gray-200">
            <CardHeader>
              <CardTitle className="text-gray-900">Aktivitätsverlauf</CardTitle>
            </CardHeader>
            <CardContent>
              <AktivitaetenFeed aktivitaeten={anfrage.aktivitaeten} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

