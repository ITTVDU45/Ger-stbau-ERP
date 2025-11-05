import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { CompanySettings } from '@/lib/db/types'

// GET - Template-Konfigurationen abrufen
export async function GET(request: NextRequest) {
  try {
    const db = await getDatabase()
    const settingsCollection = db.collection<CompanySettings>('company_settings')
    
    const settings = await settingsCollection.findOne({ aktiv: true })
    
    if (!settings) {
      return NextResponse.json({
        erfolg: true,
        templates: {
          offer: 'modern',
          invoice: 'modern'
        },
        config: {}
      })
    }
    
    return NextResponse.json({
      erfolg: true,
      templates: {
        offer: settings.offerTemplate,
        invoice: settings.invoiceTemplate
      },
      config: settings.templateConfig || {}
    })
  } catch (error) {
    console.error('Fehler beim Abrufen der Templates:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Abrufen der Templates' },
      { status: 500 }
    )
  }
}

// POST - Template-Auswahl speichern
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { offerTemplate, invoiceTemplate, templateConfig } = body
    
    if (!offerTemplate && !invoiceTemplate && !templateConfig) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Keine Template-Daten zum Speichern' },
        { status: 400 }
      )
    }

    const db = await getDatabase()
    const settingsCollection = db.collection<CompanySettings>('company_settings')

    const updateData: Partial<CompanySettings> = {
      zuletztGeaendert: new Date()
    }

    if (offerTemplate) {
      if (!['modern', 'klassisch', 'kompakt'].includes(offerTemplate)) {
        return NextResponse.json(
          { erfolg: false, fehler: 'Ungültiges Angebots-Template' },
          { status: 400 }
        )
      }
      updateData.offerTemplate = offerTemplate
    }

    if (invoiceTemplate) {
      if (!['modern', 'klassisch', 'kompakt'].includes(invoiceTemplate)) {
        return NextResponse.json(
          { erfolg: false, fehler: 'Ungültiges Rechnungs-Template' },
          { status: 400 }
        )
      }
      updateData.invoiceTemplate = invoiceTemplate
    }

    if (templateConfig) {
      updateData.templateConfig = templateConfig
    }

    const result = await settingsCollection.updateOne(
      { aktiv: true },
      { $set: updateData },
      { upsert: false }
    )

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Keine aktiven Einstellungen gefunden' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      erfolg: true,
      nachricht: 'Template-Einstellungen erfolgreich gespeichert'
    })
  } catch (error) {
    console.error('Fehler beim Speichern der Templates:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'Fehler beim Speichern der Templates' },
      { status: 500 }
    )
  }
}

