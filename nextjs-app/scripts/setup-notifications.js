/**
 * MongoDB-Setup für Benachrichtigungssystem
 * Erstellt Collection, Indizes und Sample-Daten
 */

require('dotenv').config()
const { MongoClient } = require('mongodb')

const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI
const dbName = process.env.MONGODB_DB || mongoUri?.split('/').pop()?.split('?')[0] || 'rechtly'

if (!mongoUri) {
  console.error('❌ MONGO_URI oder MONGODB_URI fehlt in .env')
  process.exit(1)
}

async function setupNotifications() {
  const client = new MongoClient(mongoUri)

  try {
    await client.connect()
    console.log('✅ MongoDB verbunden')

    const db = client.db(dbName)

    // 1. Collection erstellen (falls nicht vorhanden)
    const collections = await db.listCollections({ name: 'benachrichtigungen' }).toArray()
    if (collections.length === 0) {
      await db.createCollection('benachrichtigungen', {
        validator: {
          $jsonSchema: {
            bsonType: 'object',
            required: ['empfaengerId', 'empfaengerRolle', 'absenderId', 'absenderRolle', 'typ', 'titel', 'nachricht', 'gelesen', 'erstelltAm'],
            properties: {
              empfaengerId: { bsonType: 'string' },
              empfaengerRolle: { enum: ['admin', 'gutachter', 'partner'] },
              absenderId: { bsonType: 'string' },
              absenderRolle: { enum: ['admin', 'gutachter', 'partner'] },
              typ: {
                enum: [
                  'dokument_hochgeladen',
                  'fall_bearbeitet',
                  'fall_zugewiesen',
                  'aufgabe_faellig',
                  'kommentar_hinzugefuegt',
                  'status_geaendert'
                ]
              },
              titel: { bsonType: 'string' },
              nachricht: { bsonType: 'string' },
              fallId: { bsonType: ['string', 'null'] },
              dokumentId: { bsonType: ['string', 'null'] },
              url: { bsonType: ['string', 'null'] },
              gelesen: { bsonType: 'bool' },
              gelesenAm: { bsonType: ['date', 'null'] },
              erstelltAm: { bsonType: 'date' },
              metadata: { bsonType: ['object', 'null'] }
            }
          }
        }
      })
      console.log('✅ Collection "benachrichtigungen" erstellt')
    } else {
      console.log('ℹ️  Collection "benachrichtigungen" existiert bereits')
    }

    const collection = db.collection('benachrichtigungen')

    // 2. Indizes erstellen
    await collection.createIndex({ empfaengerId: 1, gelesen: 1 })
    await collection.createIndex({ erstelltAm: -1 })
    await collection.createIndex({ fallId: 1 })
    console.log('✅ Indizes erstellt')

    // 3. Sample-Benachrichtigungen erstellen (optional)
    const count = await collection.countDocuments()
    if (count === 0) {
      const sampleNotifications = [
        {
          empfaengerId: 'admin-1',
          empfaengerRolle: 'admin',
          absenderId: 'gutachter-1',
          absenderRolle: 'gutachter',
          typ: 'dokument_hochgeladen',
          titel: 'Neues Dokument hochgeladen',
          nachricht: 'Ein neues Dokument "KFZ-Gutachten.pdf" wurde für Fall "Unfall Müller" hochgeladen.',
          fallId: '68e7ae40bcc448a921aa4661',
          dokumentId: '507f1f77bcf86cd799439012',
          url: '/dashboard/admin/falldetail/68e7ae40bcc448a921aa4661',
          gelesen: false,
          gelesenAm: null,
          erstelltAm: new Date(Date.now() - 3600000), // vor 1 Stunde
          metadata: {
            fallname: 'Unfall Müller',
            dokumentName: 'KFZ-Gutachten.pdf'
          }
        },
        {
          empfaengerId: 'gutachter-1',
          empfaengerRolle: 'gutachter',
          absenderId: 'admin-1',
          absenderRolle: 'admin',
          typ: 'fall_bearbeitet',
          titel: 'Fall wurde bearbeitet',
          nachricht: 'Der Fall "Unfall Müller" wurde vom Admin bearbeitet: Felder geändert: status, betrag',
          fallId: '68e7ae40bcc448a921aa4661',
          dokumentId: null,
          url: '/dashboard/gutachter/falldetail/68e7ae40bcc448a921aa4661',
          gelesen: false,
          gelesenAm: null,
          erstelltAm: new Date(Date.now() - 1800000), // vor 30 Minuten
          metadata: {
            fallname: 'Unfall Müller'
          }
        },
        {
          empfaengerId: 'admin-1',
          empfaengerRolle: 'admin',
          absenderId: 'gutachter-1',
          absenderRolle: 'gutachter',
          typ: 'status_geaendert',
          titel: 'Fall-Status geändert',
          nachricht: 'Der Status des Falls "Unfall Müller" wurde von "in_bearbeitung" zu "uebermittelt" geändert.',
          fallId: '68e7ae40bcc448a921aa4661',
          dokumentId: null,
          url: '/dashboard/admin/falldetail/68e7ae40bcc448a921aa4661',
          gelesen: true,
          gelesenAm: new Date(Date.now() - 600000), // vor 10 Minuten
          erstelltAm: new Date(Date.now() - 900000), // vor 15 Minuten
          metadata: {
            fallname: 'Unfall Müller',
            alterStatus: 'in_bearbeitung',
            neuerStatus: 'uebermittelt'
          }
        }
      ]

      await collection.insertMany(sampleNotifications)
      console.log(`✅ ${sampleNotifications.length} Sample-Benachrichtigungen erstellt`)
    } else {
      console.log(`ℹ️  ${count} Benachrichtigungen bereits vorhanden`)
    }

    console.log('\n🎉 Benachrichtigungssystem erfolgreich eingerichtet!')
    console.log('\nNächste Schritte:')
    console.log('1. Starte die Anwendung: npm run dev')
    console.log('2. Melde dich als Admin oder Gutachter an')
    console.log('3. Klicke auf "Benachrichtigungen" in der Sidebar')
    console.log('4. Der rote Badge zeigt die Anzahl ungelesener Benachrichtigungen')

  } catch (error) {
    console.error('❌ Fehler:', error)
    process.exit(1)
  } finally {
    await client.close()
  }
}

setupNotifications()

