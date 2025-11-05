"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, MessageSquare, Phone, Mail, Calendar } from 'lucide-react'
import { KundenNotiz } from '@/lib/db/types'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'

interface KundenNotizenProps {
  kundeId: string
}

export default function KundenNotizen({ kundeId }: KundenNotizenProps) {
  const [notizen, setNotizen] = useState<KundenNotiz[]>([])
  const [loading, setLoading] = useState(true)
  const [neueNotiz, setNeueNotiz] = useState({
    titel: '',
    inhalt: '',
    typ: 'notiz'
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadNotizen()
  }, [kundeId])

  const loadNotizen = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/kunden/${kundeId}/notizen`)
      if (response.ok) {
        const data = await response.json()
        setNotizen(data.notizen || [])
      }
    } catch (error) {
      console.error('Fehler:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleNotizHinzufuegen = async () => {
    if (!neueNotiz.titel || !neueNotiz.inhalt) {
      alert('Bitte Titel und Inhalt ausfüllen')
      return
    }

    setSaving(true)
    try {
      const response = await fetch(`/api/kunden/${kundeId}/notizen`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(neueNotiz)
      })

      if (response.ok) {
        setNeueNotiz({ titel: '', inhalt: '', typ: 'notiz' })
        loadNotizen()
      } else {
        alert('Fehler beim Speichern')
      }
    } catch (error) {
      console.error('Fehler:', error)
      alert('Fehler beim Speichern')
    } finally {
      setSaving(false)
    }
  }

  const getNotizIcon = (typ: string) => {
    switch (typ) {
      case 'telefonat': return <Phone className="h-4 w-4 text-blue-600" />
      case 'meeting': return <Calendar className="h-4 w-4 text-green-600" />
      case 'email': return <Mail className="h-4 w-4 text-purple-600" />
      default: return <MessageSquare className="h-4 w-4 text-gray-600" />
    }
  }

  return (
    <div className="space-y-4">
      {/* Neue Notiz */}
      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="text-gray-900">Neue Notiz hinzufügen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="titel">Titel</Label>
              <Input
                id="titel"
                value={neueNotiz.titel}
                onChange={(e) => setNeueNotiz(prev => ({ ...prev, titel: e.target.value }))}
                placeholder="z.B. Telefonat wegen Angebot"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="typ">Typ</Label>
              <Select value={neueNotiz.typ} onValueChange={(v) => setNeueNotiz(prev => ({ ...prev, typ: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="notiz">Notiz</SelectItem>
                  <SelectItem value="telefonat">Telefonat</SelectItem>
                  <SelectItem value="meeting">Meeting</SelectItem>
                  <SelectItem value="email">E-Mail</SelectItem>
                  <SelectItem value="sonstiges">Sonstiges</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="inhalt">Inhalt</Label>
            <Textarea
              id="inhalt"
              value={neueNotiz.inhalt}
              onChange={(e) => setNeueNotiz(prev => ({ ...prev, inhalt: e.target.value }))}
              rows={4}
              placeholder="Details zur Notiz..."
            />
          </div>

          <Button onClick={handleNotizHinzufuegen} disabled={saving} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            {saving ? 'Speichern...' : 'Notiz hinzufügen'}
          </Button>
        </CardContent>
      </Card>

      {/* Notizen-Timeline */}
      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="text-gray-900">Notizen-Verlauf</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-8 text-gray-500">Lade Notizen...</p>
          ) : notizen.length === 0 ? (
            <p className="text-center py-8 text-gray-500">Noch keine Notizen vorhanden</p>
          ) : (
            <div className="space-y-4">
              {notizen.map((notiz) => (
                <div key={notiz._id} className="border-l-4 border-blue-500 pl-4 py-2 bg-gray-50 rounded-r">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {getNotizIcon(notiz.typ || 'notiz')}
                        <h4 className="font-semibold text-gray-900">{notiz.titel}</h4>
                      </div>
                      <p className="text-sm text-gray-800 mt-2">{notiz.inhalt}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-600">
                        <span className="font-medium">{notiz.autorName || 'Admin'}</span>
                        <span>•</span>
                        <span>{notiz.erstelltAm ? format(new Date(notiz.erstelltAm), 'dd.MM.yyyy HH:mm', { locale: de }) + ' Uhr' : '-'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

