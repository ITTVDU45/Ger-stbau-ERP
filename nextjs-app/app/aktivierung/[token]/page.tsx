"use client"

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, AlertCircle, Loader2, UserCheck, ArrowRight } from 'lucide-react'
import colors from '@/lib/theme/colors'

export default function AktivierungsPage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string

  const [status, setStatus] = useState<'loading' | 'erfolg' | 'fehler' | 'abgelaufen' | 'bereits_aktiviert'>('loading')
  const [nachricht, setNachricht] = useState('')
  const [nutzerData, setNutzerData] = useState<{
    name: string
    email: string
    gutachterNummer: string
  } | null>(null)

  useEffect(() => {
    if (token) {
      aktivieren()
    }
  }, [token])

  const aktivieren = async () => {
    try {
      const response = await fetch(`/api/aktivierung/${token}`, {
        method: 'POST'
      })

      const data = await response.json()

      if (data.erfolg) {
        setStatus('erfolg')
        setNachricht(data.nachricht || 'Ihr Account wurde erfolgreich aktiviert!')
        setNutzerData(data.data)
      } else if (response.status === 410) {
        setStatus('abgelaufen')
        setNachricht(data.nachricht || 'Der Aktivierungslink ist abgelaufen')
      } else if (response.status === 409) {
        setStatus('bereits_aktiviert')
        setNachricht(data.nachricht || 'Dieser Account wurde bereits aktiviert')
      } else {
        setStatus('fehler')
        setNachricht(data.nachricht || 'Ein Fehler ist aufgetreten')
      }
    } catch (error) {
      console.error('Aktivierungsfehler:', error)
      setStatus('fehler')
      setNachricht('Ein unerwarteter Fehler ist aufgetreten')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: colors.background.gradientBlue }}>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center flex items-center justify-center gap-2">
            <UserCheck className="h-6 w-6" style={{ color: colors.secondary.main }} />
            Account-Aktivierung
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {status === 'loading' && (
            <div className="text-center py-8">
              <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin" style={{ color: colors.primary.main }} />
              <p className="text-gray-600">Aktivierung wird durchgeführt...</p>
            </div>
          )}

          {status === 'erfolg' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ background: colors.background.gradientGreen }}>
                <CheckCircle className="h-10 w-10 text-white" />
              </div>
              <h2 className="text-xl font-bold mb-2" style={{ color: colors.secondary.main }}>
                Willkommen bei Rechtly!
              </h2>
              <p className="text-gray-600 mb-4">{nachricht}</p>
              
              {nutzerData && (
                <div className="bg-blue-50 rounded-lg p-4 mb-6 text-left">
                  <h3 className="font-semibold text-sm mb-2" style={{ color: colors.secondary.main }}>
                    Ihre Account-Daten:
                  </h3>
                  <div className="space-y-1 text-sm text-gray-700">
                    <p><strong>Name:</strong> {nutzerData.name}</p>
                    <p><strong>E-Mail:</strong> {nutzerData.email}</p>
                    <p><strong>Gutachter-Nr.:</strong> {nutzerData.gutachterNummer}</p>
                  </div>
                </div>
              )}

              <p className="text-sm text-gray-500 mb-6">
                Sie können sich nun mit Ihrer E-Mail-Adresse einloggen und alle Funktionen der Gutachter-Plattform nutzen.
              </p>
              
              <Button
                onClick={() => router.push('/')}
                style={{ background: colors.background.gradientGreen, color: colors.text.onPrimary }}
                className="w-full"
              >
                Zum Login
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          )}

          {status === 'bereits_aktiviert' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center bg-blue-100">
                <CheckCircle className="h-10 w-10 text-blue-600" />
              </div>
              <h2 className="text-xl font-bold mb-2 text-blue-900">Bereits aktiviert</h2>
              <p className="text-gray-600 mb-6">{nachricht}</p>
              <Button
                onClick={() => router.push('/')}
                variant="outline"
                style={{ borderColor: colors.secondary.main, color: colors.secondary.main }}
                className="w-full"
              >
                Zum Login
              </Button>
            </div>
          )}

          {status === 'abgelaufen' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center bg-yellow-100">
                <AlertCircle className="h-10 w-10 text-yellow-600" />
              </div>
              <h2 className="text-xl font-bold mb-2 text-yellow-900">Link abgelaufen</h2>
              <p className="text-gray-600 mb-6">{nachricht}</p>
              <p className="text-sm text-gray-500 mb-4">
                Bitte kontaktieren Sie den Support unter support@rechtly.de, um einen neuen Aktivierungslink zu erhalten.
              </p>
              <Button
                variant="outline"
                onClick={() => router.push('/')}
                style={{ borderColor: colors.secondary.main, color: colors.secondary.main }}
                className="w-full"
              >
                Zum Login
              </Button>
            </div>
          )}

          {status === 'fehler' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center bg-red-100">
                <AlertCircle className="h-10 w-10 text-red-600" />
              </div>
              <h2 className="text-xl font-bold mb-2 text-red-900">Fehler</h2>
              <p className="text-gray-600 mb-6">{nachricht}</p>
              <p className="text-sm text-gray-500 mb-4">
                Falls das Problem weiterhin besteht, kontaktieren Sie bitte den Support unter support@rechtly.de
              </p>
              <Button
                variant="outline"
                onClick={() => router.push('/')}
                style={{ borderColor: colors.secondary.main, color: colors.secondary.main }}
                className="w-full"
              >
                Zum Login
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

