import React from 'react'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Play, 
  Phone, 
  Clock, 
  User, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Download,
  Calendar,
  MessageSquare,
  TrendingUp,
  Volume2,
  Mic,
  Languages
} from 'lucide-react'

// Minimal mock - in production replace with API call
const RECENT_CALLS: Record<string, any> = {
  'CALL-001': {
    id: 'CALL-001',
    bewerberId: 'P4E-1002',
    bewerberName: 'Carlos Rodriguez',
    datum: '2025-10-17 11:45',
    dauer: '23 Min',
    status: 'Erfolgreich',
    themen: ['Berufserfahrung', 'Deutschkenntnisse', 'Verfügbarkeit'],
    qualitaet: 9.2,
    sentiment: 'Positiv',
    sprache: 'Deutsch (B2)',
    transcript: 'Zusammenfassung: Bewerber verfügt über 7 Jahre Erfahrung als Pflegefachkraft in Spanien. Deutschkenntnisse auf B2-Niveau nachgewiesen. Bereit für sofortigen Umzug nach Deutschland. Bevorzugte Regionen: Bayern, Baden-Württemberg.',
    fullTranscript: `Agent: Guten Tag Herr Rodriguez, hier spricht der KI-Assistent von TechVision. Haben Sie gerade 20 Minuten Zeit für ein kurzes Gespräch?

Bewerber: Ja, gerne. Ich habe Zeit.

Agent: Wunderbar. Ich möchte mit Ihnen über Ihre Bewerbung als Pflegefachkraft sprechen. Können Sie mir zunächst etwas über Ihre bisherige Berufserfahrung erzählen?

Bewerber: Ich arbeite seit 7 Jahren als Pflegefachkraft in einem Krankenhaus in Madrid. Ich habe hauptsächlich auf der Intensivstation gearbeitet und habe Erfahrung mit verschiedenen medizinischen Geräten.

Agent: Das klingt sehr gut. Wie würden Sie Ihre Deutschkenntnisse einschätzen?

Bewerber: Ich habe vor 2 Jahren einen B2-Kurs abgeschlossen und spreche regelmäßig Deutsch mit Freunden. Ich kann mich gut verständigen.

Agent: Perfekt. Wären Sie bereit, für eine Stelle nach Deutschland umzuziehen?

Bewerber: Ja, auf jeden Fall. Am liebsten nach Bayern oder Baden-Württemberg, aber ich bin flexibel.

Agent: Vielen Dank für die Informationen. Wir werden Ihr Profil nun an passende Arbeitgeber weiterleiten.`,
    erkenntnisse: [
      { kategorie: 'Qualifikation', status: 'Vollständig', details: '7 Jahre Berufserfahrung, Intensivstation' },
      { kategorie: 'Sprachkenntnisse', status: 'Bestätigt', details: 'Deutsch B2, Spanisch Muttersprache' },
      { kategorie: 'Verfügbarkeit', status: 'Sofort', details: 'Bereit für Umzug innerhalb 4 Wochen' },
      { kategorie: 'Dokumente', status: 'Fehlt', details: 'Diplom-Beglaubigung ausstehend' }
    ],
    naechsteSchritte: [
      { aufgabe: 'Diplom-Beglaubigung anfordern', frist: '2025-10-20', status: 'Offen' },
      { aufgabe: 'CV erstellen', frist: '2025-10-18', status: 'In Bearbeitung' },
      { aufgabe: 'Matching mit Arbeitgebern', frist: '2025-10-22', status: 'Geplant' }
    ],
    audioUrl: '/recordings/call-001.mp3',
    notizen: 'Sehr motivierter Bewerber. Gute Kommunikation. Empfehlung: Priorität A'
  },
  'CALL-002': {
    id: 'CALL-002',
    bewerberId: 'P4E-1003',
    bewerberName: 'Anna Kowalski',
    datum: '2025-10-17 10:15',
    dauer: '18 Min',
    status: 'Erfolgreich',
    themen: ['Qualifikationen', 'Relocation', 'Gehalt'],
    qualitaet: 8.7,
    sentiment: 'Neutral',
    sprache: 'Deutsch (C1)',
    transcript: 'Zusammenfassung: Bereit für sofortige Relocation. Gehaltsvorstellung 3.500€ brutto. Bevorzugt Großstädte.',
    fullTranscript: 'Vollständiges Transkript für CALL-002...',
    erkenntnisse: [
      { kategorie: 'Qualifikation', status: 'Vollständig', details: 'Bachelor Pflegewissenschaft' },
      { kategorie: 'Sprachkenntnisse', status: 'Bestätigt', details: 'Deutsch C1, Polnisch Muttersprache' },
      { kategorie: 'Verfügbarkeit', status: 'Sofort', details: 'Innerhalb 2 Wochen' },
      { kategorie: 'Dokumente', status: 'Vollständig', details: 'Alle Unterlagen vorhanden' }
    ],
    naechsteSchritte: [
      { aufgabe: 'Matching mit Arbeitgebern', frist: '2025-10-19', status: 'In Bearbeitung' }
    ],
    audioUrl: '/recordings/call-002.mp3',
    notizen: 'Klare Gehaltsvorstellung. Bevorzugt Berlin/München.'
  },
  'CALL-003': {
    id: 'CALL-003',
    bewerberId: 'P4E-1005',
    bewerberName: 'Sofia Petrova',
    datum: '2025-10-16 16:30',
    dauer: '15 Min',
    status: 'Nicht erreicht',
    themen: [],
    qualitaet: null,
    sentiment: null,
    sprache: null,
    transcript: null,
    fullTranscript: null,
    erkenntnisse: [],
    naechsteSchritte: [
      { aufgabe: 'Erneuter Anrufversuch', frist: '2025-10-18', status: 'Geplant' }
    ],
    audioUrl: null,
    notizen: 'Mailbox erreicht. Nachricht hinterlassen.'
  }
}

export default async function CallDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const call = RECENT_CALLS[id]

  if (!call) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-gray-900">Anruf nicht gefunden</CardTitle>
            <CardDescription>Die angeforderte Anruf-ID existiert nicht.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mt-4">
              <Link href="/dashboard/admin/telefonie">
                <Button>Zurück zur Telefonie</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'Erfolgreich': return <CheckCircle2 className="h-5 w-5 text-green-600" />
      case 'Nicht erreicht': return <XCircle className="h-5 w-5 text-gray-400" />
      case 'Abgebrochen': return <AlertCircle className="h-5 w-5 text-red-600" />
      default: return <Phone className="h-5 w-5 text-blue-600" />
    }
  }

  const getSentimentColor = (sentiment: string) => {
    switch(sentiment) {
      case 'Positiv': return 'text-green-600'
      case 'Neutral': return 'text-gray-600'
      case 'Negativ': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  return (
    <div className="space-y-6 p-4 lg:p-6">
      {/* Header mit Quick Stats */}
      <Card className="bg-gradient-to-r from-slate-800 to-slate-900 border-slate-700">
        <CardHeader>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-slate-700 rounded-lg shadow-sm">
                {getStatusIcon(call.status)}
              </div>
              <div>
                <CardTitle className="text-xl text-white mb-1">
                  Anruf mit {call.bewerberName}
                </CardTitle>
                <CardDescription className="text-slate-300">
                  <span className="font-mono font-semibold text-white">{call.id}</span> • Bewerber: 
                  <Link href={`/dashboard/admin/bewerber/${call.bewerberId}`} className="text-blue-400 hover:text-blue-300 hover:underline ml-1">
                    {call.bewerberId}
                  </Link>
                </CardDescription>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href={`/dashboard/admin/bewerber/${call.bewerberId}`}>
                  <User className="h-4 w-4 mr-2" />
                  Bewerber öffnen
                </Link>
              </Button>
              {call.audioUrl && (
                <Button size="sm" className="btn-gradient-green">
                  <Play className="h-4 w-4 mr-2" />
                  Aufnahme abspielen
                </Button>
              )}
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mt-6">
            <div className="bg-slate-700 p-3 rounded-lg shadow-sm border border-slate-600">
              <div className="flex items-center gap-2 text-slate-300 text-xs mb-1">
                <Clock className="h-3 w-3" />
                <span>Datum & Zeit</span>
              </div>
              <p className="text-sm font-semibold text-white">{call.datum}</p>
            </div>
            <div className="bg-slate-700 p-3 rounded-lg shadow-sm border border-slate-600">
              <div className="flex items-center gap-2 text-slate-300 text-xs mb-1">
                <Phone className="h-3 w-3" />
                <span>Dauer</span>
              </div>
              <p className="text-sm font-semibold text-white">{call.dauer}</p>
            </div>
            <div className="bg-slate-700 p-3 rounded-lg shadow-sm border border-slate-600">
              <div className="flex items-center gap-2 text-slate-300 text-xs mb-1">
                <TrendingUp className="h-3 w-3" />
                <span>Qualität</span>
              </div>
              <p className="text-sm font-semibold text-white">
                {call.qualitaet ? `${call.qualitaet}/10` : 'N/A'}
              </p>
            </div>
            <div className="bg-slate-700 p-3 rounded-lg shadow-sm border border-slate-600">
              <div className="flex items-center gap-2 text-slate-300 text-xs mb-1">
                <MessageSquare className="h-3 w-3" />
                <span>Sentiment</span>
              </div>
              <p className={`text-sm font-semibold ${call.sentiment === 'Positiv' ? 'text-green-400' : call.sentiment === 'Negativ' ? 'text-red-400' : 'text-slate-300'}`}>
                {call.sentiment || 'N/A'}
              </p>
            </div>
            <div className="bg-slate-700 p-3 rounded-lg shadow-sm border border-slate-600">
              <div className="flex items-center gap-2 text-slate-300 text-xs mb-1">
                <Languages className="h-3 w-3" />
                <span>Sprache</span>
              </div>
              <p className="text-sm font-semibold text-white">{call.sprache || 'N/A'}</p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Tabs für Details */}
      <Tabs defaultValue="zusammenfassung" className="w-full">
        <TabsList className="inline-flex overflow-x-auto w-full lg:w-auto">
          <TabsTrigger value="zusammenfassung" className="flex-shrink-0">
            <FileText className="h-4 w-4 mr-2" />
            Zusammenfassung
          </TabsTrigger>
          <TabsTrigger value="transkript" className="flex-shrink-0">
            <Mic className="h-4 w-4 mr-2" />
            Transkript
          </TabsTrigger>
          <TabsTrigger value="erkenntnisse" className="flex-shrink-0">
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Erkenntnisse
          </TabsTrigger>
          <TabsTrigger value="naechste-schritte" className="flex-shrink-0">
            <Calendar className="h-4 w-4 mr-2" />
            Nächste Schritte
          </TabsTrigger>
        </TabsList>

        {/* Tab: Zusammenfassung */}
        <TabsContent value="zusammenfassung" className="space-y-4">
          <Card className="bg-white">
            <CardHeader>
              <CardTitle className="text-gray-900">Gesprächszusammenfassung</CardTitle>
              <CardDescription className="text-gray-600">KI-generierte Zusammenfassung des Telefonats</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <Badge variant={call.status === 'Erfolgreich' ? 'default' : 'secondary'} className="text-white">
                    {call.status}
                  </Badge>
                  {call.themen?.length > 0 && call.themen.map((thema: string) => (
                    <Badge key={thema} variant="outline" className="text-gray-700 border-gray-300">{thema}</Badge>
                  ))}
                </div>
                
                {call.transcript ? (
                  <div className="bg-slate-800 border border-slate-700 p-4 rounded-lg">
                    <p className="text-sm text-slate-100 leading-relaxed">{call.transcript}</p>
                  </div>
                ) : (
                  <div className="bg-gray-100 border border-gray-300 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 italic">Keine Zusammenfassung verfügbar.</p>
                  </div>
                )}

                {call.notizen && (
                  <div className="mt-4">
                    <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-gray-700" />
                      Interne Notizen
                    </h4>
                    <div className="bg-amber-100 border border-amber-300 p-3 rounded-lg">
                      <p className="text-sm text-amber-900">{call.notizen}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Vollständiges Transkript */}
        <TabsContent value="transkript" className="space-y-4">
          <Card className="bg-white">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="text-gray-900">Vollständiges Transkript</CardTitle>
                  <CardDescription className="text-gray-600">Wort-für-Wort Aufzeichnung des Gesprächs</CardDescription>
                </div>
                {call.audioUrl && (
                  <Button size="sm" variant="outline" className="text-gray-700">
                    <Volume2 className="h-4 w-4 mr-2" />
                    Audio synchronisieren
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {call.fullTranscript ? (
                <div className="bg-slate-800 border border-slate-700 p-4 rounded-lg max-h-[600px] overflow-y-auto">
                  <pre className="text-sm text-slate-100 whitespace-pre-wrap font-sans leading-relaxed">
                    {call.fullTranscript}
                  </pre>
                </div>
              ) : (
                <div className="bg-gray-100 border border-gray-300 p-8 rounded-lg text-center">
                  <Mic className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-sm text-gray-600">Kein Transkript verfügbar.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Erkenntnisse */}
        <TabsContent value="erkenntnisse" className="space-y-4">
          <Card className="bg-white">
            <CardHeader>
              <CardTitle className="text-gray-900">KI-Erkenntnisse & Bewertung</CardTitle>
              <CardDescription className="text-gray-600">Automatisch extrahierte Informationen aus dem Gespräch</CardDescription>
            </CardHeader>
            <CardContent>
              {call.erkenntnisse && call.erkenntnisse.length > 0 ? (
                <div className="space-y-3">
                  {call.erkenntnisse.map((erkenntnis: any, idx: number) => (
                    <div key={idx} className="bg-white border border-gray-300 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold text-gray-900">{erkenntnis.kategorie}</h4>
                        <Badge variant={
                          erkenntnis.status === 'Vollständig' || erkenntnis.status === 'Bestätigt' ? 'default' :
                          erkenntnis.status === 'Fehlt' ? 'destructive' : 'secondary'
                        } className="text-white">
                          {erkenntnis.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-700">{erkenntnis.details}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-gray-100 border border-gray-300 p-8 rounded-lg text-center">
                  <CheckCircle2 className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-sm text-gray-600">Keine Erkenntnisse verfügbar.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Nächste Schritte */}
        <TabsContent value="naechste-schritte" className="space-y-4">
          <Card className="bg-white">
            <CardHeader>
              <CardTitle className="text-gray-900">Nächste Schritte & Aufgaben</CardTitle>
              <CardDescription className="text-gray-600">Automatisch generierte Follow-up Aktionen</CardDescription>
            </CardHeader>
            <CardContent>
              {call.naechsteSchritte && call.naechsteSchritte.length > 0 ? (
                <div className="space-y-3">
                  {call.naechsteSchritte.map((schritt: any, idx: number) => (
                    <div key={idx} className="bg-white border border-gray-300 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-2 gap-3">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 mb-1">{schritt.aufgabe}</h4>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Calendar className="h-3 w-3" />
                            <span>Frist: {schritt.frist}</span>
                          </div>
                        </div>
                        <Badge variant={
                          schritt.status === 'In Bearbeitung' ? 'default' :
                          schritt.status === 'Offen' ? 'secondary' : 'outline'
                        } className="text-white flex-shrink-0">
                          {schritt.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-gray-100 border border-gray-300 p-8 rounded-lg text-center">
                  <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-sm text-gray-600">Keine offenen Aufgaben.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Zurück Button */}
      <div className="flex justify-start">
        <Button variant="outline" asChild>
          <Link href="/dashboard/admin/telefonie">
            ← Zurück zur Telefonie-Übersicht
          </Link>
        </Button>
      </div>
    </div>
  )
}


