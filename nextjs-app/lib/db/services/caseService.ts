import { getDatabase } from '../client'
import { Fall, Mandant, Schaden, Partei, Vollmacht, VermitteltVon } from '../types'
import { notifyFallBearbeitet, notifyStatusChanged, notifyFallErstellt } from './notificationService'

export interface CaseFilters {
  id?: string
  name?: string
  kunde?: string
  status?: string
  von?: string // yyyy-mm-dd
  bis?: string // yyyy-mm-dd
  fahrzeugart?: string
  standort?: string
  gutachter?: string
}

// Server-only imports
let ObjectId: any
if (typeof window === 'undefined') {
  ObjectId = require('mongodb').ObjectId
}

export async function getCases(filters?: CaseFilters): Promise<{ erfolg: boolean; faelle: Fall[]; total?: number }> {
  try {
    const db = await getDatabase()
    const collection = db.collection<Fall>('faelle')

    const query: any = {}

    if (filters?.id) {
      query._id = new ObjectId(filters.id)
    }

    if (filters?.name) {
      query.fallname = { $regex: filters.name, $options: 'i' }
    }

    if (filters?.kunde) {
      query['mandant.vorname'] = { $regex: filters.kunde, $options: 'i' }
      query['mandant.nachname'] = { $regex: filters.kunde, $options: 'i' }
    }

    if (filters?.status) {
      query.status = filters.status
    }

    if (filters?.fahrzeugart) {
      query.fahrzeugart = filters.fahrzeugart
    }

    if (filters?.standort) {
      query.standort = { $regex: filters.standort, $options: 'i' }
    }

    if (filters?.gutachter) {
      query.zugewiesenAn = filters.gutachter
    }

    if (filters?.von || filters?.bis) {
      query.erstelltAm = {}
      if (filters.von) {
        query.erstelltAm.$gte = new Date(filters.von)
      }
      if (filters.bis) {
        query.erstelltAm.$lte = new Date(filters.bis)
      }
    }

    const faelle = await collection.find(query).sort({ erstelltAm: -1 }).toArray()

    return { erfolg: true, faelle, total: faelle.length }
  } catch (error) {
    console.error('Error fetching cases:', error)
    return { erfolg: false, faelle: [] }
  }
}

export async function getCaseById(id: string): Promise<{ erfolg: boolean; fall?: Fall }> {
  try {
    const db = await getDatabase()
    const collection = db.collection<Fall>('faelle')

    const fall = await collection.findOne({ _id: new ObjectId(id) })

    if (!fall) {
      return { erfolg: false }
    }

    return { erfolg: true, fall }
  } catch (error) {
    console.error('Error fetching case by ID:', error)
    return { erfolg: false }
  }
}

export async function createCase(payload: Partial<Fall>): Promise<{ erfolg: boolean; fallId?: string; fall?: Fall }> {
  try {
    const db = await getDatabase()
    const collection = db.collection<Fall>('faelle')

    const now = new Date()
    const newCase: Omit<Fall, '_id'> = {
      fallname: payload.fallname || 'Neuer Fall',
      status: payload.status || 'offen',
      mandant: payload.mandant || {
        vorname: '',
        nachname: '',
        telefon: '',
        email: '',
        geburtsdatum: '',
        adresse: '',
        nummer: ''
      },
      schaden: payload.schaden || {
        schadenstyp: '',
        schadensschwere: '',
        unfallort: '',
        unfallzeit: '',
        beschreibung: ''
      },
      erstPartei: payload.erstPartei || {
        vorname: '',
        nachname: '',
        beteiligungsposition: ''
      },
      zweitPartei: payload.zweitPartei || {
        vorname: '',
        nachname: '',
        beteiligungsposition: ''
      },
      vollmacht: payload.vollmacht || {
        dokument: '',
        unterschrieben: false
      },
      vermitteltVon: payload.vermitteltVon || {
        vorname: '',
        nachname: '',
        unternehmen: ''
      },
      fahrzeugart: payload.fahrzeugart || 'pkw',
      standort: payload.standort || '',
      betrag: payload.betrag,
      erstelltAm: now,
      zuletztGeaendert: now,
      
      // ✅ WICHTIG: User-Tracking-Felder
      erstelltVon: payload.erstelltVon || 'system',
      erstelltVonRolle: payload.erstelltVonRolle || 'admin',
      zugewiesenAn: payload.zugewiesenAn,
      
      // ✅ Sichtbarkeits-Flags
      sichtbarFuerAdmin: true,
      sichtbarFuerGutachter: !!payload.zugewiesenAn,
      
      aufgaben: payload.aufgaben || [],
      dokumente: payload.dokumente || [],
      vermittlungen: payload.vermittlungen || [],
      abrechnungen: payload.abrechnungen || [],
      notizen: payload.notizen
    }

    const result = await collection.insertOne(newCase)

    const fallId = result.insertedId.toString()

    // ✅ Benachrichtigung erstellen: Gutachter erstellt Fall → Admin benachrichtigen
    if (newCase.erstelltVonRolle === 'gutachter' && newCase.erstelltVon) {
      await notifyFallErstellt(
        fallId,
        newCase.fallname,
        newCase.erstelltVon,
        'admin-1' // TODO: Echten Admin aus DB holen
      )
    }

    return {
      erfolg: true,
      fallId,
      fall: { _id: fallId, ...newCase }
    }
  } catch (error) {
    console.error('Error creating case:', error)
    return { erfolg: false }
  }
}

export async function updateCase(
  id: string,
  payload: Partial<Fall>,
  updatedBy?: string,
  updaterRole?: 'admin' | 'gutachter'
): Promise<{ erfolg: boolean; fall?: Fall }> {
  try {
    const db = await getDatabase()
    const collection = db.collection<Fall>('faelle')

    // Hole den alten Fall für Vergleich (z.B. Status-Änderung)
    const oldFall = await collection.findOne({ _id: new ObjectId(id) })
    if (!oldFall) {
      return { erfolg: false }
    }

    const updateData = {
      ...payload,
      zuletztGeaendert: new Date()
    }

    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateData },
      { returnDocument: 'after' }
    )
    
    // In MongoDB Node Driver 6+, findOneAndUpdate gibt direkt das Dokument zurück, nicht { value: ... }
    const updatedFall = result
    
    if (!updatedFall) {
      return { erfolg: false }
    }

    // ✅ Benachrichtigungen erstellen (non-blocking mit Timeout)
    try {
      // 1. Status-Änderung erkannt?
      if (payload.status && payload.status !== oldFall.status) {
        // Admin ändert Status → Gutachter benachrichtigen
        if (updaterRole === 'admin' && oldFall.zugewiesenAn && updatedBy) {
          await Promise.race([
            notifyStatusChanged(
              id,
              oldFall.fallname,
              oldFall.status,
              payload.status,
              oldFall.zugewiesenAn,
              'gutachter',
              updatedBy,
              'admin'
            ),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Notification timeout')), 3000))
          ])
        }
        // Gutachter ändert Status → Admin benachrichtigen
        else if (updaterRole === 'gutachter' && updatedBy) {
          await Promise.race([
            notifyStatusChanged(
              id,
              oldFall.fallname,
              oldFall.status,
              payload.status,
              'admin-1', // TODO: Echten Admin aus DB
              'admin',
              updatedBy,
              'gutachter'
            ),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Notification timeout')), 3000))
          ])
        }
      }

      // 2. Allgemeine Bearbeitung → Benachrichtigungen senden
      const changedFields = Object.keys(payload).filter(key => key !== 'zuletztGeaendert' && key !== 'status')
      
      if (changedFields.length > 0) {
        // Admin bearbeitet Fall → Gutachter benachrichtigen
        if (updaterRole === 'admin' && oldFall.zugewiesenAn && updatedBy) {
          await Promise.race([
            notifyFallBearbeitet(
              id,
              oldFall.fallname,
              oldFall.zugewiesenAn,
              updatedBy,
              `Admin hat ${changedFields.length} Feld(er) bearbeitet`
            ),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Notification timeout')), 3000))
          ])
        }
        // Gutachter bearbeitet Fall → Admin benachrichtigen
        else if (updaterRole === 'gutachter' && updatedBy) {
          await Promise.race([
            notifyFallBearbeitet(
              id,
              oldFall.fallname,
              'admin-1', // TODO: Echten Admin aus DB
              updatedBy,
              `Gutachter hat ${changedFields.length} Feld(er) bearbeitet`
            ),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Notification timeout')), 3000))
          ])
        }
      }
    } catch (notifyError) {
      // Benachrichtigungsfehler sollen den Update nicht blockieren
      console.error('Benachrichtigungsfehler (ignoriert):', notifyError)
    }

    return { erfolg: true, fall: updatedFall }
  } catch (error) {
    console.error('Error updating case:', error)
    return { erfolg: false }
  }
}

export async function deleteCase(id: string): Promise<{ erfolg: boolean }> {
  try {
    const db = await getDatabase()
    const collection = db.collection<Fall>('faelle')

    const result = await collection.deleteOne({ _id: new ObjectId(id) })

    return { erfolg: result.deletedCount > 0 }
  } catch (error) {
    console.error('Error deleting case:', error)
    return { erfolg: false }
  }
}

// Dashboard-spezifische Queries
export async function getDashboardStats(gutachterId?: string): Promise<{
  erfolg: boolean;
  stats?: {
    aktiveFaelle: number;
    abgeschlosseneFaelle: number;
    offeneAufgaben: number;
    gesamtfFaelle: number;
    gutachterSumme: number;
    abrechnungAktiv: number;
    vermittlungen: number;
  }
}> {
  try {
    const db = await getDatabase()
    const collection = db.collection<Fall>('faelle')

    const matchStage: any = {}
    if (gutachterId) {
      matchStage.zugewiesenAn = gutachterId
    }

    const pipeline = [
      { $match: matchStage },
      {
        $facet: {
          aktiveFaelle: [
            { $match: { status: { $in: ['offen', 'in_bearbeitung'] } } },
            { $count: 'count' }
          ],
          abgeschlosseneFaelle: [
            { $match: { status: 'abgeschlossen' } },
            { $count: 'count' }
          ],
          gesamtfFaelle: [
            { $count: 'count' }
          ],
          offeneAufgaben: [
            { $unwind: '$aufgaben' },
            { $match: { 'aufgaben.status': { $in: ['offen', 'in_bearbeitung'] } } },
            { $count: 'count' }
          ],
          gutachterSumme: [
            { $match: { status: 'abgeschlossen' } },
            { $group: { _id: null, total: { $sum: '$betrag' } } }
          ],
          abrechnungAktiv: [
            { $unwind: '$abrechnungen' },
            { $match: { 'abrechnungen.status': { $in: ['offen', 'bezahlt'] } } },
            { $group: { _id: null, total: { $sum: '$abrechnungen.betrag' } } }
          ],
          vermittlungen: [
            { $count: 'count' }
          ]
        }
      }
    ]

    const result = await collection.aggregate(pipeline).toArray()

    if (result.length === 0) {
      return { erfolg: false }
    }

    const facet = result[0]

    const stats = {
      aktiveFaelle: facet.aktiveFaelle[0]?.count || 0,
      abgeschlosseneFaelle: facet.abgeschlosseneFaelle[0]?.count || 0,
      gesamtfFaelle: facet.gesamtfFaelle[0]?.count || 0,
      offeneAufgaben: facet.offeneAufgaben[0]?.count || 0,
      gutachterSumme: facet.gutachterSumme[0]?.total || 0,
      abrechnungAktiv: facet.abrechnungAktiv[0]?.total || 0,
      vermittlungen: facet.vermittlungen[0]?.count || 0
    }

    return { erfolg: true, stats }
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return { erfolg: false }
  }
}
