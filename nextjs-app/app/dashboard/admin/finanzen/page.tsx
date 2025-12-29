'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Plus, Download, FileSpreadsheet, FileText } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import ZeitraumFilter from '@/app/dashboard/admin/kunden/berichte/components/ZeitraumFilter'
import FinanzenKPICards from './components/FinanzenKPICards'
import TransaktionenTabelle from './components/TransaktionenTabelle'
import ChartsSection from './components/ChartsSection'
import TransaktionDialog from './components/TransaktionDialog'
import KIBerichtPanel from './components/KIBerichtPanel'
import WiederkehrendeBuchungenWidget from './components/WiederkehrendeBuchungenWidget'
import BudgetVerwaltung from './components/BudgetVerwaltung'
import LiquiditaetsWarnung from './components/LiquiditaetsWarnung'
import MwStAnsicht from './components/MwStAnsicht'
import MandantenAuswahl from './components/MandantenAuswahl'
import KontostandCard from './components/KontostandCard'
import KontostandDialog from './components/KontostandDialog'
import { ZeitraumFilter as ZeitraumFilterType } from '@/lib/db/types'
import { toast } from 'sonner'

export default function FinanzenPage() {
  const [zeitraum, setZeitraum] = useState<ZeitraumFilterType>({
    typ: 'aktuelles_jahr',
    von: new Date(new Date().getFullYear(), 0, 1),
    bis: new Date(new Date().getFullYear(), 11, 31)
  })
  
  const [mandantId, setMandantId] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogTyp, setDialogTyp] = useState<'einnahme' | 'ausgabe'>('einnahme')
  const [activeFilter, setActiveFilter] = useState<string | null>(null)
  const [editTransaktion, setEditTransaktion] = useState<any>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  
  const [stats, setStats] = useState<any>(null)
  const [transaktionen, setTransaktionen] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [kontostand, setKontostand] = useState<any>(null)
  const [kontostandDialogOpen, setKontostandDialogOpen] = useState(false)
  
  useEffect(() => {
    loadData()
  }, [zeitraum, mandantId])
  
  const loadData = async () => {
    try {
      setLoading(true)
      
      const params = new URLSearchParams({
        von: zeitraum.von?.toISOString() || '',
        bis: zeitraum.bis?.toISOString() || ''
      })
      if (mandantId) params.append('mandantId', mandantId)
      
      const kontoParams = new URLSearchParams()
      if (mandantId) kontoParams.append('mandantId', mandantId)
      
      const [statsRes, transaktionenRes, kontoRes] = await Promise.all([
        fetch(`/api/finanzen/stats?${params}`),
        fetch(`/api/finanzen/transaktionen?${params}`),
        fetch(`/api/finanzen/kontostand?${kontoParams}`)
      ])
      
      const statsData = await statsRes.json()
      const transaktionenData = await transaktionenRes.json()
      const kontoData = await kontoRes.json()
      
      if (statsData.erfolg) setStats(statsData.stats)
      if (transaktionenData.erfolg) setTransaktionen(transaktionenData.transaktionen)
      if (kontoData.erfolg) setKontostand(kontoData.aktueller)
    } catch (error) {
      console.error('Fehler beim Laden:', error)
      toast.error('Fehler beim Laden der Finanzdaten')
    } finally {
      setLoading(false)
    }
  }
  
  const handleEdit = (transaktion: any) => {
    setEditTransaktion(transaktion)
    setDialogTyp(transaktion.typ)
    setDialogOpen(true)
  }
  
  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open)
    if (!open) {
      setEditTransaktion(null)
    }
  }

  const handleZeitraumTypChange = (typ: ZeitraumFilterType['typ']) => {
    const heute = new Date()
    let von: Date | undefined
    let bis: Date | undefined

    switch (typ) {
      case 'all':
        von = undefined
        bis = undefined
        break
      case 'letzte_30_tage':
        von = new Date(heute.getTime() - 30 * 24 * 60 * 60 * 1000)
        bis = heute
        break
      case 'letzte_90_tage':
        von = new Date(heute.getTime() - 90 * 24 * 60 * 60 * 1000)
        bis = heute
        break
      case 'letztes_jahr':
        von = new Date(heute.getTime() - 365 * 24 * 60 * 60 * 1000)
        bis = heute
        break
      case 'aktuelles_jahr':
        von = new Date(heute.getFullYear(), 0, 1)
        bis = new Date(heute.getFullYear(), 11, 31)
        break
      case 'aktuelles_quartal':
        const quartal = Math.floor(heute.getMonth() / 3)
        von = new Date(heute.getFullYear(), quartal * 3, 1)
        bis = new Date(heute.getFullYear(), quartal * 3 + 3, 0)
        break
      case 'vorjahr':
        von = new Date(heute.getFullYear() - 1, 0, 1)
        bis = new Date(heute.getFullYear() - 1, 11, 31)
        break
      case 'letztes_quartal':
        const letzterQuartal = Math.floor(heute.getMonth() / 3) - 1
        const jahr = letzterQuartal < 0 ? heute.getFullYear() - 1 : heute.getFullYear()
        const q = letzterQuartal < 0 ? 3 : letzterQuartal
        von = new Date(jahr, q * 3, 1)
        bis = new Date(jahr, q * 3 + 3, 0)
        break
      case 'benutzerdefiniert':
        von = zeitraum.von || heute
        bis = zeitraum.bis || heute
        break
    }

    setZeitraum({ typ, von, bis })
  }

  const handleExportCSV = () => {
    if (transaktionen.length === 0) {
      toast.error('Keine Transaktionen zum Exportieren vorhanden')
      return
    }

    try {
      // CSV Header
      const headers = [
        'Datum',
        'Typ',
        'Betrag (€)',
        'Kategorie',
        'Beschreibung',
        'Zahlungsart',
        'Kunde',
        'Projekt',
        'Rechnung',
        'Quelle',
        'Status'
      ]

      // CSV Rows
      const rows = transaktionen.map(t => [
        new Date(t.datum).toLocaleDateString('de-DE'),
        t.typ === 'einnahme' ? 'Einnahme' : 'Ausgabe',
        t.betrag.toFixed(2),
        t.kategorieName || '-',
        t.beschreibung || '-',
        t.zahlungsart || '-',
        t.kundeName || '-',
        t.projektName || '-',
        t.rechnungsnummer || '-',
        t.quelle === 'ki_automatisch' ? 'KI' : t.quelle === 'manuell' ? 'Manuell' : t.quelle || '-',
        t.status || '-'
      ])

      // CSV erstellen
      const csvContent = [
        headers.join(';'),
        ...rows.map(row => row.join(';'))
      ].join('\n')

      // BOM für deutsche Umlaute
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      
      const filename = `transaktionen_${new Date().toISOString().split('T')[0]}.csv`
      link.setAttribute('href', url)
      link.setAttribute('download', filename)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast.success(`${transaktionen.length} Transaktionen als CSV exportiert`)
    } catch (error) {
      console.error('Fehler beim CSV-Export:', error)
      toast.error('Fehler beim Exportieren')
    }
  }

  const handleExportPDF = async () => {
    if (transaktionen.length === 0) {
      toast.error('Keine Transaktionen zum Exportieren vorhanden')
      return
    }

    try {
      // Dynamischer Import von jsPDF (nur im Client)
      const { default: jsPDF } = await import('jspdf')
      const { default: autoTable } = await import('jspdf-autotable')

      const doc = new jsPDF()

      // Header
      doc.setFontSize(20)
      doc.setFont('helvetica', 'bold')
      doc.text('Finanztransaktionen', 14, 20)

      // Zeitraum
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      const zeitraumText = `Zeitraum: ${zeitraum.von ? new Date(zeitraum.von).toLocaleDateString('de-DE') : 'Unbegrenzt'} - ${zeitraum.bis ? new Date(zeitraum.bis).toLocaleDateString('de-DE') : 'Unbegrenzt'}`
      doc.text(zeitraumText, 14, 28)

      // Zusammenfassung
      const einnahmenGesamt = transaktionen
        .filter(t => t.typ === 'einnahme')
        .reduce((sum, t) => sum + t.betrag, 0)
      const ausgabenGesamt = transaktionen
        .filter(t => t.typ === 'ausgabe')
        .reduce((sum, t) => sum + t.betrag, 0)
      const saldo = einnahmenGesamt - ausgabenGesamt

      doc.setFontSize(9)
      doc.text(`Einnahmen: ${einnahmenGesamt.toFixed(2)} €`, 14, 34)
      doc.text(`Ausgaben: ${ausgabenGesamt.toFixed(2)} €`, 60, 34)
      doc.text(`Saldo: ${saldo.toFixed(2)} €`, 105, 34)
      doc.text(`Anzahl: ${transaktionen.length}`, 145, 34)

      // Tabelle
      const tableData = transaktionen.map(t => [
        new Date(t.datum).toLocaleDateString('de-DE'),
        t.typ === 'einnahme' ? 'Einnahme' : 'Ausgabe',
        `${t.betrag.toFixed(2)} €`,
        t.kategorieName || '-',
        t.beschreibung?.substring(0, 40) || '-',
        t.zahlungsart || '-',
        t.quelle === 'ki_automatisch' ? 'KI' : t.quelle === 'manuell' ? 'Manuell' : t.quelle || '-'
      ])

      autoTable(doc, {
        startY: 40,
        head: [['Datum', 'Typ', 'Betrag', 'Kategorie', 'Beschreibung', 'Zahlung', 'Quelle']],
        body: tableData,
        styles: {
          fontSize: 8,
          cellPadding: 2
        },
        headStyles: {
          fillColor: [59, 130, 246],
          textColor: 255,
          fontStyle: 'bold'
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245]
        },
        columnStyles: {
          0: { cellWidth: 22 },  // Datum
          1: { cellWidth: 22 },  // Typ
          2: { cellWidth: 25, halign: 'right' },  // Betrag
          3: { cellWidth: 30 },  // Kategorie
          4: { cellWidth: 45 },  // Beschreibung
          5: { cellWidth: 22 },  // Zahlung
          6: { cellWidth: 18 }   // Quelle
        }
      })

      // Footer
      const pageCount = doc.internal.pages.length - 1
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        doc.text(
          `Erstellt am ${new Date().toLocaleDateString('de-DE')} - Seite ${i} von ${pageCount}`,
          14,
          doc.internal.pageSize.height - 10
        )
      }

      // Download
      const filename = `transaktionen_${new Date().toISOString().split('T')[0]}.pdf`
      doc.save(filename)

      toast.success(`${transaktionen.length} Transaktionen als PDF exportiert`)
    } catch (error) {
      console.error('Fehler beim PDF-Export:', error)
      toast.error('Fehler beim PDF-Export')
    }
  }
  
  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Finanzen</h1>
          <p className="text-gray-600 mt-1">Einnahmen, Ausgaben und Finanzanalysen</p>
        </div>
        
        <div className="flex gap-2">
          <Button onClick={() => { setDialogTyp('einnahme'); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Einnahme
          </Button>
          <Button variant="outline" onClick={() => { setDialogTyp('ausgabe'); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Ausgabe
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportCSV} className="cursor-pointer">
                <FileSpreadsheet className="h-4 w-4 mr-2 text-green-600" />
                Als CSV exportieren
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportPDF} className="cursor-pointer">
                <FileText className="h-4 w-4 mr-2 text-red-600" />
                Als PDF exportieren
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      {/* Kontostand-Karte */}
      <KontostandCard 
        kontostand={kontostand} 
        onEdit={() => setKontostandDialogOpen(true)}
        loading={loading}
      />
      
      {/* Filter-Bereich */}
      <div className="space-y-4">
        <MandantenAuswahl value={mandantId} onChange={setMandantId} />
        <ZeitraumFilter 
          zeitraumTyp={zeitraum.typ}
          vonDatum={zeitraum.von ? zeitraum.von.toISOString().split('T')[0] : ''}
          bisDatum={zeitraum.bis ? zeitraum.bis.toISOString().split('T')[0] : ''}
          onZeitraumTypChange={handleZeitraumTypChange}
          onVonDatumChange={(datum) => setZeitraum(prev => ({ ...prev, von: new Date(datum) }))}
          onBisDatumChange={(datum) => setZeitraum(prev => ({ ...prev, bis: new Date(datum) }))}
        />
      </div>
      
      {/* Liquiditäts-Warnung */}
      <LiquiditaetsWarnung 
        mandantId={mandantId} 
        zeitraum={zeitraum}
        refreshTrigger={refreshTrigger} 
      />
      
      {/* Wiederkehrende Buchungen Widget */}
      <WiederkehrendeBuchungenWidget mandantId={mandantId} onBuchungErstellt={loadData} />
      
      {/* KPI Cards */}
      <FinanzenKPICards 
        stats={stats} 
        onCardClick={setActiveFilter}
        activeFilter={activeFilter}
      />
      
      {/* Charts */}
      <ChartsSection zeitraum={zeitraum} mandantId={mandantId} refreshTrigger={refreshTrigger} />
      
      {/* MwSt-Ansicht */}
      <MwStAnsicht zeitraum={zeitraum} mandantId={mandantId} refreshTrigger={refreshTrigger} />
      
      {/* Budget-Verwaltung */}
      <BudgetVerwaltung 
        mandantId={mandantId} 
        zeitraum={zeitraum}
        refreshTrigger={refreshTrigger} 
      />
      
      {/* Transaktions-Tabelle */}
      <TransaktionenTabelle 
        transaktionen={transaktionen}
        loading={loading}
        activeFilter={activeFilter}
        onRefresh={loadData}
        onEdit={handleEdit}
      />
      
      {/* KI-Report Panel */}
      <KIBerichtPanel zeitraum={zeitraum} mandantId={mandantId} refreshTrigger={refreshTrigger} />
      
      {/* Transaktions-Dialog */}
      <TransaktionDialog 
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        typ={dialogTyp}
        mandantId={mandantId}
        transaktion={editTransaktion}
        onSuccess={() => {
          console.log('🔄 Lade Finanzdaten nach Transaktion neu...')
          setTimeout(() => {
            loadData()
            setRefreshTrigger(prev => prev + 1)
          }, 100)
        }}
      />
      
      {/* Kontostand-Dialog */}
      <KontostandDialog
        open={kontostandDialogOpen}
        onOpenChange={setKontostandDialogOpen}
        mandantId={mandantId}
        onSuccess={() => {
          loadData()
          setRefreshTrigger(prev => prev + 1)
        }}
      />
    </div>
  )
}

