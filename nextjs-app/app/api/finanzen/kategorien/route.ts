import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { FinanzenKategorie } from '@/lib/db/types'
import { ObjectId } from 'mongodb'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const typ = searchParams.get('typ') // 'einnahme', 'ausgabe', oder null für alle
    const aktiv = searchParams.get('aktiv') // 'true' oder 'false'
    
    const db = await getDatabase()
    const collection = db.collection<FinanzenKategorie>('finanzen_kategorien')
    
    const filter: any = {}
    if (typ) filter.typ = typ
    if (aktiv) filter.aktiv = aktiv === 'true'
    
    const kategorien = await collection
      .find(filter)
      .sort({ sortierung: 1, name: 1 })
      .toArray()
    
    return NextResponse.json({ erfolg: true, kategorien })
  } catch (error) {
    console.error('Fehler beim Laden der Kategorien:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Laden der Kategorien' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validierung
    if (!body.name || !body.typ) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Name und Typ sind Pflichtfelder' },
        { status: 400 }
      )
    }
    
    if (body.typ !== 'einnahme' && body.typ !== 'ausgabe') {
      return NextResponse.json(
        { erfolg: false, fehler: 'Typ muss "einnahme" oder "ausgabe" sein' },
        { status: 400 }
      )
    }
    
    const db = await getDatabase()
    const collection = db.collection<FinanzenKategorie>('finanzen_kategorien')
    
    const neueKategorie: FinanzenKategorie = {
      name: body.name,
      typ: body.typ,
      beschreibung: body.beschreibung || '',
      farbe: body.farbe || '#6B7280', // Standard-Grau
      icon: body.icon || '📁', // Standard-Icon
      steuerrelevant: body.steuerrelevant !== undefined ? body.steuerrelevant : true,
      aktiv: body.aktiv !== undefined ? body.aktiv : true,
      sortierung: body.sortierung,
      erstelltAm: new Date(),
      zuletztGeaendert: new Date()
    }
    
    const result = await collection.insertOne(neueKategorie)
    const kategorie = await collection.findOne({ _id: result.insertedId })
    
    return NextResponse.json({ erfolg: true, kategorie }, { status: 201 })
  } catch (error) {
    console.error('Fehler beim Erstellen der Kategorie:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Erstellen der Kategorie' },
      { status: 500 }
    )
  }
}

