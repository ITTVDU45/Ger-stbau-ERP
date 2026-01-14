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
import { User, Briefcase, Trash2, Info } from 'lucide-react'
import { usePlantafelStore } from '@/lib/stores/plantafelStore'
import { useEmployees, useProjects, useCreateAssignment, useUpdateAssignment, useDeleteAssignment } from '@/lib/queries/plantafelQueries'

interface AssignmentFormData {
  mitarbeiterId: string
  projektId: string
  rolle: string
  notizen: string
  bestaetigt: boolean
  // Aufbau-Planung (Datum + Uhrzeit)
  aufbauVonDatum: string  // date
  aufbauVonZeit: string   // time (z.B. "08:00")
  aufbauBisDatum: string  // date (optional)
  aufbauBisZeit: string   // time (optional)
  stundenAufbau: number
  // Abbau-Planung (Datum + Uhrzeit)
  abbauVonDatum: string   // date (optional)
  abbauVonZeit: string    // time (optional)
  abbauBisDatum: string   // date (optional)
  abbauBisZeit: string    // time (optional)
  stundenAbbau: number
}

const defaultFormData: AssignmentFormData = {
  mitarbeiterId: '',
  projektId: '',
  rolle: '',
  notizen: '',
  bestaetigt: false,
  aufbauVonDatum: new Date().toISOString().split('T')[0],
  aufbauVonZeit: '08:00',
  aufbauBisDatum: '',
  aufbauBisZeit: '17:00',
  stundenAufbau: 0,
  abbauVonDatum: '',
  abbauVonZeit: '08:00',
  abbauBisDatum: '',
  abbauBisZeit: '17:00',
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
  
  // Kombiniere Datum und Zeit zu einem Date-Objekt
  const combineDateAndTime = (datum: string, zeit: string): Date | null => {
    if (!datum) return null
    const date = new Date(datum)
    if (zeit) {
      const [hours, minutes] = zeit.split(':').map(Number)
      date.setHours(hours || 8, minutes || 0, 0, 0)
    } else {
      date.setHours(8, 0, 0, 0)
    }
    return date
  }
  
  // Berechne den Aufbau-Zeitraum mit Uhrzeiten
  const getAufbauZeitraum = () => {
    if (!formData.aufbauVonDatum) return { von: null, bis: null }
    
    const von = combineDateAndTime(formData.aufbauVonDatum, formData.aufbauVonZeit)
    const bisDatum = formData.aufbauBisDatum || formData.aufbauVonDatum
    const bis = combineDateAndTime(bisDatum, formData.aufbauBisZeit || formData.aufbauVonZeit)
    
    return { von, bis }
  }
  
  // Berechne den Abbau-Zeitraum mit Uhrzeiten
  const getAbbauZeitraum = () => {
    if (!formData.abbauVonDatum) return { von: null, bis: null }
    
    const von = combineDateAndTime(formData.abbauVonDatum, formData.abbauVonZeit)
    const bisDatum = formData.abbauBisDatum || formData.abbauVonDatum
    const bis = combineDateAndTime(bisDatum, formData.abbauBisZeit || formData.abbauVonZeit)
    
    return { von, bis }
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
        // Aufbau-Planung
        aufbauVonDatum: selectedEvent.aufbauVon 
          ? format(new Date(selectedEvent.aufbauVon), 'yyyy-MM-dd') 
          : format(selectedEvent.start, 'yyyy-MM-dd'),
        aufbauVonZeit: selectedEvent.aufbauVon 
          ? format(new Date(selectedEvent.aufbauVon), 'HH:mm')
          : '08:00',
        aufbauBisDatum: selectedEvent.aufbauBis 
          ? format(new Date(selectedEvent.aufbauBis), 'yyyy-MM-dd') 
          : '',
        aufbauBisZeit: selectedEvent.aufbauBis 
          ? format(new Date(selectedEvent.aufbauBis), 'HH:mm')
          : '17:00',
        stundenAufbau: selectedEvent.stundenAufbau || 0,
        // Abbau-Planung
        abbauVonDatum: selectedEvent.abbauVon 
          ? format(new Date(selectedEvent.abbauVon), 'yyyy-MM-dd') 
          : '',
        abbauVonZeit: selectedEvent.abbauVon 
          ? format(new Date(selectedEvent.abbauVon), 'HH:mm')
          : '08:00',
        abbauBisDatum: selectedEvent.abbauBis 
          ? format(new Date(selectedEvent.abbauBis), 'yyyy-MM-dd') 
          : '',
        abbauBisZeit: selectedEvent.abbauBis 
          ? format(new Date(selectedEvent.abbauBis), 'HH:mm')
          : '17:00',
        stundenAbbau: selectedEvent.stundenAbbau || 0
      })
    } else if (dialogMode === 'create' && selectedSlot) {
      // Erstellen: Slot-Daten vorausfüllen
      const aufbauVonDatum = format(selectedSlot.start, 'yyyy-MM-dd')
      
      setFormData({
        ...defaultFormData,
        aufbauVonDatum, // Vorausfüllen mit Startdatum
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
    if (!formData.projektId) {
      toast.error('Bitte wählen Sie ein Projekt aus')
      return
    }
    
    // Prüfe ob mindestens Aufbau ODER Abbau ausgefüllt ist
    const hatAufbau = formData.aufbauVonDatum && formData.stundenAufbau > 0
    const hatAbbau = formData.abbauVonDatum && formData.stundenAbbau > 0
    
    if (!hatAufbau && !hatAbbau) {
      toast.error('Bitte geben Sie mindestens Aufbau oder Abbau an')
      return
    }
    
    try {
      // Aufbau/Abbau-Datum Validierung (wenn gesetzt)
      if (formData.aufbauVonDatum && formData.aufbauBisDatum) {
        if (new Date(formData.aufbauVonDatum) > new Date(formData.aufbauBisDatum)) {
          toast.error('Aufbau: Startdatum muss vor Enddatum liegen')
          return
        }
      }
      if (formData.abbauVonDatum && formData.abbauBisDatum) {
        if (new Date(formData.abbauVonDatum) > new Date(formData.abbauBisDatum)) {
          toast.error('Abbau: Startdatum muss vor Enddatum liegen')
          return
        }
      }
      
      const baseData = {
        mitarbeiterId: formData.mitarbeiterId || undefined,
        projektId: formData.projektId,
        rolle: formData.rolle || undefined,
        notizen: formData.notizen || undefined,
        bestaetigt: formData.bestaetigt
      }
      
      if (dialogMode === 'edit' && selectedEvent) {
        // Bearbeitungsmodus: Aktualisiere bestehenden Einsatz
        const aufbauZeitraum = getAufbauZeitraum()
        const abbauZeitraum = getAbbauZeitraum()
        
        // Bestimme Gesamt-Zeitraum
        const allDates: Date[] = []
        if (aufbauZeitraum.von) allDates.push(aufbauZeitraum.von, aufbauZeitraum.bis!)
        if (abbauZeitraum.von) allDates.push(abbauZeitraum.von, abbauZeitraum.bis!)
        
        const gesamtVon = new Date(Math.min(...allDates.map(d => d.getTime())))
        const gesamtBis = new Date(Math.max(...allDates.map(d => d.getTime())))
        
        const payload = {
          ...baseData,
          von: gesamtVon.toISOString(),
          bis: gesamtBis.toISOString(),
          geplantStunden: getGesamtStunden() || undefined,
          // Aufbau-Daten (falls vorhanden)
          aufbauVon: aufbauZeitraum.von?.toISOString() || undefined,
          aufbauBis: aufbauZeitraum.bis?.toISOString() || undefined,
          stundenAufbau: formData.stundenAufbau || undefined,
          // Abbau-Daten (falls vorhanden)
          abbauVon: abbauZeitraum.von?.toISOString() || undefined,
          abbauBis: abbauZeitraum.bis?.toISOString() || undefined,
          stundenAbbau: formData.stundenAbbau || undefined
        }
        
        const realId = selectedEvent.sourceId
        await updateMutation.mutateAsync({ id: realId, data: payload })
        toast.success('Einsatz erfolgreich aktualisiert')
      } else {
        // Erstell-Modus: Erstelle separate Einträge für Aufbau und Abbau
        const einsaetze = []
        
        // Aufbau-Einsatz (falls ausgefüllt)
        if (hatAufbau) {
          const aufbauZeitraum = getAufbauZeitraum()
          if (aufbauZeitraum.von && aufbauZeitraum.bis) {
            einsaetze.push({
              ...baseData,
              von: aufbauZeitraum.von.toISOString(),
              bis: aufbauZeitraum.bis.toISOString(),
              geplantStunden: formData.stundenAufbau,
              aufbauVon: aufbauZeitraum.von.toISOString(),
              aufbauBis: aufbauZeitraum.bis.toISOString(),
              stundenAufbau: formData.stundenAufbau,
              notizen: formData.notizen ? `[AUFBAU] ${formData.notizen}` : '[AUFBAU]'
            })
          }
        }
        
        // Abbau-Einsatz (falls ausgefüllt)
        if (hatAbbau) {
          const abbauZeitraum = getAbbauZeitraum()
          if (abbauZeitraum.von && abbauZeitraum.bis) {
            einsaetze.push({
              ...baseData,
              von: abbauZeitraum.von.toISOString(),
              bis: abbauZeitraum.bis.toISOString(),
              geplantStunden: formData.stundenAbbau,
              abbauVon: abbauZeitraum.von.toISOString(),
              abbauBis: abbauZeitraum.bis.toISOString(),
              stundenAbbau: formData.stundenAbbau,
              notizen: formData.notizen ? `[ABBAU] ${formData.notizen}` : '[ABBAU]'
            })
          }
        }
        
        // Erstelle alle Einsätze
        for (const einsatz of einsaetze) {
          await createMutation.mutateAsync(einsatz)
        }
        
        const anzahl = einsaetze.length
        toast.success(
          anzahl === 1 
            ? 'Einsatz erfolgreich erstellt' 
            : `${anzahl} Einsätze erfolgreich erstellt (Aufbau + Abbau)`
        )
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
              ? 'Planen Sie Aufbau und/oder Abbau für ein Projekt. Jeder wird als separater Eintrag angezeigt.'
              : 'Bearbeiten Sie die Details des Einsatzes'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Mitarbeiter */}
          <div className="space-y-2">
            <Label htmlFor="mitarbeiter" className="text-gray-900 font-medium flex items-center gap-2">
              <User className="h-4 w-4" />
              Mitarbeiter
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
            <Label htmlFor="rolle" className="text-gray-900 font-medium">Rolle im Projekt</Label>
            <Select
              value={formData.rolle}
              onValueChange={(value) => handleChange('rolle', value)}
            >
              <SelectTrigger className="bg-white text-gray-900 border-gray-300">
                <SelectValue placeholder="Rolle auswählen" />
              </SelectTrigger>
              <SelectContent className="bg-white text-gray-900">
                <SelectItem value="Bauleiter">Bauleiter</SelectItem>
                <SelectItem value="Teamleiter">Teamleiter</SelectItem>
                <SelectItem value="Polier">Polier</SelectItem>
                <SelectItem value="Gerüstbauer">Gerüstbauer</SelectItem>
                <SelectItem value="Monteur">Monteur</SelectItem>
                <SelectItem value="Vorarbeiter">Vorarbeiter</SelectItem>
                <SelectItem value="Facharbeiter">Facharbeiter</SelectItem>
                <SelectItem value="Helfer">Helfer</SelectItem>
                <SelectItem value="Auszubildender">Auszubildender</SelectItem>
                <SelectItem value="Sicherheitsbeauftragter">Sicherheitsbeauftragter</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Aufbau/Abbau Planung */}
          <div className="border-t border-gray-200 pt-4">
            <Label className="text-gray-900 font-semibold mb-3 block">
              Aufbau/Abbau Planung
            </Label>
            <p className="text-xs text-gray-500 mb-4">
              Füllen Sie mindestens Aufbau ODER Abbau aus. Beide werden als separate Einträge in der Plantafel angezeigt.
            </p>
            
            {/* Aufbau Datum + Uhrzeit */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <Label className="text-blue-800 font-medium flex items-center gap-2 mb-3">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                Aufbau (optional)
              </Label>
              
              {/* Aufbau Von: Datum + Uhrzeit */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="space-y-1">
                  <Label className="text-gray-600 text-xs">Datum Von</Label>
                  <Input
                    type="date"
                    value={formData.aufbauVonDatum}
                    onChange={(e) => handleChange('aufbauVonDatum', e.target.value)}
                    className="bg-white text-gray-900 border-gray-300"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-gray-600 text-xs">Uhrzeit Von</Label>
                  <Input
                    type="time"
                    value={formData.aufbauVonZeit}
                    onChange={(e) => handleChange('aufbauVonZeit', e.target.value)}
                    className="bg-white text-gray-900 border-gray-300"
                  />
                </div>
              </div>
              
              {/* Aufbau Bis: Datum + Uhrzeit */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="space-y-1">
                  <Label className="text-gray-600 text-xs">Datum Bis (optional)</Label>
                  <Input
                    type="date"
                    value={formData.aufbauBisDatum}
                    onChange={(e) => handleChange('aufbauBisDatum', e.target.value)}
                    className="bg-white text-gray-900 border-gray-300"
                    placeholder="Gleich wie Von"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-gray-600 text-xs">Uhrzeit Bis</Label>
                  <Input
                    type="time"
                    value={formData.aufbauBisZeit}
                    onChange={(e) => handleChange('aufbauBisZeit', e.target.value)}
                    className="bg-white text-gray-900 border-gray-300"
                  />
                </div>
              </div>
              
              {/* Stunden Aufbau */}
              <div className="space-y-1">
                <Label className="text-gray-600 text-xs">Geplante Stunden</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.5"
                  value={formData.stundenAufbau}
                  onChange={(e) => handleChange('stundenAufbau', parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className="bg-white text-gray-900 border-gray-300"
                />
              </div>
            </div>
            
            {/* Abbau Datum + Uhrzeit */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <Label className="text-green-800 font-medium flex items-center gap-2 mb-3">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                Abbau (optional)
              </Label>
              
              {/* Abbau Von: Datum + Uhrzeit */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="space-y-1">
                  <Label className="text-gray-600 text-xs">Datum Von</Label>
                  <Input
                    type="date"
                    value={formData.abbauVonDatum}
                    onChange={(e) => handleChange('abbauVonDatum', e.target.value)}
                    className="bg-white text-gray-900 border-gray-300"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-gray-600 text-xs">Uhrzeit Von</Label>
                  <Input
                    type="time"
                    value={formData.abbauVonZeit}
                    onChange={(e) => handleChange('abbauVonZeit', e.target.value)}
                    className="bg-white text-gray-900 border-gray-300"
                  />
                </div>
              </div>
              
              {/* Abbau Bis: Datum + Uhrzeit */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="space-y-1">
                  <Label className="text-gray-600 text-xs">Datum Bis (optional)</Label>
                  <Input
                    type="date"
                    value={formData.abbauBisDatum}
                    onChange={(e) => handleChange('abbauBisDatum', e.target.value)}
                    className="bg-white text-gray-900 border-gray-300"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-gray-600 text-xs">Uhrzeit Bis</Label>
                  <Input
                    type="time"
                    value={formData.abbauBisZeit}
                    onChange={(e) => handleChange('abbauBisZeit', e.target.value)}
                    className="bg-white text-gray-900 border-gray-300"
                  />
                </div>
              </div>
              
              {/* Stunden Abbau */}
              <div className="space-y-1">
                <Label className="text-gray-600 text-xs">Geplante Stunden</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.5"
                  value={formData.stundenAbbau}
                  onChange={(e) => handleChange('stundenAbbau', parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className="bg-white text-gray-900 border-gray-300"
                />
              </div>
            </div>
          </div>
            
            {/* Gesamt-Stunden */}
            <div className="border-t border-gray-200 pt-4 mt-4">
              <div className="flex justify-between items-center mb-2">
                <Label className="text-gray-900">Gesamt geplante Stunden:</Label>
                <span className="text-xl font-bold text-gray-900">{getGesamtStunden()} Stunden</span>
              </div>
              <p className="text-xs text-gray-500">
                (Aufbau: {formData.stundenAufbau}h + Abbau: {formData.stundenAbbau}h)
              </p>
              {formData.aufbauVonDatum && formData.abbauVonDatum && (
                <div className="mt-2 flex items-center gap-2 text-blue-600 bg-blue-50 p-2 rounded-lg text-sm">
                  <Info className="h-4 w-4" />
                  Aufbau und Abbau werden als separate Einträge in der Plantafel angezeigt
                </div>
              )}
              {!formData.aufbauVonDatum && formData.abbauVonDatum && (
                <div className="mt-2 flex items-center gap-2 text-green-600 bg-green-50 p-2 rounded-lg text-sm">
                  <Info className="h-4 w-4" />
                  Nur Abbau wird in der Plantafel angezeigt
                </div>
              )}
              {formData.aufbauVonDatum && !formData.abbauVonDatum && (
                <div className="mt-2 flex items-center gap-2 text-blue-600 bg-blue-50 p-2 rounded-lg text-sm">
                  <Info className="h-4 w-4" />
                  Nur Aufbau wird in der Plantafel angezeigt
                </div>
              )}
            </div>
          
            {/* Notizen */}
            <div className="space-y-2 border-t border-gray-200 pt-4 mt-4">
              <Label htmlFor="notizen" className="text-gray-900 font-medium">Notizen</Label>
              <Input
                id="notizen"
                value={formData.notizen}
                onChange={(e) => handleChange('notizen', e.target.value)}
                placeholder="Optionale Hinweise..."
                className="bg-white text-gray-900 border-gray-300"
              />
            </div>
          
          {/* Bestätigt-Checkbox */}
          <div className="border-t border-gray-200 pt-4 mt-4">
            <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <Checkbox
                id="bestaetigt"
                checked={formData.bestaetigt}
                onCheckedChange={(checked) => handleChange('bestaetigt', !!checked)}
              />
              <Label htmlFor="bestaetigt" className="text-amber-800 font-medium cursor-pointer">
                Einsatz(e) bestätigt (Zeiterfassungen werden erstellt)
              </Label>
            </div>
            {formData.bestaetigt && (
              <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                <Info className="h-3 w-3" />
                Bei Bestätigung werden automatisch Zeiterfassungs-Einträge erstellt
              </p>
            )}
          </div>
          
        </div>

        <DialogFooter className="flex gap-2 pt-4 border-t border-gray-200 mt-4">
          {dialogMode === 'edit' && (
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting || createMutation.isPending || updateMutation.isPending}
              className="mr-auto"
            >
              {isDeleting ? 'Löschen...' : 'Löschen'}
            </Button>
          )}
          <Button 
            variant="outline" 
            onClick={closeDialog}
            className="bg-white text-gray-900 border-gray-300 hover:bg-gray-100"
          >
            Abbrechen
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={createMutation.isPending || updateMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {createMutation.isPending || updateMutation.isPending
              ? 'Speichern...'
              : dialogMode === 'create'
                ? 'Einsatz erstellen'
                : 'Änderungen speichern'
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

