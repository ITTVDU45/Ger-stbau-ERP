"use client"

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import VorlagenFirmendatenContent from './components/VorlagenFirmendatenContent'
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
  Copy
} from 'lucide-react'

// Mock-Daten für Einladungen
const pendingInvitations = [
  { id: 1, email: 'gutachter@example.com', role: 'GUTACHTER', sentAt: '2025-10-05', status: 'ausstehend' },
  { id: 2, email: 'partner@example.com', role: 'PARTNER', sentAt: '2025-10-03', status: 'angenommen' },
  { id: 3, email: 'admin@example.com', role: 'ADMIN', sentAt: '2025-10-01', status: 'abgelehnt' }
]

// Mock-Daten für Systemeinstellungen
const systemSettings = {
  companyName: 'RECHTLY GmbH',
  supportEmail: 'support@rechtly.de',
  supportPhone: '+49 30 12345678',
  imprintUrl: 'https://rechtly.de/impressum',
  privacyUrl: 'https://rechtly.de/datenschutz'
}

export default function AdminEinstellungenPage() {
  const [activeTab, setActiveTab] = useState('general')
  const [newInvitation, setNewInvitation] = useState({ email: '', role: 'GUTACHTER' })

  const handleSendInvitation = () => {
    console.log('Einladung versendet:', newInvitation)
    // Hier würde die Einladung versendet werden
    setNewInvitation({ email: '', role: 'GUTACHTER' })
  }

  const handleSaveSettings = () => {
    console.log('Einstellungen gespeichert')
    // Hier würden die Einstellungen gespeichert werden
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <Card className="card-gradient-blue border-0">
        <CardHeader>
          <CardTitle className="text-white text-2xl">System-Einstellungen</CardTitle>
          <CardDescription className="text-white/80">
            Konfiguration und Verwaltung des Rechtly-Systems
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general">Allgemein</TabsTrigger>
          <TabsTrigger value="company">Vorlagen & Firmendaten</TabsTrigger>
          <TabsTrigger value="invitations">Einladungen</TabsTrigger>
          <TabsTrigger value="notifications">Benachrichtigungen</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Unternehmensdaten
              </CardTitle>
              <CardDescription>Grundlegende Informationen über Ihr Unternehmen</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Firmenname</Label>
                  <Input id="companyName" defaultValue={systemSettings.companyName} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supportEmail">Support E-Mail</Label>
                  <Input id="supportEmail" type="email" defaultValue={systemSettings.supportEmail} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supportPhone">Support Telefon</Label>
                  <Input id="supportPhone" defaultValue={systemSettings.supportPhone} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="imprintUrl">Impressum URL</Label>
                  <Input id="imprintUrl" defaultValue={systemSettings.imprintUrl} />
                </div>
              </div>
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

        <TabsContent value="invitations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Neue Einladungen versenden
              </CardTitle>
              <CardDescription>Laden Sie neue Gutachter oder Partner ein</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="inviteEmail">E-Mail-Adresse</Label>
                  <Input
                    id="inviteEmail"
                    type="email"
                    placeholder="beispiel@email.com"
                    value={newInvitation.email}
                    onChange={(e) => setNewInvitation(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="inviteRole">Rolle</Label>
                  <Select
                    value={newInvitation.role}
                    onValueChange={(value) => setNewInvitation(prev => ({ ...prev, role: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GUTACHTER">Gutachter</SelectItem>
                      <SelectItem value="PARTNER">Partner</SelectItem>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button onClick={handleSendInvitation} className="btn-gradient-green w-full">
                    <Send className="h-4 w-4 mr-2" />
                    Einladung versenden
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ausstehende Einladungen</CardTitle>
              <CardDescription>Status aller versendeten Einladungen</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pendingInvitations.map((invitation) => (
                  <div key={invitation.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="font-medium">{invitation.email}</p>
                        <p className="text-sm text-gray-600">
                          {invitation.role} • Versendet am {new Date(invitation.sentAt).toLocaleDateString('de-DE')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={
                        invitation.status === 'ausstehend' ? 'default' :
                        invitation.status === 'angenommen' ? 'secondary' : 'destructive'
                      }>
                        {invitation.status}
                      </Badge>
                      <Button variant="outline" size="sm">
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Benachrichtigungsvorlagen
              </CardTitle>
              <CardDescription>Standard-Texte für automatische Benachrichtigungen</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="welcomeTemplate">Willkommensnachricht</Label>
                <Textarea
                  id="welcomeTemplate"
                  placeholder="Willkommen bei Rechtly! Ihr Account wurde erfolgreich erstellt..."
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="caseAssignedTemplate">Fall-Zuweisung</Label>
                <Textarea
                  id="caseAssignedTemplate"
                  placeholder="Sie haben einen neuen Fall erhalten: {caseId} von {clientName}..."
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="paymentReminderTemplate">Zahlungserinnerung</Label>
                <Textarea
                  id="paymentReminderTemplate"
                  placeholder="Erinnerung: Ihre Rechnung für Fall {caseId} ist fällig am {dueDate}..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
