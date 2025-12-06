import React from 'react'
import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { ObjectId } from 'mongodb'
import { Mitarbeiter, Zeiterfassung } from '@/lib/db/types'
import { renderToBuffer } from '@react-pdf/renderer'
import ZeiterfassungPDFDocument from '@/lib/pdf/ZeiterfassungPDFDocument'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const db = await getDatabase()

    // Fetch Mitarbeiter
    const mitarbeiter = await db.collection<Mitarbeiter>('mitarbeiter').findOne({ 
      _id: new ObjectId(id) 
    })

    if (!mitarbeiter) {
      return NextResponse.json(
        { error: 'Mitarbeiter nicht gefunden' },
        { status: 404 }
      )
    }

    // Fetch Zeiterfassungen
    const zeiterfassungen = await db.collection<Zeiterfassung>('zeiterfassung')
      .find({ mitarbeiterId: id })
      .sort({ datum: -1 })
      .toArray()

    // Gruppiere nach Projekt
    const stundenProProjekt = zeiterfassungen.reduce((acc, zeit) => {
      const projektKey = zeit.projektId || 'ohne-projekt'
      const projektName = zeit.projektName || 'Ohne Projekt'
      
      if (!acc[projektKey]) {
        acc[projektKey] = {
          projektName: projektName,
          gesamtStunden: 0,
          freigegebeneStunden: 0,
          offeneStunden: 0,
          eintraege: 0
        }
      }
      
      acc[projektKey].gesamtStunden += zeit.stunden
      acc[projektKey].eintraege += 1
      
      if (zeit.status === 'freigegeben') {
        acc[projektKey].freigegebeneStunden += zeit.stunden
      } else if (zeit.status === 'offen') {
        acc[projektKey].offeneStunden += zeit.stunden
      }
      
      return acc
    }, {} as Record<string, {
      projektName: string
      gesamtStunden: number
      freigegebeneStunden: number
      offeneStunden: number
      eintraege: number
    }>)

    const projektStundenArray = Object.values(stundenProProjekt).sort(
      (a, b) => b.gesamtStunden - a.gesamtStunden
    )

    // Berechne Gesamtstatistik
    const gesamtStatistik = {
      gesamt: zeiterfassungen.reduce((sum, z) => sum + z.stunden, 0),
      freigegeben: zeiterfassungen.filter(z => z.status === 'freigegeben').reduce((sum, z) => sum + z.stunden, 0),
      offen: zeiterfassungen.filter(z => z.status === 'offen').reduce((sum, z) => sum + z.stunden, 0),
      anzahlEintraege: zeiterfassungen.length
    }

    // Erstelle Zeitraum-String
    const datumsArray = zeiterfassungen.map(z => new Date(z.datum))
    const minDatum = datumsArray.length > 0 ? new Date(Math.min(...datumsArray.map(d => d.getTime()))) : null
    const maxDatum = datumsArray.length > 0 ? new Date(Math.max(...datumsArray.map(d => d.getTime()))) : null
    
    const zeitraum = minDatum && maxDatum
      ? `${minDatum.toLocaleDateString('de-DE')} - ${maxDatum.toLocaleDateString('de-DE')}`
      : 'Alle Einträge'

    // Generate PDF
    const buffer = await renderToBuffer(
      <ZeiterfassungPDFDocument
        mitarbeiterName={`${mitarbeiter.vorname} ${mitarbeiter.nachname}`}
        personalnummer={mitarbeiter.personalnummer}
        projektStunden={projektStundenArray}
        gesamtStatistik={gesamtStatistik}
        zeitraum={zeitraum}
      />
    )

    // Return PDF as response
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="Stundenuebersicht-${mitarbeiter.personalnummer || id}.pdf"`,
      },
    })

  } catch (error) {
    console.error('Fehler bei PDF-Generierung:', error)
    return NextResponse.json(
      { error: 'Fehler bei der PDF-Generierung', details: error instanceof Error ? error.message : 'Unbekannter Fehler' },
      { status: 500 }
    )
  }
}

