import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { ObjectId } from 'mongodb'
import { Angebot } from '@/lib/db/types'

// POST - Angebot aus Anfrage erstellen
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const db = await getDatabase()
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Ungültige Anfrage-ID' },
        { status: 400 }
      )
    }

    // Anfrage laden
    const anfrage = await db.collection('anfragen').findOne({ _id: new ObjectId(id) })

    if (!anfrage) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Anfrage nicht gefunden' },
        { status: 404 }
      )
    }

    // Angebotsnummer generieren
    const jahr = new Date().getFullYear()
    const random = String(Math.floor(Math.random() * 10000)).padStart(4, '0')
    const angebotsnummer = `A-${jahr}-${random}`
    
    // Betreff generieren
    const betreff = `Angebot für ${anfrage.bauvorhaben.objektname || 'Ihr Bauvorhaben'}`
    
    // Einleitung aus Anmerkungen und Arbeitstypen generieren
    const arbeitstypen = []
    if (anfrage.artDerArbeiten.dachdecker) arbeitstypen.push('Dachdecker-Arbeiten')
    if (anfrage.artDerArbeiten.fassade) arbeitstypen.push('Fassadenarbeiten')
    if (anfrage.artDerArbeiten.daemmung) arbeitstypen.push('Dämmarbeiten')
    if (anfrage.artDerArbeiten.sonstige && anfrage.artDerArbeiten.sonstigeText) {
      arbeitstypen.push(anfrage.artDerArbeiten.sonstigeText)
    }
    
    const geruestseiten = []
    if (anfrage.geruestseiten.vorderseite) geruestseiten.push('Vorderseite')
    if (anfrage.geruestseiten.rueckseite) geruestseiten.push('Rückseite')
    if (anfrage.geruestseiten.rechteSeite) geruestseiten.push('Rechte Seite')
    if (anfrage.geruestseiten.linkeSeite) geruestseiten.push('Linke Seite')
    
    let einleitung = `vielen Dank für Ihre Anfrage bezüglich ${anfrage.bauvorhaben.objektname || 'Ihres Bauvorhabens'}.`
    
    if (arbeitstypen.length > 0) {
      einleitung += `\n\nGerne unterbreiten wir Ihnen folgendes Angebot für: ${arbeitstypen.join(', ')}.`
    }
    
    if (geruestseiten.length > 0) {
      einleitung += `\n\nGerüstseiten: ${geruestseiten.join(', ')}`
    }
    
    if (anfrage.geruestseiten.gesamtflaeche) {
      einleitung += `\nGesamtfläche: ${anfrage.geruestseiten.gesamtflaeche} m²`
    }
    
    if (anfrage.anmerkungen) {
      einleitung += `\n\nZusätzliche Informationen:\n${anfrage.anmerkungen}`
    }

    // Falls Anfrage einem Projekt zugewiesen ist, Projekt laden
    let projektId: string | undefined
    let projektnummer: string | undefined
    
    if (anfrage.projektId) {
      const projekt = await db.collection('projekte').findOne({ 
        _id: new ObjectId(anfrage.projektId) 
      })
      
      if (projekt) {
        projektId = projekt._id.toString()
        projektnummer = projekt.projektnummer
        
        // Einleitung mit Projektinformationen erweitern
        einleitung += `\n\nDieses Angebot bezieht sich auf das Projekt: ${projekt.projektname} (${projektnummer})`
      }
    }

    // Neues Angebot erstellen
    const neuesAngebot: Omit<Angebot, '_id'> = {
      angebotsnummer,
      kundeId: anfrage.kundeId,
      kundeName: anfrage.kundeName,
      kundeAdresse: '', // Wird beim Bearbeiten ausgefüllt
      datum: new Date(),
      gueltigBis: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 Tage
      betreff,
      einleitung,
      positionen: [], // Werden manuell hinzugefügt
      zwischensumme: 0,
      netto: 0,
      mwstSatz: 19,
      mwstBetrag: 0,
      brutto: 0,
      zahlungsbedingungen: 'Zahlbar innerhalb von 14 Tagen ohne Abzug.',
      schlusstext: 'Wir freuen uns auf Ihre Auftragserteilung.',
      status: 'entwurf',
      versionsnummer: 1,
      anfrageId: anfrage._id.toString(), // Verknüpfung zur Anfrage
      projektId, // Verknüpfung zum Projekt (falls vorhanden)
      projektnummer, // Projektnummer (falls vorhanden)
      erstelltAm: new Date(),
      zuletztGeaendert: new Date(),
      erstelltVon: 'admin'
    }

    const result = await db.collection('angebote').insertOne(neuesAngebot)
    const angebotId = result.insertedId.toString()

    // Anfrage aktualisieren - Status auf "in_bearbeitung" lassen, bis Angebot gesendet wird
    const neueAktivitaet = {
      aktion: 'Angebot-Entwurf erstellt',
      benutzer: 'admin',
      zeitpunkt: new Date(),
      details: `Angebot-Entwurf ${angebotsnummer} wurde aus dieser Anfrage erstellt`
    }
    
    await db.collection('anfragen').updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          status: 'angebot_in_bearbeitung',
          angebotId,
          zuletztGeaendert: new Date()
        },
        $push: {
          aktivitaeten: neueAktivitaet
        }
      }
    )

    return NextResponse.json({
      erfolg: true,
      angebotId,
      angebotsnummer,
      nachricht: 'Angebot erfolgreich erstellt'
    })
  } catch (error) {
    console.error('Fehler beim Erstellen des Angebots:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}

