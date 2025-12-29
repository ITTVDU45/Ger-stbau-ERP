'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2, LogIn } from 'lucide-react'
import Image from 'next/image'

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [loadingSettings, setLoadingSettings] = useState(true)
  const [companyLogo, setCompanyLogo] = useState<string | null>(null)
  const [companyName, setCompanyName] = useState('Gerüstbau ERP')
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  
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
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      
      const data = await res.json()
      
      if (!data.erfolg) {
        toast.error(data.fehler || 'Login fehlgeschlagen')
        return
      }
      
      toast.success('Erfolgreich eingeloggt')
      
      // Verwende window.location für vollständigen Reload, damit Cookie gesetzt wird
      setTimeout(() => {
        window.location.href = '/dashboard'
      }, 500)
    } catch (error) {
      toast.error('Ein Fehler ist aufgetreten')
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-full max-w-md px-6">
        <Card className="w-full p-8 shadow-xl border border-gray-200">
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
          
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Anmelden</h2>
          
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-900 font-medium">E-Mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="ihre.email@beispiel.de"
                required
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="h-11 bg-white border-gray-300 text-gray-900 placeholder:text-gray-400"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-900 font-medium">Passwort</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••••••"
                required
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                className="h-11 bg-white border-gray-300 text-gray-900"
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full h-11 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium" 
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Anmelden...
                </>
              ) : (
                <>
                  <LogIn className="mr-2 h-4 w-4" />
                  Anmelden
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

