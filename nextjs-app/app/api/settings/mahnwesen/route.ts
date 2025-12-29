import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { MahnwesenSettings } from '@/lib/db/types'
import { z } from 'zod'

// Validierungs-Schema für MahnwesenSettings
const MahnwesenSettingsSchema = z.object({
  mahngebuehrenStufe1: z.number().nonnegative('Mahngebühren müssen positiv sein'),
  mahngebuehrenStufe2: z.number().nonnegative('Mahngebühren müssen positiv sein'),
  mahngebuehrenStufe3: z.number().nonnegative('Mahngebühren müssen positiv sein'),
  
  zahlungsfristStufe1: z.number().int().positive('Zahlungsfrist muss mindestens 1 Tag sein'),
  zahlungsfristStufe2: z.number().int().positive('Zahlungsfrist muss mindestens 1 Tag sein'),
  zahlungsfristStufe3: z.number().int().positive('Zahlungsfrist muss mindestens 1 Tag sein'),
  
  verzugszinssatz: z.number().nonnegative().optional(),
  
  standardTextStufe1: z.string().optional(),
  standardTextStufe2: z.string().optional(),
  standardTextStufe3: z.string().optional(),
  
  aktiv: z.boolean().optional().default(true)
})

// GET - Mahnwesen-Einstellungen abrufen
export async function GET(request: NextRequest) {
  try {
    const db = await getDatabase()
    const settingsCollection = db.collection<MahnwesenSettings>('mahnwesen_settings')
    
    // Es gibt nur einen aktiven Eintrag
    const settings = await settingsCollection.findOne({ aktiv: true })
    
    if (!settings) {
      return NextResponse.json({ 
        erfolg: true, 
        settings: null,
        nachricht: 'Keine Mahnwesen-Einstellungen gefunden' 
      })
    }
    
    return NextResponse.json({ erfolg: true, settings })
  } catch (error) {
    console.error('Fehler beim Abrufen der Mahnwesen-Einstellungen:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Abrufen der Mahnwesen-Einstellungen' },
      { status: 500 }
    )
  }
}

// POST - Mahnwesen-Einstellungen speichern/aktualisieren
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validierung
    const validationResult = MahnwesenSettingsSchema.safeParse(body)
    
    if (!validationResult.success) {
      console.error('Validierungsfehler:', validationResult.error.flatten().fieldErrors)
      return NextResponse.json(
        { 
          erfolg: false, 
          fehler: 'Validierungsfehler', 
          details: validationResult.error.flatten().fieldErrors 
        },
        { status: 400 }
      )
    }

    const db = await getDatabase()
    const settingsCollection = db.collection<MahnwesenSettings>('mahnwesen_settings')

    // Prüfen ob bereits Einstellungen existieren
    const existingSettings = await settingsCollection.findOne({ aktiv: true })

    const now = new Date()
    
    if (existingSettings) {
      // Update
      const updateData = {
        ...validationResult.data,
        zuletztGeaendert: now,
        geaendertVon: body.geaendertVon || 'system'
      }
      
      await settingsCollection.updateOne(
        { _id: existingSettings._id },
        { $set: updateData }
      )
      
      const updatedSettings = await settingsCollection.findOne({ _id: existingSettings._id })
      
      return NextResponse.json({ 
        erfolg: true, 
        settings: updatedSettings,
        nachricht: 'Mahnwesen-Einstellungen erfolgreich aktualisiert' 
      })
    } else {
      // Create
      const newSettings: MahnwesenSettings = {
        ...validationResult.data,
        aktiv: true,
        erstelltAm: now,
        zuletztGeaendert: now,
        geaendertVon: body.geaendertVon || 'system'
      }
      
      const result = await settingsCollection.insertOne(newSettings as any)
      
      const createdSettings = await settingsCollection.findOne({ _id: result.insertedId })
      
      return NextResponse.json({ 
        erfolg: true, 
        settings: createdSettings,
        nachricht: 'Mahnwesen-Einstellungen erfolgreich erstellt' 
      }, { status: 201 })
    }
  } catch (error) {
    console.error('Fehler beim Speichern der Mahnwesen-Einstellungen:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Speichern der Mahnwesen-Einstellungen' },
      { status: 500 }
    )
  }
}

