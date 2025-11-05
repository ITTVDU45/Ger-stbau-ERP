import { NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth/getUserFromRequest'
import { getDatabase } from '@/lib/db/client'
import { debug } from '@/lib/utils/debug'

// GET: Alle Nutzer abrufen
export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request)

    debug.log('[Admin Nutzer API] User:', user)

    if (!user || user.rolle !== 'admin') {
      return NextResponse.json(
        { erfolg: false, nachricht: 'Unauthorized - Nur für Admins' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const rolle = searchParams.get('rolle') || 'alle'
    const status = searchParams.get('status') || 'alle'

    const db = await getDatabase()
    const usersCollection = db.collection('users')
    const faelleCollection = db.collection('faelle')

    // Query bauen
    const query: any = {}
    
    if (rolle !== 'alle') {
      query.rolle = rolle.toLowerCase()
    }

    if (status !== 'alle') {
      query.aktiv = status === 'aktiv'
    }

    debug.log('[Admin Nutzer API] Query:', query)

    // Alle Nutzer abrufen
    const alleNutzer = await usersCollection
      .find(query)
      .sort({ erstelltAm: -1 })
      .toArray()

    debug.log('[Admin Nutzer API] Gefundene Nutzer:', alleNutzer.length)

    // Für jeden Nutzer die zugewiesenen Fälle zählen
    const nutzerMitFaellen = await Promise.all(
      alleNutzer.map(async (nutzer) => {
        // Zähle zugewiesene Fälle
        const fallCount = await faelleCollection.countDocuments({
          $or: [
            { zugewiesenAn: nutzer._id },
            { erstelltVon: nutzer._id }
          ]
        })

        // Konvertiere _id zu String für konsistente Verwendung
        const userId = typeof nutzer._id === 'object' ? nutzer._id.toString() : nutzer._id

        return {
          _id: userId,
          id: userId,
          vorname: nutzer.vorname || '',
          nachname: nutzer.nachname || '',
          name: `${nutzer.vorname || ''} ${nutzer.nachname || ''}`.trim() || 'Unbekannt',
          email: nutzer.email || '',
          rolle: nutzer.rolle || 'gutachter',
          aktiv: nutzer.aktiv !== undefined ? nutzer.aktiv : true,
          status: nutzer.aktiv ? 'aktiv' : 'inaktiv',
          verifiziert: nutzer.verifiziert || false,
          gutachterNummer: nutzer.gutachterNummer || '',
          erstelltAm: nutzer.erstelltAm,
          letzterLogin: nutzer.letzterLogin || nutzer.erstelltAm,
          fallCount,
          // Gutachter-spezifische Felder
          firma: nutzer.firma || '',
          adresse: nutzer.adresse || {},
          telefon: nutzer.telefon || '',
          profilbildUrl: nutzer.profilbildUrl || '',
          dienste: nutzer.dienste || [],
          spezielleExpertise: nutzer.spezielleExpertise || '',
          anfahrtsradius: nutzer.anfahrtsradius || 0,
          socialMedia: nutzer.socialMedia || {},
          oeffnungszeiten: nutzer.oeffnungszeiten || [],
          termineNachVereinbarung: nutzer.termineNachVereinbarung || false
        }
      })
    )

    return NextResponse.json({
      erfolg: true,
      nutzer: nutzerMitFaellen,
      total: nutzerMitFaellen.length
    })

  } catch (error: any) {
    debug.error('[api/admin/nutzer GET] Error:', error)
    return NextResponse.json(
      { erfolg: false, nachricht: error.message || 'Interner Server-Fehler' },
      { status: 500 }
    )
  }
}

// PUT: Nutzer aktualisieren (Status, Rolle, Verifizierung)
export async function PUT(request: Request) {
  try {
    const user = await getUserFromRequest(request)

    debug.log('[Admin Nutzer API PUT] User:', user)

    if (!user || user.rolle !== 'admin') {
      debug.error('[Admin Nutzer API PUT] Unauthorized:', user?.rolle)
      return NextResponse.json(
        { erfolg: false, nachricht: 'Unauthorized - Nur für Admins' },
        { status: 401 }
      )
    }

    const body = await request.json()
    debug.log('[Admin Nutzer API PUT] Body:', body)
    
    const { nutzerId, updates } = body

    if (!nutzerId || !updates) {
      debug.error('[Admin Nutzer API PUT] Fehlende Parameter:', { nutzerId, updates })
      return NextResponse.json(
        { erfolg: false, nachricht: 'Fehlende Parameter (nutzerId oder updates)' },
        { status: 400 }
      )
    }

    const db = await getDatabase()
    const usersCollection = db.collection('users')
    const { ObjectId } = require('mongodb')

    debug.log('[Admin Nutzer API PUT] Updating user:', nutzerId)

    // Versuche zuerst mit dem String-ID (wie gespeichert)
    let result = await usersCollection.updateOne(
      { _id: nutzerId },
      {
        $set: {
          ...updates,
          zuletztGeaendert: new Date()
        }
      }
    )

    // Falls nicht gefunden, versuche mit ObjectId
    if (result.matchedCount === 0) {
      try {
        const objectId = new ObjectId(nutzerId)
        result = await usersCollection.updateOne(
          { _id: objectId },
          {
            $set: {
              ...updates,
              zuletztGeaendert: new Date()
            }
          }
        )
        debug.log('[Admin Nutzer API PUT] Tried ObjectId, result:', {
          matched: result.matchedCount,
          modified: result.modifiedCount
        })
      } catch (err) {
        debug.warn('[Admin Nutzer API PUT] Could not convert to ObjectId:', err)
      }
    }

    debug.log('[Admin Nutzer API PUT] Update result:', {
      matched: result.matchedCount,
      modified: result.modifiedCount
    })

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { erfolg: false, nachricht: 'Nutzer nicht gefunden' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      erfolg: true,
      nachricht: 'Nutzer erfolgreich aktualisiert'
    })

  } catch (error: any) {
    debug.error('[api/admin/nutzer PUT] Error:', error)
    return NextResponse.json(
      { erfolg: false, nachricht: error.message || 'Interner Server-Fehler' },
      { status: 500 }
    )
  }
}

// DELETE: Nutzer permanent löschen
export async function DELETE(request: Request) {
  try {
    const user = await getUserFromRequest(request)

    debug.log('[Admin Nutzer API DELETE] User:', user)

    if (!user || user.rolle !== 'admin') {
      debug.error('[Admin Nutzer API DELETE] Unauthorized:', user?.rolle)
      return NextResponse.json(
        { erfolg: false, nachricht: 'Unauthorized - Nur für Admins' },
        { status: 401 }
      )
    }

    const body = await request.json()
    debug.log('[Admin Nutzer API DELETE] Body:', body)
    
    const { nutzerId } = body

    if (!nutzerId) {
      debug.error('[Admin Nutzer API DELETE] Fehlende Parameter:', { nutzerId })
      return NextResponse.json(
        { erfolg: false, nachricht: 'Fehlende Parameter (nutzerId)' },
        { status: 400 }
      )
    }

    const db = await getDatabase()
    const { ObjectId } = require('mongodb')

    debug.log('[Admin Nutzer API DELETE] Deleting user:', nutzerId)

    // 1. Nutzer aus DB löschen
    const usersCollection = db.collection('users')
    let deleteResult = await usersCollection.deleteOne({ _id: nutzerId })

    // Falls nicht gefunden, versuche mit ObjectId
    if (deleteResult.deletedCount === 0) {
      try {
        const objectId = new ObjectId(nutzerId)
        deleteResult = await usersCollection.deleteOne({ _id: objectId })
        debug.log('[Admin Nutzer API DELETE] Tried ObjectId, result:', {
          deleted: deleteResult.deletedCount
        })
      } catch (err) {
        debug.warn('[Admin Nutzer API DELETE] Could not convert to ObjectId:', err)
      }
    }

    if (deleteResult.deletedCount === 0) {
      return NextResponse.json(
        { erfolg: false, nachricht: 'Nutzer nicht gefunden' },
        { status: 404 }
      )
    }

    // 2. Zugehörige Daten löschen (Kaskade)
    try {
      const faelleCollection = db.collection('faelle')
      const benachrichtigungenCollection = db.collection('benachrichtigungen')
      const abrechnungenCollection = db.collection('abrechnungen')
      const dokumenteCollection = db.collection('dokumente')

      // Fälle löschen (oder nur zuweisen entfernen, je nach Wunsch)
      const faelleResult = await faelleCollection.deleteMany({
        $or: [
          { zugewiesenAn: nutzerId },
          { erstelltVon: nutzerId }
        ]
      })
      debug.log(`[Admin Nutzer API DELETE] Fälle gelöscht: ${faelleResult.deletedCount}`)

      // Benachrichtigungen löschen
      const benachrichtigungenResult = await benachrichtigungenCollection.deleteMany({
        $or: [
          { empfaengerId: nutzerId },
          { absenderId: nutzerId }
        ]
      })
      debug.log(`[Admin Nutzer API DELETE] Benachrichtigungen gelöscht: ${benachrichtigungenResult.deletedCount}`)

      // Abrechnungen löschen
      const abrechnungenResult = await abrechnungenCollection.deleteMany({
        gutachterId: nutzerId
      })
      debug.log(`[Admin Nutzer API DELETE] Abrechnungen gelöscht: ${abrechnungenResult.deletedCount}`)

      // Dokumente löschen
      const dokumenteResult = await dokumenteCollection.deleteMany({
        hochgeladenVon: nutzerId
      })
      debug.log(`[Admin Nutzer API DELETE] Dokumente gelöscht: ${dokumenteResult.deletedCount}`)

    } catch (cascadeError) {
      debug.error('[Admin Nutzer API DELETE] Fehler beim Löschen zugehöriger Daten:', cascadeError)
      // Wir geben trotzdem Erfolg zurück, da der Hauptnutzer gelöscht wurde
    }

    // 3. Benachrichtigung an andere Admins
    try {
      const benachrichtigungenCollection = db.collection('benachrichtigungen')
      await benachrichtigungenCollection.insertOne({
        _id: new ObjectId(),
        empfaengerId: 'admin',
        empfaengerRolle: 'admin',
        absenderId: user.id,
        absenderRolle: user.rolle || 'admin',
        typ: 'nutzer_gelöscht',
        titel: 'Nutzer wurde gelöscht',
        nachricht: `Ein Nutzer wurde permanent aus dem System entfernt.`,
        gelesen: false,
        erstelltAm: new Date(),
        url: `/dashboard/admin/nutzer`
      })
    } catch (notifError) {
      debug.error('[Admin Nutzer API DELETE] Fehler beim Erstellen der Benachrichtigung:', notifError)
    }

    debug.log('[Admin Nutzer API DELETE] Delete successful')

    return NextResponse.json({
      erfolg: true,
      nachricht: 'Nutzer erfolgreich gelöscht'
    })

  } catch (error: any) {
    debug.error('[api/admin/nutzer DELETE] Error:', error)
    return NextResponse.json(
      { erfolg: false, nachricht: error.message || 'Interner Server-Fehler' },
      { status: 500 }
    )
  }
}

