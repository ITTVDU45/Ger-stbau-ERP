"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Mitarbeiter, Urlaub } from '@/lib/db/types'
import { Mail, Phone, MapPin, Calendar, Clock, Euro, FileText, CheckCircle2, XCircle, Edit2, Save, X } from 'lucide-react'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { toast } from 'sonner'

interface MitarbeiterUebersichtProps {
  mitarbeiterId: string
  mitarbeiter: Mitarbeiter
  onMitarbeiterUpdated?: () => void
}

export default function MitarbeiterUebersicht({ mitarbeiterId, mitarbeiter, onMitarbeiterUpdated }: MitarbeiterUebersichtProps) {
  const [urlaubStats, setUrlaubStats] = useState({
    jahresurlaub: mitarbeiter.jahresUrlaubstage || 0,
    genommen: 0,
    resturlaub: 0,
    loading: true
  })
  const [editingUrlaub, setEditingUrlaub] = useState(false)
  const [jahresurlaubInput, setJahresurlaubInput] = useState(mitarbeiter.jahresUrlaubstage?.toString() || '0')
  const [saving, setSaving] = useState(false)

  // Lade Urlaubsdaten und berechne Statistiken
  useEffect(() => {
    const loadUrlaubStats = async () => {
      try {
        // Lade alle genehmigten Urlaube für diesen Mitarbeiter im aktuellen Jahr
        const currentYear = new Date().getFullYear()
        const response = await fetch(`/api/urlaub?mitarbeiterId=${mitarbeiterId}`)
        
        if (response.ok) {
          const data = await response.json()
          const urlaube: Urlaub[] = data.urlaube || []
          
          // Filtere nur genehmigte Urlaube vom Typ 'urlaub' im aktuellen Jahr
          const genehmigteUrlaube = urlaube.filter((u: Urlaub) => {
            const urlaubJahr = new Date(u.von).getFullYear()
            return u.status === 'genehmigt' && u.typ === 'urlaub' && urlaubJahr === currentYear
          })
          
          // Summiere die genommenen Tage
          const genommenerUrlaub = genehmigteUrlaube.reduce((sum: number, u: Urlaub) => sum + (u.anzahlTage || 0), 0)
          
          const jahresurlaub = mitarbeiter.jahresUrlaubstage || 0
          const resturlaub = Math.max(0, jahresurlaub - genommenerUrlaub)
          
          setUrlaubStats({
            jahresurlaub,
            genommen: genommenerUrlaub,
            resturlaub,
            loading: false
          })
        } else {
          // API-Fehler - zeige gespeicherte Werte
          setUrlaubStats({
            jahresurlaub: mitarbeiter.jahresUrlaubstage || 0,
            genommen: mitarbeiter.genommenerUrlaub || 0,
            resturlaub: mitarbeiter.resturlaub || 0,
            loading: false
          })
        }
      } catch (error) {
        console.error('Fehler beim Laden der Urlaubsstats:', error)
        setUrlaubStats({
          jahresurlaub: mitarbeiter.jahresUrlaubstage || 0,
          genommen: mitarbeiter.genommenerUrlaub || 0,
          resturlaub: mitarbeiter.resturlaub || 0,
          loading: false
        })
      }
    }

    loadUrlaubStats()
  }, [mitarbeiterId, mitarbeiter.jahresUrlaubstage])

  // Jahresurlaub speichern
  const handleSaveJahresurlaub = async () => {
    const neuerWert = parseInt(jahresurlaubInput) || 0
    
    if (neuerWert < 0 || neuerWert > 365) {
      toast.error('Bitte geben Sie einen gültigen Wert ein (0-365)')
      return
    }

    setSaving(true)
    try {
      const response = await fetch(`/api/mitarbeiter/${mitarbeiterId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jahresUrlaubstage: neuerWert,
          resturlaub: Math.max(0, neuerWert - urlaubStats.genommen)
        })
      })

      if (response.ok) {
        toast.success('Jahresurlaub aktualisiert')
        setEditingUrlaub(false)
        setUrlaubStats(prev => ({
          ...prev,
          jahresurlaub: neuerWert,
          resturlaub: Math.max(0, neuerWert - prev.genommen)
        }))
        onMitarbeiterUpdated?.()
      } else {
        const data = await response.json()
        toast.error(data.fehler || 'Fehler beim Speichern')
      }
    } catch (error) {
      console.error('Fehler:', error)
      toast.error('Fehler beim Speichern')
    } finally {
      setSaving(false)
    }
  }
  
  const getBeschaeftigungsartLabel = (art: string) => {
    const labels: Record<string, string> = {
      festangestellt: 'Festangestellt',
      aushilfe: 'Aushilfe',
      subunternehmer: 'Subunternehmer'
    }
    return labels[art] || art
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Kontaktinformationen */}
      <Card className="bg-white border-gray-200">
        <CardHeader>
          <CardTitle className="text-gray-900 flex items-center gap-2">
            <Mail className="h-5 w-5 text-blue-600" />
            Kontaktinformationen
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-2">
            <Mail className="h-4 w-4 text-gray-500 mt-0.5" />
            <div>
              <p className="text-sm text-gray-600">E-Mail</p>
              <p className="text-gray-900 font-medium">{mitarbeiter.email}</p>
            </div>
          </div>
          
          {mitarbeiter.telefon && (
            <div className="flex items-start gap-2">
              <Phone className="h-4 w-4 text-gray-500 mt-0.5" />
              <div>
                <p className="text-sm text-gray-600">Telefon</p>
                <p className="text-gray-900 font-medium">{mitarbeiter.telefon}</p>
              </div>
            </div>
          )}
          
          {mitarbeiter.adresse && (
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
              <div>
                <p className="text-sm text-gray-600">Adresse</p>
                <p className="text-gray-900 font-medium">
                  {mitarbeiter.adresse.strasse} {mitarbeiter.adresse.hausnummer}<br />
                  {mitarbeiter.adresse.plz} {mitarbeiter.adresse.ort}
                  {mitarbeiter.adresse.land && <><br />{mitarbeiter.adresse.land}</>}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Beschäftigungsdaten */}
      <Card className="bg-white border-gray-200">
        <CardHeader>
          <CardTitle className="text-gray-900 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            Beschäftigungsdaten
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-sm text-gray-600">Beschäftigungsart</p>
            <Badge variant="outline" className="mt-1">
              {getBeschaeftigungsartLabel(mitarbeiter.beschaeftigungsart)}
            </Badge>
          </div>
          
          <div>
            <p className="text-sm text-gray-600">Eintrittsdatum</p>
            <p className="text-gray-900 font-medium">
              {mitarbeiter.eintrittsdatum ? format(new Date(mitarbeiter.eintrittsdatum), 'dd.MM.yyyy', { locale: de }) : '-'}
            </p>
          </div>
          
          {mitarbeiter.austrittsdatum && (
            <div>
              <p className="text-sm text-gray-600">Austrittsdatum</p>
              <p className="text-gray-900 font-medium">
                {format(new Date(mitarbeiter.austrittsdatum), 'dd.MM.yyyy', { locale: de })}
              </p>
            </div>
          )}
          
          {mitarbeiter.stundensatz && (
            <div className="flex items-start gap-2">
              <Euro className="h-4 w-4 text-gray-500 mt-0.5" />
              <div>
                <p className="text-sm text-gray-600">Stundensatz</p>
                <p className="text-gray-900 font-medium">{mitarbeiter.stundensatz.toFixed(2)} €</p>
              </div>
            </div>
          )}
          
          {mitarbeiter.wochenarbeitsstunden && (
            <div className="flex items-start gap-2">
              <Clock className="h-4 w-4 text-gray-500 mt-0.5" />
              <div>
                <p className="text-sm text-gray-600">Wochenarbeitsstunden</p>
                <p className="text-gray-900 font-medium">{mitarbeiter.wochenarbeitsstunden} Std.</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Qualifikationen */}
      <Card className="bg-white border-gray-200">
        <CardHeader>
          <CardTitle className="text-gray-900 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-blue-600" />
            Qualifikationen
          </CardTitle>
        </CardHeader>
        <CardContent>
          {mitarbeiter.qualifikationen && mitarbeiter.qualifikationen.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {mitarbeiter.qualifikationen.map((qual, idx) => (
                <Badge key={idx} variant="outline" className="text-sm">
                  {qual}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">Keine Qualifikationen hinterlegt</p>
          )}
        </CardContent>
      </Card>

      {/* Urlaubsübersicht */}
      <Card className="bg-white border-gray-200">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-gray-900 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            Urlaubsübersicht
          </CardTitle>
          {!editingUrlaub && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setJahresurlaubInput(urlaubStats.jahresurlaub.toString())
                setEditingUrlaub(true)
              }}
              className="text-gray-500 hover:text-gray-700"
            >
              <Edit2 className="h-4 w-4" />
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {urlaubStats.loading ? (
            <div className="text-center py-4">
              <p className="text-gray-500 text-sm">Lade Urlaubsdaten...</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600">Jahresurlaub</p>
                {editingUrlaub ? (
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      type="number"
                      min="0"
                      max="365"
                      value={jahresurlaubInput}
                      onChange={(e) => setJahresurlaubInput(e.target.value)}
                      className="w-20 h-8 text-center font-bold"
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleSaveJahresurlaub}
                      disabled={saving}
                      className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                    >
                      <Save className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingUrlaub(false)}
                      disabled={saving}
                      className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <p className="text-2xl font-bold text-gray-900">
                      {urlaubStats.jahresurlaub}
                    </p>
                    <p className="text-xs text-gray-500">Tage</p>
                  </>
                )}
              </div>
              
              <div>
                <p className="text-sm text-gray-600">Genommen</p>
                <p className="text-2xl font-bold text-orange-600">
                  {urlaubStats.genommen}
                </p>
                <p className="text-xs text-gray-500">Tage</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-600">Resturlaub</p>
                <p className="text-2xl font-bold text-green-600">
                  {urlaubStats.resturlaub}
                </p>
                <p className="text-xs text-gray-500">Tage</p>
              </div>
            </div>
          )}
          
          {!editingUrlaub && urlaubStats.jahresurlaub === 0 && !urlaubStats.loading && (
            <p className="text-xs text-gray-500 mt-2">
              Klicken Sie auf den Stift, um den Jahresurlaub festzulegen
            </p>
          )}
        </CardContent>
      </Card>

      {/* Verfügbarkeiten */}
      {mitarbeiter.verfuegbarkeiten && mitarbeiter.verfuegbarkeiten.length > 0 && (
        <Card className="bg-white border-gray-200 md:col-span-2">
          <CardHeader>
            <CardTitle className="text-gray-900 flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              Verfügbarkeiten
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-2">
              {mitarbeiter.verfuegbarkeiten.map((verf, idx) => (
                <div key={idx} className="text-center p-2 border border-gray-200 rounded">
                  <p className="text-xs font-medium text-gray-900 capitalize">{verf.tag}</p>
                  {verf.verfuegbar ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-green-600 mx-auto mt-1" />
                      {verf.von && verf.bis && (
                        <p className="text-xs text-gray-600 mt-1">{verf.von} - {verf.bis}</p>
                      )}
                    </>
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600 mx-auto mt-1" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notizen */}
      {mitarbeiter.notizen && (
        <Card className="bg-white border-gray-200 md:col-span-2">
          <CardHeader>
            <CardTitle className="text-gray-900 flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              Notizen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 whitespace-pre-wrap">{mitarbeiter.notizen}</p>
          </CardContent>
        </Card>
      )}

      {/* Status-Informationen */}
      <Card className="bg-white border-gray-200 md:col-span-2">
        <CardHeader>
          <CardTitle className="text-gray-900 flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            Status & Metadaten
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600">Status</p>
              <Badge variant={mitarbeiter.aktiv ? 'default' : 'secondary'} className={mitarbeiter.aktiv ? 'bg-green-600 mt-1' : 'mt-1'}>
                {mitarbeiter.aktiv ? 'Aktiv' : 'Inaktiv'}
              </Badge>
            </div>
            
            <div>
              <p className="text-sm text-gray-600">Erstellt am</p>
              <p className="text-gray-900 font-medium">
                {mitarbeiter.erstelltAm ? format(new Date(mitarbeiter.erstelltAm), 'dd.MM.yyyy HH:mm', { locale: de }) : '-'}
              </p>
            </div>
            
            <div>
              <p className="text-sm text-gray-600">Zuletzt geändert</p>
              <p className="text-gray-900 font-medium">
                {mitarbeiter.zuletztGeaendert ? format(new Date(mitarbeiter.zuletztGeaendert), 'dd.MM.yyyy HH:mm', { locale: de }) : '-'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

