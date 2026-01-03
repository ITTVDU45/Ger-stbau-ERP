'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Projekt } from '@/lib/db/types'
import { toast } from 'sonner'

interface BauvorhabenBearbeitenDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projekt: Projekt
  onSuccess: () => void
}

export default function BauvorhabenBearbeitenDialog({
  open,
  onOpenChange,
  projekt,
  onSuccess
}: BauvorhabenBearbeitenDialogProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    adresse: '',
    plz: '',
    ort: '',
    beschreibung: '',
    arbeitstypen: {
      dach: false,
      fassade: false,
      daemmung: false,
      sonderaufbau: false,
      beschreibung: ''
    },
    geruestseiten: {
      vorderseite: false,
      rueckseite: false,
      rechts: false,
      links: false,
      gesamtflaeche: 0
    },
    besonderheiten: '',
    zufahrtsbeschraenkungen: '',
    sicherheitsanforderungen: ''
  })

  useEffect(() => {
    if (open && projekt.bauvorhaben) {
      setFormData({
        adresse: projekt.bauvorhaben.adresse || '',
        plz: projekt.bauvorhaben.plz || '',
        ort: projekt.bauvorhaben.ort || '',
        beschreibung: projekt.bauvorhaben.beschreibung || '',
        arbeitstypen: {
          dach: projekt.bauvorhaben.arbeitstypen?.dach || false,
          fassade: projekt.bauvorhaben.arbeitstypen?.fassade || false,
          daemmung: projekt.bauvorhaben.arbeitstypen?.daemmung || false,
          sonderaufbau: projekt.bauvorhaben.arbeitstypen?.sonderaufbau || false,
          beschreibung: projekt.bauvorhaben.arbeitstypen?.beschreibung || ''
        },
        geruestseiten: {
          vorderseite: projekt.bauvorhaben.geruestseiten?.vorderseite || false,
          rueckseite: projekt.bauvorhaben.geruestseiten?.rueckseite || false,
          rechts: projekt.bauvorhaben.geruestseiten?.rechts || false,
          links: projekt.bauvorhaben.geruestseiten?.links || false,
          gesamtflaeche: projekt.bauvorhaben.geruestseiten?.gesamtflaeche || 0
        },
        besonderheiten: projekt.bauvorhaben.besonderheiten || '',
        zufahrtsbeschraenkungen: projekt.bauvorhaben.zufahrtsbeschraenkungen || '',
        sicherheitsanforderungen: projekt.bauvorhaben.sicherheitsanforderungen || ''
      })
    }
  }, [open, projekt])

  const handleSpeichern = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/projekte/${projekt._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bauvorhaben: formData,
          geaendertVon: 'admin'
        })
      })

      const data = await response.json()

      if (data.erfolg) {
        toast.success('Bauvorhabeninformationen erfolgreich aktualisiert')
        onSuccess()
        onOpenChange(false)
      } else {
        toast.error(data.fehler || 'Fehler beim Aktualisieren')
      }
    } catch (error) {
      console.error('Fehler:', error)
      toast.error('Fehler beim Aktualisieren')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white">
        <DialogHeader>
          <DialogTitle className="text-gray-900">Bauvorhabeninformationen bearbeiten</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Adresse */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Adresse</h3>
            <div className="space-y-2">
              <Label className="text-gray-900">Straße & Hausnummer</Label>
              <Input
                value={formData.adresse}
                onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
                placeholder="z.B. Musterstraße 123"
                className="bg-white border-gray-300 text-gray-900"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-900">PLZ</Label>
                <Input
                  value={formData.plz}
                  onChange={(e) => setFormData({ ...formData, plz: e.target.value })}
                  placeholder="z.B. 12345"
                  className="bg-white border-gray-300 text-gray-900"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-900">Ort</Label>
                <Input
                  value={formData.ort}
                  onChange={(e) => setFormData({ ...formData, ort: e.target.value })}
                  placeholder="z.B. Musterstadt"
                  className="bg-white border-gray-300 text-gray-900"
                />
              </div>
            </div>
          </div>

          {/* Beschreibung */}
          <div className="space-y-2">
            <Label className="text-gray-900">Beschreibung</Label>
            <Textarea
              value={formData.beschreibung}
              onChange={(e) => setFormData({ ...formData, beschreibung: e.target.value })}
              placeholder="Kurze Beschreibung des Bauvorhabens"
              className="bg-white border-gray-300 text-gray-900"
              rows={3}
            />
          </div>

          {/* Art der Arbeiten */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-900">Art der Arbeiten</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="dach"
                  checked={formData.arbeitstypen.dach}
                  onCheckedChange={(checked) => 
                    setFormData({
                      ...formData,
                      arbeitstypen: { ...formData.arbeitstypen, dach: checked as boolean }
                    })
                  }
                />
                <Label htmlFor="dach" className="cursor-pointer text-gray-900">Dach</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="fassade"
                  checked={formData.arbeitstypen.fassade}
                  onCheckedChange={(checked) => 
                    setFormData({
                      ...formData,
                      arbeitstypen: { ...formData.arbeitstypen, fassade: checked as boolean }
                    })
                  }
                />
                <Label htmlFor="fassade" className="cursor-pointer text-gray-900">Fassade</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="daemmung"
                  checked={formData.arbeitstypen.daemmung}
                  onCheckedChange={(checked) => 
                    setFormData({
                      ...formData,
                      arbeitstypen: { ...formData.arbeitstypen, daemmung: checked as boolean }
                    })
                  }
                />
                <Label htmlFor="daemmung" className="cursor-pointer text-gray-900">Dämmung</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="sonderaufbau"
                  checked={formData.arbeitstypen.sonderaufbau}
                  onCheckedChange={(checked) => 
                    setFormData({
                      ...formData,
                      arbeitstypen: { ...formData.arbeitstypen, sonderaufbau: checked as boolean }
                    })
                  }
                />
                <Label htmlFor="sonderaufbau" className="cursor-pointer text-gray-900">Sonderaufbau</Label>
              </div>
            </div>
          </div>

          {/* Gerüstseiten */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-900">Gerüstseiten</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="vorderseite"
                  checked={formData.geruestseiten.vorderseite}
                  onCheckedChange={(checked) => 
                    setFormData({
                      ...formData,
                      geruestseiten: { ...formData.geruestseiten, vorderseite: checked as boolean }
                    })
                  }
                />
                <Label htmlFor="vorderseite" className="cursor-pointer text-gray-900">Vorderseite</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="rueckseite"
                  checked={formData.geruestseiten.rueckseite}
                  onCheckedChange={(checked) => 
                    setFormData({
                      ...formData,
                      geruestseiten: { ...formData.geruestseiten, rueckseite: checked as boolean }
                    })
                  }
                />
                <Label htmlFor="rueckseite" className="cursor-pointer text-gray-900">Rückseite</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="rechts"
                  checked={formData.geruestseiten.rechts}
                  onCheckedChange={(checked) => 
                    setFormData({
                      ...formData,
                      geruestseiten: { ...formData.geruestseiten, rechts: checked as boolean }
                    })
                  }
                />
                <Label htmlFor="rechts" className="cursor-pointer text-gray-900">Rechte Seite</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="links"
                  checked={formData.geruestseiten.links}
                  onCheckedChange={(checked) => 
                    setFormData({
                      ...formData,
                      geruestseiten: { ...formData.geruestseiten, links: checked as boolean }
                    })
                  }
                />
                <Label htmlFor="links" className="cursor-pointer text-gray-900">Linke Seite</Label>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-gray-900">Gesamtfläche (m²)</Label>
              <Input
                type="number"
                value={formData.geruestseiten.gesamtflaeche}
                onChange={(e) => 
                  setFormData({
                    ...formData,
                    geruestseiten: { ...formData.geruestseiten, gesamtflaeche: parseFloat(e.target.value) || 0 }
                  })
                }
                placeholder="0"
                className="bg-white border-gray-300 text-gray-900"
              />
            </div>
          </div>

          {/* Weitere Informationen */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-gray-900">Besonderheiten</Label>
              <Textarea
                value={formData.besonderheiten}
                onChange={(e) => setFormData({ ...formData, besonderheiten: e.target.value })}
                placeholder="z.B. Denkmalschutz, besondere Bauweise..."
                className="bg-white border-gray-300 text-gray-900"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-900">Zufahrtsbeschränkungen</Label>
              <Textarea
                value={formData.zufahrtsbeschraenkungen}
                onChange={(e) => setFormData({ ...formData, zufahrtsbeschraenkungen: e.target.value })}
                placeholder="z.B. enge Straße, Parkverbot..."
                className="bg-white border-gray-300 text-gray-900"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-900">Sicherheitsanforderungen</Label>
              <Textarea
                value={formData.sicherheitsanforderungen}
                onChange={(e) => setFormData({ ...formData, sicherheitsanforderungen: e.target.value })}
                placeholder="z.B. besondere Sicherungsmaßnahmen..."
                className="bg-white border-gray-300 text-gray-900"
                rows={2}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Abbrechen
          </Button>
          <Button
            onClick={handleSpeichern}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {loading ? 'Speichert...' : 'Speichern'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

