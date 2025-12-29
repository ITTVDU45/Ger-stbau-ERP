'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

interface KategorieErstellenDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  typ: 'einnahme' | 'ausgabe'
  onSuccess?: () => void
}

export default function KategorieErstellenDialog({
  open,
  onOpenChange,
  typ,
  onSuccess
}: KategorieErstellenDialogProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    farbe: '#3B82F6',
    icon: '📁',
    steuerrelevant: true
  })

  // Beliebte Emojis zur Auswahl
  const beliebteIcons = ['💰', '🏗️', '🚗', '💻', '📊', '🏢', '🛡️', '📣', '👥', '⏱️', '🔧', '📦', '💳', '🏦', '📱']

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error('Bitte Kategorie-Namen eingeben')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/finanzen/kategorien', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          typ,
          aktiv: true,
          beschreibung: ''
        })
      })

      const data = await res.json()

      if (res.ok && data.erfolg) {
        toast.success('Kategorie erfolgreich erstellt')
        onSuccess?.()
        onOpenChange(false)
        // Form zurücksetzen
        setFormData({ name: '', farbe: '#3B82F6', icon: '📁', steuerrelevant: true })
      } else {
        toast.error(data.fehler || 'Fehler beim Erstellen der Kategorie')
      }
    } catch (error) {
      console.error('Fehler beim Erstellen:', error)
      toast.error('Netzwerkfehler beim Erstellen der Kategorie')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Neue {typ === 'einnahme' ? 'Einnahmen' : 'Ausgaben'}-Kategorie
          </DialogTitle>
          <DialogDescription>
            Erstellen Sie eine neue Kategorie für {typ === 'einnahme' ? 'Ihre Einnahmen' : 'Ihre Ausgaben'}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder={typ === 'einnahme' ? 'z.B. Projektabrechnung, Beratung' : 'z.B. Marketing, Büromaterial'}
              autoFocus
            />
          </div>

          {/* Farbe und Icon */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="farbe">Farbe</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="farbe"
                  type="color"
                  value={formData.farbe}
                  onChange={(e) => setFormData(prev => ({ ...prev, farbe: e.target.value }))}
                  className="h-10 w-16"
                />
                <Input
                  type="text"
                  value={formData.farbe}
                  onChange={(e) => setFormData(prev => ({ ...prev, farbe: e.target.value }))}
                  placeholder="#3B82F6"
                  className="flex-1 font-mono text-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="icon">Emoji-Icon</Label>
              <Input
                id="icon"
                value={formData.icon}
                onChange={(e) => setFormData(prev => ({ ...prev, icon: e.target.value }))}
                maxLength={2}
                placeholder="📁"
                className="text-2xl text-center"
              />
            </div>
          </div>

          {/* Beliebte Icons */}
          <div className="space-y-2">
            <Label className="text-xs text-gray-500">Beliebte Icons:</Label>
            <div className="flex flex-wrap gap-1">
              {beliebteIcons.map(icon => (
                <Button
                  key={icon}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-10 h-10 p-0 text-xl"
                  onClick={() => setFormData(prev => ({ ...prev, icon }))}
                >
                  {icon}
                </Button>
              ))}
            </div>
          </div>

          {/* Steuerrelevant */}
          <div className="flex items-center justify-between py-2">
            <div className="space-y-0.5">
              <Label htmlFor="steuerrelevant">Steuerrelevant</Label>
              <p className="text-xs text-gray-500">
                Wird in Steuerberichten berücksichtigt
              </p>
            </div>
            <Switch
              id="steuerrelevant"
              checked={formData.steuerrelevant}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, steuerrelevant: checked }))}
            />
          </div>
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Abbrechen
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={loading || !formData.name.trim()}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Erstellen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

