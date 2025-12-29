'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2, Lock, CheckCircle2 } from 'lucide-react'
import Image from 'next/image'

function SetPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  
  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(true)
  const [tokenValid, setTokenValid] = useState(false)
  const [userInfo, setUserInfo] = useState<any>(null)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [companyLogo, setCompanyLogo] = useState<string | null>(null)
  const [companyName, setCompanyName] = useState('Gerüstbau ERP')
  const [loadingSettings, setLoadingSettings] = useState(true)
  
  // Lade Firmenlogo und -name
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch('/api/settings/firmen')
        const data = await response.json()
        
        if (data.erfolg && data.einstellungen) {
          if (data.einstellungen.logo?.primary) {
            setCompanyLogo(data.einstellungen.logo.primary)
          }
          if (data.einstellungen.firmenname) {
            setCompanyName(data.einstellungen.firmenname)
          }
        }
      } catch (error) {
        console.error('Fehler beim Laden der Einstellungen:', error)
      } finally {
        setLoadingSettings(false)
      }
    }
    
    loadSettings()
  }, [])
  
  useEffect(() => {
    if (!token) {
      toast.error('Kein Token gefunden')
      router.push('/login')
      return
    }
    
    verifyToken()
  }, [token])
  
  const verifyToken = async () => {
    try {
      const res = await fetch(`/api/invitations/verify?token=${token}`)
      const data = await res.json()
      
      if (data.erfolg && data.valid) {
        setTokenValid(true)
        setUserInfo(data)
      } else {
        toast.error(data.fehler || 'Token ungültig')
        setTimeout(() => router.push('/login'), 2000)
      }
    } catch (error) {
      toast.error('Fehler beim Verifizieren des Tokens')
    } finally {
      setVerifying(false)
    }
  }
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (password !== confirmPassword) {
      toast.error('Passwörter stimmen nicht überein')
      return
    }
    
    if (password.length < 12) {
      toast.error('Passwort muss mindestens 12 Zeichen lang sein')
      return
    }
    
    setLoading(true)
    
    try {
      const res = await fetch('/api/auth/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
      })
      
      const data = await res.json()
      
      if (!data.erfolg) {
        if (data.errors) {
          data.errors.forEach((err: string) => toast.error(err))
        } else {
          toast.error(data.fehler || 'Passwort konnte nicht gesetzt werden')
        }
        return
      }
      
      toast.success('Passwort erfolgreich gesetzt! Sie werden weitergeleitet...')
      setTimeout(() => router.push('/dashboard'), 1500)
    } catch (error) {
      toast.error('Ein Fehler ist aufgetreten')
    } finally {
      setLoading(false)
    }
  }
  
  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#ffffff' }}>
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }
  
  if (!tokenValid) {
    return null
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#ffffff' }}>
      <div className="w-full max-w-md px-6">
        <Card className="w-full p-8 shadow-xl border border-gray-200" style={{ backgroundColor: '#ffffff', color: '#111827' }}>
          {/* Logo & Header */}
          <div className="text-center mb-8">
            {loadingSettings ? (
              <div className="h-20 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            ) : (
              <>
                {companyLogo ? (
                  <div className="mb-4 flex justify-center">
                    <div className="relative w-full h-20 max-w-[280px]">
                      <Image 
                        src={companyLogo} 
                        alt={`${companyName} Logo`}
                        fill
                        className="object-contain"
                        priority
                      />
                    </div>
                  </div>
                ) : (
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">{companyName}</h1>
                )}
                <p className="text-gray-600 text-sm">Management System</p>
              </>
            )}
          </div>

          {/* Trennlinie */}
          <div className="mb-8 border-t border-gray-200"></div>
          
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Passwort festlegen</h2>
            {userInfo && (
              <p className="text-gray-600 text-sm">
                Willkommen, <span className="font-medium text-gray-900">{userInfo.firstName}</span>! 
                Bitte legen Sie Ihr Passwort fest.
              </p>
            )}
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-900 font-medium" style={{ color: '#111827' }}>Neues Passwort</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••••••"
                required
                minLength={12}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 bg-white border-gray-300 text-gray-900"
                style={{ backgroundColor: '#ffffff', color: '#111827', borderColor: '#d1d5db' }}
              />
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mt-2">
                <p className="text-xs text-gray-700 font-medium mb-1">Passwort-Anforderungen:</p>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className={`h-3 w-3 ${password.length >= 12 ? 'text-green-600' : 'text-gray-400'}`} />
                    Mindestens 12 Zeichen
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className={`h-3 w-3 ${/[A-Z]/.test(password) ? 'text-green-600' : 'text-gray-400'}`} />
                    Großbuchstaben
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className={`h-3 w-3 ${/[a-z]/.test(password) ? 'text-green-600' : 'text-gray-400'}`} />
                    Kleinbuchstaben
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className={`h-3 w-3 ${/[0-9]/.test(password) ? 'text-green-600' : 'text-gray-400'}`} />
                    Ziffern
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className={`h-3 w-3 ${/[^A-Za-z0-9]/.test(password) ? 'text-green-600' : 'text-gray-400'}`} />
                    Sonderzeichen
                  </li>
                </ul>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-gray-900 font-medium" style={{ color: '#111827' }}>Passwort bestätigen</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••••••"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="h-11 bg-white border-gray-300 text-gray-900"
                style={{ backgroundColor: '#ffffff', color: '#111827', borderColor: '#d1d5db' }}
              />
              {confirmPassword && password !== confirmPassword && (
                <p className="text-xs text-red-600">Passwörter stimmen nicht überein</p>
              )}
            </div>
            
            <Button 
              type="submit" 
              className="w-full h-11 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium" 
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Passwort wird gesetzt...
                </>
              ) : (
                <>
                  <Lock className="mr-2 h-4 w-4" />
                  Passwort festlegen
                </>
              )}
            </Button>
          </form>
          
          {/* Footer */}
          <div className="mt-6 text-center text-xs text-gray-500">
            <p>© {new Date().getFullYear()} {companyName}</p>
          </div>
        </Card>
      </div>
    </div>
  )
}

export default function SetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#ffffff' }}>
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    }>
      <SetPasswordContent />
    </Suspense>
  )
}

