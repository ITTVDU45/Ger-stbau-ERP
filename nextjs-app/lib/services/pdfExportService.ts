import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { KundenDetailBericht, KIBerichtSnapshot, KundenKennzahlen } from '@/lib/db/types'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'

// Extend jsPDF type for autoTable
declare module 'jspdf' {
  interface jsPDF {
    lastAutoTable?: { finalY: number }
  }
}

export function exportKundenDetailBerichtToPDF(
  bericht: KundenDetailBericht,
  kiBericht?: KIBerichtSnapshot
): void {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  let yPos = 20

  const kundeName = bericht.kunde.firma || `${bericht.kunde.vorname || ''} ${bericht.kunde.nachname || ''}`.trim()

  // Header
  doc.setFontSize(20)
  doc.setTextColor(0, 0, 0)
  doc.text('Kundenbericht', 20, yPos)
  yPos += 10

  doc.setFontSize(16)
  doc.setTextColor(60, 60, 60)
  doc.text(kundeName, 20, yPos)
  yPos += 8

  doc.setFontSize(10)
  doc.setTextColor(100, 100, 100)
  doc.text(`Kundennummer: ${bericht.kunde.kundennummer || 'N/A'}`, 20, yPos)
  yPos += 5
  doc.text(`Zeitraum: ${getZeitraumBeschreibung(bericht.zeitraum)}`, 20, yPos)
  yPos += 5
  doc.text(`Erstellt am: ${format(new Date(), 'dd.MM.yyyy HH:mm', { locale: de })}`, 20, yPos)
  yPos += 15

  // Trennlinie
  doc.setDrawColor(200, 200, 200)
  doc.line(20, yPos, pageWidth - 20, yPos)
  yPos += 10

  // KPIs Tabelle
  doc.setFontSize(14)
  doc.setTextColor(0, 0, 0)
  doc.text('Kennzahlen', 20, yPos)
  yPos += 8

  autoTable(doc, {
    startY: yPos,
    head: [['Kennzahl', 'Wert']],
    body: [
      ['Anzahl Anfragen', bericht.kpis.anzahlAnfragen.toString()],
      ['Angebotsvolumen', formatCurrency(bericht.kpis.angebotsvolumen)],
      ['Rechnungsvolumen', formatCurrency(bericht.kpis.rechnungsvolumen)],
      ['Offener Betrag', formatCurrency(bericht.kpis.offenerBetrag)],
      ['Mahnungen offen', bericht.kpis.mahnungenOffen.toString()],
      ['Zahlungsquote', `${bericht.kpis.zahlungsquote.toFixed(1)}%`],
      ['Ø Zahlungsdauer', `${bericht.kpis.durchschnittlicheZahlungszeit} Tage`],
      ['Aktive Projekte', bericht.kpis.aktiveProjekte.toString()],
      ['Abgeschlossene Projekte', bericht.kpis.abgeschlosseneProjekte.toString()],
      ['Gesamt Projekte', bericht.kpis.gesamtprojekte.toString()]
    ],
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246], textColor: 255 },
    styles: { fontSize: 10 }
  })

  yPos = doc.lastAutoTable ? doc.lastAutoTable.finalY + 15 : yPos + 80

  // Check for new page
  if (yPos > pageHeight - 40) {
    doc.addPage()
    yPos = 20
  }

  // KI-Bericht (falls vorhanden)
  if (kiBericht) {
    doc.setFontSize(14)
    doc.text('KI-Bericht', 20, yPos)
    yPos += 8

    // Executive Summary
    doc.setFontSize(12)
    doc.setTextColor(60, 60, 60)
    doc.text('Executive Summary', 20, yPos)
    yPos += 6

    doc.setFontSize(10)
    doc.setTextColor(80, 80, 80)
    const summaryLines = doc.splitTextToSize(kiBericht.bericht.executiveSummary, pageWidth - 40)
    summaryLines.forEach((line: string) => {
      if (yPos > pageHeight - 20) {
        doc.addPage()
        yPos = 20
      }
      doc.text(line, 20, yPos)
      yPos += 5
    })
    yPos += 10

    // Highlights
    if (yPos > pageHeight - 40) {
      doc.addPage()
      yPos = 20
    }

    doc.setFontSize(12)
    doc.setTextColor(60, 60, 60)
    doc.text('Highlights', 20, yPos)
    yPos += 6

    doc.setFontSize(10)
    kiBericht.bericht.highlights.forEach((highlight) => {
      if (yPos > pageHeight - 20) {
        doc.addPage()
        yPos = 20
      }
      doc.setTextColor(100, 100, 100)
      doc.text('•', 20, yPos)
      doc.setTextColor(80, 80, 80)
      const highlightLines = doc.splitTextToSize(highlight, pageWidth - 50)
      highlightLines.forEach((line: string) => {
        doc.text(line, 25, yPos)
        yPos += 5
      })
      yPos += 2
    })
    yPos += 10

    // Nächste Schritte
    if (yPos > pageHeight - 40) {
      doc.addPage()
      yPos = 20
    }

    doc.setFontSize(12)
    doc.setTextColor(60, 60, 60)
    doc.text('Nächste Schritte', 20, yPos)
    yPos += 6

    doc.setFontSize(10)
    kiBericht.bericht.naechsteSchritte.forEach((schritt) => {
      if (yPos > pageHeight - 20) {
        doc.addPage()
        yPos = 20
      }
      doc.setTextColor(100, 100, 100)
      doc.text('→', 20, yPos)
      doc.setTextColor(80, 80, 80)
      const schrittLines = doc.splitTextToSize(schritt, pageWidth - 50)
      schrittLines.forEach((line: string) => {
        doc.text(line, 25, yPos)
        yPos += 5
      })
      yPos += 2
    })
  }

  // Aktivitäten
  if (yPos > pageHeight - 60) {
    doc.addPage()
    yPos = 20
  }

  doc.setFontSize(14)
  doc.setTextColor(0, 0, 0)
  doc.text('Letzte Aktivitäten', 20, yPos)
  yPos += 8

  const aktivitaetenData = bericht.aktivitaeten.slice(0, 10).map(a => [
    format(new Date(a.zeitpunkt), 'dd.MM.yyyy', { locale: de }),
    a.typ.toUpperCase(),
    a.titel,
    a.status || '-',
    a.betrag ? formatCurrency(a.betrag) : '-'
  ])

  autoTable(doc, {
    startY: yPos,
    head: [['Datum', 'Typ', 'Titel', 'Status', 'Betrag']],
    body: aktivitaetenData,
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246], textColor: 255 },
    styles: { fontSize: 9 },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 25 },
      2: { cellWidth: 60 },
      3: { cellWidth: 30 },
      4: { cellWidth: 30 }
    }
  })

  // Footer auf jeder Seite
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(150, 150, 150)
    doc.text(
      `Seite ${i} von ${pageCount}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    )
  }

  // Download
  const fileName = `Kundenbericht_${kundeName.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`
  doc.save(fileName)
}

export function exportKundenListeToPDF(kunden: KundenKennzahlen[], zeitraum: string): void {
  const doc = new jsPDF('landscape')
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  let yPos = 20

  // Header
  doc.setFontSize(20)
  doc.text('Kundenliste', 20, yPos)
  yPos += 8

  doc.setFontSize(10)
  doc.setTextColor(100, 100, 100)
  doc.text(`Zeitraum: ${zeitraum}`, 20, yPos)
  yPos += 5
  doc.text(`Erstellt am: ${format(new Date(), 'dd.MM.yyyy HH:mm', { locale: de })}`, 20, yPos)
  yPos += 15

  // Kundentabelle
  const kundenData = kunden.map(k => [
    k.kundennummer || '-',
    k.kundeName,
    k.anzahlProjekte.toString(),
    k.anzahlAngebote.toString(),
    k.rechnungenOffen.toString(),
    k.rechnungenBezahlt.toString(),
    k.mahnungenOffen.toString(),
    formatCurrency(k.umsatzImZeitraum),
    k.status
  ])

  autoTable(doc, {
    startY: yPos,
    head: [['Nr.', 'Kunde', 'Projekte', 'Angebote', 'Rechng. Offen', 'Rechng. Bezahlt', 'Mahnungen', 'Umsatz', 'Status']],
    body: kundenData,
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246], textColor: 255 },
    styles: { fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 50 },
      2: { cellWidth: 20 },
      3: { cellWidth: 20 },
      4: { cellWidth: 25 },
      5: { cellWidth: 25 },
      6: { cellWidth: 20 },
      7: { cellWidth: 30 },
      8: { cellWidth: 25 }
    }
  })

  // Footer
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(150, 150, 150)
    doc.text(
      `Seite ${i} von ${pageCount}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    )
  }

  // Download
  const fileName = `Kundenliste_${format(new Date(), 'yyyy-MM-dd')}.pdf`
  doc.save(fileName)
}

function formatCurrency(value: number): string {
  return `${value.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €`
}

function getZeitraumBeschreibung(zeitraum: any): string {
  if (zeitraum.von && zeitraum.bis) {
    const von = format(new Date(zeitraum.von), 'dd.MM.yyyy', { locale: de })
    const bis = format(new Date(zeitraum.bis), 'dd.MM.yyyy', { locale: de })
    return `${von} - ${bis}`
  }

  const labels: Record<string, string> = {
    letzte_30_tage: 'Letzte 30 Tage',
    letzte_90_tage: 'Letzte 90 Tage',
    letztes_jahr: 'Letztes Jahr',
    aktuelles_jahr: 'Aktuelles Jahr',
    aktuelles_quartal: 'Aktuelles Quartal',
    vorjahr: 'Vorjahr',
    letztes_quartal: 'Letztes Quartal'
  }

  return labels[zeitraum.typ] || 'Unbekannter Zeitraum'
}

