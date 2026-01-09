import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { Projekt } from '@/lib/db/types'
import { ObjectId } from 'mongodb'

/**
 * Generiert die nächste Projektnummer im Format JJ-NNN
 * z.B. 26-001, 26-002, etc.
 */
async function generiereNaechsteProjektnummer(): Promise<string> {
  const db = await getDatabase()
  const projekteCollection = db.collection<Projekt>('projekte')
  
  // Aktuelles Jahr (zweistellig)
  const jahr = new Date().getFullYear().toString().slice(-2)
  const jahrPrefix = `${jahr}-`
  
  // Finde das letzte Projekt des aktuellen Jahres
  const letzteProjekte = await projekteCollection
    .find({
      projektnummer: { $regex: `^${jahrPrefix}` }
    })
    .sort({ projektnummer: -1 })
    .limit(1)
    .toArray()
  
  let naechsteNummer = 1
  
  if (letzteProjekte.length > 0 && letzteProjekte[0].projektnummer) {
    const letzteNummer = letzteProjekte[0].projektnummer
    const match = letzteNummer.match(/^(\d{2})-(\d{3})$/)
    
    if (match && match[1] === jahr) {
      naechsteNummer = parseInt(match[2], 10) + 1
    }
  }
  
  // Format: JJ-NNN (z.B. 26-001)
  return `${jahr}-${naechsteNummer.toString().padStart(3, '0')}`
}

// GET - Alle Projekte abrufen
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const kundeId = searchParams.get('kundeId')
    
    const db = await getDatabase()
    const projekteCollection = db.collection<Projekt>('projekte')
    
    // Filter für kundeId wenn angegeben
    const matchStage = kundeId ? { $match: { kundeId } } : null
    
    // Aggregation mit Lookup auf Kunden für Branche
    const pipeline: any[] = []
    
    if (matchStage) {
      pipeline.push(matchStage)
    }
    
    pipeline.push(
      {
        $addFields: {
          kundeIdObject: { $toObjectId: '$kundeId' }
        }
      },
      {
        $lookup: {
          from: 'kunden',
          localField: 'kundeIdObject',
          foreignField: '_id',
          as: 'kundeData'
        }
      },
      {
        $addFields: {
          kundeBranche: { $arrayElemAt: ['$kundeData.branche', 0] }
        }
      },
      {
        $project: {
          kundeData: 0,
          kundeIdObject: 0
        }
      },
      {
        $sort: { beginn: -1 } as any
      }
    )
    
    const projekte = await projekteCollection.aggregate(pipeline).toArray()
    
    return NextResponse.json({ erfolg: true, projekte })
  } catch (error) {
    console.error('Fehler beim Abrufen der Projekte:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Abrufen der Projekte' },
      { status: 500 }
    )
  }
}

// POST - Neues Projekt anlegen
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    if (!body.projektname || !body.kundeId || !body.standort) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Projektname, Kunde und Standort sind erforderlich' },
        { status: 400 }
      )
    }

    const db = await getDatabase()
    const projekteCollection = db.collection<Projekt>('projekte')
    
    // Generiere automatisch die nächste Projektnummer
    // Wenn bereits eine Projektnummer angegeben wurde (z.B. beim Import), behalte diese
    const projektnummer = body.projektnummer || await generiereNaechsteProjektnummer()
    
    const neuesProjekt: Projekt = {
      ...body,
      projektnummer,
      erstelltAm: new Date(),
      zuletztGeaendert: new Date()
    }
    
    const result = await projekteCollection.insertOne(neuesProjekt as any)
    
    return NextResponse.json({ 
      erfolg: true, 
      projektId: result.insertedId,
      projekt: { ...neuesProjekt, _id: result.insertedId }
    }, { status: 201 })
  } catch (error) {
    console.error('Fehler beim Anlegen des Projekts:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Anlegen des Projekts' },
      { status: 500 }
    )
  }
}

