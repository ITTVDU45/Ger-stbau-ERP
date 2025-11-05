#!/usr/bin/env node
/**
 * Datenbank-Migration Script
 *
 * Erstellt die benötigten Collections und Indizes für das Gutachter-System
 */

const { MongoClient } = require('mongodb')
require('dotenv').config()

// Unterstütze beide Varianten: MONGO_URI und MONGODB_URI
const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017'
// Extrahiere DB-Name aus URI oder nutze Fallback
const dbNameFromUri = MONGODB_URI.split('/').pop()?.split('?')[0]
const MONGODB_DB = process.env.MONGODB_DB || dbNameFromUri || 'rechtly'

async function migrateDatabase() {
  console.log('🔄 Datenbank-Migration wird ausgeführt...\n')

  let client
  try {
    client = new MongoClient(MONGODB_URI)
    await client.connect()

    const db = client.db(MONGODB_DB)
    console.log(`✅ Verbunden mit Datenbank: ${MONGODB_DB}`)

    // Erstelle Collections mit Validierungsschemas
    const collections = [
      {
        name: 'faelle',
        schema: {
          $jsonSchema: {
            bsonType: 'object',
            required: ['fallname', 'status', 'mandant', 'schaden', 'erstPartei', 'zweitPartei', 'vollmacht', 'vermitteltVon', 'fahrzeugart', 'standort', 'erstelltAm', 'zuletztGeaendert', 'erstelltVon'],
            properties: {
              fallname: { bsonType: 'string', minLength: 1 },
              status: { bsonType: 'string', enum: ['offen', 'in_bearbeitung', 'uebermittelt', 'abgeschlossen'] },
              mandant: {
                bsonType: 'object',
                properties: {
                  vorname: { bsonType: 'string' },
                  nachname: { bsonType: 'string' },
                  telefon: { bsonType: 'string' },
                  email: { bsonType: 'string' },
                  geburtsdatum: { bsonType: 'string' },
                  adresse: { bsonType: 'string' },
                  nummer: { bsonType: 'string' }
                }
              },
              schaden: {
                bsonType: 'object',
                properties: {
                  schadenstyp: { bsonType: 'string' },
                  schadensschwere: { bsonType: 'string' },
                  unfallort: { bsonType: 'string' },
                  unfallzeit: { bsonType: 'string' },
                  beschreibung: { bsonType: 'string' }
                }
              },
              erstPartei: {
                bsonType: 'object',
                properties: {
                  vorname: { bsonType: 'string' },
                  nachname: { bsonType: 'string' },
                  beteiligungsposition: { bsonType: 'string' }
                }
              },
              zweitPartei: {
                bsonType: 'object',
                properties: {
                  vorname: { bsonType: 'string' },
                  nachname: { bsonType: 'string' },
                  beteiligungsposition: { bsonType: 'string' }
                }
              },
              fahrzeugart: { bsonType: 'string', enum: ['pkw', 'lkw', 'motorrad', 'transporter'] },
              standort: { bsonType: 'string' },
              betrag: { bsonType: 'number', minimum: 0 },
              erstelltAm: { bsonType: 'date' },
              zuletztGeaendert: { bsonType: 'date' },
              erstelltVon: { bsonType: 'string' }
            }
          }
        }
      }
    ]

    // Erstelle Collections
    for (const collection of collections) {
      try {
        // Lösche bestehende Collection falls vorhanden
        await db.collection(collection.name).drop().catch(() => {
          // Ignoriere Fehler falls Collection nicht existiert
        })

        // Erstelle neue Collection mit Schema
        await db.createCollection(collection.name, {
          validator: collection.schema,
          validationLevel: 'moderate',
          validationAction: 'warn'
        })

        console.log(`✅ Collection '${collection.name}' erstellt`)
      } catch (error) {
        console.error(`❌ Fehler beim Erstellen von Collection '${collection.name}':`, error.message)
      }
    }

    // Erstelle Indizes für Performance
    const indexes = [
      // Fälle
      { collection: 'faelle', index: { status: 1 }, name: 'status_idx' },
      { collection: 'faelle', index: { fahrzeugart: 1 }, name: 'fahrzeugart_idx' },
      { collection: 'faelle', index: { standort: 1 }, name: 'standort_idx' },
      { collection: 'faelle', index: { erstelltAm: -1 }, name: 'erstelltAm_idx' },
      { collection: 'faelle', index: { zugewiesenAn: 1 }, name: 'zugewiesenAn_idx' },
      { collection: 'faelle', index: { 'mandant.vorname': 1, 'mandant.nachname': 1 }, name: 'mandant_name_idx' },
      { collection: 'faelle', index: { fallname: 'text' }, name: 'fallname_text_idx' }
    ]

    for (const index of indexes) {
      try {
        await db.collection(index.collection).createIndex(index.index, { name: index.name })
        console.log(`✅ Index '${index.name}' auf '${index.collection}' erstellt`)
      } catch (error) {
        console.error(`❌ Fehler beim Erstellen von Index '${index.name}':`, error.message)
      }
    }

    // Erstelle Beispiel-Daten für Testing
    await createSampleData(db)

    console.log('\n✅ Migration erfolgreich abgeschlossen!')
    console.log('📋 Nächste Schritte:')
    console.log('1. Kopiere .env.example zu .env und passe die Werte an')
    console.log('2. Stelle sicher, dass MongoDB läuft')
    console.log('3. Starte die Anwendung mit: npm run dev')

  } catch (error) {
    console.error('❌ Fehler bei der Migration:', error)
    process.exit(1)
  } finally {
    if (client) {
      await client.close()
    }
  }
}

async function createSampleData(db) {
  console.log('\n📊 Erstelle Beispiel-Daten...')

  const sampleCases = [
    {
      fallname: 'Unfall PKW - Müller',
      status: 'in_bearbeitung',
      mandant: {
        vorname: 'Max',
        nachname: 'Mustermann',
        telefon: '+49 30 123456789',
        email: 'max.mustermann@example.com',
        geburtsdatum: '1985-05-15',
        adresse: 'Musterstraße 123, 10115 Berlin',
        nummer: 'M-001'
      },
      schaden: {
        schadenstyp: 'Verkehrsunfall',
        schadensschwere: 'mittel',
        unfallort: 'Berlin-Mitte',
        unfallzeit: '2025-01-15T14:30:00Z',
        beschreibung: 'Auffahrunfall an Kreuzung'
      },
      erstPartei: {
        vorname: 'Max',
        nachname: 'Mustermann',
        beteiligungsposition: 'Fahrer'
      },
      zweitPartei: {
        vorname: 'Erika',
        nachname: 'Schmidt',
        beteiligungsposition: 'Fahrer'
      },
      vollmacht: {
        dokument: 'vollmacht_mustermann.pdf',
        unterschrieben: true,
        unterschriebenAm: new Date()
      },
      vermitteltVon: {
        vorname: 'Hans',
        nachname: 'Partner',
        unternehmen: 'Rechtly GmbH',
        referenzNummer: 'REF-2025-001'
      },
      fahrzeugart: 'pkw',
      standort: 'Berlin',
      betrag: 2400,
      erstelltAm: new Date(),
      zuletztGeaendert: new Date(),
      erstelltVon: 'system',
      aufgaben: [
        {
          titel: 'Gutachten erstellen',
          prioritaet: 'hoch',
          faelligAm: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          status: 'offen',
          erstelltAm: new Date(),
          zugewiesenAn: 'gutachter-1'
        }
      ],
      dokumente: [
        {
          dateiname: 'schadenmeldung.pdf',
          dateipfad: '/uploads/case-1/schadenmeldung.pdf',
          dateigroesse: 1024000,
          mimetype: 'application/pdf',
          hochgeladenVon: 'system',
          hochgeladenAm: new Date(),
          kategorie: 'gutachten'
        }
      ],
      vermittlungen: [
        {
          partnerId: 'partner-1',
          referenzNummer: 'REF-2025-001',
          vermitteltAm: new Date(),
          status: 'aktiv'
        }
      ],
      abrechnungen: [
        {
          gutachterId: 'gutachter-1',
          betrag: 2400,
          status: 'offen',
          faelligAm: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        }
      ]
    },
    {
      fallname: 'LKW-Schaden - Groß GmbH',
      status: 'offen',
      mandant: {
        vorname: 'Petra',
        nachname: 'Groß',
        telefon: '+49 40 987654321',
        email: 'petra.gross@gmbh.de',
        geburtsdatum: '1978-12-03',
        adresse: 'Industriestraße 45, 20095 Hamburg',
        nummer: 'G-002'
      },
      schaden: {
        schadenstyp: 'Ladungsschaden',
        schadensschwere: 'hoch',
        unfallort: 'Hamburg-Hafen',
        unfallzeit: '2025-01-20T09:15:00Z',
        beschreibung: 'Schaden an Ladung während Transport'
      },
      erstPartei: {
        vorname: 'Petra',
        nachname: 'Groß',
        beteiligungsposition: 'Fahrer'
      },
      zweitPartei: {
        vorname: 'Michael',
        nachname: 'Klein',
        beteiligungsposition: 'Lagerarbeiter'
      },
      vollmacht: {
        dokument: 'vollmacht_gross.pdf',
        unterschrieben: false
      },
      vermitteltVon: {
        vorname: 'Lisa',
        nachname: 'Berater',
        unternehmen: 'Rechtly GmbH',
        referenzNummer: 'REF-2025-002'
      },
      fahrzeugart: 'lkw',
      standort: 'Hamburg',
      betrag: 8500,
      erstelltAm: new Date(),
      zuletztGeaendert: new Date(),
      erstelltVon: 'system',
      aufgaben: [
        {
          titel: 'Ladungsschaden dokumentieren',
          prioritaet: 'hoch',
          faelligAm: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          status: 'offen',
          erstelltAm: new Date(),
          zugewiesenAn: 'gutachter-1'
        }
      ],
      dokumente: [],
      vermittlungen: [
        {
          partnerId: 'partner-2',
          referenzNummer: 'REF-2025-002',
          vermitteltAm: new Date(),
          status: 'aktiv'
        }
      ],
      abrechnungen: []
    }
  ]

  try {
    const result = await db.collection('faelle').insertMany(sampleCases)
    console.log(`✅ ${result.insertedCount} Beispiel-Fälle erstellt`)
  } catch (error) {
    console.error('❌ Fehler beim Erstellen von Beispiel-Daten:', error.message)
  }
}

// Migration ausführen
migrateDatabase()
  .then(() => {
    console.log('\n🎉 Migration abgeschlossen!')
    process.exit(0)
  })
  .catch(error => {
    console.error('\n💥 Migration fehlgeschlagen:', error)
    process.exit(1)
  })
