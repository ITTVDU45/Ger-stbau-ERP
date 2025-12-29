import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/session'
import { getDatabase } from '@/lib/db/client'
import { BenachrichtigungsVorlagen, UserRole } from '@/lib/db/types'
import { requireRole } from '@/lib/auth/rbac'

// Standard-Vorlagen
const DEFAULT_VORLAGEN: Omit<BenachrichtigungsVorlagen, '_id' | 'erstelltAm' | 'zuletztGeaendert'> = {
  willkommen: {
    betreff: 'Willkommen bei Gerüstbau A+',
    inhalt: `Hallo {vorname} {nachname},

willkommen bei Gerüstbau A+! Ihr Account wurde erfolgreich erstellt.

Sie können sich nun mit Ihrer E-Mail-Adresse ({email}) anmelden.

Bei Fragen stehen wir Ihnen gerne zur Verfügung.

Mit freundlichen Grüßen
Ihr Gerüstbau A+ Team`,
    aktiv: true
  },
  
  passwortZuruecksetzen: {
    betreff: 'Passwort zurücksetzen - Gerüstbau A+',
    inhalt: `Hallo {vorname} {nachname},

Sie haben eine Anfrage zum Zurücksetzen Ihres Passworts gestellt.

Bitte klicken Sie auf den folgenden Link, um Ihr Passwort zurückzusetzen:
{resetLink}

Dieser Link ist 24 Stunden gültig.

Falls Sie diese Anfrage nicht gestellt haben, können Sie diese E-Mail ignorieren.

Mit freundlichen Grüßen
Ihr Gerüstbau A+ Team`,
    aktiv: true
  },
  
  angebotVersendet: {
    betreff: 'Ihr Angebot von Gerüstbau A+ - {angebotNummer}',
    inhalt: `Sehr geehrte Damen und Herren,

vielen Dank für Ihre Anfrage.

Gerne übersenden wir Ihnen unser Angebot {angebotNummer} für das Projekt "{projektName}".

Das Angebot finden Sie im Anhang dieser E-Mail.

Angebotssumme: {betrag} € (netto)
Gültig bis: {gueltigBis}

Bei Fragen oder Änderungswünschen stehen wir Ihnen gerne zur Verfügung.

Mit freundlichen Grüßen
Ihr Gerüstbau A+ Team`,
    aktiv: true
  },
  
  rechnungVersendet: {
    betreff: 'Rechnung {rechnungNummer} - Gerüstbau A+',
    inhalt: `Sehr geehrte Damen und Herren,

anbei erhalten Sie die Rechnung {rechnungNummer} für das Projekt "{projektName}".

Rechnungsbetrag: {betrag} € (brutto)
Zahlungsziel: {zahlungsziel}

Die Rechnung finden Sie im Anhang dieser E-Mail.

Bitte überweisen Sie den Betrag unter Angabe der Rechnungsnummer auf unser Konto:
IBAN: {iban}
BIC: {bic}

Vielen Dank für Ihren Auftrag!

Mit freundlichen Grüßen
Ihr Gerüstbau A+ Team`,
    aktiv: true
  },
  
  rechnungBezahlt: {
    betreff: 'Zahlungsbestätigung - Rechnung {rechnungNummer}',
    inhalt: `Sehr geehrte Damen und Herren,

wir bestätigen hiermit den Eingang Ihrer Zahlung für die Rechnung {rechnungNummer}.

Rechnungsbetrag: {betrag} € (brutto)
Zahlungseingang: {zahlungsdatum}
Projekt: {projektName}

Vielen Dank für die pünktliche Zahlung!

Wir freuen uns auf eine weiterhin gute Zusammenarbeit.

Mit freundlichen Grüßen
Ihr Gerüstbau A+ Team`,
    aktiv: true
  },
  
  zahlungserinnerung: {
    betreff: 'Zahlungserinnerung - Rechnung {rechnungNummer}',
    inhalt: `Sehr geehrte Damen und Herren,

wir möchten Sie freundlich daran erinnern, dass die Rechnung {rechnungNummer} noch offen ist.

Rechnungsbetrag: {betrag} € (brutto)
Rechnungsdatum: {rechnungsdatum}
Fälligkeit: {faelligkeitsdatum}
Überfällig seit: {ueberfaelligSeit} Tagen

Projekt: {projektName}

Falls die Zahlung bereits erfolgt ist, bitten wir Sie, diese E-Mail zu ignorieren.

Sollten Sie Fragen zur Rechnung haben, kontaktieren Sie uns bitte.

Bitte überweisen Sie den Betrag auf unser Konto:
IBAN: {iban}
BIC: {bic}

Mit freundlichen Grüßen
Ihr Gerüstbau A+ Team`,
    aktiv: true
  },
  
  mahnungErstellt: {
    betreff: '{mahnstufe}. Mahnung - Rechnung {rechnungNummer}',
    inhalt: `Sehr geehrte Damen und Herren,

leider mussten wir feststellen, dass die Rechnung {rechnungNummer} trotz Fälligkeit noch nicht beglichen wurde.

Rechnungsbetrag: {betrag} € (brutto)
Rechnungsdatum: {rechnungsdatum}
Fälligkeit: {faelligkeitsdatum}
Mahnstufe: {mahnstufe}
Mahngebühr: {mahngebuehr} €

Gesamtforderung: {gesamtbetrag} € (inkl. Mahngebühren)

Wir bitten Sie, den ausstehenden Betrag innerhalb von {zahlungsfrist} Tagen auf unser Konto zu überweisen:
IBAN: {iban}
BIC: {bic}

Die Mahnung finden Sie im Anhang dieser E-Mail.

Bei weiterer Nichtzahlung behalten wir uns rechtliche Schritte vor.

Falls die Zahlung bereits erfolgt ist oder es Unstimmigkeiten gibt, kontaktieren Sie uns bitte umgehend.

Mit freundlichen Grüßen
Ihr Gerüstbau A+ Team`,
    aktiv: true
  }
}

// GET - Benachrichtigungsvorlagen abrufen
export async function GET() {
  try {
    await requireAuth()
    
    const db = await getDatabase()
    const vorlagenCollection = db.collection<BenachrichtigungsVorlagen>('benachrichtigungsvorlagen')
    
    // Hole die aktuellen Vorlagen (es sollte nur eine geben)
    let vorlagen = await vorlagenCollection.findOne({})
    
    // Falls keine Vorlagen existieren, erstelle Standardwerte
    if (!vorlagen) {
      const standardVorlagen: BenachrichtigungsVorlagen = {
        ...DEFAULT_VORLAGEN,
        erstelltAm: new Date(),
        zuletztGeaendert: new Date()
      }
      
      await vorlagenCollection.insertOne(standardVorlagen)
      vorlagen = standardVorlagen
    }
    
    return NextResponse.json({
      erfolg: true,
      vorlagen
    })
  } catch (error: any) {
    console.error('Fehler beim Abrufen der Benachrichtigungsvorlagen:', error)
    return NextResponse.json(
      { erfolg: false, fehler: error.message || 'Fehler beim Abrufen der Vorlagen' },
      { status: 500 }
    )
  }
}

// PUT - Benachrichtigungsvorlagen aktualisieren
export async function PUT(request: NextRequest) {
  try {
    // Nur SUPERADMIN und ADMIN dürfen Vorlagen ändern
    await requireRole([UserRole.SUPERADMIN, UserRole.ADMIN])
    
    const body = await request.json()
    
    // Validierung - prüfe ob alle erforderlichen Felder vorhanden sind
    const requiredTemplates = [
      'willkommen',
      'passwortZuruecksetzen',
      'angebotVersendet',
      'rechnungVersendet',
      'rechnungBezahlt',
      'zahlungserinnerung',
      'mahnungErstellt'
    ]
    
    for (const template of requiredTemplates) {
      if (!body[template] || !body[template].betreff || !body[template].inhalt) {
        return NextResponse.json(
          { erfolg: false, fehler: `Vorlage "${template}" ist unvollständig` },
          { status: 400 }
        )
      }
    }
    
    const db = await getDatabase()
    const vorlagenCollection = db.collection<BenachrichtigungsVorlagen>('benachrichtigungsvorlagen')
    
    // Prüfe ob Vorlagen existieren
    const existingVorlagen = await vorlagenCollection.findOne({})
    
    const updateData: Omit<BenachrichtigungsVorlagen, '_id' | 'erstelltAm'> = {
      willkommen: {
        betreff: body.willkommen.betreff,
        inhalt: body.willkommen.inhalt,
        aktiv: body.willkommen.aktiv !== false
      },
      passwortZuruecksetzen: {
        betreff: body.passwortZuruecksetzen.betreff,
        inhalt: body.passwortZuruecksetzen.inhalt,
        aktiv: body.passwortZuruecksetzen.aktiv !== false
      },
      angebotVersendet: {
        betreff: body.angebotVersendet.betreff,
        inhalt: body.angebotVersendet.inhalt,
        aktiv: body.angebotVersendet.aktiv !== false
      },
      rechnungVersendet: {
        betreff: body.rechnungVersendet.betreff,
        inhalt: body.rechnungVersendet.inhalt,
        aktiv: body.rechnungVersendet.aktiv !== false
      },
      rechnungBezahlt: {
        betreff: body.rechnungBezahlt.betreff,
        inhalt: body.rechnungBezahlt.inhalt,
        aktiv: body.rechnungBezahlt.aktiv !== false
      },
      zahlungserinnerung: {
        betreff: body.zahlungserinnerung.betreff,
        inhalt: body.zahlungserinnerung.inhalt,
        aktiv: body.zahlungserinnerung.aktiv !== false
      },
      mahnungErstellt: {
        betreff: body.mahnungErstellt.betreff,
        inhalt: body.mahnungErstellt.inhalt,
        aktiv: body.mahnungErstellt.aktiv !== false
      },
      zuletztGeaendert: new Date()
    }
    
    if (existingVorlagen) {
      // Update
      await vorlagenCollection.updateOne(
        { _id: existingVorlagen._id },
        { $set: updateData }
      )
    } else {
      // Insert
      await vorlagenCollection.insertOne({
        ...updateData,
        erstelltAm: new Date()
      } as BenachrichtigungsVorlagen)
    }
    
    return NextResponse.json({
      erfolg: true,
      nachricht: 'Benachrichtigungsvorlagen erfolgreich gespeichert'
    })
  } catch (error: any) {
    console.error('Fehler beim Speichern der Benachrichtigungsvorlagen:', error)
    return NextResponse.json(
      { erfolg: false, fehler: error.message || 'Fehler beim Speichern der Vorlagen' },
      { status: 500 }
    )
  }
}

