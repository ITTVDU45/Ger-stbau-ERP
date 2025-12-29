'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

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
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }
  
  if (!tokenValid) {
    return null
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md p-8">
        <h1 className="text-2xl font-bold mb-2">Passwort festlegen</h1>
        {userInfo && (
          <p className="text-gray-600 mb-6">
            Willkommen, {userInfo.firstName}! Bitte legen Sie Ihr Passwort fest.
          </p>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="password">Passwort</Label>
            <Input
              id="password"
              type="password"
              required
              minLength={12}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <p className="text-xs text-gray-600 mt-1">
              Mindestens 12 Zeichen, inkl. Groß-/Kleinbuchstaben, Ziffern und Sonderzeichen
            </p>
          </div>
          
          <div>
            <Label htmlFor="confirmPassword">Passwort bestätigen</Label>
            <Input
              id="confirmPassword"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Passwort wird gesetzt...' : 'Passwort festlegen'}
          </Button>
        </form>
      </Card>
    </div>
  )
}

export default function SetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    }>
      <SetPasswordContent />
    </Suspense>
  )
}

