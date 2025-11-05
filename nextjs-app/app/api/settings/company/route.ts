import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { CompanySettings } from '@/lib/db/types'
import { z } from 'zod'

// Validierungs-Schema für CompanySettings (alle Felder optional für schrittweises Ausfüllen)
const CompanySettingsSchema = z.object({
  firmenname: z.string().optional(),
  strasse: z.string().optional(),
  plz: z.string().optional(),
  ort: z.string().optional(),
  land: z.string().optional(),
  telefon: z.string().optional(),
  email: z.union([
    z.string().email('Ungültige E-Mail-Adresse'),
    z.literal(''),
    z.undefined()
  ]).optional(),
  website: z.union([
    z.string().url('Ungültige Website-URL'),
    z.literal(''),
    z.undefined()
  ]).optional(),
  steuernummer: z.string().optional(),
  ustId: z.string().optional(),
  geschaeftsfuehrer: z.string().optional(),
  handelsregister: z.string().optional(),
  amtsgericht: z.string().optional(),
  footerText: z.string().optional(),
  
  logoUrl: z.string().optional(),
  logoObjectName: z.string().optional(),
  logoSecondaryUrl: z.string().optional(),
  logoSecondaryObjectName: z.string().optional(),
  zertifikate: z.array(z.object({
    _id: z.string().optional(),
    name: z.string(),
    url: z.string(),
    objectName: z.string(),
    typ: z.string(),
    hochgeladenAm: z.date().or(z.string())
  })).optional(),
  
  bankname: z.string().optional(),
  iban: z.union([
    z.string().regex(/^[A-Z]{2}\d{2}[A-Z0-9]+$/, 'Ungültige IBAN'),
    z.literal(''),
    z.undefined()
  ]).optional(),
  bic: z.union([
    z.string().regex(/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/, 'Ungültiger BIC'),
    z.literal(''),
    z.undefined()
  ]).optional(),
  zahlungsziel: z.number().int().nonnegative().optional(),
  verwendungszweck: z.string().optional(),
  istStandardKonto: z.boolean().optional().default(false),
  skontoTage: z.number().int().nonnegative().optional(),
  skontoProzent: z.number().nonnegative().max(100).optional(),
  
  offerTemplate: z.enum(['modern', 'klassisch', 'kompakt']).optional().default('modern'),
  invoiceTemplate: z.enum(['modern', 'klassisch', 'kompakt']).optional().default('modern'),
  
  templateConfig: z.object({
    primaryColor: z.string().optional(),
    fontSize: z.enum(['small', 'medium', 'large']).optional(),
    logoPosition: z.enum(['left', 'center', 'right']).optional(),
    headerHeight: z.number().optional(),
    footerHeight: z.number().optional()
  }).optional(),
  
  aktiv: z.boolean().optional().default(true)
})

// GET - Firmeneinstellungen abrufen
export async function GET(request: NextRequest) {
  try {
    const db = await getDatabase()
    const settingsCollection = db.collection<CompanySettings>('company_settings')
    
    // Es gibt nur einen aktiven Eintrag
    const settings = await settingsCollection.findOne({ aktiv: true })
    
    if (!settings) {
      return NextResponse.json({ 
        erfolg: true, 
        settings: null,
        nachricht: 'Keine Einstellungen gefunden' 
      })
    }
    
    return NextResponse.json({ erfolg: true, settings })
  } catch (error) {
    console.error('Fehler beim Abrufen der Einstellungen:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Abrufen der Einstellungen' },
      { status: 500 }
    )
  }
}

// POST - Firmeneinstellungen speichern/aktualisieren
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validierung
    const validationResult = CompanySettingsSchema.safeParse(body)
    
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
    const settingsCollection = db.collection<CompanySettings>('company_settings')

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
        nachricht: 'Einstellungen erfolgreich aktualisiert' 
      })
    } else {
      // Create
      const newSettings: CompanySettings = {
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
        nachricht: 'Einstellungen erfolgreich erstellt' 
      }, { status: 201 })
    }
  } catch (error) {
    console.error('Fehler beim Speichern der Einstellungen:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Speichern der Einstellungen' },
      { status: 500 }
    )
  }
}

