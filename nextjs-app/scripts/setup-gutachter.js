const { MongoClient } = require('mongodb')
const dotenv = require('dotenv')
const path = require('path')

// Lade .env aus dem Projekt-Root
dotenv.config({ path: path.join(__dirname, '..', '.env') })

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI
const DB_NAME = process.env.MONGODB_DB || MONGO_URI?.split('/').pop()?.split('?')[0] || 'rechtly'

async function setupGutachter() {
  if (!MONGO_URI) {
    console.error('❌ MONGO_URI oder MONGODB_URI nicht gefunden in .env')
    process.exit(1)
  }

  const client = new MongoClient(MONGO_URI)

  try {
    await client.connect()
    console.log('✅ Mit MongoDB verbunden')

    const db = client.db(DB_NAME)
    const faelleCollection = db.collection('faelle')

    // Erstelle 3 Gutachter mit jeweils Fällen
    const gutachter = [
      {
        id: 'gutachter-1',
        name: 'Max Mustermann',
        email: 'max.mustermann@gutachter.de',
        telefon: '+49 30 12345678',
        standort: 'Berlin'
      },
      {
        id: 'gutachter-2',
        name: 'Anna Schmidt',
        email: 'anna.schmidt@gutachter.de',
        telefon: '+49 40 87654321',
        standort: 'Hamburg'
      },
      {
        id: 'gutachter-3',
        name: 'Thomas Müller',
        email: 'thomas.mueller@gutachter.de',
        telefon: '+49 69 11223344',
        standort: 'Frankfurt'
      }
    ]

    console.log('\n📦 Erstelle Fälle für Gutachter...')

    // Lösche alte Test-Fälle
    const deleteResult = await faelleCollection.deleteMany({
      erstelltVon: { $in: gutachter.map(g => g.id) }
    })
    console.log(`🗑️  ${deleteResult.deletedCount} alte Test-Fälle gelöscht`)

    // Erstelle für jeden Gutachter mehrere Fälle
    const now = new Date()
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

    for (const gut of gutachter) {
      const fallCount = Math.floor(Math.random() * 5) + 3 // 3-7 Fälle pro Gutachter
      
      for (let i = 0; i < fallCount; i++) {
        const statusOptions = ['offen', 'in_bearbeitung', 'uebermittelt', 'abgeschlossen']
        const fahrzeugartenOptions = ['pkw', 'lkw', 'motorrad', 'fahrrad']
        const standorteOptions = ['Berlin', 'Hamburg', 'München', 'Köln', 'Frankfurt']
        
        const status = statusOptions[Math.floor(Math.random() * statusOptions.length)]
        const fahrzeugart = fahrzeugartenOptions[Math.floor(Math.random() * fahrzeugartenOptions.length)]
        const standort = standorteOptions[Math.floor(Math.random() * standorteOptions.length)]
        const betrag = Math.floor(Math.random() * 5000) + 500
        
        // Zufälliges Erstellungsdatum in den letzten 2 Wochen
        const createdAt = new Date(
          twoWeeksAgo.getTime() + Math.random() * (now.getTime() - twoWeeksAgo.getTime())
        )
        
        const fall = {
          fallname: `Fall ${i + 1} - ${gut.name}`,
          status,
          fahrzeugart,
          standort,
          betrag,
          
          mandant: {
            vorname: `Kunde${i + 1}`,
            nachname: `Test`,
            email: `kunde${i + 1}@test.de`,
            telefon: `+49 123 ${Math.floor(Math.random() * 10000000)}`,
            geburtsdatum: '1980-01-01',
            adresse: `Teststraße ${i + 1}, ${standort}`
          },
          
          schaden: {
            schadenstyp: 'Verkehrsunfall',
            schadensschwere: i % 2 === 0 ? 'mittel' : 'gering',
            unfallort: standort,
            unfallzeit: createdAt.toISOString(),
            beschreibung: `Testschaden für Fall ${i + 1}`
          },
          
          erstPartei: {
            vorname: `Kunde${i + 1}`,
            nachname: `Test`,
            versicherung: 'Test Versicherung AG',
            kennzeichen: `B-XX ${1000 + i}`,
            kfzModell: 'VW Golf',
            fahrzeughalter: `Kunde${i + 1} Test`,
            beteiligungsposition: 'Geschädigter'
          },
          
          aufgaben: status === 'offen' || status === 'in_bearbeitung' ? [
            {
              titel: 'Erstbegutachtung',
              beschreibung: 'Fahrzeug begutachten',
              status: status === 'in_bearbeitung' ? 'erledigt' : 'offen',
              faellig: new Date(createdAt.getTime() + 2 * 24 * 60 * 60 * 1000),
              zugewiesen: gut.id
            }
          ] : [],
          
          dokumente: [],
          vermittlungen: [],
          abrechnungen: [],
          
          erstelltAm: createdAt,
          zuletztGeaendert: new Date(),
          erstelltVon: gut.id,
          erstelltVonRolle: 'gutachter',
          zugewiesenAn: gut.id,
          sichtbarFuerAdmin: true,
          sichtbarFuerGutachter: true
        }
        
        await faelleCollection.insertOne(fall)
      }
      
      console.log(`  ✅ ${fallCount} Fälle für ${gut.name} erstellt`)
    }

    // Zeige Statistiken
    const stats = await faelleCollection.aggregate([
      {
        $group: {
          _id: '$zugewiesenAn',
          fallCount: { $sum: 1 },
          totalRevenue: { $sum: '$betrag' }
        }
      }
    ]).toArray()

    console.log('\n📊 Gutachter-Statistiken:')
    stats.forEach(s => {
      const gut = gutachter.find(g => g.id === s._id)
      console.log(`  ${gut?.name || s._id}: ${s.fallCount} Fälle, ${s.totalRevenue.toLocaleString('de-DE')} € Umsatz`)
    })

    console.log('\n✅ Setup abgeschlossen!')

  } catch (error) {
    console.error('❌ Fehler beim Setup:', error)
    process.exit(1)
  } finally {
    await client.close()
  }
}

setupGutachter()

