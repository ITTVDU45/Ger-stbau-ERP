import { getDatabase } from '@/lib/db/client'
import { Kunde } from '@/lib/db/types'
import { ObjectId } from 'mongodb'

export class KundeService {
  /**
   * Alle Kunden abrufen
   */
  static async getAll(nurAktive: boolean = false): Promise<Kunde[]> {
    const db = await getDatabase()
    const filter = nurAktive ? { aktiv: true } : {}
    
    const kunden = await db.collection<Kunde>('kunden')
      .find(filter)
      .sort({ firma: 1, nachname: 1 })
      .toArray()
    
    return kunden
  }

  /**
   * Einzelnen Kunden mit KPIs abrufen
   */
  static async getById(id: string): Promise<Kunde | null> {
    const db = await getDatabase()
    const kunde = await db.collection<Kunde>('kunden')
      .findOne({ _id: new ObjectId(id) })
    
    if (!kunde) return null

    // KPIs berechnen
    const kpis = await this.berechneKPIs(id)
    
    return {
      ...kunde,
      ...kpis
    }
  }

  /**
   * Nur aktive Kunden
   */
  static async getAktive(): Promise<Kunde[]> {
    return await this.getAll(true)
  }

  /**
   * Neuen Kunden anlegen
   */
  static async create(data: Omit<Kunde, '_id' | 'erstelltAm' | 'zuletztGeaendert' | 'kundennummer'>): Promise<string> {
    const db = await getDatabase()
    
    // Kundennummer generieren (wird in API-Route gemacht)
    const result = await db.collection<Kunde>('kunden').insertOne({
      ...data,
      umsatzGesamt: 0,
      offenePosten: 0,
      anzahlProjekte: 0,
      anzahlAngebote: 0,
      anzahlRechnungen: 0,
      erstelltAm: new Date(),
      zuletztGeaendert: new Date()
    } as any)
    
    return result.insertedId.toString()
  }

  /**
   * Kunde aktualisieren
   */
  static async update(id: string, data: Partial<Kunde>): Promise<boolean> {
    const db = await getDatabase()
    const { _id, ...updateData } = data as any
    
    const result = await db.collection<Kunde>('kunden').updateOne(
      { _id: new ObjectId(id) },
      { $set: { ...updateData, zuletztGeaendert: new Date() } }
    )
    
    return result.matchedCount > 0
  }

  /**
   * Kunde deaktivieren (nicht löschen)
   */
  static async deaktivieren(id: string): Promise<boolean> {
    const db = await getDatabase()
    
    // Aktuellen Status abrufen und umkehren
    const kunde = await db.collection('kunden').findOne({ _id: new ObjectId(id) })
    if (!kunde) return false

    const neuerStatus = !kunde.aktiv
    
    const result = await db.collection('kunden').updateOne(
      { _id: new ObjectId(id) },
      { $set: { aktiv: neuerStatus, zuletztGeaendert: new Date() } }
    )
    
    return result.matchedCount > 0
  }

  /**
   * Kunde löschen
   */
  static async delete(id: string): Promise<boolean> {
    const db = await getDatabase()
    
    // Prüfen ob Kunde Projekte/Rechnungen/Angebote hat
    const projekte = await db.collection('projekte').countDocuments({ kundeId: id })
    const rechnungen = await db.collection('rechnungen').countDocuments({ kundeId: id })
    const angebote = await db.collection('angebote').countDocuments({ kundeId: id })
    
    if (projekte > 0 || rechnungen > 0 || angebote > 0) {
      throw new Error('Kunde hat zugeordnete Daten und kann nicht gelöscht werden')
    }
    
    const result = await db.collection('kunden').deleteOne({ _id: new ObjectId(id) })
    return result.deletedCount > 0
  }

  /**
   * KPIs für einen Kunden berechnen
   */
  static async berechneKPIs(kundeId: string): Promise<{
    anzahlProjekte: number
    anzahlAngebote: number
    anzahlRechnungen: number
    umsatzGesamt: number
    offenePosten: number
  }> {
    const db = await getDatabase()

    // Anzahlen
    const anzahlProjekte = await db.collection('projekte').countDocuments({ kundeId })
    const anzahlAngebote = await db.collection('angebote').countDocuments({ kundeId })
    const anzahlRechnungen = await db.collection('rechnungen').countDocuments({ kundeId })

    // Umsatz (bezahlte Rechnungen)
    const umsatzAgg = await db.collection('rechnungen').aggregate([
      { $match: { kundeId, status: 'bezahlt' } },
      { $group: { _id: null, total: { $sum: '$brutto' } } }
    ]).toArray()

    // Offene Posten
    const offenePostenAgg = await db.collection('rechnungen').aggregate([
      { $match: { kundeId, status: { $in: ['gesendet', 'ueberfaellig', 'teilbezahlt'] } } },
      { $group: { _id: null, total: { $sum: '$brutto' } } }
    ]).toArray()

    return {
      anzahlProjekte,
      anzahlAngebote,
      anzahlRechnungen,
      umsatzGesamt: umsatzAgg[0]?.total || 0,
      offenePosten: offenePostenAgg[0]?.total || 0
    }
  }

  /**
   * Umsatz-Verlauf eines Kunden (monatlich)
   */
  static async getUmsatzVerlauf(kundeId: string, monate: number = 12): Promise<any[]> {
    const db = await getDatabase()
    
    const vorMonaten = new Date()
    vorMonaten.setMonth(vorMonaten.getMonth() - monate)
    
    const umsatzVerlauf = await db.collection('rechnungen').aggregate([
      {
        $match: {
          kundeId,
          status: 'bezahlt',
          bezahltAm: { $gte: vorMonaten }
        }
      },
      {
        $group: {
          _id: {
            jahr: { $year: '$bezahltAm' },
            monat: { $month: '$bezahltAm' }
          },
          umsatz: { $sum: '$brutto' },
          anzahl: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.jahr': 1, '_id.monat': 1 }
      }
    ]).toArray()

    return umsatzVerlauf
  }

  /**
   * Alle Kunden mit berechneten KPIs
   */
  static async getAllMitKPIs(): Promise<Kunde[]> {
    const kunden = await this.getAll()
    
    // Für große Kundenzahl würde man hier Batch-Processing machen
    const kundenMitKPIs = await Promise.all(
      kunden.map(async (k) => {
        const kpis = await this.berechneKPIs(k._id!.toString())
        return { ...k, ...kpis }
      })
    )
    
    return kundenMitKPIs
  }
}

