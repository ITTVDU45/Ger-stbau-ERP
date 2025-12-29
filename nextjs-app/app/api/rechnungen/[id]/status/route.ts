import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { ObjectId } from 'mongodb'
import { Rechnung, Mahnung } from '@/lib/db/types'

/**
 * POST /api/rechnungen/:id/status
 * 
 * Ändert den Status einer Rechnung und aktualisiert zugehörige Mahnungen
 * 
 * Body: {
 *   status: 'bezahlt' | 'offen' | 'storniert',
 *   bezahltAm?: Date,
 *   bezahltBetrag?: number,
 *   zahlungsnotiz?: string
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()
    const { status, bezahltAm, bezahltBetrag, zahlungsnotiz } = body

    // Validierung
    if (!status || !['bezahlt', 'offen', 'storniert', 'teilweise_bezahlt'].includes(status)) {
      return NextResponse.json(
        { error: 'Ungültiger Status' },
        { status: 400 }
      )
    }

    const db = await getDatabase()
    const rechnungenCollection = db.collection<Rechnung>('rechnungen')
    const mahnungenCollection = db.collection<Mahnung>('mahnungen')

    // Rechnung abrufen
    const rechnung = await rechnungenCollection.findOne({ _id: new ObjectId(id) })
    if (!rechnung) {
      return NextResponse.json(
        { error: 'Rechnung nicht gefunden' },
        { status: 404 }
      )
    }

    const oldStatus = rechnung.status // Merke alten Status für Auto-Einnahmen-Logik

    // Update-Objekt vorbereiten
    const updateData: any = {
      status,
      zuletztGeaendert: new Date()
    }

    // Wenn Status 'bezahlt', dann Zahlungsinformationen speichern
    if (status === 'bezahlt') {
      updateData.bezahltAm = bezahltAm ? new Date(bezahltAm) : new Date()
      updateData.bezahltBetrag = bezahltBetrag || rechnung.brutto
      if (zahlungsnotiz) {
        updateData.zahlungsnotiz = zahlungsnotiz
      }
    } else if (status === 'teilweise_bezahlt') {
      updateData.bezahltBetrag = bezahltBetrag || 0
      if (zahlungsnotiz) {
        updateData.zahlungsnotiz = zahlungsnotiz
      }
    } else {
      // Bei anderen Status Zahlungsinformationen entfernen
      updateData.bezahltAm = null
      updateData.bezahltBetrag = null
      updateData.zahlungsnotiz = null
    }

    // Rechnung aktualisieren
    await rechnungenCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    )

    // Wenn Rechnung als 'bezahlt' markiert wurde, ALLE verknüpften Mahnungen auf 'settled' setzen
    if (status === 'bezahlt') {
      const mahnungen = await mahnungenCollection.find({ 
        rechnungId: id,
        status: { $nin: ['settled', 'storniert'] } // Nur aktive Mahnungen
      }).toArray()

      for (const mahnung of mahnungen) {
        await mahnungenCollection.updateOne(
          { _id: mahnung._id },
          {
            $set: {
              status: 'settled',
              zuletztGeaendert: new Date()
            },
            $push: {
              chronik: {
                aktion: 'settled_durch_zahlung',
                benutzer: 'System',
                zeitpunkt: new Date(),
                details: `Mahnung ${mahnung.mahnstufe} automatisch erledigt, da Rechnung bezahlt wurde`,
                alterStatus: mahnung.status,
                neuerStatus: 'settled'
              }
            } as any
          }
        )
      }
    }
    
    // Rückgängig machen (PAID -> OPEN): Mahnungen NICHT reaktivieren
    // Sie bleiben 'settled'. Eine neue Mahnung muss manuell erstellt + genehmigt werden

    // NEU: Automatische Einnahme erstellen wenn Rechnung auf 'bezahlt' gesetzt wird (Finanzen-Modul)
    if (status === 'bezahlt' && oldStatus !== 'bezahlt') {
      const transaktionenCollection = db.collection('transaktionen')
      
      // Prüfe ob bereits eine Einnahme existiert
      const bestehendeEinnahme = await transaktionenCollection.findOne({
        rechnungId: id,
        typ: 'einnahme'
      })
      
      if (!bestehendeEinnahme) {
        // Hole Standard-Kategorie für Projektabrechnung
        const kategorienCollection = db.collection('finanzen_kategorien')
        const standardKategorie = await kategorienCollection.findOne({
          typ: 'einnahme',
          name: 'Projektabrechnung / Rechnung'
        })
        
        // Erstelle automatische Einnahme
        const einnahme = {
          mandantId: rechnung.mandantId, // Falls vorhanden
          typ: 'einnahme',
          datum: updateData.bezahltAm || new Date(),
          betrag: rechnung.brutto,
          nettobetrag: rechnung.netto,
          mwstSatz: rechnung.mwstSatz,
          mwstBetrag: rechnung.mwstBetrag,
          kategorieId: standardKategorie?._id?.toString() || 'default',
          kategorieName: 'Projektabrechnung / Rechnung',
          beschreibung: `Automatische Einnahme aus Rechnung ${rechnung.rechnungsnummer}`,
          zahlungsart: 'ueberweisung', // Standard
          kundeId: rechnung.kundeId,
          kundeName: rechnung.kundeName,
          projektId: rechnung.projektId,
          rechnungId: id,
          rechnungsnummer: rechnung.rechnungsnummer,
          status: 'gebucht',
          istWiederkehrend: false,
          quelle: 'rechnung_automatisch',
          steuerrelevant: true,
          notizen: zahlungsnotiz || '',
          erstelltAm: new Date(),
          erstelltVon: 'System (Auto-Einnahme)',
          zuletztGeaendert: new Date()
        }
        
        const einnahmeResult = await transaktionenCollection.insertOne(einnahme)
        
        // Update Rechnung mit Transaktion-Link
        await rechnungenCollection.updateOne(
          { _id: new ObjectId(id) },
          {
            $set: {
              einnahmeTransaktionId: einnahmeResult.insertedId.toString(),
              einnahmeAutomatischErstellt: true
            }
          }
        )
      }
    }
    
    // Wenn Rechnung von 'bezahlt' zurück auf 'offen' gesetzt wird
    if (oldStatus === 'bezahlt' && status === 'offen') {
      const transaktionenCollection = db.collection('transaktionen')
      
      // Storniere automatisch erstellte Einnahme
      if (rechnung.einnahmeAutomatischErstellt && rechnung.einnahmeTransaktionId) {
        await transaktionenCollection.updateOne(
          { _id: new ObjectId(rechnung.einnahmeTransaktionId) },
          {
            $set: {
              status: 'storniert',
              notizen: `Storniert: Rechnung ${rechnung.rechnungsnummer} wurde auf 'offen' zurückgesetzt`,
              zuletztGeaendert: new Date()
            }
          }
        )
      }
    }

    // Projekt-KPIs aktualisieren (offenerBetrag neu berechnen)
    if (rechnung.projektId) {
      const projekteCollection = db.collection('projekte')
      
      // Alle Rechnungen des Projekts abrufen
      const projektRechnungen = await rechnungenCollection.find({ 
        projektId: rechnung.projektId 
      }).toArray()

      // Offenen Betrag berechnen
      const offenerBetrag = projektRechnungen.reduce((sum, r) => {
        if (r.status === 'bezahlt') return sum
        if (r.status === 'teilweise_bezahlt' && r.bezahltBetrag) {
          return sum + (r.brutto - r.bezahltBetrag)
        }
        return sum + r.brutto
      }, 0)

      // Bereits abgerechneten Betrag berechnen
      const bereitsAbgerechnet = projektRechnungen.reduce((sum, r) => {
        return sum + (r.brutto || 0)
      }, 0)

      await projekteCollection.updateOne(
        { _id: new ObjectId(rechnung.projektId) },
        { 
          $set: { 
            offenerBetrag,
            bereitsAbgerechnet,
            zuletztGeaendert: new Date()
          }
        }
      )
    }

    // Aktualisierte Rechnung abrufen
    const updatedRechnung = await rechnungenCollection.findOne({ _id: new ObjectId(id) })

    return NextResponse.json({
      success: true,
      rechnung: updatedRechnung
    })

  } catch (error) {
    console.error('Fehler beim Aktualisieren des Rechnungsstatus:', error)
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}

