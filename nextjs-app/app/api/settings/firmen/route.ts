import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/session'
import { getDatabase } from '@/lib/db/client'
import { FirmenEinstellungen, UserRole } from '@/lib/db/types'
import { requireRole } from '@/lib/auth/rbac'

// GET - Firmeneinstellungen abrufen
export async function GET() {
  try {
    await requireAuth()
    
    const db = await getDatabase()
    const einstellungenCollection = db.collection<FirmenEinstellungen>('firmen_einstellungen')
    
    // Hole die aktuelle Einstellung (es sollte nur eine geben)
    let einstellungen = await einstellungenCollection.findOne({})
    
    // Falls keine Einstellungen existieren, erstelle Standardwerte
    if (!einstellungen) {
      const standardEinstellungen: FirmenEinstellungen = {
        firmenname: 'Gerüstbau A+',
        supportEmail: 'info@geruestbau-aplus.de',
        supportPhone: '+49 123 456789',
        imprintUrl: '/impressum',
        privacyUrl: '/datenschutz',
        erstelltAm: new Date(),
        zuletztGeaendert: new Date()
      }
      
      await einstellungenCollection.insertOne(standardEinstellungen)
      einstellungen = standardEinstellungen
    }
    
    return NextResponse.json({
      erfolg: true,
      einstellungen
    })
  } catch (error: any) {
    console.error('Fehler beim Abrufen der Firmeneinstellungen:', error)
    return NextResponse.json(
      { erfolg: false, fehler: error.message || 'Fehler beim Abrufen der Einstellungen' },
      { status: 500 }
    )
  }
}

// PUT - Firmeneinstellungen aktualisieren
export async function PUT(request: NextRequest) {
  try {
    // Nur SUPERADMIN und ADMIN dürfen Firmeneinstellungen ändern
    await requireRole([UserRole.SUPERADMIN, UserRole.ADMIN])
    
    const body = await request.json()
    const { firmenname, supportEmail, supportPhone, imprintUrl, privacyUrl } = body
    
    // Validierung
    if (!firmenname || !supportEmail) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Firmenname und Support-E-Mail sind erforderlich' },
        { status: 400 }
      )
    }
    
    const db = await getDatabase()
    const einstellungenCollection = db.collection<FirmenEinstellungen>('firmen_einstellungen')
    
    // Prüfe ob Einstellungen existieren
    const existingSettings = await einstellungenCollection.findOne({})
    
    const updateData = {
      firmenname,
      supportEmail,
      supportPhone: supportPhone || '',
      imprintUrl: imprintUrl || '/impressum',
      privacyUrl: privacyUrl || '/datenschutz',
      zuletztGeaendert: new Date()
    }
    
    if (existingSettings) {
      // Update
      await einstellungenCollection.updateOne(
        { _id: existingSettings._id },
        { $set: updateData }
      )
    } else {
      // Insert
      await einstellungenCollection.insertOne({
        ...updateData,
        erstelltAm: new Date()
      } as FirmenEinstellungen)
    }
    
    return NextResponse.json({
      erfolg: true,
      nachricht: 'Firmeneinstellungen erfolgreich gespeichert'
    })
  } catch (error: any) {
    console.error('Fehler beim Speichern der Firmeneinstellungen:', error)
    return NextResponse.json(
      { erfolg: false, fehler: error.message || 'Fehler beim Speichern der Einstellungen' },
      { status: 500 }
    )
  }
}

