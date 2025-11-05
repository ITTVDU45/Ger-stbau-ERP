import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { ObjectId } from 'mongodb'

// GET - Resturlaub eines Mitarbeiters berechnen
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const db = await getDatabase()
    
    // 1. Mitarbeiter laden
    const mitarbeiter = await db.collection('mitarbeiter').findOne({ _id: new ObjectId(id) })
    
    if (!mitarbeiter) {
      return NextResponse.json(
        { error: 'Mitarbeiter nicht gefunden' },
        { status: 404 }
      )
    }

    // 2. Jahresurlaubstage aus Profil (falls definiert, sonst Standard 30)
    const jahresUrlaubstage = mitarbeiter.jahresUrlaubstage || 30

    // 3. Genehmigte Urlaubstage im aktuellen Jahr zählen
    const aktuellesJahr = new Date().getFullYear()
    const jahresStart = new Date(aktuellesJahr, 0, 1).toISOString()
    const jahresEnde = new Date(aktuellesJahr, 11, 31, 23, 59, 59).toISOString()

    const genehmigteUrlaube = await db.collection('urlaube')
      .find({
        mitarbeiterId: id,
        status: 'genehmigt',
        von: { $gte: jahresStart, $lte: jahresEnde }
      })
      .toArray()

    // 4. Urlaubstage berechnen (inkl. Wochenenden)
    const genommenerUrlaub = genehmigteUrlaube.reduce((sum, urlaub) => {
      const von = new Date(urlaub.von)
      const bis = new Date(urlaub.bis)
      const diffTime = Math.abs(bis.getTime() - von.getTime())
      const diffTage = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1 // +1 um beide Tage zu zählen
      return sum + diffTage
    }, 0)

    // 5. Resturlaub berechnen
    const resturlaub = jahresUrlaubstage - genommenerUrlaub

    // 6. Mitarbeiter-Dokument aktualisieren mit aktuellen Werten
    await db.collection('mitarbeiter').updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: { 
          jahresUrlaubstage,
          genommenerUrlaub,
          resturlaub,
          zuletztGeaendert: new Date().toISOString()
        } 
      }
    )

    return NextResponse.json({
      erfolg: true,
      mitarbeiterId: id,
      jahr: aktuellesJahr,
      jahresUrlaubstage,
      genommenerUrlaub,
      resturlaub,
      urlaubsAnzahl: genehmigteUrlaube.length
    })

  } catch (error) {
    console.error('Fehler beim Berechnen des Resturlaubs:', error)
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}

