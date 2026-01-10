'use client'

/**
 * ConflictPanel
 * 
 * Seitliches Panel, das alle erkannten Konflikte anzeigt
 */

import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  AlertTriangle,
  AlertCircle,
  X,
  User,
  Calendar,
  Clock
} from 'lucide-react'
import { usePlantafelStore } from '@/lib/stores/plantafelStore'
import { ConflictInfo } from './types'

interface ConflictPanelProps {
  conflicts: ConflictInfo[]
  isLoading?: boolean
}

export default function ConflictPanel({ conflicts, isLoading }: ConflictPanelProps) {
  const { isConflictPanelOpen, setConflictPanelOpen } = usePlantafelStore()
  
  if (!isConflictPanelOpen) return null
  
  const errorCount = conflicts.filter(c => c.severity === 'error').length
  const warningCount = conflicts.filter(c => c.severity === 'warning').length
  
  return (
    <div className="w-80 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Konflikte
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {conflicts.length === 0 
              ? 'Keine Konflikte erkannt'
              : `${conflicts.length} Konflikt${conflicts.length > 1 ? 'e' : ''} gefunden`
            }
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setConflictPanelOpen(false)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Summary Badges */}
      {conflicts.length > 0 && (
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex gap-2">
          {errorCount > 0 && (
            <Badge variant="destructive" className="flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {errorCount} Fehler
            </Badge>
          )}
          {warningCount > 0 && (
            <Badge variant="secondary" className="flex items-center gap-1 bg-orange-100 text-orange-800">
              <AlertTriangle className="h-3 w-3" />
              {warningCount} Warnungen
            </Badge>
          )}
        </div>
      )}
      
      {/* Konflikt-Liste */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="p-4 text-center text-gray-500">
            Lade Konflikte...
          </div>
        ) : conflicts.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Keine Planungskonflikte im aktuellen Zeitraum.
            </p>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {conflicts.map((conflict) => (
              <ConflictCard key={conflict.id} conflict={conflict} />
            ))}
          </div>
        )}
      </ScrollArea>
      
      {/* Footer mit Hinweis */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-900">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          <strong>Fehler:</strong> Beide Einsätze sind bestätigt.<br />
          <strong>Warnungen:</strong> Mindestens ein Einsatz ist noch geplant.
        </p>
      </div>
    </div>
  )
}

interface ConflictCardProps {
  conflict: ConflictInfo
}

function ConflictCard({ conflict }: ConflictCardProps) {
  const isError = conflict.severity === 'error'
  
  const formatDateTime = (date: Date) => {
    return format(date, 'dd.MM. HH:mm', { locale: de })
  }
  
  const getConflictTypeLabel = () => {
    switch (conflict.conflictType) {
      case 'double_booking':
        return 'Doppelbelegung'
      case 'work_during_absence':
        return 'Einsatz während Abwesenheit'
      default:
        return 'Konflikt'
    }
  }
  
  return (
    <Card className={`border-l-4 ${isError ? 'border-l-red-500' : 'border-l-orange-400'}`}>
      <CardHeader className="py-3 px-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            {isError ? (
              <AlertCircle className="h-4 w-4 text-red-500" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            )}
            <CardTitle className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {getConflictTypeLabel()}
            </CardTitle>
          </div>
          <Badge 
            variant={isError ? 'destructive' : 'secondary'}
            className={!isError ? 'bg-orange-100 text-orange-800' : ''}
          >
            {isError ? 'Fehler' : 'Warnung'}
          </Badge>
        </div>
        <CardDescription className="flex items-center gap-1 mt-1">
          <User className="h-3 w-3" />
          {conflict.mitarbeiterName}
        </CardDescription>
      </CardHeader>
      <CardContent className="py-2 px-4">
        {/* Event 1 */}
        <div className="text-xs space-y-1 mb-2">
          <p className="font-medium text-gray-900 dark:text-gray-100">
            {conflict.event1.title}
          </p>
          <p className="text-gray-500 dark:text-gray-400 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatDateTime(conflict.event1.start)} - {formatDateTime(conflict.event1.end)}
          </p>
        </div>
        
        <div className="text-xs text-center text-gray-400 my-1">↕ überschneidet mit</div>
        
        {/* Event 2 */}
        <div className="text-xs space-y-1">
          <p className="font-medium text-gray-900 dark:text-gray-100">
            {conflict.event2.title}
          </p>
          <p className="text-gray-500 dark:text-gray-400 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatDateTime(conflict.event2.start)} - {formatDateTime(conflict.event2.end)}
          </p>
        </div>
        
        {/* Überlappungs-Zeitraum */}
        <Separator className="my-2" />
        <div className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          Überlappung: {formatDateTime(conflict.overlapStart)} - {formatDateTime(conflict.overlapEnd)}
        </div>
      </CardContent>
    </Card>
  )
}
