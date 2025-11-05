'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Projekt, Kunde } from '@/lib/db/types'
import { ExternalLink, Phone, Mail, MapPin, User } from 'lucide-react'
import { toast } from 'sonner'

interface ProjektKundeTabProps {
  projekt: Projekt
}

export default function ProjektKundeTab({ projekt }: ProjektKundeTabProps) {
  const router = useRouter()
  const [kunde, setKunde] = useState<Kunde | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadKunde()
  }, [projekt.kundeId])

  const loadKunde = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/kunden/${projekt.kundeId}`)
      const data = await response.json()
      
      if (data.erfolg) {
        setKunde(data.kunde)
      } else {
        toast.error('Fehler beim Laden der Kundendaten')
      }
    } catch (error) {
      console.error('Fehler:', error)
      toast.error('Fehler beim Laden')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card className="bg-white border-gray-200">
        <CardContent className="p-6">
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!kunde) {
    return (
      <Card className="bg-white border-gray-200">
        <CardContent className="p-6">
          <p className="text-gray-600">Kundendaten nicht gefunden</p>
        </CardContent>
      </Card>
    )
  }

  const getKundentypBadge = (typ: Kunde['kundentyp']) => {
    const config = {
      privat: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-300', label: 'Privat' },
      gewerblich: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-300', label: 'Gewerblich' },
      oeffentlich: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-300', label: 'Öffentlich' },
    }
    const c = config[typ]
    return <Badge variant="outline" className={`${c.bg} ${c.text} ${c.border}`}>{c.label}</Badge>
  }

  return (
    <div className="space-y-6">
      <Card className="bg-white border-gray-200">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-gray-900">Kundeninformationen</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/dashboard/admin/kunden/${projekt.kundeId}`)}
            className="border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Kundendetails öffnen
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Firmendaten */}
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">{kunde.firma || `${kunde.vorname} ${kunde.nachname}`}</h3>
                <div className="flex items-center gap-2 mt-1">
                  {kunde.kundennummer && (
                    <p className="text-sm text-gray-600">Kundennr.: {kunde.kundennummer}</p>
                  )}
                  {getKundentypBadge(kunde.kundentyp)}
                </div>
              </div>
            </div>

            {/* Kontaktdaten */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {kunde.telefon && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-xs text-gray-600">Telefon</p>
                    <p className="text-sm font-medium text-gray-900">{kunde.telefon}</p>
                  </div>
                </div>
              )}

              {kunde.mobil && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-xs text-gray-600">Mobil</p>
                    <p className="text-sm font-medium text-gray-900">{kunde.mobil}</p>
                  </div>
                </div>
              )}

              {kunde.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-xs text-gray-600">E-Mail</p>
                    <p className="text-sm font-medium text-gray-900">{kunde.email}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Adresse */}
            {kunde.adresse && (
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-gray-500 mt-1" />
                <div>
                  <p className="text-xs text-gray-600">Adresse</p>
                  <p className="text-sm font-medium text-gray-900">
                    {kunde.adresse.strasse} {kunde.adresse.hausnummer}<br />
                    {kunde.adresse.plz} {kunde.adresse.ort}
                    {kunde.adresse.land && kunde.adresse.land !== 'Deutschland' && (
                      <><br />{kunde.adresse.land}</>
                    )}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Ansprechpartner */}
          {kunde.ansprechpartner && (kunde.ansprechpartner.vorname || kunde.ansprechpartner.nachname) && (
            <div className="border-t border-gray-200 pt-4">
              <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <User className="h-4 w-4" />
                Ansprechpartner
              </h4>
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-gray-600">Name</p>
                  <p className="text-sm font-medium text-gray-900">
                    {kunde.ansprechpartner.vorname} {kunde.ansprechpartner.nachname}
                  </p>
                  {kunde.ansprechpartner.position && (
                    <p className="text-xs text-gray-600">{kunde.ansprechpartner.position}</p>
                  )}
                </div>
                {kunde.ansprechpartner.telefon && (
                  <div>
                    <p className="text-xs text-gray-600">Telefon</p>
                    <p className="text-sm font-medium text-gray-900">{kunde.ansprechpartner.telefon}</p>
                  </div>
                )}
                {kunde.ansprechpartner.email && (
                  <div>
                    <p className="text-xs text-gray-600">E-Mail</p>
                    <p className="text-sm font-medium text-gray-900">{kunde.ansprechpartner.email}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* KPIs */}
          {(kunde.anzahlProjekte || kunde.anzahlAngebote || kunde.umsatzGesamt) && (
            <div className="border-t border-gray-200 pt-4">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Statistiken</h4>
              <div className="grid grid-cols-3 gap-4">
                {kunde.anzahlProjekte !== undefined && (
                  <div>
                    <p className="text-xs text-gray-600">Projekte</p>
                    <p className="text-lg font-bold text-gray-900">{kunde.anzahlProjekte}</p>
                  </div>
                )}
                {kunde.anzahlAngebote !== undefined && (
                  <div>
                    <p className="text-xs text-gray-600">Angebote</p>
                    <p className="text-lg font-bold text-gray-900">{kunde.anzahlAngebote}</p>
                  </div>
                )}
                {kunde.umsatzGesamt !== undefined && (
                  <div>
                    <p className="text-xs text-gray-600">Umsatz</p>
                    <p className="text-lg font-bold text-gray-900">
                      {kunde.umsatzGesamt.toLocaleString('de-DE', { minimumFractionDigits: 0 })} €
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

