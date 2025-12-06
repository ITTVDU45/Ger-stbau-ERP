import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { Projekt } from '@/lib/db/types'
import { ObjectId } from 'mongodb'

// GET - Exportiert die Kalkulation in verschiedenen Formaten
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projektId: string }> }
) {
  try {
    const { projektId } = await params
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'csv'
    
    if (!projektId || projektId === 'undefined') {
      return NextResponse.json(
        { erfolg: false, fehler: 'Projekt-ID ist erforderlich' },
        { status: 400 }
      )
    }

    const db = await getDatabase()
    const projekt = await db.collection<Projekt>('projekte').findOne({ 
      _id: new ObjectId(projektId) 
    })
    
    if (!projekt || !projekt.vorkalkulation || !projekt.nachkalkulation) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Projekt oder Kalkulation nicht gefunden' },
        { status: 404 }
      )
    }

    const vorkalkulation = projekt.vorkalkulation
    const nachkalkulation = projekt.nachkalkulation

    // CSV-Export
    if (format === 'csv') {
      const csvContent = generateCSV(projekt, vorkalkulation, nachkalkulation)
      
      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="Kalkulation_${projekt.projektnummer}_${new Date().toISOString().split('T')[0]}.csv"`
        }
      })
    }

    // PDF-Export (vereinfacht - kann später mit React-PDF erweitert werden)
    if (format === 'pdf') {
      return NextResponse.json(
        { erfolg: false, fehler: 'PDF-Export wird derzeit entwickelt. Bitte verwenden Sie CSV oder Excel.' },
        { status: 501 }
      )
    }

    // Excel-Export (vereinfacht - benötigt exceljs)
    if (format === 'excel') {
      return NextResponse.json(
        { erfolg: false, fehler: 'Excel-Export wird derzeit entwickelt. Bitte verwenden Sie CSV.' },
        { status: 501 }
      )
    }

    return NextResponse.json(
      { erfolg: false, fehler: 'Unbekanntes Format. Verfügbar: csv, pdf, excel' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Fehler beim Export:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Export der Kalkulation' },
      { status: 500 }
    )
  }
}

// Hilfsfunktion: CSV generieren
function generateCSV(projekt: Projekt, vorkalkulation: any, nachkalkulation: any): string {
  const lines: string[] = []
  
  // Header-Info
  lines.push(`Nachkalkulation - Projekt ${projekt.projektnummer}`)
  lines.push(`Projektname: ${projekt.projektname}`)
  lines.push(`Kunde: ${projekt.kundeName}`)
  lines.push(`Exportiert am: ${new Date().toLocaleString('de-DE')}`)
  lines.push('')
  
  // Soll-Ist-Vergleich Tabelle
  lines.push('Kategorie;Soll-Stunden;Ist-Stunden;Differenz Stunden;Soll-Umsatz;Ist-Umsatz;Differenz Umsatz;Abweichung %')
  
  lines.push(`Aufbau;${vorkalkulation.sollStundenAufbau};${nachkalkulation.istStundenAufbau};${nachkalkulation.istStundenAufbau - vorkalkulation.sollStundenAufbau};${vorkalkulation.sollUmsatzAufbau.toFixed(2)};${nachkalkulation.istUmsatzAufbau.toFixed(2)};${(nachkalkulation.istUmsatzAufbau - vorkalkulation.sollUmsatzAufbau).toFixed(2)};${vorkalkulation.sollStundenAufbau > 0 ? ((nachkalkulation.istStundenAufbau / vorkalkulation.sollStundenAufbau - 1) * 100).toFixed(1) : '0'}`)
  
  lines.push(`Abbau;${vorkalkulation.sollStundenAbbau};${nachkalkulation.istStundenAbbau};${nachkalkulation.istStundenAbbau - vorkalkulation.sollStundenAbbau};${vorkalkulation.sollUmsatzAbbau.toFixed(2)};${nachkalkulation.istUmsatzAbbau.toFixed(2)};${(nachkalkulation.istUmsatzAbbau - vorkalkulation.sollUmsatzAbbau).toFixed(2)};${vorkalkulation.sollStundenAbbau > 0 ? ((nachkalkulation.istStundenAbbau / vorkalkulation.sollStundenAbbau - 1) * 100).toFixed(1) : '0'}`)
  
  lines.push(`Gesamt (gewichtet);${vorkalkulation.gesamtSollStunden};${nachkalkulation.gesamtIstStunden};${nachkalkulation.differenzStunden};${vorkalkulation.gesamtSollUmsatz.toFixed(2)};${nachkalkulation.gesamtIstUmsatz.toFixed(2)};${nachkalkulation.differenzUmsatz.toFixed(2)};${nachkalkulation.abweichungUmsatzProzent.toFixed(1)}`)
  
  lines.push('')
  lines.push('Mitarbeiter-Abgleich')
  lines.push('Mitarbeiter;Zeit-SOLL;Zeit-IST;Differenz Zeit;Summe-SOLL;Summe-IST;Differenz Summe;Abweichung %')
  
  nachkalkulation.mitarbeiterAuswertung.forEach((ma: any) => {
    lines.push(`${ma.mitarbeiterName};${ma.zeitSoll.toFixed(1)};${ma.zeitIst.toFixed(1)};${ma.differenzZeit.toFixed(1)};${ma.summeSoll.toFixed(2)};${ma.summeIst.toFixed(2)};${ma.differenzSumme.toFixed(2)};${ma.abweichungProzent.toFixed(1)}`)
  })
  
  lines.push('')
  lines.push(`Erfüllungsgrad: ${nachkalkulation.erfuellungsgrad.toFixed(1)}%`)
  lines.push(`Status: ${nachkalkulation.status}`)
  lines.push(`Letzte Berechnung: ${new Date(nachkalkulation.letzteBerechnung).toLocaleString('de-DE')}`)
  
  return lines.join('\n')
}

