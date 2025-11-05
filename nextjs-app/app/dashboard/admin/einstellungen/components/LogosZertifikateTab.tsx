"use client"

import React, { useState, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Image, Upload, Trash2, Plus, FileText, Loader2 } from 'lucide-react'
import { CompanySettings } from '@/lib/db/types'
import { toast } from 'sonner'

interface LogosZertifikateTabProps {
  settings: Partial<CompanySettings>
  onChange: (field: keyof CompanySettings, value: any) => void
  onSave: () => void
  saving: boolean
}

export default function LogosZertifikateTab({ settings, onChange, onSave, saving }: LogosZertifikateTabProps) {
  const [uploadingPrimary, setUploadingPrimary] = useState(false)
  const [uploadingSecondary, setUploadingSecondary] = useState(false)
  const [uploadingCert, setUploadingCert] = useState(false)
  
  const primaryLogoRef = useRef<HTMLInputElement>(null)
  const secondaryLogoRef = useRef<HTMLInputElement>(null)
  const certRef = useRef<HTMLInputElement>(null)
  
  const [newCertName, setNewCertName] = useState('')
  const [newCertType, setNewCertType] = useState('')

  const handleLogoUpload = async (file: File, type: 'primary' | 'secondary') => {
    const setUploading = type === 'primary' ? setUploadingPrimary : setUploadingSecondary
    
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', `logo-${type}`)
      
      const response = await fetch('/api/settings/upload', {
        method: 'POST',
        body: formData
      })
      
      const data = await response.json()
      
      if (!data.erfolg) {
        throw new Error(data.fehler || 'Upload fehlgeschlagen')
      }
      
      if (type === 'primary') {
        onChange('logoUrl', data.url)
        onChange('logoObjectName', data.objectName)
      } else {
        onChange('logoSecondaryUrl', data.url)
        onChange('logoSecondaryObjectName', data.objectName)
      }
      
      toast.success('Logo hochgeladen', {
        description: `${type === 'primary' ? 'Primäres' : 'Sekundäres'} Logo wurde erfolgreich hochgeladen`
      })
    } catch (error: any) {
      console.error('Upload-Fehler:', error)
      toast.error('Upload fehlgeschlagen', {
        description: error.message || 'Logo konnte nicht hochgeladen werden'
      })
    } finally {
      setUploading(false)
    }
  }

  const handleCertificateUpload = async (file: File) => {
    if (!newCertName.trim() || !newCertType.trim()) {
      toast.error('Fehlende Angaben', {
        description: 'Bitte Name und Typ des Zertifikats eingeben'
      })
      return
    }
    
    setUploadingCert(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', 'certificate')
      formData.append('certificateType', newCertType)
      
      const response = await fetch('/api/settings/upload', {
        method: 'POST',
        body: formData
      })
      
      const data = await response.json()
      
      if (!data.erfolg) {
        throw new Error(data.fehler || 'Upload fehlgeschlagen')
      }
      
      const newCert = {
        _id: Date.now().toString(),
        name: newCertName,
        url: data.url,
        objectName: data.objectName,
        typ: newCertType,
        hochgeladenAm: new Date()
      }
      
      const updatedCerts = [...(settings.zertifikate || []), newCert]
      onChange('zertifikate', updatedCerts)
      
      setNewCertName('')
      setNewCertType('')
      
      toast.success('Zertifikat hochgeladen', {
        description: `${newCertName} wurde erfolgreich hinzugefügt`
      })
    } catch (error: any) {
      console.error('Upload-Fehler:', error)
      toast.error('Upload fehlgeschlagen', {
        description: error.message || 'Zertifikat konnte nicht hochgeladen werden'
      })
    } finally {
      setUploadingCert(false)
    }
  }

  const handleRemoveCertificate = (certId: string) => {
    const updatedCerts = (settings.zertifikate || []).filter(c => c._id !== certId)
    onChange('zertifikate', updatedCerts)
    toast.success('Zertifikat entfernt')
  }

  return (
    <div className="space-y-6">
      {/* Primäres Logo */}
      <Card className="bg-white border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900">
            <Image className="h-5 w-5 text-blue-600" />
            Primäres Firmenlogo
          </CardTitle>
          <CardDescription className="text-gray-700">
            Hauptlogo für Kopfzeilen in Angeboten und Rechnungen
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {settings.logoUrl ? (
            <div className="space-y-3">
              <div className="border border-gray-300 rounded-lg p-4 bg-gray-50 flex items-center justify-center min-h-[200px]">
                <img 
                  src={settings.logoUrl} 
                  alt="Primäres Logo" 
                  className="max-h-[180px] max-w-full object-contain"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => primaryLogoRef.current?.click()}
                  disabled={uploadingPrimary}
                  className="border-gray-300 text-gray-900 hover:bg-gray-50"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Neues Logo hochladen
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    onChange('logoUrl', undefined)
                    onChange('logoObjectName', undefined)
                  }}
                  className="border-red-400 text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Entfernen
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
                onClick={() => primaryLogoRef.current?.click()}
              >
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-sm text-gray-700 font-medium mb-1">Logo hochladen</p>
                <p className="text-xs text-gray-600">PNG, JPG, SVG oder WebP (max. 10 MB)</p>
              </div>
            </div>
          )}
          
          <input
            ref={primaryLogoRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleLogoUpload(file, 'primary')
            }}
          />
          
          {uploadingPrimary && (
            <div className="flex items-center gap-2 text-sm text-blue-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Lade Logo hoch...</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sekundäres Logo */}
      <Card className="bg-white border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900">
            <Image className="h-5 w-5 text-gray-600" />
            Sekundäres Logo (optional)
          </CardTitle>
          <CardDescription className="text-gray-700">
            Z.B. Partner-Logo oder Zertifizierungssiegel
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {settings.logoSecondaryUrl ? (
            <div className="space-y-3">
              <div className="border border-gray-300 rounded-lg p-4 bg-gray-50 flex items-center justify-center min-h-[150px]">
                <img 
                  src={settings.logoSecondaryUrl} 
                  alt="Sekundäres Logo" 
                  className="max-h-[130px] max-w-full object-contain"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => secondaryLogoRef.current?.click()}
                  disabled={uploadingSecondary}
                  className="border-gray-300 text-gray-900 hover:bg-gray-50"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Neues Logo hochladen
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    onChange('logoSecondaryUrl', undefined)
                    onChange('logoSecondaryObjectName', undefined)
                  }}
                  className="border-red-400 text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Entfernen
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
                onClick={() => secondaryLogoRef.current?.click()}
              >
                <Upload className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-700 font-medium mb-1">Logo hochladen</p>
                <p className="text-xs text-gray-600">PNG, JPG, SVG oder WebP (max. 10 MB)</p>
              </div>
            </div>
          )}
          
          <input
            ref={secondaryLogoRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleLogoUpload(file, 'secondary')
            }}
          />
          
          {uploadingSecondary && (
            <div className="flex items-center gap-2 text-sm text-blue-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Lade Logo hoch...</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Zertifikate */}
      <Card className="bg-white border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900">
            <FileText className="h-5 w-5 text-green-600" />
            Zertifikate
          </CardTitle>
          <CardDescription className="text-gray-700">
            Zertifikate wie DIN EN 12811, SCC, TÜV etc. für Dokument-Anhänge
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Liste der Zertifikate */}
          {settings.zertifikate && settings.zertifikate.length > 0 && (
            <div className="space-y-2">
              {settings.zertifikate.map((cert) => (
                <div key={cert._id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-gray-50">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-medium text-gray-900">{cert.name}</p>
                      <p className="text-sm text-gray-600">{cert.typ}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveCertificate(cert._id!)}
                    className="hover:bg-red-50 text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          
          {/* Neues Zertifikat hinzufügen */}
          <div className="border-t border-gray-200 pt-4 space-y-3">
            <h4 className="font-medium text-gray-900">Neues Zertifikat hinzufügen</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-gray-900 font-medium">Zertifikatsname</Label>
                <Input
                  value={newCertName}
                  onChange={(e) => setNewCertName(e.target.value)}
                  placeholder="z.B. TÜV-Zertifizierung 2025"
                  className="bg-white border-gray-300 text-gray-900"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-900 font-medium">Typ / Norm</Label>
                <Input
                  value={newCertType}
                  onChange={(e) => setNewCertType(e.target.value)}
                  placeholder="z.B. DIN EN 12811, SCC, TÜV"
                  className="bg-white border-gray-300 text-gray-900"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => certRef.current?.click()}
                disabled={uploadingCert || !newCertName.trim() || !newCertType.trim()}
                className="border-gray-300 text-gray-900 hover:bg-gray-50"
              >
                {uploadingCert ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Lädt hoch...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Zertifikat hochladen
                  </>
                )}
              </Button>
            </div>
            
            <input
              ref={certRef}
              type="file"
              accept="image/*,.pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleCertificateUpload(file)
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Speichern-Button */}
      <div className="flex justify-end">
        <Button 
          onClick={onSave}
          disabled={saving}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          {saving ? 'Speichere...' : 'Änderungen speichern'}
        </Button>
      </div>
    </div>
  )
}

