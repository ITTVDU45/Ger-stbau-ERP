'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Upload, X, FileText, Download } from 'lucide-react'
import { Anfrage } from '@/lib/db/types'
import { toast } from 'sonner'

interface DokumenteUploadProps {
  anfrageId: string
  dokumente: Anfrage['dokumente']
  onChange: (dokumente: Anfrage['dokumente']) => void
}

export default function DokumenteUpload({ anfrageId, dokumente = [], onChange }: DokumenteUploadProps) {
  const [uploading, setUploading] = useState(false)

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    try {
      setUploading(true)
      const uploadedDokumente = [...dokumente]

      for (const file of Array.from(files)) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('anfrageId', anfrageId)

        const response = await fetch('/api/anfragen/upload', {
          method: 'POST',
          body: formData
        })

        const data = await response.json()

        if (data.erfolg) {
          uploadedDokumente.push(data.dokument)
          toast.success(`${file.name} erfolgreich hochgeladen`)
        } else {
          toast.error(`Fehler beim Hochladen von ${file.name}`)
        }
      }

      onChange(uploadedDokumente)
    } catch (error) {
      console.error('Fehler beim Upload:', error)
      toast.error('Fehler beim Hochladen')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = (index: number) => {
    const neueDokumente = dokumente.filter((_, i) => i !== index)
    onChange(neueDokumente)
    toast.success('Dokument entfernt')
  }

  return (
    <div className="space-y-4">
      {/* Upload-Bereich */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
        <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-sm text-gray-700 mb-2">
          Dateien hochladen oder hier ablegen
        </p>
        <p className="text-xs text-gray-500 mb-4">
          PDF, DOC, DOCX, XLS, XLSX, JPG, PNG (max. 10MB)
        </p>
        <input
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
          onChange={handleFileUpload}
          disabled={uploading}
          className="hidden"
          id="file-upload"
        />
        <label htmlFor="file-upload">
          <Button 
            type="button"
            disabled={uploading}
            className="bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
            asChild
          >
            <span>
              {uploading ? 'Hochladen...' : 'Dateien auswählen'}
            </span>
          </Button>
        </label>
      </div>

      {/* Dokumente-Liste */}
      {dokumente.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-900">Hochgeladene Dokumente ({dokumente.length})</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {dokumente.map((dok, index) => (
              <Card key={index} className="p-3 bg-white border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <FileText className="h-5 w-5 text-blue-600 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {dok.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(dok.hochgeladenAm).toLocaleDateString('de-DE')}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(dok.url, '_blank')}
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(index)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

