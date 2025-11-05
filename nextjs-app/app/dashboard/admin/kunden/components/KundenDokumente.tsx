"use client"

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Upload, FileText, Download, Eye, Trash2 } from 'lucide-react'

interface KundenDokumenteProps {
  kundeId: string
  kundeName: string
}

export default function KundenDokumente({ kundeId, kundeName }: KundenDokumenteProps) {
  const [dokumente, setDokumente] = useState<any[]>([])
  const [uploading, setUploading] = useState(false)
  const [kategorie, setKategorie] = useState('vertrag')

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    setUploading(true)
    const formData = new FormData()
    Array.from(files).forEach(file => formData.append('files', file))
    formData.append('kategorie', kategorie)

    try {
      const response = await fetch(`/api/kunden/${kundeId}/dokumente`, {
        method: 'POST',
        body: formData
      })

      if (response.ok) {
        // Dokumente neu laden
        loadDokumente()
      } else {
        alert('Fehler beim Upload')
      }
    } catch (error) {
      console.error('Upload-Fehler:', error)
      alert('Fehler beim Upload')
    } finally {
      setUploading(false)
    }
  }

  const loadDokumente = async () => {
    // TODO: Implementierung
    console.log('Lade Dokumente für Kunde:', kundeId)
  }

  return (
    <div className="space-y-4">
      {/* Upload-Bereich */}
      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="text-gray-900">Dokumente hochladen</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="kategorie">Kategorie</Label>
              <Select value={kategorie} onValueChange={setKategorie}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vertrag">Vertrag</SelectItem>
                  <SelectItem value="schriftwechsel">Schriftwechsel</SelectItem>
                  <SelectItem value="zertifikat">Zertifikat</SelectItem>
                  <SelectItem value="sonstiges">Sonstiges</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="file-upload">Dateien auswählen</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="file-upload"
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="flex-1"
                />
                <Button disabled={uploading}>
                  <Upload className="h-4 w-4 mr-2" />
                  {uploading ? 'Hochladen...' : 'Hochladen'}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dokumente-Liste */}
      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="text-gray-900">Gespeicherte Dokumente</CardTitle>
        </CardHeader>
        <CardContent>
          {dokumente.length === 0 ? (
            <p className="text-center py-8 text-gray-500">
              Noch keine Dokumente hochgeladen
            </p>
          ) : (
            <div className="space-y-2">
              {dokumente.map((dok, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 border border-gray-200 bg-white rounded-lg hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-medium text-gray-900">{dok.name}</p>
                      <p className="text-sm text-gray-600">{dok.kategorie} • {dok.groesse}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" className="hover:bg-gray-100">
                      <Eye className="h-4 w-4 text-gray-700" />
                    </Button>
                    <Button variant="ghost" size="sm" className="hover:bg-gray-100">
                      <Download className="h-4 w-4 text-gray-700" />
                    </Button>
                    <Button variant="ghost" size="sm" className="hover:bg-gray-100">
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
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

