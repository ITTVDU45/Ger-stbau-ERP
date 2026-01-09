'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Projekt } from '@/lib/db/types'
import { Upload, FileText, Image as ImageIcon, File, Trash2, Download, CloudUpload, Eye, X, ZoomIn, ZoomOut } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import Image from 'next/image'

interface ProjektDokumenteTabProps {
  projekt: Projekt
  onProjektUpdated: () => void
}

export default function ProjektDokumenteTab({ projekt, onProjektUpdated }: ProjektDokumenteTabProps) {
  const [dokumente, setDokumente] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [selectedKategorie, setSelectedKategorie] = useState<string>('sonstiges')
  const [kommentar, setKommentar] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Lightbox State
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxDokument, setLightboxDokument] = useState<any>(null)
  const [lightboxZoom, setLightboxZoom] = useState(1)

  const openLightbox = (dok: any) => {
    setLightboxDokument(dok)
    setLightboxZoom(1)
    setLightboxOpen(true)
  }

  const closeLightbox = () => {
    setLightboxOpen(false)
    setLightboxDokument(null)
    setLightboxZoom(1)
  }

  const isImage = (typ: string) => typ?.startsWith('image/')
  const isPdf = (typ: string) => typ === 'application/pdf'

  useEffect(() => {
    loadDokumente()
  }, [projekt._id])

  const loadDokumente = async () => {
    if (!projekt.dokumente) {
      setDokumente([])
      return
    }
    setDokumente(projekt.dokumente)
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0])
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0])
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Bitte wählen Sie eine Datei aus')
      return
    }

    try {
      setUploading(true)

      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('projektId', projekt._id!)
      formData.append('kategorie', selectedKategorie)
      formData.append('kommentar', kommentar)
      formData.append('benutzer', 'admin')

      const response = await fetch(`/api/projekte/${projekt._id}/dokumente`, {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (data.erfolg) {
        toast.success('Dokument erfolgreich hochgeladen')
        setSelectedFile(null)
        setKommentar('')
        setSelectedKategorie('sonstiges')
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
        onProjektUpdated()
        loadDokumente()
      } else {
        toast.error('Fehler beim Hochladen', {
          description: data.fehler
        })
      }
    } catch (error) {
      console.error('Fehler:', error)
      toast.error('Fehler beim Hochladen')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (dokument: any) => {
    if (!confirm(`Dokument "${dokument.name}" wirklich löschen?`)) return

    try {
      const response = await fetch(`/api/projekte/${projekt._id}/dokumente`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dokumentId: dokument._id,
          objectName: dokument.objectName,
          benutzer: 'admin'
        })
      })

      const data = await response.json()

      if (data.erfolg) {
        toast.success('Dokument gelöscht')
        onProjektUpdated()
        loadDokumente()
      } else {
        toast.error('Fehler beim Löschen')
      }
    } catch (error) {
      console.error('Fehler:', error)
      toast.error('Fehler beim Löschen')
    }
  }

  const getKategorieBadge = (kategorie?: string) => {
    const config: any = {
      bauplan: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-300', label: 'Bauplan' },
      lieferschein: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-300', label: 'Lieferschein' },
      aufmass: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-300', label: 'Aufmaß' },
      sicherheit: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-300', label: 'Sicherheit' },
      foto: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-300', label: 'Foto' },
      sonstiges: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-300', label: 'Sonstiges' },
    }
    const c = config[kategorie || 'sonstiges']
    return <Badge variant="outline" className={`${c.bg} ${c.text} ${c.border}`}>{c.label}</Badge>
  }

  const getFileIcon = (typ: string) => {
    if (typ.startsWith('image/')) return <ImageIcon className="h-5 w-5 text-blue-600" />
    if (typ === 'application/pdf') return <FileText className="h-5 w-5 text-red-600" />
    return <File className="h-5 w-5 text-gray-600" />
  }

  const dokumenteNachKategorie = dokumente.reduce((acc: any, dok: any) => {
    const kat = dok.kategorie || 'sonstiges'
    if (!acc[kat]) acc[kat] = []
    acc[kat].push(dok)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      {/* Upload-Bereich */}
      <Card className="bg-white border-gray-200">
        <CardHeader>
          <CardTitle className="text-gray-900">Neues Dokument hochladen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Drag & Drop Zone */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <CloudUpload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-700 mb-2">
              Datei hierher ziehen oder{' '}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                durchsuchen
              </button>
            </p>
            <p className="text-sm text-gray-500">PDF, Bilder, Dokumente bis 10MB</p>
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* Ausgewählte Datei */}
          {selectedFile && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getFileIcon(selectedFile.type)}
                  <div>
                    <p className="font-medium text-gray-900">{selectedFile.name}</p>
                    <p className="text-sm text-gray-600">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedFile(null)
                    if (fileInputRef.current) fileInputRef.current.value = ''
                  }}
                  className="text-gray-700"
                >
                  Entfernen
                </Button>
              </div>
            </div>
          )}

          {/* Kategorie & Kommentar */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="kategorie" className="text-gray-900">
                Kategorie
              </Label>
              <Select value={selectedKategorie} onValueChange={setSelectedKategorie}>
                <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="bauplan">Bauplan</SelectItem>
                  <SelectItem value="lieferschein">Lieferschein</SelectItem>
                  <SelectItem value="aufmass">Aufmaß</SelectItem>
                  <SelectItem value="sicherheit">Sicherheit</SelectItem>
                  <SelectItem value="foto">Foto</SelectItem>
                  <SelectItem value="sonstiges">Sonstiges</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="kommentar" className="text-gray-900">
                Kommentar (optional)
              </Label>
              <Input
                id="kommentar"
                value={kommentar}
                onChange={(e) => setKommentar(e.target.value)}
                placeholder="z.B. Baupläne für Ostseite"
                className="bg-white border-gray-300 text-gray-900"
              />
            </div>
          </div>

          {/* Upload Button */}
          <Button
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Upload className="mr-2 h-4 w-4" />
            {uploading ? 'Wird hochgeladen...' : 'Hochladen'}
          </Button>
        </CardContent>
      </Card>

      {/* Dokumente-Liste */}
      <Card className="bg-white border-gray-200">
        <CardHeader>
          <CardTitle className="text-gray-900">
            Dokumente ({dokumente.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {dokumente.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Noch keine Dokumente hochgeladen</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(dokumenteNachKategorie).map(([kategorie, docs]: [string, any]) => (
                <div key={kategorie}>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    {getKategorieBadge(kategorie)}
                    <span>({docs.length})</span>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {docs.map((dok: any, dokIndex: number) => (
                      <div
                        key={dok._id || dok.objectName || `dok-${kategorie}-${dokIndex}`}
                        className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-all group"
                      >
                        {/* Thumbnail-Vorschau für Bilder */}
                        {isImage(dok.typ) ? (
                          <div 
                            className="relative aspect-video bg-gray-100 cursor-pointer overflow-hidden"
                            onClick={() => openLightbox(dok)}
                          >
                            <img
                              src={dok.url}
                              alt={dok.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                              <Eye className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </div>
                        ) : isPdf(dok.typ) ? (
                          <div 
                            className="relative aspect-video bg-red-50 cursor-pointer flex items-center justify-center"
                            onClick={() => openLightbox(dok)}
                          >
                            <FileText className="h-12 w-12 text-red-500" />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                              <Eye className="h-8 w-8 text-red-700 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </div>
                        ) : (
                          <div className="aspect-video bg-gray-50 flex items-center justify-center">
                            <File className="h-12 w-12 text-gray-400" />
                          </div>
                        )}
                        
                        {/* Dokument-Infos */}
                        <div className="p-3">
                          <p className="font-medium text-gray-900 text-sm mb-1 line-clamp-2" title={dok.name}>
                            {dok.name}
                          </p>
                          {dok.kommentar && (
                            <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                              {dok.kommentar}
                            </p>
                          )}
                          <p className="text-xs text-gray-500 mb-2">
                            {dok.hochgeladenAm ? format(new Date(dok.hochgeladenAm), 'dd.MM.yyyy HH:mm', { locale: de }) : '-'}
                            {dok.hochgeladenVon && ` · ${dok.hochgeladenVon}`}
                          </p>
                          
                          {/* Aktions-Buttons */}
                          <div className="flex gap-1 pt-2 border-t border-gray-100">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openLightbox(dok)}
                              className="h-8 flex-1 text-gray-600 hover:text-blue-600 hover:bg-blue-50"
                              title="Vorschau"
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              <span className="text-xs">Ansehen</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(dok.url, '_blank')}
                              className="h-8 px-2 text-gray-600 hover:text-gray-900"
                              title="Herunterladen"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(dok)}
                              className="h-8 px-2 text-red-500 hover:text-red-700 hover:bg-red-50"
                              title="Löschen"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lightbox / Vorschau-Modal */}
      <Dialog open={lightboxOpen} onOpenChange={closeLightbox}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95 border-none overflow-hidden">
          <DialogHeader className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-black/80 to-transparent">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-white font-medium truncate pr-4">
                {lightboxDokument?.name}
              </DialogTitle>
              <div className="flex items-center gap-2">
                {/* Zoom-Steuerung für Bilder */}
                {lightboxDokument && isImage(lightboxDokument.typ) && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setLightboxZoom(prev => Math.max(0.5, prev - 0.25))}
                      className="h-8 w-8 p-0 text-white hover:bg-white/20"
                      title="Verkleinern"
                    >
                      <ZoomOut className="h-4 w-4" />
                    </Button>
                    <span className="text-white text-sm min-w-[50px] text-center">
                      {Math.round(lightboxZoom * 100)}%
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setLightboxZoom(prev => Math.min(3, prev + 0.25))}
                      className="h-8 w-8 p-0 text-white hover:bg-white/20"
                      title="Vergrößern"
                    >
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                    <div className="w-px h-6 bg-white/30 mx-2" />
                  </>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => lightboxDokument && window.open(lightboxDokument.url, '_blank')}
                  className="h-8 px-3 text-white hover:bg-white/20"
                  title="Herunterladen"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={closeLightbox}
                  className="h-8 w-8 p-0 text-white hover:bg-white/20"
                  title="Schließen"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </DialogHeader>
          
          {/* Vorschau-Inhalt */}
          <div className="w-full h-[90vh] flex items-center justify-center overflow-auto p-8 pt-20">
            {lightboxDokument && isImage(lightboxDokument.typ) ? (
              <img
                src={lightboxDokument.url}
                alt={lightboxDokument.name}
                className="max-w-full max-h-full object-contain transition-transform duration-200"
                style={{ transform: `scale(${lightboxZoom})` }}
              />
            ) : lightboxDokument && isPdf(lightboxDokument.typ) ? (
              <iframe
                src={lightboxDokument.url}
                className="w-full h-full bg-white rounded-lg"
                title={lightboxDokument.name}
              />
            ) : lightboxDokument ? (
              <div className="text-center text-white">
                <File className="h-24 w-24 mx-auto mb-4 text-gray-400" />
                <p className="text-lg mb-4">{lightboxDokument.name}</p>
                <p className="text-gray-400 mb-6">
                  Keine Vorschau verfügbar für diesen Dateityp
                </p>
                <Button
                  onClick={() => window.open(lightboxDokument.url, '_blank')}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Datei herunterladen
                </Button>
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

