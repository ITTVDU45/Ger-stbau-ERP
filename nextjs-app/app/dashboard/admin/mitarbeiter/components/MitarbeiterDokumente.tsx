"use client"

import React, { useState, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Mitarbeiter, Dokument } from '@/lib/db/types'
import { FileText, Download, Calendar, File, Upload, Trash2, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'

interface MitarbeiterDokumenteProps {
  mitarbeiterId: string
  mitarbeiter: Mitarbeiter
  onUploadSuccess?: () => void
}

export default function MitarbeiterDokumente({ mitarbeiterId, mitarbeiter, onUploadSuccess }: MitarbeiterDokumenteProps) {
  
  const [uploading, setUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [kategorie, setKategorie] = useState('sonstiges')
  const [deleting, setDeleting] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const dokumente = mitarbeiter.dokumente || []

  const getKategorieLabel = (kategorie: string) => {
    const labels: Record<string, string> = {
      personalausweis_vorne: 'Personalausweis Vorne',
      personalausweis_hinten: 'Personalausweis Hinten',
      vertrag: 'Vertrag',
      zeugnis: 'Zeugnis',
      zertifikat: 'Zertifikat',
      sonstiges: 'Sonstiges'
    }
    return labels[kategorie] || kategorie
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0])
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      alert('Bitte wählen Sie eine Datei aus')
      return
    }

    try {
      setUploading(true)
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('kategorie', kategorie)
      formData.append('benutzer', 'admin') // TODO: aus Session holen

      const response = await fetch(`/api/mitarbeiter/${mitarbeiterId}/dokumente`, {
        method: 'POST',
        body: formData
      })

      if (response.ok) {
        // Reset Form
        setSelectedFile(null)
        setKategorie('sonstiges')
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
        
        // Callback aufrufen
        if (onUploadSuccess) {
          onUploadSuccess()
        }
      } else {
        const data = await response.json()
        alert(`Fehler: ${data.fehler || 'Upload fehlgeschlagen'}`)
      }
    } catch (error) {
      console.error('Upload-Fehler:', error)
      alert('Fehler beim Hochladen')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (dokument: Dokument) => {
    if (!dokument._id || !dokument.dateipfad) return
    
    if (!confirm(`Möchten Sie das Dokument "${dokument.titel || dokument.name}" wirklich löschen?`)) {
      return
    }

    try {
      setDeleting(dokument._id)
      const response = await fetch(
        `/api/mitarbeiter/${mitarbeiterId}/dokumente?dokumentId=${dokument._id}&objectName=${dokument.dateipfad}`,
        { method: 'DELETE' }
      )

      if (response.ok) {
        if (onUploadSuccess) {
          onUploadSuccess()
        }
      } else {
        const data = await response.json()
        alert(`Fehler: ${data.fehler || 'Löschen fehlgeschlagen'}`)
      }
    } catch (error) {
      console.error('Delete-Fehler:', error)
      alert('Fehler beim Löschen')
    } finally {
      setDeleting(null)
    }
  }

  const formatDateigroesse = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  const handleDownload = (dokument: Dokument) => {
    if (dokument.url) {
      window.open(dokument.url, '_blank')
    }
  }

  return (
    <div className="space-y-4">
      {/* Upload-Bereich */}
      <Card className="bg-white border-gray-200">
        <CardHeader>
          <CardTitle className="text-gray-900 flex items-center gap-2">
            <Upload className="h-5 w-5 text-blue-600" />
            Dokument hochladen
          </CardTitle>
          <CardDescription className="text-gray-600">
            Laden Sie Dokumente wie Ausweise, Verträge oder Zertifikate hoch (max. 10 MB)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="file-upload" className="text-gray-900 font-medium">Datei auswählen</Label>
              <Input
                id="file-upload"
                ref={fileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                onChange={handleFileSelect}
                disabled={uploading}
                className="text-gray-900"
              />
              {selectedFile && (
                <p className="text-sm text-gray-700 font-medium">
                  Ausgewählt: {selectedFile.name} ({Math.round(selectedFile.size / 1024)} KB)
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="kategorie" className="text-gray-900 font-medium">Kategorie</Label>
              <Select value={kategorie} onValueChange={setKategorie} disabled={uploading}>
                <SelectTrigger id="kategorie" className="text-gray-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="personalausweis_vorne">Personalausweis Vorne</SelectItem>
                  <SelectItem value="personalausweis_hinten">Personalausweis Hinten</SelectItem>
                  <SelectItem value="vertrag">Vertrag</SelectItem>
                  <SelectItem value="zeugnis">Zeugnis</SelectItem>
                  <SelectItem value="zertifikat">Zertifikat</SelectItem>
                  <SelectItem value="sonstiges">Sonstiges</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-4">
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
              className="w-full md:w-auto"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Wird hochgeladen...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Dokument hochladen
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Statistik */}
      <Card className="bg-white border-gray-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-900">Dokumente gesamt</CardTitle>
          <FileText className="h-4 w-4 text-gray-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-gray-900">{dokumente.length}</div>
          <p className="text-xs text-gray-600 mt-1">Hochgeladene Dokumente</p>
        </CardContent>
      </Card>

      {/* Dokumente-Liste */}
      <Card className="bg-white border-gray-200">
        <CardHeader>
          <CardTitle className="text-gray-900 flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            Dokumente
          </CardTitle>
        </CardHeader>
        <CardContent>
          {dokumente.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Keine Dokumente vorhanden</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {dokumente.map((dokument, idx) => (
                <Card key={dokument._id || idx} className="bg-gray-50 border-gray-200 hover:border-blue-300 transition-colors">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start gap-2 flex-1">
                        <File className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {dokument.titel || dokument.name || dokument.dateiname}
                          </p>
                          <p className="text-xs text-gray-600 mt-1">
                            {formatDateigroesse(dokument.dateigroesse)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Badge variant="outline" className="text-xs">
                        {getKategorieLabel(dokument.kategorie)}
                      </Badge>
                      
                      {dokument.dateityp && (
                        <div className="text-xs text-gray-600">
                          Typ: {dokument.dateityp.toUpperCase()}
                        </div>
                      )}

                      <div className="flex items-center gap-1 text-xs text-gray-600">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(dokument.hochgeladenAm), 'dd.MM.yyyy', { locale: de })}
                      </div>

                      {dokument.hochgeladenVon && (
                        <div className="text-xs text-gray-600">
                          von: {dokument.hochgeladenVon}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 mt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 bg-white hover:bg-blue-50 border-gray-300"
                        onClick={() => handleDownload(dokument)}
                      >
                        <Download className="h-3 w-3 mr-2 text-gray-700" />
                        <span className="text-gray-900 font-medium">Download</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="bg-white hover:bg-red-50 border-gray-300"
                        onClick={() => handleDelete(dokument)}
                        disabled={deleting === dokument._id}
                      >
                        {deleting === dokument._id ? (
                          <Loader2 className="h-3 w-3 text-red-600 animate-spin" />
                        ) : (
                          <Trash2 className="h-3 w-3 text-red-600" />
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

