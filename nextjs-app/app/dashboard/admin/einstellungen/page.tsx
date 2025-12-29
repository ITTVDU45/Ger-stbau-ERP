"use client"

import React, { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import VorlagenFirmendatenContent from './components/VorlagenFirmendatenContent'
import KalkulationsparameterTab from './components/KalkulationsparameterTab'
import MahnwesenSettingsTab from './components/MahnwesenSettingsTab'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import {
  UserPlus,
  Mail,
  Bell,
  Building,
  Save,
  Send,
  Copy,
  RefreshCw,
  User as UserIcon,
  Loader2,
  Upload,
  X
} from 'lucide-react'
import { User } from '@/lib/db/types'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

// Typ-Definitionen für Einladungen
interface InvitationType {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  sentAt: string
  status: string
  statusLabel: string
  expiresAt: string
  usedAt: string | null
}

export default function AdminEinstellungenPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('general')
  
  // Firmeneinstellungen-States
  const [systemSettings, setSystemSettings] = useState({
    firmenname: '',
    supportEmail: '',
    supportPhone: '',
    imprintUrl: '',
    privacyUrl: ''
  })
  const [loadingSystemSettings, setLoadingSystemSettings] = useState(true)
  const [savingSystemSettings, setSavingSystemSettings] = useState(false)
  
  // Benachrichtigungsvorlagen-States
  const [benachrichtigungsVorlagen, setBenachrichtigungsVorlagen] = useState({
    willkommen: { betreff: '', inhalt: '', aktiv: true },
    passwortZuruecksetzen: { betreff: '', inhalt: '', aktiv: true },
    angebotVersendet: { betreff: '', inhalt: '', aktiv: true },
    rechnungVersendet: { betreff: '', inhalt: '', aktiv: true },
    rechnungBezahlt: { betreff: '', inhalt: '', aktiv: true },
    zahlungserinnerung: { betreff: '', inhalt: '', aktiv: true },
    mahnungErstellt: { betreff: '', inhalt: '', aktiv: true }
  })
  const [loadingBenachrichtigungen, setLoadingBenachrichtigungen] = useState(true)
  const [savingBenachrichtigungen, setSavingBenachrichtigungen] = useState(false)
  
  const [newInvitation, setNewInvitation] = useState({ 
    firstName: '',
    lastName: '',
    email: '', 
    role: 'ADMIN' 
  })
  const [inviteLoading, setInviteLoading] = useState(false)
  const [invitations, setInvitations] = useState<InvitationType[]>([])
  const [loadingInvitations, setLoadingInvitations] = useState(false)
  const [resendingId, setResendingId] = useState<string | null>(null)

  // Profil-States
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [loadingProfile, setLoadingProfile] = useState(false)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    telefon: '',
    geburtsdatum: '',
    personalnummer: '',
    strasse: '',
    hausnummer: '',
    plz: '',
    stadt: '',
    land: 'Deutschland',
    notfallkontaktName: '',
    notfallkontaktBeziehung: '',
    notfallkontaktTelefon: '',
    iban: '',
    bic: '',
    bankname: '',
    steuerID: '',
    sozialversicherungsnummer: ''
  })

  // Lade Einladungen von der API
  const loadInvitations = async () => {
    setLoadingInvitations(true)
    try {
      const response = await fetch('/api/invitations/list')
      const data = await response.json()
      
      if (data.erfolg) {
        setInvitations(data.invitations || [])
      } else {
        console.error('Fehler beim Laden der Einladungen:', data.fehler)
      }
    } catch (error) {
      console.error('Fehler beim Laden der Einladungen:', error)
    } finally {
      setLoadingInvitations(false)
    }
  }

  // Lade Einladungen und Benutzerprofil beim Laden der Komponente
  useEffect(() => {
    loadInvitations()
    loadCurrentUser()
    loadSystemSettings()
    loadBenachrichtigungsVorlagen()
  }, [])
  
  // Firmeneinstellungen laden
  const loadSystemSettings = async () => {
    try {
      setLoadingSystemSettings(true)
      const response = await fetch('/api/settings/firmen')
      const data = await response.json()
      
      if (data.erfolg && data.einstellungen) {
        setSystemSettings({
          firmenname: data.einstellungen.firmenname || '',
          supportEmail: data.einstellungen.supportEmail || '',
          supportPhone: data.einstellungen.supportPhone || '',
          imprintUrl: data.einstellungen.imprintUrl || '',
          privacyUrl: data.einstellungen.privacyUrl || ''
        })
      }
    } catch (error) {
      console.error('Fehler beim Laden der Firmeneinstellungen:', error)
      toast.error('Fehler beim Laden der Firmeneinstellungen')
    } finally {
      setLoadingSystemSettings(false)
    }
  }
  
  // Benachrichtigungsvorlagen laden
  const loadBenachrichtigungsVorlagen = async () => {
    try {
      setLoadingBenachrichtigungen(true)
      const response = await fetch('/api/settings/benachrichtigungen')
      const data = await response.json()
      
      if (data.erfolg && data.vorlagen) {
        setBenachrichtigungsVorlagen({
          willkommen: data.vorlagen.willkommen || { betreff: '', inhalt: '', aktiv: true },
          passwortZuruecksetzen: data.vorlagen.passwortZuruecksetzen || { betreff: '', inhalt: '', aktiv: true },
          angebotVersendet: data.vorlagen.angebotVersendet || { betreff: '', inhalt: '', aktiv: true },
          rechnungVersendet: data.vorlagen.rechnungVersendet || { betreff: '', inhalt: '', aktiv: true },
          rechnungBezahlt: data.vorlagen.rechnungBezahlt || { betreff: '', inhalt: '', aktiv: true },
          zahlungserinnerung: data.vorlagen.zahlungserinnerung || { betreff: '', inhalt: '', aktiv: true },
          mahnungErstellt: data.vorlagen.mahnungErstellt || { betreff: '', inhalt: '', aktiv: true }
        })
      }
    } catch (error) {
      console.error('Fehler beim Laden der Benachrichtigungsvorlagen:', error)
      toast.error('Fehler beim Laden der Benachrichtigungsvorlagen')
    } finally {
      setLoadingBenachrichtigungen(false)
    }
  }
  
  // Benachrichtigungsvorlagen speichern
  const saveBenachrichtigungsVorlagen = async () => {
    try {
      setSavingBenachrichtigungen(true)
      const response = await fetch('/api/settings/benachrichtigungen', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(benachrichtigungsVorlagen)
      })
      
      const data = await response.json()
      
      if (data.erfolg) {
        toast.success('Benachrichtigungsvorlagen erfolgreich gespeichert')
        await loadBenachrichtigungsVorlagen()
      } else {
        toast.error(data.fehler || 'Fehler beim Speichern')
      }
    } catch (error) {
      console.error('Fehler beim Speichern der Benachrichtigungsvorlagen:', error)
      toast.error('Fehler beim Speichern der Benachrichtigungsvorlagen')
    } finally {
      setSavingBenachrichtigungen(false)
    }
  }

  // Lade aktuellen Benutzer
  const loadCurrentUser = async () => {
    setLoadingProfile(true)
    try {
      // Cache-Bypass durch Timestamp
      const response = await fetch(`/api/users/me?t=${Date.now()}`, {
        cache: 'no-store'
      })
      const data = await response.json()
      if (data.erfolg) {
        console.log('📦 Loaded user data:', data.user)
        console.log('🖼️ Profilbild URL:', data.user.profile?.profilbild?.url)
        
        setCurrentUser(data.user)
        // Fülle Formular mit Benutzerdaten
        setProfileData({
          firstName: data.user.firstName || '',
          lastName: data.user.lastName || '',
          email: data.user.email || '',
          telefon: data.user.profile?.telefon || '',
          geburtsdatum: data.user.profile?.geburtsdatum 
            ? new Date(data.user.profile.geburtsdatum).toISOString().split('T')[0] 
            : '',
          personalnummer: data.user.profile?.personalnummer || '',
          strasse: data.user.profile?.adresse?.strasse || '',
          hausnummer: data.user.profile?.adresse?.hausnummer || '',
          plz: data.user.profile?.adresse?.plz || '',
          stadt: data.user.profile?.adresse?.stadt || '',
          land: data.user.profile?.adresse?.land || 'Deutschland',
          notfallkontaktName: data.user.profile?.notfallkontakt?.name || '',
          notfallkontaktBeziehung: data.user.profile?.notfallkontakt?.beziehung || '',
          notfallkontaktTelefon: data.user.profile?.notfallkontakt?.telefon || '',
          iban: data.user.profile?.bankdaten?.iban || '',
          bic: data.user.profile?.bankdaten?.bic || '',
          bankname: data.user.profile?.bankdaten?.bankname || '',
          steuerID: data.user.profile?.steuerDaten?.steuerID || '',
          sozialversicherungsnummer: data.user.profile?.steuerDaten?.sozialversicherungsnummer || ''
        })
      }
    } catch (error) {
      console.error('Fehler beim Laden des Benutzers:', error)
      toast.error('Fehler beim Laden des Benutzerprofils')
    } finally {
      setLoadingProfile(false)
    }
  }

  // Handle Avatar-File-Selection
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validiere Dateityp
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
      if (!allowedTypes.includes(file.type)) {
        toast.error('Nur JPG, PNG und WebP Bilder sind erlaubt')
        return
      }
      
      // Validiere Dateigröße (max 5MB)
      const maxSize = 5 * 1024 * 1024 // 5MB
      if (file.size > maxSize) {
        toast.error('Datei ist zu groß. Maximum: 5MB')
        return
      }
      
      setAvatarFile(file)
      
      // Erstelle Vorschau
      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  // Upload Avatar
  const handleAvatarUpload = async () => {
    if (!avatarFile) {
      toast.error('Bitte wählen Sie ein Bild aus')
      return
    }

    setUploadingAvatar(true)
    try {
      const formData = new FormData()
      formData.append('file', avatarFile)

      const response = await fetch('/api/users/avatar', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (data.erfolg) {
        toast.success('Profilbild erfolgreich hochgeladen!')
        
        // Setze die neue URL direkt im currentUser State
        if (currentUser) {
          setCurrentUser({
            ...currentUser,
            profile: {
              ...currentUser.profile,
              profilbild: {
                url: data.url,
                filename: data.filename,
                uploadedAt: new Date()
              }
            }
          })
        }
        
        setAvatarFile(null)
        setAvatarPreview(null)
        
        // Reload user data vom Server
        await loadCurrentUser()
        
        // Refresh server components (Sidebar)
        router.refresh()
      } else {
        toast.error(data.fehler || 'Fehler beim Hochladen')
      }
    } catch (error) {
      console.error('Fehler beim Hochladen des Profilbilds:', error)
      toast.error('Fehler beim Hochladen des Profilbilds')
    } finally {
      setUploadingAvatar(false)
    }
  }

  // Lösche Avatar
  const handleAvatarDelete = async () => {
    if (!currentUser?.profile?.profilbild?.url) {
      return
    }

    setUploadingAvatar(true)
    try {
      const response = await fetch('/api/users/avatar', {
        method: 'DELETE'
      })

      const data = await response.json()

      if (data.erfolg) {
        toast.success('Profilbild erfolgreich gelöscht!')
        await loadCurrentUser() // Reload user data
        router.refresh() // Refresh server components (Sidebar)
      } else {
        toast.error(data.fehler || 'Fehler beim Löschen')
      }
    } catch (error) {
      console.error('Fehler beim Löschen des Profilbilds:', error)
      toast.error('Fehler beim Löschen des Profilbilds')
    } finally {
      setUploadingAvatar(false)
    }
  }

  // Speichere Profil-Änderungen
  const handleProfileUpdate = async () => {
    if (!profileData.firstName || !profileData.lastName) {
      toast.error('Vorname und Nachname sind erforderlich')
      return
    }

    setProfileLoading(true)
    try {
      const response = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData)
      })
      
      const data = await response.json()
      if (data.erfolg) {
        toast.success('Profil erfolgreich aktualisiert!')
        await loadCurrentUser() // Reload user data
      } else {
        toast.error(data.fehler || 'Fehler beim Speichern')
      }
    } catch (error) {
      console.error('Fehler beim Speichern des Profils:', error)
      toast.error('Fehler beim Speichern des Profils')
    } finally {
      setProfileLoading(false)
    }
  }

  const handleSendInvitation = async () => {
    if (!newInvitation.firstName || !newInvitation.lastName || !newInvitation.email) {
      toast.error('Bitte füllen Sie alle Felder aus')
      return
    }

    setInviteLoading(true)
    try {
      const response = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: newInvitation.firstName,
          lastName: newInvitation.lastName,
          email: newInvitation.email,
          role: newInvitation.role
        })
      })

      const data = await response.json()

      if (data.erfolg) {
        toast.success('Einladung erfolgreich versendet! Der Benutzer erhält eine E-Mail mit dem Aktivierungslink.')
        setNewInvitation({ firstName: '', lastName: '', email: '', role: 'ADMIN' })
        // Aktualisiere die Einladungsliste
        await loadInvitations()
      } else {
        toast.error(data.fehler || 'Einladung konnte nicht versendet werden')
      }
    } catch (error) {
      console.error('Fehler beim Versenden der Einladung:', error)
      toast.error('Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.')
    } finally {
      setInviteLoading(false)
    }
  }

  const handleResendInvitation = async (invitationId: string) => {
    setResendingId(invitationId)
    try {
      const response = await fetch('/api/invitations/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invitationId })
      })

      const data = await response.json()

      if (data.erfolg) {
        toast.success('Einladung wurde erneut versendet!')
        await loadInvitations()
      } else {
        toast.error(data.fehler || 'Fehler beim erneuten Senden der Einladung')
      }
    } catch (error) {
      console.error('Fehler beim erneuten Senden:', error)
      toast.error('Ein Fehler ist aufgetreten.')
    } finally {
      setResendingId(null)
    }
  }

  const handleSaveSettings = async () => {
    try {
      // Validierung
      if (!systemSettings.firmenname || !systemSettings.supportEmail) {
        toast.error('Firmenname und Support-E-Mail sind erforderlich')
        return
      }
      
      setSavingSystemSettings(true)
      const response = await fetch('/api/settings/firmen', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(systemSettings)
      })
      
      const data = await response.json()
      
      if (data.erfolg) {
        toast.success('Firmeneinstellungen erfolgreich gespeichert')
        await loadSystemSettings() // Neu laden
      } else {
        toast.error(data.fehler || 'Fehler beim Speichern')
      }
    } catch (error) {
      console.error('Fehler beim Speichern der Firmeneinstellungen:', error)
      toast.error('Fehler beim Speichern der Firmeneinstellungen')
    } finally {
      setSavingSystemSettings(false)
    }
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <Card className="bg-white border shadow-sm">
        <CardHeader>
          <CardTitle className="text-gray-900 text-2xl">System-Einstellungen</CardTitle>
          <CardDescription className="text-gray-600">
            Konfiguration und Verwaltung des Gerüstbau ERP Systems
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="general">Allgemein</TabsTrigger>
          <TabsTrigger value="company">Vorlagen & Firmendaten</TabsTrigger>
          <TabsTrigger value="kalkulation">Kalkulation</TabsTrigger>
          <TabsTrigger value="mahnwesen">Mahnwesen</TabsTrigger>
          <TabsTrigger value="invitations">Einladungen</TabsTrigger>
          <TabsTrigger value="notifications">Benachrichtigungen</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card className="bg-white border shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <Building className="h-5 w-5" />
                Unternehmensdaten
              </CardTitle>
              <CardDescription className="text-gray-600">Grundlegende Informationen über Ihr Unternehmen</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingSystemSettings ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                </div>
              ) : (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="companyName">Firmenname</Label>
                      <Input 
                        id="companyName" 
                        value={systemSettings.firmenname}
                        onChange={(e) => setSystemSettings({ ...systemSettings, firmenname: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="supportEmail">Support E-Mail</Label>
                      <Input 
                        id="supportEmail" 
                        type="email" 
                        value={systemSettings.supportEmail}
                        onChange={(e) => setSystemSettings({ ...systemSettings, supportEmail: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="supportPhone">Support Telefon</Label>
                      <Input 
                        id="supportPhone" 
                        value={systemSettings.supportPhone}
                        onChange={(e) => setSystemSettings({ ...systemSettings, supportPhone: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="imprintUrl">Impressum URL</Label>
                      <Input 
                        id="imprintUrl" 
                        value={systemSettings.imprintUrl}
                        onChange={(e) => setSystemSettings({ ...systemSettings, imprintUrl: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="privacyUrl">Datenschutz URL</Label>
                      <Input 
                        id="privacyUrl" 
                        value={systemSettings.privacyUrl}
                        onChange={(e) => setSystemSettings({ ...systemSettings, privacyUrl: e.target.value })}
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-end pt-4">
                    <Button 
                      onClick={handleSaveSettings} 
                      disabled={savingSystemSettings}
                      className="btn-gradient-green"
                    >
                      {savingSystemSettings ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Speichern...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Einstellungen speichern
                        </>
                      )}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* NEU: Benutzerprofil */}
          <Card className="bg-white border shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <UserIcon className="h-5 w-5" />
                Mein Profil
              </CardTitle>
              <CardDescription className="text-gray-600">
                Persönliche Informationen und Kontaktdaten
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {loadingProfile ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                </div>
              ) : (
                <>
                  {/* Profilbild Upload */}
                  <div className="border-b pb-6">
                    <h4 className="font-semibold mb-4 text-sm text-gray-700">Profilbild</h4>
                    <div className="flex items-start gap-6">
                      {/* Avatar Vorschau */}
                      <div className="flex-shrink-0">
                        <Avatar className="h-24 w-24">
                          <AvatarImage src={avatarPreview || currentUser?.profile?.profilbild?.url} />
                          <AvatarFallback className="bg-blue-600 text-white text-2xl font-semibold">
                            {currentUser?.firstName?.charAt(0) || '?'}
                            {currentUser?.lastName?.charAt(0) || ''}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                      
                      {/* Upload Controls */}
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-2">
                          <input
                            type="file"
                            accept="image/jpeg,image/jpg,image/png,image/webp"
                            onChange={handleAvatarChange}
                            disabled={uploadingAvatar}
                            className="hidden"
                            id="avatar-upload"
                          />
                          <label 
                            htmlFor="avatar-upload" 
                            className="cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-blue-600 text-white hover:bg-blue-700 h-10 px-4 py-2 border-0"
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            Datei auswählen
                          </label>
                          {avatarFile && (
                            <span className="text-sm text-gray-600">
                              {avatarFile.name}
                            </span>
                          )}
                        </div>
                        
                        {avatarFile && (
                          <div className="flex items-center gap-2">
                            <Button
                              onClick={handleAvatarUpload}
                              disabled={uploadingAvatar}
                              size="sm"
                              className="btn-gradient-green"
                            >
                              {uploadingAvatar ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Lädt hoch...
                                </>
                              ) : (
                                <>
                                  <Upload className="h-4 w-4 mr-2" />
                                  Hochladen
                                </>
                              )}
                            </Button>
                            <Button
                              onClick={() => {
                                setAvatarFile(null)
                                setAvatarPreview(null)
                              }}
                              disabled={uploadingAvatar}
                              variant="outline"
                              size="sm"
                            >
                              Abbrechen
                            </Button>
                          </div>
                        )}
                        
                        {currentUser?.profile?.profilbild?.url && !avatarFile && (
                          <Button
                            onClick={handleAvatarDelete}
                            disabled={uploadingAvatar}
                            variant="destructive"
                            size="sm"
                          >
                            {uploadingAvatar ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Löscht...
                              </>
                            ) : (
                              <>
                                <X className="h-4 w-4 mr-2" />
                                Profilbild löschen
                              </>
                            )}
                          </Button>
                        )}
                        
                        <p className="text-xs text-gray-500">
                          JPG, PNG oder WebP. Maximal 5MB.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Basisdaten */}
                  <div>
                    <h4 className="font-semibold mb-3 text-sm text-gray-700">Grundinformationen</h4>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="profileFirstName">Vorname *</Label>
                        <Input 
                          id="profileFirstName" 
                          value={profileData.firstName}
                          onChange={(e) => setProfileData(prev => ({ ...prev, firstName: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="profileLastName">Nachname *</Label>
                        <Input 
                          id="profileLastName" 
                          value={profileData.lastName}
                          onChange={(e) => setProfileData(prev => ({ ...prev, lastName: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="profileEmail">E-Mail</Label>
                        <Input 
                          id="profileEmail" 
                          type="email"
                          value={profileData.email}
                          disabled
                          className="bg-gray-100"
                        />
                        <p className="text-xs text-gray-500">E-Mail kann nicht geändert werden</p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="profileTelefon">Telefon</Label>
                        <Input 
                          id="profileTelefon" 
                          value={profileData.telefon}
                          onChange={(e) => setProfileData(prev => ({ ...prev, telefon: e.target.value }))}
                          placeholder="+49 123 456789"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="profileGeburtsdatum">Geburtsdatum</Label>
                        <Input 
                          id="profileGeburtsdatum" 
                          type="date"
                          value={profileData.geburtsdatum}
                          onChange={(e) => setProfileData(prev => ({ ...prev, geburtsdatum: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="profilePersonalnummer">Personalnummer</Label>
                        <Input 
                          id="profilePersonalnummer" 
                          value={profileData.personalnummer}
                          disabled
                          className="bg-gray-100"
                        />
                        <p className="text-xs text-gray-500">Wird automatisch vergeben</p>
                      </div>
                    </div>
                  </div>

                  {/* Adresse */}
                  <div className="border-t pt-4">
                    <h4 className="font-semibold mb-3 text-sm text-gray-700">Adresse</h4>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="profileStrasse">Straße</Label>
                        <Input 
                          id="profileStrasse" 
                          value={profileData.strasse}
                          onChange={(e) => setProfileData(prev => ({ ...prev, strasse: e.target.value }))}
                          placeholder="Musterstraße"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="profileHausnummer">Hausnummer</Label>
                        <Input 
                          id="profileHausnummer" 
                          value={profileData.hausnummer}
                          onChange={(e) => setProfileData(prev => ({ ...prev, hausnummer: e.target.value }))}
                          placeholder="123"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="profilePlz">PLZ</Label>
                        <Input 
                          id="profilePlz" 
                          value={profileData.plz}
                          onChange={(e) => setProfileData(prev => ({ ...prev, plz: e.target.value }))}
                          placeholder="12345"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="profileStadt">Stadt</Label>
                        <Input 
                          id="profileStadt" 
                          value={profileData.stadt}
                          onChange={(e) => setProfileData(prev => ({ ...prev, stadt: e.target.value }))}
                          placeholder="Musterstadt"
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="profileLand">Land</Label>
                        <Input 
                          id="profileLand" 
                          value={profileData.land}
                          onChange={(e) => setProfileData(prev => ({ ...prev, land: e.target.value }))}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Notfallkontakt */}
                  <div className="border-t pt-4">
                    <h4 className="font-semibold mb-3 text-sm text-gray-700">Notfallkontakt</h4>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="notfallkontaktName">Name</Label>
                        <Input 
                          id="notfallkontaktName" 
                          value={profileData.notfallkontaktName}
                          onChange={(e) => setProfileData(prev => ({ ...prev, notfallkontaktName: e.target.value }))}
                          placeholder="Max Mustermann"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="notfallkontaktBeziehung">Beziehung</Label>
                        <Input 
                          id="notfallkontaktBeziehung" 
                          value={profileData.notfallkontaktBeziehung}
                          onChange={(e) => setProfileData(prev => ({ ...prev, notfallkontaktBeziehung: e.target.value }))}
                          placeholder="z.B. Ehepartner, Elternteil"
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="notfallkontaktTelefon">Telefon</Label>
                        <Input 
                          id="notfallkontaktTelefon" 
                          value={profileData.notfallkontaktTelefon}
                          onChange={(e) => setProfileData(prev => ({ ...prev, notfallkontaktTelefon: e.target.value }))}
                          placeholder="+49 123 456789"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Bankdaten */}
                  <div className="border-t pt-4">
                    <h4 className="font-semibold mb-3 text-sm text-gray-700">Bankdaten</h4>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="profileIban">IBAN</Label>
                        <Input 
                          id="profileIban" 
                          value={profileData.iban}
                          onChange={(e) => setProfileData(prev => ({ ...prev, iban: e.target.value }))}
                          placeholder="DE89 3704 0044 0532 0130 00"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="profileBic">BIC</Label>
                        <Input 
                          id="profileBic" 
                          value={profileData.bic}
                          onChange={(e) => setProfileData(prev => ({ ...prev, bic: e.target.value }))}
                          placeholder="COBADEFFXXX"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="profileBankname">Bankname</Label>
                        <Input 
                          id="profileBankname" 
                          value={profileData.bankname}
                          onChange={(e) => setProfileData(prev => ({ ...prev, bankname: e.target.value }))}
                          placeholder="Commerzbank"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Steuerliche Daten */}
                  <div className="border-t pt-4">
                    <h4 className="font-semibold mb-3 text-sm text-gray-700">Steuerliche Daten</h4>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="profileSteuerID">Steuer-ID</Label>
                        <Input 
                          id="profileSteuerID" 
                          value={profileData.steuerID}
                          onChange={(e) => setProfileData(prev => ({ ...prev, steuerID: e.target.value }))}
                          placeholder="12 345 678 901"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="profileSozialversicherungsnummer">Sozialversicherungsnummer</Label>
                        <Input 
                          id="profileSozialversicherungsnummer" 
                          value={profileData.sozialversicherungsnummer}
                          onChange={(e) => setProfileData(prev => ({ ...prev, sozialversicherungsnummer: e.target.value }))}
                          placeholder="12 345678 A 123"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button 
                      variant="outline" 
                      onClick={loadCurrentUser}
                      disabled={profileLoading || loadingProfile}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Zurücksetzen
                    </Button>
                    <Button 
                      onClick={handleProfileUpdate} 
                      disabled={profileLoading || loadingProfile}
                      className="btn-gradient-green"
                    >
                      {profileLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Speichert...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Profil speichern
                        </>
                      )}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSaveSettings} className="btn-gradient-green">
              <Save className="h-4 w-4 mr-2" />
              Einstellungen speichern
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="company" className="space-y-4">
          <VorlagenFirmendatenContent />
        </TabsContent>

        <TabsContent value="kalkulation" className="space-y-4">
          <KalkulationsparameterTab />
        </TabsContent>

        <TabsContent value="mahnwesen" className="space-y-4">
          <MahnwesenSettingsTab />
        </TabsContent>

        <TabsContent value="invitations" className="space-y-6">
          <Card className="bg-white border shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <UserPlus className="h-5 w-5" />
                Neue Einladungen versenden
              </CardTitle>
              <CardDescription className="text-gray-600">Laden Sie neue Admins oder Mitarbeiter ein</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                <div className="space-y-2">
                  <Label htmlFor="inviteFirstName">Vorname</Label>
                  <Input
                    id="inviteFirstName"
                    type="text"
                    placeholder="Max"
                    value={newInvitation.firstName}
                    onChange={(e) => setNewInvitation(prev => ({ ...prev, firstName: e.target.value }))}
                    disabled={inviteLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="inviteLastName">Nachname</Label>
                  <Input
                    id="inviteLastName"
                    type="text"
                    placeholder="Mustermann"
                    value={newInvitation.lastName}
                    onChange={(e) => setNewInvitation(prev => ({ ...prev, lastName: e.target.value }))}
                    disabled={inviteLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="inviteEmail">E-Mail-Adresse</Label>
                  <Input
                    id="inviteEmail"
                    type="email"
                    placeholder="beispiel@email.com"
                    value={newInvitation.email}
                    onChange={(e) => setNewInvitation(prev => ({ ...prev, email: e.target.value }))}
                    disabled={inviteLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="inviteRole">Rolle</Label>
                  <Select
                    value={newInvitation.role}
                    onValueChange={(value) => setNewInvitation(prev => ({ ...prev, role: value }))}
                    disabled={inviteLoading}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                      <SelectItem value="EMPLOYEE">Mitarbeiter</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button 
                    onClick={handleSendInvitation} 
                    className="btn-gradient-green w-full"
                    disabled={inviteLoading}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {inviteLoading ? 'Wird versendet...' : 'Einladung versenden'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border shadow-sm">
            <CardHeader>
              <CardTitle className="text-gray-900">Ausstehende Einladungen</CardTitle>
              <CardDescription className="text-gray-600">Status aller versendeten Einladungen</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingInvitations ? (
                <div className="text-center py-8 text-gray-500">
                  Lade Einladungen...
                </div>
              ) : invitations.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Noch keine Einladungen versendet
                </div>
              ) : (
                <div className="space-y-3">
                  {invitations.map((invitation) => (
                    <div key={invitation.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Mail className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="font-medium">{invitation.firstName} {invitation.lastName}</p>
                          <p className="text-sm text-gray-600">
                            {invitation.email}
                          </p>
                          <p className="text-xs text-gray-500">
                            {invitation.role === 'ADMIN' ? 'Admin' : invitation.role === 'EMPLOYEE' ? 'Mitarbeiter' : invitation.role} • Versendet am {new Date(invitation.sentAt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={
                          invitation.status === 'ausstehend' ? 'default' :
                          invitation.status === 'angenommen' ? 'secondary' : 'destructive'
                        }>
                          {invitation.statusLabel}
                        </Badge>
                        {invitation.status !== 'angenommen' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleResendInvitation(invitation.id)}
                            disabled={resendingId === invitation.id}
                            title="Einladung erneut senden"
                          >
                            <RefreshCw className={`h-4 w-4 ${resendingId === invitation.id ? 'animate-spin' : ''}`} />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card className="bg-white border shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <Bell className="h-5 w-5" />
                Benachrichtigungsvorlagen
              </CardTitle>
              <CardDescription className="text-gray-600">
                Standard-Texte für automatische Benachrichtigungen. Verfügbare Platzhalter werden in geschweiften Klammern angezeigt.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {loadingBenachrichtigungen ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                </div>
              ) : (
                <>
                  {/* Willkommensnachricht */}
                  <div className="space-y-3 p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900">Willkommensnachricht</h3>
                      <Badge variant={benachrichtigungsVorlagen.willkommen.aktiv ? "default" : "secondary"}>
                        {benachrichtigungsVorlagen.willkommen.aktiv ? "Aktiv" : "Inaktiv"}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">Platzhalter: {'{vorname}'}, {'{nachname}'}, {'{email}'}</p>
                    <div className="space-y-2">
                      <Label htmlFor="willkommen-betreff">Betreff</Label>
                      <Input
                        id="willkommen-betreff"
                        value={benachrichtigungsVorlagen.willkommen.betreff}
                        onChange={(e) => setBenachrichtigungsVorlagen({
                          ...benachrichtigungsVorlagen,
                          willkommen: { ...benachrichtigungsVorlagen.willkommen, betreff: e.target.value }
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="willkommen-inhalt">Nachrichtentext</Label>
                      <Textarea
                        id="willkommen-inhalt"
                        rows={6}
                        value={benachrichtigungsVorlagen.willkommen.inhalt}
                        onChange={(e) => setBenachrichtigungsVorlagen({
                          ...benachrichtigungsVorlagen,
                          willkommen: { ...benachrichtigungsVorlagen.willkommen, inhalt: e.target.value }
                        })}
                      />
                    </div>
                  </div>

                  {/* Passwort zurücksetzen */}
                  <div className="space-y-3 p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900">Passwort zurücksetzen</h3>
                      <Badge variant={benachrichtigungsVorlagen.passwortZuruecksetzen.aktiv ? "default" : "secondary"}>
                        {benachrichtigungsVorlagen.passwortZuruecksetzen.aktiv ? "Aktiv" : "Inaktiv"}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">Platzhalter: {'{vorname}'}, {'{nachname}'}, {'{resetLink}'}</p>
                    <div className="space-y-2">
                      <Label htmlFor="passwort-betreff">Betreff</Label>
                      <Input
                        id="passwort-betreff"
                        value={benachrichtigungsVorlagen.passwortZuruecksetzen.betreff}
                        onChange={(e) => setBenachrichtigungsVorlagen({
                          ...benachrichtigungsVorlagen,
                          passwortZuruecksetzen: { ...benachrichtigungsVorlagen.passwortZuruecksetzen, betreff: e.target.value }
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="passwort-inhalt">Nachrichtentext</Label>
                      <Textarea
                        id="passwort-inhalt"
                        rows={6}
                        value={benachrichtigungsVorlagen.passwortZuruecksetzen.inhalt}
                        onChange={(e) => setBenachrichtigungsVorlagen({
                          ...benachrichtigungsVorlagen,
                          passwortZuruecksetzen: { ...benachrichtigungsVorlagen.passwortZuruecksetzen, inhalt: e.target.value }
                        })}
                      />
                    </div>
                  </div>

                  {/* Angebot versendet */}
                  <div className="space-y-3 p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900">Angebot versendet</h3>
                      <Badge variant={benachrichtigungsVorlagen.angebotVersendet.aktiv ? "default" : "secondary"}>
                        {benachrichtigungsVorlagen.angebotVersendet.aktiv ? "Aktiv" : "Inaktiv"}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">Platzhalter: {'{angebotNummer}'}, {'{projektName}'}, {'{betrag}'}, {'{gueltigBis}'}</p>
                    <div className="space-y-2">
                      <Label htmlFor="angebot-betreff">Betreff</Label>
                      <Input
                        id="angebot-betreff"
                        value={benachrichtigungsVorlagen.angebotVersendet.betreff}
                        onChange={(e) => setBenachrichtigungsVorlagen({
                          ...benachrichtigungsVorlagen,
                          angebotVersendet: { ...benachrichtigungsVorlagen.angebotVersendet, betreff: e.target.value }
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="angebot-inhalt">Nachrichtentext</Label>
                      <Textarea
                        id="angebot-inhalt"
                        rows={6}
                        value={benachrichtigungsVorlagen.angebotVersendet.inhalt}
                        onChange={(e) => setBenachrichtigungsVorlagen({
                          ...benachrichtigungsVorlagen,
                          angebotVersendet: { ...benachrichtigungsVorlagen.angebotVersendet, inhalt: e.target.value }
                        })}
                      />
                    </div>
                  </div>

                  {/* Rechnung versendet */}
                  <div className="space-y-3 p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900">Rechnung versendet</h3>
                      <Badge variant={benachrichtigungsVorlagen.rechnungVersendet.aktiv ? "default" : "secondary"}>
                        {benachrichtigungsVorlagen.rechnungVersendet.aktiv ? "Aktiv" : "Inaktiv"}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">Platzhalter: {'{rechnungNummer}'}, {'{projektName}'}, {'{betrag}'}, {'{zahlungsziel}'}, {'{iban}'}, {'{bic}'}</p>
                    <div className="space-y-2">
                      <Label htmlFor="rechnung-betreff">Betreff</Label>
                      <Input
                        id="rechnung-betreff"
                        value={benachrichtigungsVorlagen.rechnungVersendet.betreff}
                        onChange={(e) => setBenachrichtigungsVorlagen({
                          ...benachrichtigungsVorlagen,
                          rechnungVersendet: { ...benachrichtigungsVorlagen.rechnungVersendet, betreff: e.target.value }
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="rechnung-inhalt">Nachrichtentext</Label>
                      <Textarea
                        id="rechnung-inhalt"
                        rows={6}
                        value={benachrichtigungsVorlagen.rechnungVersendet.inhalt}
                        onChange={(e) => setBenachrichtigungsVorlagen({
                          ...benachrichtigungsVorlagen,
                          rechnungVersendet: { ...benachrichtigungsVorlagen.rechnungVersendet, inhalt: e.target.value }
                        })}
                      />
                    </div>
                  </div>

                  {/* Rechnung bezahlt */}
                  <div className="space-y-3 p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900">Rechnung bezahlt</h3>
                      <Badge variant={benachrichtigungsVorlagen.rechnungBezahlt.aktiv ? "default" : "secondary"}>
                        {benachrichtigungsVorlagen.rechnungBezahlt.aktiv ? "Aktiv" : "Inaktiv"}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">Platzhalter: {'{rechnungNummer}'}, {'{betrag}'}, {'{zahlungsdatum}'}, {'{projektName}'}</p>
                    <div className="space-y-2">
                      <Label htmlFor="bezahlt-betreff">Betreff</Label>
                      <Input
                        id="bezahlt-betreff"
                        value={benachrichtigungsVorlagen.rechnungBezahlt.betreff}
                        onChange={(e) => setBenachrichtigungsVorlagen({
                          ...benachrichtigungsVorlagen,
                          rechnungBezahlt: { ...benachrichtigungsVorlagen.rechnungBezahlt, betreff: e.target.value }
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bezahlt-inhalt">Nachrichtentext</Label>
                      <Textarea
                        id="bezahlt-inhalt"
                        rows={6}
                        value={benachrichtigungsVorlagen.rechnungBezahlt.inhalt}
                        onChange={(e) => setBenachrichtigungsVorlagen({
                          ...benachrichtigungsVorlagen,
                          rechnungBezahlt: { ...benachrichtigungsVorlagen.rechnungBezahlt, inhalt: e.target.value }
                        })}
                      />
                    </div>
                  </div>

                  {/* Zahlungserinnerung */}
                  <div className="space-y-3 p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900">Zahlungserinnerung</h3>
                      <Badge variant={benachrichtigungsVorlagen.zahlungserinnerung.aktiv ? "default" : "secondary"}>
                        {benachrichtigungsVorlagen.zahlungserinnerung.aktiv ? "Aktiv" : "Inaktiv"}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">Platzhalter: {'{rechnungNummer}'}, {'{betrag}'}, {'{rechnungsdatum}'}, {'{faelligkeitsdatum}'}, {'{ueberfaelligSeit}'}, {'{projektName}'}, {'{iban}'}, {'{bic}'}</p>
                    <div className="space-y-2">
                      <Label htmlFor="erinnerung-betreff">Betreff</Label>
                      <Input
                        id="erinnerung-betreff"
                        value={benachrichtigungsVorlagen.zahlungserinnerung.betreff}
                        onChange={(e) => setBenachrichtigungsVorlagen({
                          ...benachrichtigungsVorlagen,
                          zahlungserinnerung: { ...benachrichtigungsVorlagen.zahlungserinnerung, betreff: e.target.value }
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="erinnerung-inhalt">Nachrichtentext</Label>
                      <Textarea
                        id="erinnerung-inhalt"
                        rows={6}
                        value={benachrichtigungsVorlagen.zahlungserinnerung.inhalt}
                        onChange={(e) => setBenachrichtigungsVorlagen({
                          ...benachrichtigungsVorlagen,
                          zahlungserinnerung: { ...benachrichtigungsVorlagen.zahlungserinnerung, inhalt: e.target.value }
                        })}
                      />
                    </div>
                  </div>

                  {/* Mahnung erstellt */}
                  <div className="space-y-3 p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900">Mahnung erstellt</h3>
                      <Badge variant={benachrichtigungsVorlagen.mahnungErstellt.aktiv ? "default" : "secondary"}>
                        {benachrichtigungsVorlagen.mahnungErstellt.aktiv ? "Aktiv" : "Inaktiv"}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">Platzhalter: {'{mahnstufe}'}, {'{rechnungNummer}'}, {'{betrag}'}, {'{rechnungsdatum}'}, {'{faelligkeitsdatum}'}, {'{mahngebuehr}'}, {'{gesamtbetrag}'}, {'{zahlungsfrist}'}, {'{iban}'}, {'{bic}'}</p>
                    <div className="space-y-2">
                      <Label htmlFor="mahnung-betreff">Betreff</Label>
                      <Input
                        id="mahnung-betreff"
                        value={benachrichtigungsVorlagen.mahnungErstellt.betreff}
                        onChange={(e) => setBenachrichtigungsVorlagen({
                          ...benachrichtigungsVorlagen,
                          mahnungErstellt: { ...benachrichtigungsVorlagen.mahnungErstellt, betreff: e.target.value }
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="mahnung-inhalt">Nachrichtentext</Label>
                      <Textarea
                        id="mahnung-inhalt"
                        rows={6}
                        value={benachrichtigungsVorlagen.mahnungErstellt.inhalt}
                        onChange={(e) => setBenachrichtigungsVorlagen({
                          ...benachrichtigungsVorlagen,
                          mahnungErstellt: { ...benachrichtigungsVorlagen.mahnungErstellt, inhalt: e.target.value }
                        })}
                      />
                    </div>
                  </div>

                  {/* Speichern Button */}
                  <div className="flex justify-end pt-4 border-t">
                    <Button 
                      onClick={saveBenachrichtigungsVorlagen}
                      disabled={savingBenachrichtigungen}
                      className="btn-gradient-green"
                    >
                      {savingBenachrichtigungen ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Speichern...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Vorlagen speichern
                        </>
                      )}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
