'use client'

/**
 * AssignmentDialog (NEUE VERSION)
 * 
 * Dialog zum Erstellen und Bearbeiten von Einsätzen mit:
 * - Tabs für Aufbau/Abbau
 * - Date-only Felder (keine Uhrzeiten)
 * - Badges mit X zum Entfernen
 * - Löschen-Funktion mit Confirm
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
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { User, Briefcase, Trash2, Info, X, Calendar } from 'lucide-react'
import { usePlantafelStore } from '@/lib/stores/plantafelStore'
import { useEmployees, useProjects, useCreateAssignment, useUpdateAssignment, useDeleteAssignment } from '@/lib/queries/plantafelQueries'

interface SelectedMitarbeiter {
  id: string
  name: string
  personalnummer?: string
}

interface AssignmentFormData {
  mitarbeiterIds: SelectedMitarbeiter[] // Mehrere Mitarbeiter als Array
  projektId: string
  rolle: string
  notizen: string
  bestaetigt: boolean
  // Neue date-only Felder
  setupDate: string    // YYYY-MM-DD
  dismantleDate: string // YYYY-MM-DD
}

const defaultFormData: AssignmentFormData = {
  mitarbeiterIds: [],
  projektId: '',
  rolle: '',
  notizen: '',
  bestaetigt: false,
  setupDate: '',
  dismantleDate: ''
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
  const [activeTab, setActiveTab] = useState<'setup' | 'dismantle'>('setup')
  const [isDeleting, setIsDeleting] = useState(false)
  const isDragMitarbeiterCreate = dialogMode === 'create' && view === 'team' && !!selectedSlot?.resourceId

  function toDateOnly(value?: string) {
    if (!value) return ''
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return ''
    return format(parsed, 'yyyy-MM-dd')
  }

  function getEarliestDate(values: string[]) {
    const validDates = values
      .map(value => new Date(value))
      .filter(date => !Number.isNaN(date.getTime()))
      .sort((a, b) => a.getTime() - b.getTime())
    if (validDates.length === 0) return ''
    return format(validDates[0], 'yyyy-MM-dd')
  }
  
  // Formular initialisieren
  useEffect(() => {
    if (dialogMode === 'edit' && selectedEvent) {
      // Bearbeiten: Daten aus Event laden
      // Unterstütze sowohl neue (setupDate/dismantleDate) als auch alte Felder (aufbauVon/abbauVon)
      let setupDate = selectedEvent.setupDate || ''
      let dismantleDate = selectedEvent.dismantleDate || ''
      
      // Fallback: Konvertiere alte Felder zu neuem Format
      if (!setupDate && selectedEvent.aufbauVon) {
        setupDate = format(new Date(selectedEvent.aufbauVon), 'yyyy-MM-dd')
      }
      if (!dismantleDate && selectedEvent.abbauVon) {
        dismantleDate = format(new Date(selectedEvent.abbauVon), 'yyyy-MM-dd')
      }
      
      // Im Edit-Modus alle Mitarbeiter laden (auch gruppierte)
      const mitarbeiterIds: SelectedMitarbeiter[] = []
      
      // Prüfe ob es gruppierte Mitarbeiter gibt
      if (selectedEvent.allMitarbeiterIds && selectedEvent.allMitarbeiterIds.length > 0) {
        // Gruppiertes Event: Lade alle Mitarbeiter
        for (let i = 0; i < selectedEvent.allMitarbeiterIds.length; i++) {
          const id = selectedEvent.allMitarbeiterIds[i]
          const name = selectedEvent.allMitarbeiterNames?.[i] || 'Unbekannt'
          const employee = employees.find(e => e._id === id)
          mitarbeiterIds.push({
            id,
            name,
            personalnummer: employee?.personalnummer
          })
        }
      } else if (selectedEvent.mitarbeiterId) {
        // Einzelnes Event: Nur einen Mitarbeiter laden
        const employee = employees.find(e => e._id === selectedEvent.mitarbeiterId)
        mitarbeiterIds.push({
          id: selectedEvent.mitarbeiterId,
          name: selectedEvent.mitarbeiterName || 'Unbekannt',
          personalnummer: employee?.personalnummer
        })
      }
      
      setFormData({
        mitarbeiterIds,
        projektId: selectedEvent.projektId || '',
        rolle: selectedEvent.rolle || '',
        notizen: selectedEvent.notes || '',
        bestaetigt: selectedEvent.bestaetigt || false,
        setupDate,
        dismantleDate
      })
    } else if (dialogMode === 'create' && selectedSlot) {
      // Erstellen: Slot-Daten vorausfüllen
      const clickedDate = format(selectedSlot.start, 'yyyy-MM-dd')
      
      // Mitarbeiter vorauswählen wenn Team-View
      const mitarbeiterIds: SelectedMitarbeiter[] = []
      if (view === 'team' && selectedSlot.resourceId) {
        const employee = employees.find(e => e._id === selectedSlot.resourceId)
        if (employee) {
          mitarbeiterIds.push({
            id: employee._id || '',
            name: `${employee.vorname} ${employee.nachname}`,
            personalnummer: employee.personalnummer
          })
        }
      }
      
      setFormData({
        ...defaultFormData,
        mitarbeiterIds,
        setupDate: clickedDate, // Vorausfüllen mit geklicktem Datum
        projektId: view === 'project' ? selectedSlot.resourceId : ''
      })
    } else {
      setFormData(defaultFormData)
    }
  }, [dialogMode, selectedEvent, selectedSlot, view, employees])

  useEffect(() => {
    if (!isDialogOpen || dialogMode !== 'edit' || !selectedEvent?.projektId) return
    let isActive = true

    async function loadProjectDates() {
      try {
        const response = await fetch(`/api/einsatz?projektId=${selectedEvent.projektId}`)
        if (!response.ok) return
        const data = await response.json()
        const einsaetze = data?.einsaetze ?? []
        if (!isActive || !Array.isArray(einsaetze)) return

        const setupCandidates = einsaetze
          .map((einsatz: any) => einsatz.setupDate || toDateOnly(einsatz.aufbauVon))
          .filter(Boolean)
        const dismantleCandidates = einsaetze
          .map((einsatz: any) => einsatz.dismantleDate || toDateOnly(einsatz.abbauVon))
          .filter(Boolean)

        const projectSetupDate = getEarliestDate(setupCandidates)
        const projectDismantleDate = getEarliestDate(dismantleCandidates)

        setFormData(prev => {
          if (prev.projektId !== selectedEvent.projektId) return prev
          return {
            ...prev,
            setupDate: prev.setupDate || projectSetupDate || '',
            dismantleDate: prev.dismantleDate || projectDismantleDate || ''
          }
        })
      } catch {
        // Keine UI-Fehlermeldung nötig – Dialog funktioniert auch ohne Zusatzdaten
      }
    }

    loadProjectDates()

    return () => {
      isActive = false
    }
  }, [isDialogOpen, dialogMode, selectedEvent?.projektId])
  
  const handleChange = (field: keyof AssignmentFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }
  
  const handleRemoveDate = (field: 'setupDate' | 'dismantleDate') => {
    setFormData(prev => ({ ...prev, [field]: '' }))
  }
  
  // Mitarbeiter hinzufügen
  const handleAddMitarbeiter = (employeeId: string) => {
    if (!employeeId || employeeId === 'none') return
    
    // Prüfen ob bereits hinzugefügt
    if ((formData?.mitarbeiterIds ?? []).some(m => m.id === employeeId)) {
      toast.info('Mitarbeiter bereits hinzugefügt')
      return
    }
    
    const employee = employees.find(e => e._id === employeeId)
    if (!employee) return
    
    setFormData(prev => ({
      ...prev,
      mitarbeiterIds: [
        ...(prev?.mitarbeiterIds ?? []),
        {
          id: employee._id || '',
          name: `${employee.vorname} ${employee.nachname}`,
          personalnummer: employee.personalnummer
        }
      ]
    }))
  }
  
  // Mitarbeiter entfernen
  const handleRemoveMitarbeiter = (employeeId: string) => {
    setFormData(prev => ({
      ...prev,
      mitarbeiterIds: (prev?.mitarbeiterIds ?? []).filter(m => m.id !== employeeId)
    }))
  }
  
  const handleSubmit = async () => {
    // Debug: Zeige FormData beim Submit
    console.log('[AssignmentDialog] Submit FormData:', {
      projektId: formData.projektId,
      mitarbeiterIds: formData.mitarbeiterIds?.length,
      setupDate: formData.setupDate,
      dismantleDate: formData.dismantleDate
    })
    
    // Validierung
    if (!formData.projektId) {
      console.error('[AssignmentDialog] Fehler: projektId fehlt!', formData)
      toast.error('Bitte wählen Sie ein Projekt aus')
      return
    }
    
    // Mindestens Aufbau ODER Abbau muss gesetzt sein
    if (!formData.setupDate && !formData.dismantleDate) {
      console.error('[AssignmentDialog] Fehler: Kein Datum gesetzt!', formData)
      toast.error('Bitte geben Sie mindestens ein Aufbau- oder Abbau-Datum an')
      return
    }
    
    try {
      // Berechne von/bis: Wenn nur ein Datum, dann gleicher Tag für Start und Ende
      const dates = [formData.setupDate, formData.dismantleDate].filter(Boolean)
      if (dates.length === 0) {
        toast.error('Bitte geben Sie mindestens ein Aufbau- oder Abbau-Datum an')
        return
      }
      
      // Wenn nur ein Datum: von und bis auf den gleichen Tag
      // Wenn zwei Daten: von = früheres, bis = späteres
      const sortedDates = dates.sort()
      const vonDateStr = sortedDates[0]
      const bisDateStr = sortedDates.length === 1 ? sortedDates[0] : sortedDates[sortedDates.length - 1]
      
      // Erstelle Date-Objekte in lokaler Zeitzone (YYYY-MM-DD → lokale Zeitzone)
      const [vonYear, vonMonth, vonDay] = vonDateStr.split('-').map(Number)
      const von = new Date(vonYear, vonMonth - 1, vonDay, 0, 0, 0, 0)
      
      const [bisYear, bisMonth, bisDay] = bisDateStr.split('-').map(Number)
      const bis = new Date(bisYear, bisMonth - 1, bisDay, 23, 59, 59, 999)
      
      if (dialogMode === 'edit' && selectedEvent) {
        // Bearbeitungsmodus: 
        // 1. Bestehenden Einsatz mit erstem Mitarbeiter aktualisieren
        // 2. Für jeden NEUEN Mitarbeiter einen neuen Einsatz erstellen
        const mitarbeiterListe = formData?.mitarbeiterIds ?? []
        
        // Erster Mitarbeiter überschreibt den bestehenden Einsatz
        const ersterMitarbeiter = mitarbeiterListe.length > 0 ? mitarbeiterListe[0] : null
        
        const payload = {
          mitarbeiterId: ersterMitarbeiter?.id || undefined,
          projektId: formData.projektId,
          rolle: formData.rolle || undefined,
          notizen: formData.notizen || undefined,
          bestaetigt: formData.bestaetigt,
          setupDate: formData.setupDate || undefined,
          dismantleDate: formData.dismantleDate || undefined,
          von: von.toISOString(),
          bis: bis.toISOString()
        }
        
        const realId = selectedEvent.sourceId
        await updateMutation.mutateAsync({ id: realId, data: payload })
        
        // Für jeden ZUSÄTZLICHEN Mitarbeiter (ab Index 1) einen neuen Einsatz erstellen
        let neueEinsaetze = 0
        for (let i = 1; i < mitarbeiterListe.length; i++) {
          const mitarbeiter = mitarbeiterListe[i]
          const neuerPayload = {
            mitarbeiterId: mitarbeiter.id || undefined,
            projektId: formData.projektId,
            rolle: formData.rolle || undefined,
            notizen: formData.notizen || undefined,
            bestaetigt: formData.bestaetigt,
            setupDate: formData.setupDate || undefined,
            dismantleDate: formData.dismantleDate || undefined,
            von: von.toISOString(),
            bis: bis.toISOString()
          }
          await createMutation.mutateAsync(neuerPayload)
          neueEinsaetze++
        }
        
        if (neueEinsaetze > 0) {
          toast.success(`Einsatz aktualisiert und ${neueEinsaetze} neue Einsätze erstellt`)
        } else {
          toast.success('Einsatz erfolgreich aktualisiert')
        }
      } else {
        // Erstell-Modus: Erstelle Einsatz für JEDEN ausgewählten Mitarbeiter
        const ausgewaehlteMitarbeiter = formData?.mitarbeiterIds ?? []
        const mitarbeiterListe = ausgewaehlteMitarbeiter.length > 0 
          ? ausgewaehlteMitarbeiter 
          : [{ id: '', name: 'Nicht zugewiesen' }] // Mindestens einen Einsatz ohne Mitarbeiter erstellen
        
        let erstellteEinsaetze = 0
        
        for (const mitarbeiter of mitarbeiterListe) {
          const payload = {
            mitarbeiterId: mitarbeiter.id || undefined,
            projektId: formData.projektId,
            rolle: formData.rolle || undefined,
            notizen: formData.notizen || undefined,
            bestaetigt: formData.bestaetigt,
            setupDate: formData.setupDate || undefined,
            dismantleDate: formData.dismantleDate || undefined,
            von: von.toISOString(),
            bis: bis.toISOString()
          }
          
          console.log('[AssignmentDialog] Erstelle Einsatz mit Payload:', payload)
          await createMutation.mutateAsync(payload)
          erstellteEinsaetze++
        }
        
        if (erstellteEinsaetze > 1) {
          toast.success(`${erstellteEinsaetze} Einsätze erfolgreich erstellt`)
        } else {
          toast.success('Einsatz erfolgreich erstellt')
        }
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
      console.log('[AssignmentDialog] Löschen - sourceId:', realId)
      console.log('[AssignmentDialog] Löschen - selectedEvent:', selectedEvent)
      
      if (!realId) {
        toast.error('Keine gültige Einsatz-ID gefunden')
        setIsDeleting(false)
        return
      }
      
      await deleteMutation.mutateAsync(realId)
      toast.success('Einsatz erfolgreich gelöscht')
      closeDialog()
    } catch (error: unknown) {
      console.error('[AssignmentDialog] Löschen-Fehler:', error)
      const errorMessage = error instanceof Error ? error.message : 'Fehler beim Löschen'
      toast.error(errorMessage)
    } finally {
      setIsDeleting(false)
    }
  }
  
  const isLoading = createMutation.isPending || updateMutation.isPending
  
  // Debug-Logging
  console.log('[AssignmentDialog] dialogMode:', dialogMode)
  console.log('[AssignmentDialog] isDialogOpen:', isDialogOpen)
  console.log('[AssignmentDialog] selectedEvent:', selectedEvent ? { 
    id: selectedEvent.id, 
    sourceType: selectedEvent.sourceType,
    projektId: selectedEvent.projektId,
    projektName: selectedEvent.projektName,
    mitarbeiterId: selectedEvent.mitarbeiterId,
    mitarbeiterName: selectedEvent.mitarbeiterName
  } : null)
  console.log('[AssignmentDialog] formData:', {
    projektId: formData?.projektId,
    mitarbeiterIds: formData?.mitarbeiterIds?.length
  })
  
  return (
    <>
      <Dialog open={isDialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto bg-white text-gray-900">
          <DialogHeader>
            <DialogTitle className="text-gray-900">
              {dialogMode === 'create' ? 'Neuer Einsatz' : 'Einsatz bearbeiten'}
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              {dialogMode === 'create'
                ? 'Planen Sie Aufbau und/oder Abbau für ein Projekt. Wählen Sie nur Datum (keine Uhrzeit).'
                : 'Bearbeiten Sie die Details des Einsatzes'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Mitarbeiter - Im Team-View beim Bearbeiten nur Anzeige, sonst Mehrfachauswahl */}
            <div className="space-y-3">
              <Label htmlFor="mitarbeiter" className="text-gray-900 font-medium flex items-center gap-2">
                <User className="h-4 w-4" />
                Mitarbeiter
                {dialogMode === 'edit' && view === 'team' ? null : (
                  (formData?.mitarbeiterIds?.length ?? 0) > 0 && (
                    <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-800">
                      {formData.mitarbeiterIds.length} ausgewählt
                    </Badge>
                  )
                )}
              </Label>
              
              {/* Im Team-View beim Bearbeiten: Nur Anzeige (kein Entfernen/Hinzufügen) */}
              {dialogMode === 'edit' && view === 'team' ? (
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  {(formData?.mitarbeiterIds?.length ?? 0) > 0 ? (
                    <Badge className="bg-blue-100 text-blue-800 border-blue-300 px-3 py-1.5 flex items-center gap-2 w-fit">
                      <User className="h-3 w-3" />
                      <span className="font-medium">{formData.mitarbeiterIds[0].name}</span>
                      {formData.mitarbeiterIds[0].personalnummer && (
                        <span className="text-blue-600 text-xs">(#{formData.mitarbeiterIds[0].personalnummer})</span>
                      )}
                    </Badge>
                  ) : (
                    <span className="text-gray-500 text-sm">Kein Mitarbeiter zugewiesen</span>
                  )}
                  <p className="text-xs text-gray-500 mt-2">
                    Im Team-View ist der Mitarbeiter fix zugewiesen
                  </p>
                </div>
              ) : (
                <>
                  {/* Ausgewählte Mitarbeiter als Badges mit Entfernen-Button */}
                  {(formData?.mitarbeiterIds?.length ?? 0) > 0 && (
                    <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      {formData.mitarbeiterIds.map((mitarbeiter) => (
                        <Badge 
                          key={mitarbeiter.id}
                          className="bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200 px-3 py-1.5 flex items-center gap-2"
                        >
                          <User className="h-3 w-3" />
                          <span className="font-medium">{mitarbeiter.name}</span>
                          {mitarbeiter.personalnummer && (
                            <span className="text-blue-600 text-xs">(#{mitarbeiter.personalnummer})</span>
                          )}
                          <button
                            onClick={() => handleRemoveMitarbeiter(mitarbeiter.id)}
                            className="ml-1 hover:bg-blue-300 rounded-full p-0.5"
                            type="button"
                            title="Mitarbeiter entfernen"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                  
                  {/* Dropdown zum Hinzufügen */}
                  {!isDragMitarbeiterCreate && (
                    <>
                      <Select
                        value=""
                        onValueChange={handleAddMitarbeiter}
                      >
                        <SelectTrigger className="bg-white text-gray-900 border-gray-300">
                          <SelectValue placeholder="+ Mitarbeiter hinzufügen (optional)" />
                        </SelectTrigger>
                        <SelectContent className="bg-white text-gray-900 max-h-[300px]">
                          {employees
                            .filter(e => e.aktiv)
                            .filter(e => !(formData?.mitarbeiterIds ?? []).some(m => m.id === e._id))
                            .map((employee) => (
                              <SelectItem key={employee._id} value={employee._id || ''}>
                                {employee.vorname} {employee.nachname}
                                {employee.personalnummer && (
                                  <span className="text-gray-500 ml-2">(#{employee.personalnummer})</span>
                                )}
                              </SelectItem>
                            ))}
                          {employees.filter(e => e.aktiv).filter(e => !(formData?.mitarbeiterIds ?? []).some(m => m.id === e._id)).length === 0 && (
                            <div className="px-2 py-1.5 text-sm text-gray-500">
                              Alle Mitarbeiter bereits hinzugefügt
                            </div>
                          )}
                        </SelectContent>
                      </Select>
                      
                      {dialogMode === 'create' && (
                        <p className="text-xs text-gray-500">
                          Sie können mehrere Mitarbeiter auswählen. Für jeden wird ein separater Einsatz erstellt.
                        </p>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
            
            {/* Projekt */}
            <div className="space-y-2">
              <Label htmlFor="projekt" className="text-gray-900 font-medium flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                Projekt *
              </Label>
              <Select
                value={formData?.projektId || ''}
                onValueChange={(value) => handleChange('projektId', value)}
              >
                <SelectTrigger className="bg-white text-gray-900 border-gray-300">
                  <SelectValue placeholder="Projekt auswählen" />
                </SelectTrigger>
                <SelectContent className="bg-white text-gray-900">
                  {projects
                    .filter(p => 
                      // Zeige aktive/geplante Projekte ODER das aktuell ausgewählte Projekt
                      ['in_planung', 'aktiv'].includes(p.status) || p._id === formData?.projektId
                    )
                    .map((project) => (
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
                value={formData.rolle || undefined}
                onValueChange={(value) => handleChange('rolle', value === 'none' ? '' : value)}
              >
                <SelectTrigger className="bg-white text-gray-900 border-gray-300">
                  <SelectValue placeholder="Rolle auswählen (optional)" />
                </SelectTrigger>
                <SelectContent className="bg-white text-gray-900">
                  <SelectItem value="none">Keine Rolle</SelectItem>
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
            
            {/* Aufbau/Abbau Tabs + Badges */}
            <div className="border-t border-gray-200 pt-4">
              <Label className="text-gray-900 font-semibold mb-3 block flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Aufbau/Abbau Planung *
              </Label>
              <p className="text-xs text-gray-500 mb-4">
                Mindestens Aufbau ODER Abbau muss gesetzt sein. Wählen Sie nur das Datum.
              </p>
              
              {/* Anzeige der gesetzten Daten als Badges */}
              {(formData.setupDate || formData.dismantleDate) && (
                <div className="flex flex-wrap gap-2 mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  {formData.setupDate && (
                    <Badge className="bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200 px-3 py-1.5 flex items-center gap-2">
                      <span className="font-medium">Aufbau:</span>
                      <span>{format(new Date(formData.setupDate), 'dd.MM.yyyy', { locale: de })}</span>
                      <button
                        onClick={() => handleRemoveDate('setupDate')}
                        className="ml-1 hover:bg-blue-300 rounded-full p-0.5"
                        type="button"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                  {formData.dismantleDate && (
                    <Badge className="bg-green-100 text-green-800 border-green-300 hover:bg-green-200 px-3 py-1.5 flex items-center gap-2">
                      <span className="font-medium">Abbau:</span>
                      <span>{format(new Date(formData.dismantleDate), 'dd.MM.yyyy', { locale: de })}</span>
                      <button
                        onClick={() => handleRemoveDate('dismantleDate')}
                        className="ml-1 hover:bg-green-300 rounded-full p-0.5"
                        type="button"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                </div>
              )}
              
              {/* Tabs für Aufbau/Abbau */}
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'setup' | 'dismantle')} className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-gray-100">
                  <TabsTrigger 
                    value="setup" 
                    className="data-[state=active]:bg-blue-500 data-[state=active]:text-white"
                  >
                    Aufbau
                  </TabsTrigger>
                  <TabsTrigger 
                    value="dismantle" 
                    className="data-[state=active]:bg-green-500 data-[state=active]:text-white"
                  >
                    Abbau
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="setup" className="mt-4 space-y-3">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <Label className="text-blue-900 font-medium mb-2 block">
                      Aufbau-Datum
                    </Label>
                    <Input
                      type="date"
                      value={formData.setupDate}
                      onChange={(e) => handleChange('setupDate', e.target.value)}
                      className="bg-white text-gray-900 border-gray-300"
                    />
                    <p className="text-xs text-blue-700 mt-2">
                      Wählen Sie das Datum für den Aufbau (nur Tag, keine Uhrzeit)
                    </p>
                  </div>
                </TabsContent>
                
                <TabsContent value="dismantle" className="mt-4 space-y-3">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <Label className="text-green-900 font-medium mb-2 block">
                      Abbau-Datum
                    </Label>
                    <Input
                      type="date"
                      value={formData.dismantleDate}
                      onChange={(e) => handleChange('dismantleDate', e.target.value)}
                      className="bg-white text-gray-900 border-gray-300"
                    />
                    <p className="text-xs text-green-700 mt-2">
                      Wählen Sie das Datum für den Abbau (nur Tag, keine Uhrzeit)
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
            
            {/* Notizen */}
            <div className="space-y-2 border-t border-gray-200 pt-4">
              <Label htmlFor="notizen" className="text-gray-900 font-medium">Notizen</Label>
              <Textarea
                id="notizen"
                value={formData.notizen}
                onChange={(e) => handleChange('notizen', e.target.value)}
                placeholder="Optionale Hinweise..."
                className="bg-white text-gray-900 border-gray-300 min-h-[80px]"
              />
            </div>
            
            {/* Bestätigt-Checkbox */}
            <div className="border-t border-gray-200 pt-4">
              <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <Checkbox
                  id="bestaetigt"
                  checked={formData.bestaetigt}
                  onCheckedChange={(checked) => handleChange('bestaetigt', !!checked)}
                />
                <Label htmlFor="bestaetigt" className="text-amber-800 font-medium cursor-pointer">
                  Einsatz bestätigt (Zeiterfassungen werden erstellt)
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

          {/* Sicherheitswarnung für Löschen - nur im Edit-Modus */}
          {dialogMode === 'edit' && (
            <div className="border-t-2 border-red-200 pt-4 mt-6">
              <div className="bg-red-50 border-2 border-red-500 rounded-lg p-4 space-y-3 mb-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <svg 
                      className="h-6 w-6 text-red-600" 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
                      />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-red-900 font-bold text-base mb-1">
                      ⚠️ SICHERHEITSWARNUNG - EINTRAG LÖSCHEN
                    </h4>
                    <ul className="text-red-800 text-sm space-y-1 list-disc list-inside mb-3">
                      <li>Der Einsatz wird <strong>permanent gelöscht</strong></li>
                      <li>Alle verknüpften <strong>Zeiterfassungen</strong> werden entfernt</li>
                      <li>Daten können <strong>nicht wiederhergestellt</strong> werden</li>
                    </ul>
                    <Button
                      variant="destructive"
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="w-full font-semibold flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white border-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                      {isDeleting ? 'Wird gelöscht...' : 'Unwiderruflich löschen'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex gap-2 pt-4 border-t border-gray-200">
            <Button 
              variant="outline" 
              onClick={closeDialog}
              className="bg-white text-gray-900 border-gray-300 hover:bg-gray-100"
            >
              Abbrechen
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isLoading
                ? 'Speichern...'
                : dialogMode === 'create'
                  ? 'Einsatz erstellen'
                  : 'Änderungen speichern'
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
