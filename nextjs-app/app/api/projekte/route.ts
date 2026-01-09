import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { Projekt } from '@/lib/db/types'
import { ObjectId } from 'mongodb'

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
    
    const neuesProjekt: Projekt = {
      ...body,
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

