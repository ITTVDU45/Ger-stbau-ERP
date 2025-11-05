"use client"

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, AlertCircle, Loader2, Shield } from 'lucide-react'
import colors from '@/lib/theme/colors'

export default function VerifizierungsPage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string

  const [status, setStatus] = useState<'loading' | 'erfolg' | 'fehler' | 'abgelaufen'>('loading')
  const [nachricht, setNachricht] = useState('')

  useEffect(() => {
    if (token) {
      verifizieren()
    }
  }, [token])

  const verifizieren = async () => {
    try {
      const response = await fetch(`/api/verifizierung/${token}`, {
        method: 'POST'
      })

      const data = await response.json()

      if (data.erfolg) {
        setStatus('erfolg')
        setNachricht(data.nachricht || 'Ihr Account wurde erfolgreich bestätigt!')
      } else if (response.status === 410) {
        setStatus('abgelaufen')
        setNachricht(data.nachricht || 'Der Verifizierungslink ist abgelaufen')
      } else {
        setStatus('fehler')
        setNachricht(data.nachricht || 'Ein Fehler ist aufgetreten')
      }
    } catch (error) {
      console.error('Verifizierungsfehler:', error)
      setStatus('fehler')
      setNachricht('Ein unerwarteter Fehler ist aufgetreten')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: colors.background.gradientBlue }}>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center flex items-center justify-center gap-2">
            <Shield className="h-6 w-6" style={{ color: colors.secondary.main }} />
            Account-Verifizierung
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {status === 'loading' && (
            <div className="text-center py-8">
              <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin" style={{ color: colors.primary.main }} />
              <p className="text-gray-600">Verifizierung wird durchgeführt...</p>
            </div>
          )}

          {status === 'erfolg' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center bg-green-100">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
              <h2 className="text-xl font-bold mb-2 text-green-900">Erfolgreich bestätigt!</h2>
              <p className="text-gray-600 mb-6">{nachricht}</p>
              <p className="text-sm text-gray-500 mb-4">
                Ein Administrator wird Ihren Account nun final verifizieren. Sie erhalten eine Benachrichtigung, sobald die Verifizierung abgeschlossen ist.
              </p>
              <Button
                onClick={() => router.push('/')}
                style={{ background: colors.background.gradientGreen, color: colors.text.onPrimary }}
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
                Bitte kontaktieren Sie den Support, um einen neuen Verifizierungslink zu erhalten.
              </p>
              <Button
                variant="outline"
                onClick={() => router.push('/')}
                style={{ borderColor: colors.secondary.main, color: colors.secondary.main }}
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
              <Button
                variant="outline"
                onClick={() => router.push('/')}
                style={{ borderColor: colors.secondary.main, color: colors.secondary.main }}
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

