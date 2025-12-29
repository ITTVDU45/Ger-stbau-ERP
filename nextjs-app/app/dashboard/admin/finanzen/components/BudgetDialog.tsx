'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

interface BudgetDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mandantId?: string | null
  budget?: any | null
  onSuccess?: () => void
}

export default function BudgetDialog({
  open,
  onOpenChange,
  mandantId,
  budget,
  onSuccess
}: BudgetDialogProps) {
  const [loading, setLoading] = useState(false)
  const [kategorien, setKategorien] = useState<any[]>([])
  const [formData, setFormData] = useState({
    kategorieId: '',
    betrag: '',
    zeitraum: 'monat',
    warnungAktiviert: true,
    warnschwelle: '80'
  })

  useEffect(() => {
    if (open) {
      loadKategorien()
      if (budget) {
        setFormData({
          kategorieId: budget.kategorieId || '',
          betrag: budget.betrag?.toString() || '',
          zeitraum: budget.zeitraum || 'monat',
          warnungAktiviert: budget.warnungAktiviert !== false,
          warnschwelle: budget.warnschwelle?.toString() || '80'
        })
      }
    }
  }, [open, budget])

  const loadKategorien = async () => {
    try {
      const params = new URLSearchParams({ typ: 'ausgabe' })
      if (mandantId) params.append('mandantId', mandantId)
      
      const res = await fetch(`/api/finanzen/kategorien?${params}`)
      const data = await res.json()
      
      if (data.erfolg) {
        setKategorien(data.kategorien)
      }
    } catch (error) {
      console.error('Fehler beim Laden der Kategorien:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.kategorieId) {
      toast.error('Bitte Kategorie auswählen')
      return
    }
    
    if (!formData.betrag || parseFloat(formData.betrag) <= 0) {
      toast.error('Bitte gültigen Budget-Betrag eingeben')
      return
    }

    setLoading(true)
    try {
      const kategorie = kategorien.find(k => k._id === formData.kategorieId)
      
      const payload = {
        kategorieId: formData.kategorieId,
        kategorieName: kategorie?.name || '',
        betrag: parseFloat(formData.betrag),
        zeitraum: formData.zeitraum,
        warnungAktiviert: formData.warnungAktiviert,
        warnschwelle: parseInt(formData.warnschwelle),
        mandantId: mandantId || undefined
      }

      const url = budget 
        ? `/api/finanzen/budgets/${budget._id}`
        : '/api/finanzen/budgets'
      
      const method = budget ? 'PUT' : 'POST'
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await res.json()

      if (res.ok && data.erfolg) {
        toast.success(budget ? 'Budget aktualisiert' : 'Budget erstellt')
        onSuccess?.()
        onOpenChange(false)
        resetForm()
      } else {
        toast.error(data.fehler || 'Fehler beim Speichern')
      }
    } catch (error) {
      console.error('Fehler:', error)
      toast.error('Fehler beim Speichern des Budgets')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      kategorieId: '',
      betrag: '',
      zeitraum: 'monat',
      warnungAktiviert: true,
      warnschwelle: '80'
    })
  }

  return (
    <Dialog open={open} onOpenChange={(open) => {
      onOpenChange(open)
      if (!open) resetForm()
    }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {budget ? 'Budget bearbeiten' : 'Neues Budget erstellen'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="kategorie">Kategorie *</Label>
            <Select 
              value={formData.kategorieId} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, kategorieId: value }))}
              disabled={!!budget}
            >
              <SelectTrigger>
                <SelectValue placeholder="Kategorie wählen" />
              </SelectTrigger>
              <SelectContent>
                {kategorien.map(kat => (
                  <SelectItem key={kat._id} value={kat._id}>
                    {kat.icon} {kat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {budget && (
              <p className="text-xs text-gray-500 mt-1">
                Kategorie kann nach Erstellung nicht geändert werden
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="betrag">Budget-Betrag (€) *</Label>
            <Input
              id="betrag"
              type="number"
              step="0.01"
              min="0"
              value={formData.betrag}
              onChange={(e) => setFormData(prev => ({ ...prev, betrag: e.target.value }))}
              placeholder="z.B. 5000"
              required
            />
          </div>

          <div>
            <Label htmlFor="zeitraum">Zeitraum *</Label>
            <Select 
              value={formData.zeitraum} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, zeitraum: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monat">Monatlich</SelectItem>
                <SelectItem value="quartal">Quartalsweise</SelectItem>
                <SelectItem value="jahr">Jährlich</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <Label htmlFor="warnung">Budget-Warnung aktivieren</Label>
                <p className="text-xs text-gray-500">
                  Benachrichtigung bei Erreichung der Warnschwelle
                </p>
              </div>
              <Switch
                id="warnung"
                checked={formData.warnungAktiviert}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, warnungAktiviert: checked }))}
              />
            </div>

            {formData.warnungAktiviert && (
              <div>
                <Label htmlFor="warnschwelle">Warnschwelle (%)</Label>
                <Input
                  id="warnschwelle"
                  type="number"
                  min="1"
                  max="100"
                  value={formData.warnschwelle}
                  onChange={(e) => setFormData(prev => ({ ...prev, warnschwelle: e.target.value }))}
                  placeholder="z.B. 80"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Warnung bei {formData.warnschwelle}% Budget-Auslastung
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {budget ? 'Aktualisieren' : 'Erstellen'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

