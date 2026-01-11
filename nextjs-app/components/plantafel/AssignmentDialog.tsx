'use client'

/**
 * AssignmentDialog
 * 
 * Dialog zum Erstellen und Bearbeiten von Einsätzen in der Plantafel.
 * Struktur wie MitarbeiterZuweisenDialog mit Aufbau/Abbau-Datumsfeldern und Stunden.
 */

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { User, Briefcase, Trash2 } from 'lucide-react'
import { usePlantafelStore } from '@/lib/stores/plantafelStore'
import { useEmployees, useProjects, useCreateAssignment, useUpdateAssignment, useDeleteAssignment } from '@/lib/queries/plantafelQueries'

interface AssignmentFormData {
  mitarbeiterId: string
  projektId: string
  rolle: string
  notizen: string
  bestaetigt: boolean
  // Aufbau/Abbau-Planung (wie MitarbeiterZuweisenDialog)
  aufbauVon: string // date (Pflicht)
  aufbauBis: string // date (optional)
  stundenAufbau: number
  abbauVon: string  // date (optional)
  abbauBis: string  // date (optional)
  stundenAbbau: number
}

const defaultFormData: AssignmentFormData = {
  mitarbeiterId: '',
  projektId: '',
  rolle: '',
  notizen: '',
  bestaetigt: false,
  aufbauVon: new Date().toISOString().split('T')[0], // Heute als Standard
  aufbauBis: '',
  stundenAufbau: 0,
  abbauVon: '',
  abbauBis: '',
  stundenAbbau: 0
}

export default function AssignmentDialog() {
  const {
    isDialogOpen,
    dialogMode,
    selectedEvent,
    selectedSlot,
    closeDialog,
    view
  } = usePlantafelStore()
  
  const { data: employees = [] } = useEmployees()
  const { data: projects = [] } = useProjects()
  
  const createMutation = useCreateAssignment()
  const updateMutation = useUpdateAssignment()
  const deleteMutation = useDeleteAssignment()
  
  const [formData, setFormData] = useState<AssignmentFormData>(defaultFormData)
  const [isDeleting, setIsDeleting] = useState(false)
  
  // Berechne Gesamt-Stunden aus Aufbau + Abbau
  const getGesamtStunden = (): number => {
    return (formData.stundenAufbau || 0) + (formData.stundenAbbau || 0)
  }
  
  // Berechne den Aufbau-Zeitraum (NUR Aufbau-Tage, nicht Abbau!)
  const getAufbauZeitraum = () => {
    if (!formData.aufbauVon) return { von: null, bis: null }
    
    const von = new Date(formData.aufbauVon)
    const bis = formData.aufbauBis ? new Date(formData.aufbauBis) : new Date(formData.aufbauVon)
    
    // Setze Zeit auf 08:00 bzw. 17:00
    von.setHours(8, 0, 0, 0)
    bis.setHours(17, 0, 0, 0)
    
    return { von, bis }
  }
  
  // Berechne den Abbau-Zeitraum (nur wenn abbauVon gesetzt)
  const getAbbauZeitraum = () => {
    if (!formData.abbauVon) return { von: null, bis: null }
    
    const von = new Date(formData.abbauVon)
    const bis = formData.abbauBis ? new Date(formData.abbauBis) : new Date(formData.abbauVon)
    
    // Setze Zeit auf 08:00 bzw. 17:00
    von.setHours(8, 0, 0, 0)
    bis.setHours(17, 0, 0, 0)
    
    return { von, bis }
  }
  
  // Prüfe ob Abbau an anderen Tagen als Aufbau ist
  const istAbbauSeparat = (): boolean => {
    if (!formData.abbauVon || !formData.aufbauVon) return false
    
    const aufbauEnd = formData.aufbauBis || formData.aufbauVon
    
    // Abbau ist separat wenn abbauVon > aufbauBis (oder aufbauVon)
    return new Date(formData.abbauVon) > new Date(aufbauEnd)
  }
  
  // Formular initialisieren
  useEffect(() => {
    if (dialogMode === 'edit' && selectedEvent) {
      // Bearbeiten: Daten aus Event laden
      setFormData({
        mitarbeiterId: selectedEvent.mitarbeiterId || '',
        projektId: selectedEvent.projektId || '',
        rolle: selectedEvent.rolle || '',
        notizen: selectedEvent.notes || '',
        bestaetigt: selectedEvent.bestaetigt || false,
        // Aufbau/Abbau-Planung
        aufbauVon: selectedEvent.aufbauVon 
          ? format(new Date(selectedEvent.aufbauVon), 'yyyy-MM-dd') 
          : format(selectedEvent.start, 'yyyy-MM-dd'),
        aufbauBis: selectedEvent.aufbauBis 
          ? format(new Date(selectedEvent.aufbauBis), 'yyyy-MM-dd') 
          : '',
        stundenAufbau: selectedEvent.stundenAufbau || 0,
        abbauVon: selectedEvent.abbauVon 
          ? format(new Date(selectedEvent.abbauVon), 'yyyy-MM-dd') 
          : '',
        abbauBis: selectedEvent.abbauBis 
          ? format(new Date(selectedEvent.abbauBis), 'yyyy-MM-dd') 
          : '',
        stundenAbbau: selectedEvent.stundenAbbau || 0
      })
    } else if (dialogMode === 'create' && selectedSlot) {
      // Erstellen: Slot-Daten vorausfüllen
      const aufbauVon = format(selectedSlot.start, 'yyyy-MM-dd')
      
      setFormData({
        ...defaultFormData,
        aufbauVon, // Vorausfüllen mit Startdatum
        // Je nach View den resourceId als Mitarbeiter oder Projekt vorauswählen
        mitarbeiterId: view === 'team' ? selectedSlot.resourceId : '',
        projektId: view === 'project' ? selectedSlot.resourceId : ''
      })
    } else {
      setFormData(defaultFormData)
    }
  }, [dialogMode, selectedEvent, selectedSlot, view])
  
  const handleChange = (field: keyof AssignmentFormData, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }
  
  const handleSubmit = async () => {
    // Validierung
    if (!formData.mitarbeiterId) {
      toast.error('Bitte wählen Sie einen Mitarbeiter aus')
      return
    }
    if (!formData.projektId) {
      toast.error('Bitte wählen Sie ein Projekt aus')
      return
    }
    if (!formData.aufbauVon) {
      toast.error('Bitte geben Sie ein Aufbau-Startdatum an')
      return
    }
    if (formData.stundenAufbau <= 0 && formData.stundenAbbau <= 0) {
      toast.error('Bitte geben Sie Stunden für Aufbau oder Abbau an')
      return
    }
    
    try {
      // Aufbau/Abbau-Datum Validierung (wenn beide gesetzt)
      if (formData.aufbauVon && formData.aufbauBis) {
        if (new Date(formData.aufbauVon) > new Date(formData.aufbauBis)) {
          toast.error('Aufbau: Startdatum muss vor Enddatum liegen')
          return
        }
      }
      if (formData.abbauVon && formData.abbauBis) {
        if (new Date(formData.abbauVon) > new Date(formData.abbauBis)) {
          toast.error('Abbau: Startdatum muss vor Enddatum liegen')
          return
        }
      }
      
      // Berechne Gesamt-Zeitraum (frühestes bis spätestes Datum)
      const aufbauZeitraum = getAufbauZeitraum()
      const abbauZeitraum = getAbbauZeitraum()
      
      if (!aufbauZeitraum.von || !aufbauZeitraum.bis) {
        toast.error('Bitte geben Sie ein Aufbau-Startdatum an')
        return
      }
      
      // Gesamt-Zeitraum berechnen (für Filter in der Plantafel)
      const allDates: Date[] = [aufbauZeitraum.von, aufbauZeitraum.bis]
      if (abbauZeitraum.von) allDates.push(abbauZeitraum.von)
      if (abbauZeitraum.bis) allDates.push(abbauZeitraum.bis)
      
      const gesamtVon = new Date(Math.min(...allDates.map(d => d.getTime())))
      const gesamtBis = new Date(Math.max(...allDates.map(d => d.getTime())))
      
      // Ein Einsatz mit allen Daten (Aufbau + Abbau)
      const payload = {
        mitarbeiterId: formData.mitarbeiterId,
        projektId: formData.projektId,
        von: gesamtVon.toISOString(),
        bis: gesamtBis.toISOString(),
        rolle: formData.rolle || undefined,
        geplantStunden: getGesamtStunden() || undefined,
        notizen: formData.notizen || undefined,
        bestaetigt: formData.bestaetigt,
        // Aufbau-Planung (immer speichern)
        aufbauVon: formData.aufbauVon || undefined,
        aufbauBis: formData.aufbauBis || undefined,
        stundenAufbau: formData.stundenAufbau || undefined,
        // Abbau-Planung (immer speichern)
        abbauVon: formData.abbauVon || undefined,
        abbauBis: formData.abbauBis || undefined,
        stundenAbbau: formData.stundenAbbau || undefined
      }
      
      if (dialogMode === 'create') {
        await createMutation.mutateAsync(payload)
        toast.success(formData.bestaetigt 
          ? 'Einsatz erstellt und Zeiterfassungen angelegt' 
          : 'Einsatz erfolgreich erstellt')
      } else if (selectedEvent) {
        const realId = selectedEvent.sourceId
        await updateMutation.mutateAsync({ id: realId, data: payload })
        toast.success(formData.bestaetigt 
          ? 'Einsatz aktualisiert und Zeiterfassungen synchronisiert' 
          : 'Einsatz erfolgreich aktualisiert')
      }
      
      closeDialog()
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Fehler beim Speichern'
      toast.error(errorMessage)
    }
  }
  
  const handleDelete = async () => {
    if (!selectedEvent) return
    
    setIsDeleting(true)
    try {
      const realId = selectedEvent.sourceId
      await deleteMutation.mutateAsync(realId)
      toast.success('Einsatz erfolgreich gelöscht')
      closeDialog()
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Fehler beim Löschen'
      toast.error(errorMessage)
    } finally {
      setIsDeleting(false)
    }
  }
  
  const isLoading = createMutation.isPending || updateMutation.isPending
  const canDelete = dialogMode === 'edit' && selectedEvent?.sourceType === 'einsatz'
  
  return (
    <Dialog open={isDialogOpen} onOpenChange={(open) => !open && closeDialog()}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto bg-white text-gray-900">
        <DialogHeader>
          <DialogTitle className="text-gray-900">
            {dialogMode === 'create' ? 'Neuer Einsatz' : 'Einsatz bearbeiten'}
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            {dialogMode === 'create'
              ? 'Planen Sie einen neuen Mitarbeiter-Einsatz auf einem Projekt'
              : 'Bearbeiten Sie die Details des Einsatzes'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Mitarbeiter */}
          <div className="space-y-2">
            <Label htmlFor="mitarbeiter" className="text-gray-900 font-medium flex items-center gap-2">
              <User className="h-4 w-4" />
              Mitarbeiter *
            </Label>
            <Select
              value={formData.mitarbeiterId}
              onValueChange={(value) => handleChange('mitarbeiterId', value)}
            >
              <SelectTrigger className="bg-white text-gray-900 border-gray-300">
                <SelectValue placeholder="Mitarbeiter auswählen" />
              </SelectTrigger>
              <SelectContent className="bg-white text-gray-900">
                {employees.filter(e => e.aktiv).map((employee) => (
                  <SelectItem key={employee._id} value={employee._id || ''}>
                    {employee.vorname} {employee.nachname}
                    {employee.personalnummer && (
                      <span className="text-gray-500 ml-2">(#{employee.personalnummer})</span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Projekt */}
          <div className="space-y-2">
            <Label htmlFor="projekt" className="text-gray-900 font-medium flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Projekt *
            </Label>
            <Select
              value={formData.projektId}
              onValueChange={(value) => handleChange('projektId', value)}
            >
              <SelectTrigger className="bg-white text-gray-900 border-gray-300">
                <SelectValue placeholder="Projekt auswählen" />
              </SelectTrigger>
              <SelectContent className="bg-white text-gray-900">
                {projects.filter(p => ['in_planung', 'aktiv'].includes(p.status)).map((project) => (
                  <SelectItem key={project._id} value={project._id || ''}>
                    {project.projektname} ({project.projektnummer})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Rolle */}
          <div className="space-y-2">
            <Label htmlFor="rolle" className="text-gray-900 font-medium">Rolle im Projekt *</Label>
            <Select
              value={formData.rolle}
              onValueChange={(value) => handleChange('rolle', value)}
            >
              <SelectTrigger className="bg-white text-gray-900 border-gray-300">
                <SelectValue placeholder="Rolle auswählen" />
              </SelectTrigger>
              <SelectContent className="bg-white text-gray-900">
                <SelectItem value="kolonnenfuehrer">Kolonnenführer</SelectItem>
                <SelectItem value="vorarbeiter">Vorarbeiter</SelectItem>
                <SelectItem value="monteur">Monteur</SelectItem>
                <SelectItem value="helfer">Helfer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Aufbau/Abbau Planung */}
          <div className="border-t border-gray-200 pt-4">
            <Label className="text-gray-900 font-semibold mb-3 block">
              Aufbau/Abbau Planung
            </Label>
            <p className="text-xs text-gray-500 mb-4">
              Bei Bestätigung werden automatisch Zeiterfassungs-Einträge erstellt
            </p>
            
            {/* Aufbau */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="space-y-2">
                <Label className="text-gray-700 font-medium">Aufbau: Von *</Label>
                <Input
                  type="date"
                  value={formData.aufbauVon}
                  onChange={(e) => handleChange('aufbauVon', e.target.value)}
                  className="bg-white text-gray-900 border-gray-300"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-700 font-medium">Aufbau: Bis (optional)</Label>
                <Input
                  type="date"
                  value={formData.aufbauBis}
                  onChange={(e) => handleChange('aufbauBis', e.target.value)}
                  className="bg-white text-gray-900 border-gray-300"
                />
              </div>
            </div>
            
            {/* Stunden Aufbau/Abbau */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="space-y-2">
                <Label className="text-gray-700 font-medium flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  Stunden Aufbau
                </Label>
                <Input
                  type="number"
                  min="0"
                  step="0.5"
                  value={formData.stundenAufbau}
                  onChange={(e) => handleChange('stundenAufbau', parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className="bg-white text-gray-900 border-gray-300"
                />
                <p className="text-xs text-gray-500">Geplante Aufbau-Stunden</p>
              </div>
              <div className="space-y-2">
                <Label className="text-gray-700 font-medium flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  Stunden Abbau
                </Label>
                <Input
                  type="number"
                  min="0"
                  step="0.5"
                  value={formData.stundenAbbau}
                  onChange={(e) => handleChange('stundenAbbau', parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className="bg-white text-gray-900 border-gray-300"
                />
                <p className="text-xs text-gray-500">Geplante Abbau-Stunden</p>
              </div>
            </div>
            
            {/* Abbau */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-700 font-medium">Abbau: Von (optional)</Label>
                <Input
                  type="date"
                  value={formData.abbauVon}
                  onChange={(e) => handleChange('abbauVon', e.target.value)}
                  className="bg-white text-gray-900 border-gray-300"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-700 font-medium">Abbau: Bis (optional)</Label>
                <Input
                  type="date"
                  value={formData.abbauBis}
                  onChange={(e) => handleChange('abbauBis', e.target.value)}
                  className="bg-white text-gray-900 border-gray-300"
                />
              </div>
            </div>
            
            {/* Gesamt-Stunden Anzeige */}
            <div className="bg-gray-50 rounded-lg p-3 mt-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 text-sm">Gesamt geplante Stunden:</span>
                <span className="font-semibold text-lg text-gray-900">
                  {getGesamtStunden()} Stunden
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                (Aufbau: {formData.stundenAufbau || 0}h + Abbau: {formData.stundenAbbau || 0}h)
              </p>
              {istAbbauSeparat() && formData.stundenAbbau > 0 && (
                <p className="text-xs text-blue-600 mt-2 font-medium">
                  ℹ️ Aufbau und Abbau an verschiedenen Tagen → werden separat in der Timeline angezeigt
                </p>
              )}
            </div>
          </div>
          
          {/* Notizen */}
          <div className="space-y-2">
            <Label htmlFor="notizen" className="text-gray-900 font-medium">Notizen</Label>
            <Textarea
              id="notizen"
              placeholder="Zusätzliche Hinweise..."
              value={formData.notizen}
              onChange={(e) => handleChange('notizen', e.target.value)}
              className="bg-white text-gray-900 border-gray-300"
              rows={2}
            />
          </div>
          
          {/* Bestätigt */}
          <div className="flex items-center gap-2 pt-2">
            <Checkbox
              id="bestaetigt"
              checked={formData.bestaetigt}
              onCheckedChange={(checked) => handleChange('bestaetigt', !!checked)}
            />
            <label
              htmlFor="bestaetigt"
              className="text-sm text-gray-900 cursor-pointer"
            >
              Einsatz bestätigt
            </label>
            {formData.bestaetigt && (
              <span className="text-xs text-blue-600 ml-2">
                → Zeiterfassungen werden erstellt
              </span>
            )}
          </div>
        </div>
        
        <DialogFooter className="flex justify-between">
          <div>
            {canDelete && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={isDeleting || isLoading}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {isDeleting ? 'Löschen...' : 'Löschen'}
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={closeDialog} disabled={isLoading}>
              Abbrechen
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isLoading ? 'Speichern...' : 'Speichern'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
