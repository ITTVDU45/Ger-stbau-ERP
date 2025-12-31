import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { Mitarbeiter } from '@/lib/db/types'

// GET - Alle Mitarbeiter abrufen
export async function GET(request: NextRequest) {
  try {
    const db = await getDatabase()
    const mitarbeiterCollection = db.collection<Mitarbeiter>('mitarbeiter')
    
    const mitarbeiter = await mitarbeiterCollection
      .find({})
      .sort({ nachname: 1, vorname: 1 })
      .toArray()
    
    return NextResponse.json({ 
      erfolg: true, 
      mitarbeiter 
    })
  } catch (error) {
    console.error('Fehler beim Abrufen der Mitarbeiter:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Abrufen der Mitarbeiter' },
      { status: 500 }
    )
  }
}

// Hilfsfunktion: Nächste Personalnummer generieren
async function generierePersonalnummer(mitarbeiterCollection: any): Promise<string> {
  // Alle Mitarbeiter mit Personalnummern im Format M-XXX holen
  const alleMitarbeiter = await mitarbeiterCollection
    .find({ personalnummer: { $regex: /^M-\d+$/ } })
    .sort({ personalnummer: -1 })
    .limit(1)
    .toArray()
  
  if (alleMitarbeiter.length === 0) {
    return 'M-001'
  }
  
  // Höchste Nummer extrahieren und um 1 erhöhen
  const hoechsteNummer = alleMitarbeiter[0].personalnummer
  const match = hoechsteNummer.match(/^M-(\d+)$/)
  
  if (match) {
    const naechsteNummer = parseInt(match[1], 10) + 1
    return `M-${String(naechsteNummer).padStart(3, '0')}`
  }
  
  return 'M-001'
}

// POST - Neuen Mitarbeiter anlegen
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    console.log('📥 Mitarbeiter POST Request Body:', JSON.stringify(body, null, 2))
    
    // Validierung der Pflichtfelder
    if (!body.vorname || !body.nachname || !body.email) {
      console.error('❌ Validierungsfehler: Pflichtfelder fehlen', { 
        vorname: !!body.vorname, 
        nachname: !!body.nachname, 
        email: !!body.email 
      })
      return NextResponse.json(
        { erfolg: false, fehler: 'Vorname, Nachname und E-Mail sind erforderlich' },
        { status: 400 }
      )
    }

    // E-Mail-Format validieren
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(body.email)) {
      console.error('❌ Ungültiges E-Mail-Format:', body.email)
      return NextResponse.json(
        { erfolg: false, fehler: 'Ungültiges E-Mail-Format' },
        { status: 400 }
      )
    }

    const db = await getDatabase()
    const mitarbeiterCollection = db.collection<Mitarbeiter>('mitarbeiter')
    
    // Prüfen ob E-Mail bereits existiert
    const existing = await mitarbeiterCollection.findOne({ email: body.email })
    if (existing) {
      console.error('❌ E-Mail bereits vorhanden:', body.email)
      return NextResponse.json(
        { erfolg: false, fehler: 'Ein Mitarbeiter mit dieser E-Mail existiert bereits' },
        { status: 400 }
      )
    }

    // Automatische Generierung der Personalnummer, falls nicht vorhanden
    let personalnummer = body.personalnummer
    if (!personalnummer || personalnummer.trim() === '') {
      personalnummer = await generierePersonalnummer(mitarbeiterCollection)
      console.log('✅ Personalnummer generiert:', personalnummer)
    }

    // Datum-Konvertierung sicherstellen
    const eintrittsdatum = body.eintrittsdatum 
      ? (typeof body.eintrittsdatum === 'string' ? new Date(body.eintrittsdatum) : body.eintrittsdatum)
      : new Date()

    // Mitarbeiter-Objekt erstellen mit allen erforderlichen Feldern
    const neuerMitarbeiter: Mitarbeiter = {
      vorname: body.vorname,
      nachname: body.nachname,
      email: body.email,
      telefon: body.telefon || '',
      personalnummer,
      beschaeftigungsart: body.beschaeftigungsart || 'festangestellt',
      eintrittsdatum,
      aktiv: body.aktiv !== undefined ? body.aktiv : true,
      qualifikationen: Array.isArray(body.qualifikationen) ? body.qualifikationen : [],
      adresse: body.adresse || {},
      stundensatz: typeof body.stundensatz === 'number' ? body.stundensatz : 0,
      wochenarbeitsstunden: typeof body.wochenarbeitsstunden === 'number' ? body.wochenarbeitsstunden : 40,
      notizen: body.notizen || '',
      dokumente: Array.isArray(body.dokumente) ? body.dokumente : [],
      erstelltAm: new Date(),
      zuletztGeaendert: new Date()
    }
    
    console.log('💾 Speichere Mitarbeiter:', JSON.stringify(neuerMitarbeiter, null, 2))
    
    const result = await mitarbeiterCollection.insertOne(neuerMitarbeiter as any)
    
    console.log('✅ Mitarbeiter erfolgreich angelegt:', result.insertedId)
    
    return NextResponse.json({ 
      erfolg: true, 
      mitarbeiterId: result.insertedId,
      mitarbeiter: { ...neuerMitarbeiter, _id: result.insertedId }
    }, { status: 201 })
  } catch (error) {
    console.error('❌ Fehler beim Anlegen des Mitarbeiters:', error)
    return NextResponse.json(
      { 
        erfolg: false, 
        fehler: 'Fehler beim Anlegen des Mitarbeiters',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler'
      },
      { status: 500 }
    )
  }
}

