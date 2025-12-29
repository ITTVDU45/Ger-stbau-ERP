import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { WiederkehrendeBuchung, Transaktion } from '@/lib/db/types'
import { ObjectId } from 'mongodb'
import { addDays, addWeeks, addMonths, addQuarters, addYears } from 'date-fns'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Ungültige ID' },
        { status: 400 }
      )
    }
    
    const db = await getDatabase()
    const buchungenCollection = db.collection<WiederkehrendeBuchung>('wiederkehrende_buchungen')
    const transaktionenCollection = db.collection<Transaktion>('transaktionen')
    
    // Hole wiederkehrende Buchung
    const buchung = await buchungenCollection.findOne({ _id: new ObjectId(id) })
    
    if (!buchung) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Wiederkehrende Buchung nicht gefunden' },
        { status: 404 }
      )
    }
    
    if (!buchung.aktiv) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Wiederkehrende Buchung ist nicht aktiv' },
        { status: 400 }
      )
    }
    
    // Erstelle Transaktion aus Template
    const neueTransaktion: Transaktion = {
      mandantId: buchung.mandantId,
      typ: buchung.typ,
      datum: new Date(),
      betrag: buchung.betrag,
      nettobetrag: buchung.nettobetrag,
      mwstSatz: buchung.mwstSatz,
      mwstBetrag: buchung.mwstBetrag,
      kategorieId: buchung.kategorieId,
      kategorieName: buchung.kategorieName,
      beschreibung: buchung.beschreibung,
      zahlungsart: buchung.zahlungsart,
      status: 'gebucht',
      istWiederkehrend: true,
      wiederkehrendeBuchungId: id,
      quelle: 'wiederkehrend',
      steuerrelevant: true, // Standard für wiederkehrende Buchungen
      erstelltAm: new Date(),
      erstelltVon: 'System (Wiederkehrend)',
      zuletztGeaendert: new Date()
    }
    
    const transaktionResult = await transaktionenCollection.insertOne(neueTransaktion)
    const transaktion = await transaktionenCollection.findOne({ _id: transaktionResult.insertedId })
    
    // Berechne nächstes Fälligkeitsdatum
    const aktuell = buchung.naechstesFaelligkeitsdatum
    let naechstesDatum: Date
    
    switch (buchung.intervall) {
      case 'taeglich':
        naechstesDatum = addDays(aktuell, 1)
        break
      case 'woechentlich':
        naechstesDatum = addWeeks(aktuell, 1)
        break
      case 'monatlich':
        naechstesDatum = addMonths(aktuell, 1)
        break
      case 'quartal':
        naechstesDatum = addMonths(aktuell, 3)
        break
      case 'jaehrlich':
        naechstesDatum = addYears(aktuell, 1)
        break
      default:
        naechstesDatum = addMonths(aktuell, 1)
    }
    
    // Prüfe ob Enddatum erreicht
    let aktiv = buchung.aktiv
    if (buchung.endDatum && naechstesDatum > buchung.endDatum) {
      aktiv = false
    }
    
    // Update wiederkehrende Buchung
    await buchungenCollection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          naechstesFaelligkeitsdatum: naechstesDatum,
          letzteErinnerungAm: new Date(),
          erinnerungAngezeigt: false,
          aktiv,
          zuletztGeaendert: new Date()
        }
      }
    )
    
    const aktualisiert = await buchungenCollection.findOne({ _id: new ObjectId(id) })
    
    return NextResponse.json({
      erfolg: true,
      transaktion,
      wiederkehrendeBuchung: aktualisiert
    })
  } catch (error) {
    console.error('Fehler beim Buchen der wiederkehrenden Buchung:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Buchen der wiederkehrenden Buchung' },
      { status: 500 }
    )
  }
}

