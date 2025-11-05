import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { ObjectId } from 'mongodb'

// POST - Rechnung aus zugewiesenem Angebot erstellen
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const db = await getDatabase()
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Ungültige Projekt-ID' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { typ, positionen, prozentsatz, angebotId } = body // typ: 'teil' | 'schluss'

    // Projekt laden
    const projekt = await db.collection('projekte').findOne({ _id: new ObjectId(id) })
    if (!projekt) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Projekt nicht gefunden' },
        { status: 404 }
      )
    }

    // AngebotId: entweder aus Body oder aus Projekt
    const verwendeteAngebotId = angebotId || projekt.angebotId
    
    // Prüfen ob Angebot vorhanden
    if (!verwendeteAngebotId) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Kein Angebot zugewiesen. Bitte zuerst Angebot zuweisen.' },
        { status: 400 }
      )
    }

    if (!ObjectId.isValid(verwendeteAngebotId)) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Ungültige Angebots-ID' },
        { status: 400 }
      )
    }

    // Angebot laden
    const angebot = await db.collection('angebote').findOne({ _id: new ObjectId(verwendeteAngebotId) })
    if (!angebot) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Zugewiesenes Angebot nicht gefunden' },
        { status: 404 }
      )
    }

    // Rechnungsnummer generieren
    const jahr = new Date().getFullYear()
    const random = String(Math.floor(Math.random() * 10000)).padStart(4, '0')
    const rechnungsnummer = `R-${jahr}-${random}`

    // Rechnungspositionen berechnen
    let rechnungspositionen = []
    let rechnungsbetrag = 0

    if (typ === 'teil') {
      if (prozentsatz) {
        // Prozentuale Teilrechnung
        const faktor = prozentsatz / 100
        rechnungspositionen = angebot.positionen.map((pos: any) => {
          const gesamt = pos.gesamtpreis || pos.gesamt || 0
          return {
            ...pos,
            menge: pos.menge * faktor,
            gesamt: gesamt * faktor,
            gesamtpreis: gesamt * faktor
          }
        })
        rechnungsbetrag = angebot.brutto * faktor
      } else if (positionen && positionen.length > 0) {
        // Ausgewählte Positionen
        rechnungspositionen = angebot.positionen.filter((pos: any) =>
          positionen.includes(pos._id?.toString() || pos.position)
        )
        rechnungsbetrag = rechnungspositionen.reduce((sum: number, pos: any) => sum + (pos.gesamtpreis || pos.gesamt || 0), 0)
        // MwSt hinzufügen
        rechnungsbetrag = rechnungsbetrag * (1 + (angebot.mwstSatz || 19) / 100)
      }
    } else {
      // Schlussrechnung - alle Positionen
      rechnungspositionen = angebot.positionen
      rechnungsbetrag = angebot.brutto
    }

    // Neue Rechnung erstellen
    const neueRechnung = {
      rechnungsnummer,
      kundeId: projekt.kundeId,
      kundeName: projekt.kundeName,
      projektId: id,
      projektnummer: projekt.projektnummer,
      angebotId: verwendeteAngebotId,
      angebotsnummer: angebot.angebotsnummer,
      datum: new Date(),
      faelligkeitsdatum: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 Tage
      typ: typ === 'teil' ? 'teilrechnung' : 'schlussrechnung',
      positionen: rechnungspositionen,
      netto: rechnungsbetrag / (1 + (angebot.mwstSatz || 19) / 100),
      mwstSatz: angebot.mwstSatz || 19,
      mwstBetrag: rechnungsbetrag - (rechnungsbetrag / (1 + (angebot.mwstSatz || 19) / 100)),
      brutto: rechnungsbetrag,
      status: 'entwurf',
      zahlungsbedingungen: angebot.zahlungsbedingungen || 'Zahlbar innerhalb von 14 Tagen ohne Abzug.',
      erstelltAm: new Date(),
      zuletztGeaendert: new Date(),
      erstelltVon: body.benutzer || 'admin'
    }

    const result = await db.collection('rechnungen').insertOne(neueRechnung)
    const rechnungId = result.insertedId.toString()

    // Projekt aktualisieren
    const bereitsAbgerechnet = (projekt.bereitsAbgerechnet || 0) + rechnungsbetrag
    const neuerStatus = projekt.status === 'aktiv' ? 'in_abrechnung' : projekt.status
    
    const neueAktivitaet = {
      aktion: typ === 'teil' ? 'Teilrechnung erstellt' : 'Schlussrechnung erstellt',
      benutzer: body.benutzer || 'admin',
      zeitpunkt: new Date(),
      details: `Rechnung ${rechnungsnummer} wurde als Entwurf erstellt (${rechnungsbetrag.toFixed(2)} €)`,
      typ: 'rechnung'
    }

    await db.collection('projekte').updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          status: neuerStatus,
          bereitsAbgerechnet,
          offenerBetrag: (projekt.angebotssumme || 0) - bereitsAbgerechnet,
          zuletztGeaendert: new Date()
        },
        $push: {
          aktivitaeten: neueAktivitaet as any
        }
      }
    )

    return NextResponse.json({
      erfolg: true,
      nachricht: 'Rechnung erfolgreich erstellt',
      rechnungId,
      rechnungsnummer,
      rechnungsbetrag
    })
  } catch (error) {
    console.error('Fehler beim Erstellen der Rechnung:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}

