import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { ObjectId } from 'mongodb'

// GET - Einzelnes Projekt mit allen Daten laden
export async function GET(
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

    const projekt = await db.collection('projekte').findOne({ _id: new ObjectId(id) })

    if (!projekt) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Projekt nicht gefunden' },
        { status: 404 }
      )
    }

    // Fallback für Legacy-Projektdaten ohne vollständige bauvorhaben-Struktur
    const bauvorhaben = projekt.bauvorhaben || {}
    const normalizedBauvorhaben = {
      adresse: bauvorhaben.adresse || '',
      plz: bauvorhaben.plz || '',
      ort: bauvorhaben.ort || '',
      beschreibung: bauvorhaben.beschreibung || '',
      arbeitstypen: bauvorhaben.arbeitstypen || {
        dach: false,
        fassade: false,
        daemmung: false,
        sonderaufbau: false,
        beschreibung: ''
      },
      geruestseiten: bauvorhaben.geruestseiten || {
        vorderseite: false,
        rueckseite: false,
        rechts: false,
        links: false,
        gesamtflaeche: 0
      },
      besonderheiten: bauvorhaben.besonderheiten || '',
      zufahrtsbeschraenkungen: bauvorhaben.zufahrtsbeschraenkungen || '',
      bauzeitraum: bauvorhaben.bauzeitraum || '',
      sicherheitsanforderungen: bauvorhaben.sicherheitsanforderungen || ''
    }

    // Normalisiere angebotId (kann ObjectId oder String sein)
    const angebotId = projekt.angebotId 
      ? (projekt.angebotId instanceof ObjectId ? projekt.angebotId.toString() : projekt.angebotId)
      : undefined
    
    console.log(`[GET /api/projekte/${id}] Projekt geladen:`, {
      projektId: projekt._id.toString(),
      angebotId: angebotId,
      angebotsnummer: projekt.angebotsnummer,
      budget: projekt.budget,
      angebotssumme: projekt.angebotssumme
    })

    return NextResponse.json({
      erfolg: true,
      projekt: {
        ...projekt,
        _id: projekt._id.toString(),
        angebotId: angebotId, // Explizit als String
        bauvorhaben: normalizedBauvorhaben,
        dokumente: projekt.dokumente || [],
        aktivitaeten: projekt.aktivitaeten || []
      }
    })
  } catch (error) {
    console.error('Fehler beim Abrufen des Projekts:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}

// PUT - Projekt aktualisieren
export async function PUT(
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
    const { _id, ...updateData } = body
    
    // Aktivität hinzufügen
    const neueAktivitaet = {
      aktion: 'Projekt aktualisiert',
      benutzer: body.geaendertVon || 'admin',
      zeitpunkt: new Date(),
      details: 'Projektdaten wurden bearbeitet',
      typ: 'projekt'
    }
    
    const existingProjekt = await db.collection('projekte').findOne({ _id: new ObjectId(id) })
    const aktivitaeten = existingProjekt?.aktivitaeten || []
    
    const result = await db.collection('projekte').updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          ...updateData,
          aktivitaeten: [...aktivitaeten, neueAktivitaet],
          zuletztGeaendert: new Date()
        }
      }
    )

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Projekt nicht gefunden' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      erfolg: true,
      nachricht: 'Projekt erfolgreich aktualisiert'
    })
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Projekts:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}

// DELETE - Projekt löschen
export async function DELETE(
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

    const result = await db.collection('projekte').deleteOne({ _id: new ObjectId(id) })

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Projekt nicht gefunden' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      erfolg: true,
      nachricht: 'Projekt erfolgreich gelöscht'
    })
  } catch (error) {
    console.error('Fehler beim Löschen des Projekts:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}
