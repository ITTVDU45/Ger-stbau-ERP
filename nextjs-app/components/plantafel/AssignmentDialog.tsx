'use client'

/**
 * AssignmentDialog
 * 
 * Dialog zum Erstellen und Bearbeiten von Einsätzen
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
import { Calendar, User, Briefcase, Clock, Trash2 } from 'lucide-react'
import { usePlantafelStore } from '@/lib/stores/plantafelStore'
import { useEmployees, useProjects, useCreateAssignment, useUpdateAssignment, useDeleteAssignment } from '@/lib/queries/plantafelQueries'
import { PlantafelEvent } from './types'

interface AssignmentFormData {
  mitarbeiterId: string
  projektId: string
  von: string
  bis: string
  rolle: string
  geplantStunden: number
  notizen: string
  bestaetigt: boolean
}

const defaultFormData: AssignmentFormData = {
  mitarbeiterId: '',
  projektId: '',
  von: '',
  bis: '',
  rolle: '',
  geplantStunden: 0,
  notizen: '',
  bestaetigt: false
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
  
  // Berechne Stunden aus Von/Bis
  const calculateHours = (von: string, bis: string): number => {
    if (!von || !bis) return 0
    try {
      const vonDate = new Date(von)
      const bisDate = new Date(bis)
      const diffMs = bisDate.getTime() - vonDate.getTime()
      const diffHours = diffMs / (1000 * 60 * 60)
      return Math.max(0, Math.round(diffHours * 2) / 2) // Runde auf 0.5 Stunden
    } catch {
      return 0
    }
  }
  
  // Formular initialisieren
  useEffect(() => {
    if (dialogMode === 'edit' && selectedEvent) {
      // Bearbeiten: Daten aus Event laden
      const von = format(selectedEvent.start, "yyyy-MM-dd'T'HH:mm")
      const bis = format(selectedEvent.end, "yyyy-MM-dd'T'HH:mm")
      setFormData({
        mitarbeiterId: selectedEvent.mitarbeiterId || '',
        projektId: selectedEvent.projektId || '',
        von,
        bis,
        rolle: '',
        geplantStunden: calculateHours(von, bis),
        notizen: selectedEvent.notes || '',
        bestaetigt: selectedEvent.bestaetigt || false
      })
    } else if (dialogMode === 'create' && selectedSlot) {
      // Erstellen: Slot-Daten vorausfüllen
      const von = format(selectedSlot.start, "yyyy-MM-dd'T'HH:mm")
      const bis = format(selectedSlot.end, "yyyy-MM-dd'T'HH:mm")
      setFormData({
        ...defaultFormData,
        von,
        bis,
        geplantStunden: calculateHours(von, bis),
        // Je nach View den resourceId als Mitarbeiter oder Projekt vorauswählen
        mitarbeiterId: view === 'team' ? selectedSlot.resourceId : '',
        projektId: view === 'project' ? selectedSlot.resourceId : ''
      })
    } else {
      setFormData(defaultFormData)
    }
  }, [dialogMode, selectedEvent, selectedSlot, view])
  
  const handleChange = (field: keyof AssignmentFormData, value: any) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value }
      
      // Automatisch Stunden berechnen wenn Von oder Bis geändert wird
      if (field === 'von' || field === 'bis') {
        const von = field === 'von' ? value : prev.von
        const bis = field === 'bis' ? value : prev.bis
        newData.geplantStunden = calculateHours(von, bis)
      }
      
      return newData
    })
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
    if (!formData.von || !formData.bis) {
      toast.error('Bitte geben Sie Start- und Enddatum an')
      return
    }
    
    const vonDate = new Date(formData.von)
    const bisDate = new Date(formData.bis)
    
    if (vonDate >= bisDate) {
      toast.error('Das Startdatum muss vor dem Enddatum liegen')
      return
    }
    
    try {
      if (dialogMode === 'create') {
        await createMutation.mutateAsync({
          mitarbeiterId: formData.mitarbeiterId,
          projektId: formData.projektId,
          von: vonDate.toISOString(),
          bis: bisDate.toISOString(),
          rolle: formData.rolle || undefined,
          geplantStunden: formData.geplantStunden || undefined,
          notizen: formData.notizen || undefined,
          bestaetigt: formData.bestaetigt
        })
        toast.success('Einsatz erfolgreich erstellt')
      } else if (selectedEvent) {
        // Extrahiere die echte ID aus der Event-ID (z.B. "einsatz-123" -> "123")
        const realId = selectedEvent.sourceId
        
        await updateMutation.mutateAsync({
          id: realId,
          data: {
            mitarbeiterId: formData.mitarbeiterId,
            projektId: formData.projektId,
            von: vonDate.toISOString(),
            bis: bisDate.toISOString(),
            rolle: formData.rolle || undefined,
            geplantStunden: formData.geplantStunden || undefined,
            notizen: formData.notizen || undefined,
            bestaetigt: formData.bestaetigt
          }
        })
        toast.success('Einsatz erfolgreich aktualisiert')
      }
      
      closeDialog()
    } catch (error: any) {
      toast.error(error.message || 'Fehler beim Speichern')
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
    } catch (error: any) {
      toast.error(error.message || 'Fehler beim Löschen')
    } finally {
      setIsDeleting(false)
    }
  }
  
  const isLoading = createMutation.isPending || updateMutation.isPending
  const canDelete = dialogMode === 'edit' && selectedEvent?.sourceType === 'einsatz'
  
  return (
    <Dialog open={isDialogOpen} onOpenChange={(open) => !open && closeDialog()}>
      <DialogContent className="sm:max-w-[500px] bg-white text-gray-900">
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
        
        <div className="grid gap-4 py-4">
          {/* Mitarbeiter */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="mitarbeiter" className="text-right text-gray-900">
              <User className="h-4 w-4 inline mr-2" />
              Mitarbeiter
            </Label>
            <Select
              value={formData.mitarbeiterId}
              onValueChange={(value) => handleChange('mitarbeiterId', value)}
            >
              <SelectTrigger className="col-span-3 bg-white text-gray-900">
                <SelectValue placeholder="Mitarbeiter auswählen" />
              </SelectTrigger>
              <SelectContent className="bg-white text-gray-900">
                {employees.filter(e => e.aktiv).map((employee) => (
                  <SelectItem key={employee._id} value={employee._id || ''}>
                    {employee.vorname} {employee.nachname}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Projekt */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="projekt" className="text-right text-gray-900">
              <Briefcase className="h-4 w-4 inline mr-2" />
              Projekt
            </Label>
            <Select
              value={formData.projektId}
              onValueChange={(value) => handleChange('projektId', value)}
            >
              <SelectTrigger className="col-span-3 bg-white text-gray-900">
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
          
          {/* Start-Datum */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="von" className="text-right text-gray-900">
              <Calendar className="h-4 w-4 inline mr-2" />
              Von
            </Label>
            <Input
              id="von"
              type="datetime-local"
              value={formData.von}
              onChange={(e) => handleChange('von', e.target.value)}
              className="col-span-3 bg-white text-gray-900"
            />
          </div>
          
          {/* End-Datum */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="bis" className="text-right text-gray-900">
              <Calendar className="h-4 w-4 inline mr-2" />
              Bis
            </Label>
            <Input
              id="bis"
              type="datetime-local"
              value={formData.bis}
              onChange={(e) => handleChange('bis', e.target.value)}
              className="col-span-3 bg-white text-gray-900"
            />
          </div>
          
          {/* Rolle */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="rolle" className="text-right text-gray-900">
              Rolle
            </Label>
            <Input
              id="rolle"
              placeholder="z.B. Vorarbeiter, Helfer"
              value={formData.rolle}
              onChange={(e) => handleChange('rolle', e.target.value)}
              className="col-span-3 bg-white text-gray-900"
            />
          </div>
          
          {/* Geplante Stunden - Automatisch berechnet */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="stunden" className="text-right text-gray-900">
              <Clock className="h-4 w-4 inline mr-2" />
              Std. geplant
            </Label>
            <div className="col-span-3">
              <Input
                id="stunden"
                type="text"
                value={`${formData.geplantStunden || 0} Stunden`}
                readOnly
                disabled
                className="bg-gray-100 text-gray-700 cursor-not-allowed"
                title="Wird automatisch aus Von/Bis berechnet"
              />
              <p className="text-xs text-gray-500 mt-1">
                Automatisch berechnet aus Zeitraum
              </p>
            </div>
          </div>
          
          {/* Notizen */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="notizen" className="text-right text-gray-900">
              Notizen
            </Label>
            <Textarea
              id="notizen"
              placeholder="Zusätzliche Hinweise..."
              value={formData.notizen}
              onChange={(e) => handleChange('notizen', e.target.value)}
              className="col-span-3 bg-white text-gray-900"
              rows={2}
            />
          </div>
          
          {/* Bestätigt */}
          <div className="grid grid-cols-4 items-center gap-4">
            <div className="col-span-1" />
            <div className="col-span-3 flex items-center gap-2">
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
            </div>
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
