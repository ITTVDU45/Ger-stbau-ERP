"use client"

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from '@/components/ui/switch'
import { Kunde } from '@/lib/db/types'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { CustomerImportModeSelector, AiCustomerImportWizard, type CustomerDialogMode } from '@/features/customer-import'

interface KundeDialogProps {
  open: boolean
  kunde?: Kunde
  onClose: (updated: boolean, wasImport?: boolean) => void
}

export default function KundeDialog({ open, kunde, onClose }: KundeDialogProps) {
  // Modus: Manuell oder KI-Import
  const [mode, setMode] = useState<CustomerDialogMode>('manual')
  
  const [formData, setFormData] = useState<Partial<Kunde>>({
    kundennummer: '',
    firma: '',
    anrede: 'Firma',
    vorname: '',
    nachname: '',
    email: '',
    telefon: '',
    mobil: '',
    kundentyp: 'gewerblich',
    ansprechpartner: {
      vorname: '',
      nachname: '',
      position: '',
      telefon: '',
      email: ''
    },
    adresse: {
      strasse: '',
      hausnummer: '',
      plz: '',
      ort: '',
      land: 'Deutschland'
    },
    notizen: '',
    aktiv: true
  })
  
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (kunde) {
      // Beim Bearbeiten: immer manueller Modus
      setMode('manual')
      setFormData(kunde)
    } else {
      // Neuer Kunde: Modus beibehalten, Formular zurücksetzen
      setFormData({
        kundennummer: 'Wird automatisch generiert',
        firma: '',
        anrede: 'Firma',
        vorname: '',
        nachname: '',
        email: '',
        telefon: '',
        mobil: '',
        kundentyp: 'gewerblich',
        ansprechpartner: {
          vorname: '',
          nachname: '',
          position: '',
          telefon: '',
          email: ''
        },
        adresse: {
          strasse: '',
          hausnummer: '',
          plz: '',
          ort: '',
          land: 'Deutschland'
        },
        notizen: '',
        aktiv: true
      })
    }
    
    // Modus zurücksetzen wenn Dialog geschlossen wird
    if (!open) {
      setMode('manual')
    }
  }, [kunde, open])

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleAnsprechpartnerChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      ansprechpartner: { ...prev.ansprechpartner, [field]: value }
    }))
  }

  const handleAdresseChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      adresse: { ...prev.adresse, [field]: value }
    }))
  }

  const handleSubmit = async () => {
    // Validierung
    if (!formData.firma && (!formData.vorname || !formData.nachname)) {
      alert('Bitte geben Sie entweder einen Firmennamen oder Vor- und Nachnamen an')
      return
    }

    setSaving(true)
    try {
      const url = kunde?._id 
        ? `/api/kunden/${kunde._id}` 
        : '/api/kunden'
      
      const method = kunde?._id ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        onClose(true)
      } else {
        const error = await response.json()
        alert(error.fehler || 'Fehler beim Speichern')
      }
    } catch (error) {
      console.error('Fehler:', error)
      alert('Fehler beim Speichern')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={() => onClose(false)}>
      <DialogContent 
        className="w-[95vw] !max-w-[95vw] max-h-[90vh] overflow-y-auto p-0"
        style={{ maxWidth: '95vw', width: '95vw' }}
      >
        <div className="p-6 pb-0">
          <DialogHeader>
            <DialogTitle>{kunde ? 'Kunde bearbeiten' : 'Neuer Kunde'}</DialogTitle>
            <DialogDescription>Kundendaten erfassen und verwalten</DialogDescription>
          </DialogHeader>

          {/* Modus-Auswahl nur bei neuem Kunden */}
          {!kunde && (
            <CustomerImportModeSelector 
              mode={mode}
              onChange={setMode}
            />
          )}
        </div>

        {/* Bedingtes Rendering: Manuell ODER KI */}
        <div className={mode === 'ai' ? '' : 'px-6'}>
          {mode === 'manual' ? (
            // Manuelles Formular
            <Tabs defaultValue="allgemein" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="allgemein">Allgemein</TabsTrigger>
            <TabsTrigger value="kontakt">Ansprechpartner</TabsTrigger>
            <TabsTrigger value="adresse">Adresse</TabsTrigger>
            <TabsTrigger value="notizen">Notizen</TabsTrigger>
          </TabsList>

          <TabsContent value="allgemein" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="kundennummer">Kundennummer</Label>
                <Input
                  id="kundennummer"
                  value={formData.kundennummer || 'Wird automatisch generiert'}
                  disabled
                  className="bg-gray-50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="kundentyp">Kundentyp *</Label>
                <Select value={formData.kundentyp} onValueChange={(v) => handleChange('kundentyp', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="privat">Privat</SelectItem>
                    <SelectItem value="gewerblich">Gewerblich</SelectItem>
                    <SelectItem value="oeffentlich">Öffentlich</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="branche">Branche</Label>
                <Select value={formData.branche || ''} onValueChange={(v) => handleChange('branche', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Branche wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dachdecker">
                      <span className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-blue-500" />
                        Dachdecker
                      </span>
                    </SelectItem>
                    <SelectItem value="maler">
                      <span className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-green-500" />
                        Maler
                      </span>
                    </SelectItem>
                    <SelectItem value="bauunternehmen">
                      <span className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-purple-500" />
                        Bauunternehmen
                      </span>
                    </SelectItem>
                    <SelectItem value="privat">
                      <span className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-yellow-500" />
                        Privat
                      </span>
                    </SelectItem>
                    <SelectItem value="sonstige">
                      <span className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-gray-400" />
                        Sonstige
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="firma">Firmenname</Label>
              <Input
                id="firma"
                value={formData.firma || ''}
                onChange={(e) => handleChange('firma', e.target.value)}
                placeholder="z.B. Bauunternehmen Schmidt GmbH"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="anrede">Anrede</Label>
                <Select value={formData.anrede} onValueChange={(v) => handleChange('anrede', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Herr">Herr</SelectItem>
                    <SelectItem value="Frau">Frau</SelectItem>
                    <SelectItem value="Firma">Firma</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="vorname">Vorname</Label>
                <Input
                  id="vorname"
                  value={formData.vorname || ''}
                  onChange={(e) => handleChange('vorname', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="nachname">Nachname</Label>
                <Input
                  id="nachname"
                  value={formData.nachname || ''}
                  onChange={(e) => handleChange('nachname', e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-Mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => handleChange('email', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="telefon">Telefon</Label>
                <Input
                  id="telefon"
                  type="tel"
                  value={formData.telefon || ''}
                  onChange={(e) => handleChange('telefon', e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="aktiv"
                checked={formData.aktiv}
                onCheckedChange={(checked) => handleChange('aktiv', checked)}
              />
              <Label htmlFor="aktiv">Aktiv</Label>
            </div>
          </TabsContent>

          <TabsContent value="kontakt" className="space-y-4">
            <div className="space-y-2">
              <Label className="text-base font-semibold text-gray-900">Ansprechpartner (optional)</Label>
              <p className="text-sm text-gray-500">Kontaktperson beim Kunden</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ap-vorname">Vorname</Label>
                <Input
                  id="ap-vorname"
                  value={formData.ansprechpartner?.vorname || ''}
                  onChange={(e) => handleAnsprechpartnerChange('vorname', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ap-nachname">Nachname</Label>
                <Input
                  id="ap-nachname"
                  value={formData.ansprechpartner?.nachname || ''}
                  onChange={(e) => handleAnsprechpartnerChange('nachname', e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ap-position">Position</Label>
              <Input
                id="ap-position"
                value={formData.ansprechpartner?.position || ''}
                onChange={(e) => handleAnsprechpartnerChange('position', e.target.value)}
                placeholder="z.B. Geschäftsführer, Bauleiter"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ap-telefon">Telefon</Label>
                <Input
                  id="ap-telefon"
                  type="tel"
                  value={formData.ansprechpartner?.telefon || ''}
                  onChange={(e) => handleAnsprechpartnerChange('telefon', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ap-email">E-Mail</Label>
                <Input
                  id="ap-email"
                  type="email"
                  value={formData.ansprechpartner?.email || ''}
                  onChange={(e) => handleAnsprechpartnerChange('email', e.target.value)}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="adresse" className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2 space-y-2">
                <Label htmlFor="strasse">Straße</Label>
                <Input
                  id="strasse"
                  value={formData.adresse?.strasse || ''}
                  onChange={(e) => handleAdresseChange('strasse', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hausnummer">Nr.</Label>
                <Input
                  id="hausnummer"
                  value={formData.adresse?.hausnummer || ''}
                  onChange={(e) => handleAdresseChange('hausnummer', e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="plz">PLZ</Label>
                <Input
                  id="plz"
                  value={formData.adresse?.plz || ''}
                  onChange={(e) => handleAdresseChange('plz', e.target.value)}
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="ort">Ort</Label>
                <Input
                  id="ort"
                  value={formData.adresse?.ort || ''}
                  onChange={(e) => handleAdresseChange('ort', e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="land">Land</Label>
              <Input
                id="land"
                value={formData.adresse?.land || 'Deutschland'}
                onChange={(e) => handleAdresseChange('land', e.target.value)}
              />
            </div>
          </TabsContent>

          <TabsContent value="notizen" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="notizen">Interne Notizen & Bemerkungen</Label>
              <Textarea
                id="notizen"
                value={formData.notizen || ''}
                onChange={(e) => handleChange('notizen', e.target.value)}
                rows={8}
                placeholder="Interne Informationen zum Kunden..."
              />
            </div>
          </TabsContent>
        </Tabs>
          ) : (
            // KI-Import Wizard
            <AiCustomerImportWizard
              onImportComplete={(importedCount) => {
                toast.success(`${importedCount} Kunden erfolgreich importiert! Der Filter wird automatisch auf "Inaktiv" gesetzt.`, {
                  duration: 5000
                })
                onClose(true, true) // wasImport = true
              }}
              onCancel={() => setMode('manual')}
            />
          )}
        </div>

        {/* Footer nur im manuellen Modus */}
        {mode === 'manual' && (
          <DialogFooter className="px-6 pb-6 pt-4">
            <Button variant="outline" onClick={() => onClose(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? 'Speichern...' : 'Speichern'}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}

