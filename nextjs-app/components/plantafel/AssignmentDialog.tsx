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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
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

interface AssignmentFormData {
  mitarbeiterId: string
  projektId: string
  rolle: string
  notizen: string
  bestaetigt: boolean
  // Neue date-only Felder
  setupDate: string    // YYYY-MM-DD
  dismantleDate: string // YYYY-MM-DD
}

const defaultFormData: AssignmentFormData = {
  mitarbeiterId: '',
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  
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
        setupDate: selectedEvent.setupDate || '',
        dismantleDate: selectedEvent.dismantleDate || ''
      })
    } else if (dialogMode === 'create' && selectedSlot) {
      // Erstellen: Slot-Daten vorausfüllen
      const clickedDate = format(selectedSlot.start, 'yyyy-MM-dd')
      
      setFormData({
        ...defaultFormData,
        setupDate: clickedDate, // Vorausfüllen mit geklicktem Datum
        // Je nach View den resourceId als Mitarbeiter oder Projekt vorauswählen
        mitarbeiterId: view === 'team' ? selectedSlot.resourceId : '',
        projektId: view === 'project' ? selectedSlot.resourceId : ''
      })
    } else {
      setFormData(defaultFormData)
    }
  }, [dialogMode, selectedEvent, selectedSlot, view])
  
  const handleChange = (field: keyof AssignmentFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }
  
  const handleRemoveDate = (field: 'setupDate' | 'dismantleDate') => {
    setFormData(prev => ({ ...prev, [field]: '' }))
  }
  
  const handleSubmit = async () => {
    // Validierung
    if (!formData.projektId) {
      toast.error('Bitte wählen Sie ein Projekt aus')
      return
    }
    
    // Mindestens Aufbau ODER Abbau muss gesetzt sein
    if (!formData.setupDate && !formData.dismantleDate) {
      toast.error('Bitte geben Sie mindestens ein Aufbau- oder Abbau-Datum an')
      return
    }
    
    try {
      const baseData = {
        mitarbeiterId: formData.mitarbeiterId || undefined,
        projektId: formData.projektId,
        rolle: formData.rolle || undefined,
        notizen: formData.notizen || undefined,
        bestaetigt: formData.bestaetigt,
        setupDate: formData.setupDate || undefined,
        dismantleDate: formData.dismantleDate || undefined
      }
      
      if (dialogMode === 'edit' && selectedEvent) {
        // Bearbeitungsmodus: Aktualisiere bestehenden Einsatz
        // Bestimme von/bis basierend auf gesetzten Daten
        const dates = [formData.setupDate, formData.dismantleDate].filter(Boolean)
        const von = new Date(dates[0] + 'T00:00:00.000Z')
        const bis = new Date(dates[dates.length - 1] + 'T23:59:59.999Z')
        
        const payload = {
          ...baseData,
          von: von.toISOString(),
          bis: bis.toISOString()
        }
        
        const realId = selectedEvent.sourceId
        await updateMutation.mutateAsync({ id: realId, data: payload })
        toast.success('Einsatz erfolgreich aktualisiert')
      } else {
        // Erstell-Modus: Erstelle Einsatz mit setup/dismantle
        const dates = [formData.setupDate, formData.dismantleDate].filter(Boolean)
        const von = new Date(dates[0] + 'T00:00:00.000Z')
        const bis = new Date(dates[dates.length - 1] + 'T23:59:59.999Z')
        
        const payload = {
          ...baseData,
          von: von.toISOString(),
          bis: bis.toISOString()
        }
        
        await createMutation.mutateAsync(payload)
        toast.success('Einsatz erfolgreich erstellt')
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
      setShowDeleteConfirm(false)
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
            {/* Mitarbeiter */}
            <div className="space-y-2">
              <Label htmlFor="mitarbeiter" className="text-gray-900 font-medium flex items-center gap-2">
                <User className="h-4 w-4" />
                Mitarbeiter
              </Label>
              <Select
                value={formData.mitarbeiterId || undefined}
                onValueChange={(value) => handleChange('mitarbeiterId', value === 'none' ? '' : value)}
              >
                <SelectTrigger className="bg-white text-gray-900 border-gray-300">
                  <SelectValue placeholder="Mitarbeiter auswählen (optional)" />
                </SelectTrigger>
                <SelectContent className="bg-white text-gray-900">
                  <SelectItem value="none">Kein Mitarbeiter</SelectItem>
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

          <DialogFooter className="flex gap-2 pt-4 border-t border-gray-200 mt-4">
            {canDelete && (
              <Button
                variant="destructive"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isLoading}
                className="mr-auto flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Eintrag löschen
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
      
      {/* Lösch-Bestätigung */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="bg-white text-gray-900">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600 flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Einsatz wirklich löschen?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600">
              Dieser Vorgang kann nicht rückgängig gemacht werden. Alle zugehörigen Zeiterfassungen werden ebenfalls gelöscht.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white text-gray-900 border-gray-300 hover:bg-gray-100">
              Abbrechen
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? 'Löschen...' : 'Löschen'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
