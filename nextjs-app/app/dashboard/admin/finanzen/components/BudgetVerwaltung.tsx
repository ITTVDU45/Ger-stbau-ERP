'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { PiggyBank, Plus, AlertTriangle, RefreshCw, MoreVertical, Edit, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import BudgetDialog from './BudgetDialog'

interface BudgetVerwaltungProps {
  mandantId?: string | null
  zeitraum?: { von?: Date | null; bis?: Date | null }
  refreshTrigger?: number
}

export default function BudgetVerwaltung({ mandantId, zeitraum, refreshTrigger }: BudgetVerwaltungProps) {
  const [loading, setLoading] = useState(true)
  const [budgetStatus, setBudgetStatus] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedBudget, setSelectedBudget] = useState<any>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [budgetToDelete, setBudgetToDelete] = useState<any>(null)

  useEffect(() => {
    loadBudgetStatus()
    loadStats()
  }, [mandantId, zeitraum, refreshTrigger])

  const loadBudgetStatus = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (mandantId) params.append('mandantId', mandantId)
      if (zeitraum?.von) params.append('von', zeitraum.von.toISOString())
      if (zeitraum?.bis) params.append('bis', zeitraum.bis.toISOString())

      const res = await fetch(`/api/finanzen/budgets/status?${params}`)
      const data = await res.json()

      if (data.erfolg) {
        setBudgetStatus(data.budgets)
      }
    } catch (error) {
      console.error('Fehler beim Laden des Budget-Status:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const params = new URLSearchParams()
      if (mandantId) params.append('mandantId', mandantId)
      if (zeitraum?.von) params.append('von', zeitraum.von.toISOString())
      if (zeitraum?.bis) params.append('bis', zeitraum.bis.toISOString())

      const res = await fetch(`/api/finanzen/stats?${params}`)
      const data = await res.json()

      if (data.erfolg) {
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Fehler beim Laden der Stats:', error)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  const getProgressColor = (prozent: number, ueberschritten: boolean) => {
    if (ueberschritten) return 'bg-red-600'
    if (prozent >= 80) return 'bg-orange-500'
    if (prozent >= 60) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const getStatusBadge = (prozent: number, ueberschritten: boolean, warnungAktiv: boolean) => {
    if (ueberschritten) {
      return <Badge variant="destructive">Überschritten</Badge>
    }
    if (warnungAktiv) {
      return <Badge className="bg-orange-100 text-orange-800">⚠️ Warnung</Badge>
    }
    if (prozent >= 60) {
      return <Badge variant="secondary">In Nutzung</Badge>
    }
    return <Badge variant="default" className="bg-green-100 text-green-800">OK</Badge>
  }

  const handleEdit = (budget: any) => {
    setSelectedBudget(budget)
    setDialogOpen(true)
  }

  const handleDeleteClick = (budget: any) => {
    setBudgetToDelete(budget)
    setDeleteDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!budgetToDelete?._id) return

    try {
      const res = await fetch(`/api/finanzen/budgets/${budgetToDelete._id}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        toast.success('Budget erfolgreich gelöscht')
        loadBudgetStatus()
      } else {
        toast.error('Fehler beim Löschen des Budgets')
      }
    } catch (error) {
      console.error('Fehler beim Löschen:', error)
      toast.error('Fehler beim Löschen des Budgets')
    } finally {
      setDeleteDialogOpen(false)
      setBudgetToDelete(null)
    }
  }

  if (loading) {
    return (
      <Card className="p-6 bg-white border-2 border-gray-200 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="h-40 bg-gray-100 rounded"></div>
      </Card>
    )
  }

  if (budgetStatus.length === 0) {
    return (
      <>
        <Card className="p-6 bg-white border-2 border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <PiggyBank className="h-5 w-5 text-blue-600" />
              Budget-Übersicht
            </h3>
            <Button size="sm" onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Budget erstellen
            </Button>
          </div>
          <p className="text-sm text-gray-700 text-center py-8 font-medium">
            Noch keine Budgets definiert. Erstellen Sie Budgets, um Ihre Ausgaben zu überwachen.
          </p>
        </Card>

        {/* Budget Dialog */}
        <BudgetDialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open)
            if (!open) setSelectedBudget(null)
          }}
          mandantId={mandantId}
          budget={selectedBudget}
          onSuccess={loadBudgetStatus}
        />
      </>
    )
  }

  return (
    <Card className="p-6 bg-white border-2 border-gray-200">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <PiggyBank className="h-5 w-5 text-blue-600" />
            Budget-Übersicht
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Aktuelle Auslastung Ihrer Budgets
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadBudgetStatus} className="text-gray-900">
            <RefreshCw className="h-4 w-4 mr-2 text-gray-900" />
            Aktualisieren
          </Button>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Neues Budget
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {budgetStatus.map((budget) => (
          <div
            key={budget.kategorieId}
            className={cn(
              'p-4 rounded-lg border-2',
              budget.ueberschritten ? 'border-red-200 bg-red-50' :
              budget.warnungAktiv ? 'border-orange-200 bg-orange-50' :
              'border-gray-200 bg-white'
            )}
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-gray-900">
                    {budget.kategorieName}
                  </span>
                  {getStatusBadge(budget.prozentAusgelastet, budget.ueberschritten, budget.warnungAktiv)}
                </div>
                <div className="text-sm text-gray-600">
                  Budget: {formatCurrency(budget.budgetBetrag)} / {budget.zeitraum}
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="text-right">
                  <div className={cn(
                    'text-xl font-bold',
                    budget.ueberschritten ? 'text-red-600' :
                    budget.warnungAktiv ? 'text-orange-600' :
                    'text-gray-900'
                  )}>
                    {budget.prozentAusgelastet.toFixed(0)}%
                  </div>
                  <div className="text-sm text-gray-600">
                    {formatCurrency(budget.ausgabenAktuell)} ausgegeben
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4 text-gray-600" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleEdit(budget)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Bearbeiten
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => handleDeleteClick(budget)}
                      className="text-red-600 focus:text-red-600"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Löschen
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <Progress 
              value={Math.min(budget.prozentAusgelastet, 100)} 
              className="h-3"
              indicatorClassName={getProgressColor(budget.prozentAusgelastet, budget.ueberschritten)}
            />

            <div className="flex justify-between items-center mt-2 text-xs text-gray-600">
              <span>
                Verbleibend: {formatCurrency(Math.max(0, budget.budgetBetrag - budget.ausgabenAktuell))}
              </span>
              {budget.warnungAktiv && !budget.ueberschritten && (
                <span className="flex items-center gap-1 text-orange-600">
                  <AlertTriangle className="h-3 w-3" />
                  Warnschwelle erreicht
                </span>
              )}
              {budget.ueberschritten && (
                <span className="flex items-center gap-1 text-red-600 font-semibold">
                  <AlertTriangle className="h-3 w-3" />
                  Überschritten um {formatCurrency(budget.ausgabenAktuell - budget.budgetBetrag)}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Zusammenfassung */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="grid grid-cols-3 gap-4 text-center mb-4">
          <div>
            <div className="text-2xl font-bold text-gray-900">
              {budgetStatus.length}
            </div>
            <div className="text-sm text-gray-600">Budgets Gesamt</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-orange-600">
              {budgetStatus.filter(b => b.warnungAktiv && !b.ueberschritten).length}
            </div>
            <div className="text-sm text-gray-600">Warnungen</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-red-600">
              {budgetStatus.filter(b => b.ueberschritten).length}
            </div>
            <div className="text-sm text-gray-600">Überschritten</div>
          </div>
        </div>

        {/* Cashflow-Übersicht */}
        {stats && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="text-sm font-semibold text-gray-700 mb-3 text-center">
              Cashflow im gewählten Zeitraum
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-xl font-bold text-green-600">
                  {formatCurrency(stats.einnahmenGesamt || 0)}
                </div>
                <div className="text-xs text-gray-600">Einnahmen</div>
              </div>
              <div>
                <div className="text-xl font-bold text-red-600">
                  {formatCurrency(stats.ausgabenGesamt || 0)}
                </div>
                <div className="text-xs text-gray-600">Ausgaben</div>
              </div>
              <div>
                <div className={`text-xl font-bold ${(stats.saldo || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(stats.saldo || 0)}
                </div>
                <div className="text-xs text-gray-600">Netto-Cashflow</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Budget Dialog */}
      <BudgetDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) setSelectedBudget(null)
        }}
        mandantId={mandantId}
        budget={selectedBudget}
        onSuccess={loadBudgetStatus}
      />

      {/* Lösch-Bestätigungs-Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Budget löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Sind Sie sicher, dass Sie das Budget für "{budgetToDelete?.kategorieName}" löschen möchten? 
              Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setDeleteDialogOpen(false)
              setBudgetToDelete(null)
            }}>
              Abbrechen
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}

