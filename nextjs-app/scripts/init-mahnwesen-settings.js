/**
 * Initialisierungs-Script für Mahnwesen-Einstellungen
 * 
 * Dieses Script erstellt die Standard-Einstellungen für das Mahnwesen-Modul
 * in der MongoDB-Datenbank.
 * 
 * Verwendung:
 *   node nextjs-app/scripts/init-mahnwesen-settings.js
 */

const { MongoClient } = require('mongodb')
require('dotenv').config({ path: '.env.local' })

const MONGO_URI = process.env.MONGO_URI
const MONGODB_DB = process.env.MONGODB_DB || 'geruestbau-erp'

if (!MONGO_URI) {
  console.error('❌ MONGO_URI ist nicht in .env.local definiert')
  process.exit(1)
}

const defaultSettings = {
  // Mahngebühren pro Mahnstufe
  mahngebuehrenStufe1: 5.0,
  mahngebuehrenStufe2: 15.0,
  mahngebuehrenStufe3: 25.0,
  
  // Zahlungsfristen pro Mahnstufe (in Tagen)
  zahlungsfristStufe1: 7,
  zahlungsfristStufe2: 7,
  zahlungsfristStufe3: 7,
  
  // Verzugszinsen
  verzugszinssatz: 9.0,
  
  // Standard-Mahntexte (Vorlagen)
  standardTextStufe1: `Sehr geehrte Damen und Herren,

wir möchten Sie höflich daran erinnern, dass die Zahlung für die unten genannte Rechnung noch aussteht.

Bitte begleichen Sie den offenen Betrag innerhalb der angegebenen Frist.

Falls die Zahlung bereits erfolgt ist, betrachten Sie dieses Schreiben bitte als gegenstandslos.

Mit freundlichen Grüßen`,

  standardTextStufe2: `Sehr geehrte Damen und Herren,

trotz unserer Zahlungserinnerung ist die Zahlung für die unten genannte Rechnung noch nicht bei uns eingegangen.

Wir fordern Sie hiermit auf, den offenen Betrag zuzüglich Mahngebühren innerhalb der angegebenen Frist zu begleichen.

Sollte die Zahlung bereits erfolgt sein, bitten wir Sie, uns einen entsprechenden Nachweis zukommen zu lassen.

Mit freundlichen Grüßen`,

  standardTextStufe3: `Sehr geehrte Damen und Herren,

dies ist unsere letzte Mahnung. Trotz mehrfacher Erinnerungen ist die Zahlung für die unten genannte Rechnung noch immer nicht erfolgt.

Wir fordern Sie hiermit letztmalig auf, den offenen Betrag zuzüglich Mahngebühren und Verzugszinsen innerhalb der angegebenen Frist zu begleichen.

Sollte die Zahlung nicht fristgerecht eingehen, werden wir ohne weitere Ankündigung rechtliche Schritte einleiten.

Mit freundlichen Grüßen`,
  
  // Metadaten
  aktiv: true,
  erstelltAm: new Date(),
  zuletztGeaendert: new Date(),
  geaendertVon: 'system'
}

async function initMahnwesenSettings() {
  let client
  
  try {
    console.log('🔄 Verbinde mit MongoDB...')
    client = new MongoClient(MONGO_URI)
    await client.connect()
    
    const db = client.db(MONGODB_DB)
    const settingsCollection = db.collection('mahnwesen_settings')
    
    // Prüfen, ob bereits Einstellungen existieren
    const existingSettings = await settingsCollection.findOne({ aktiv: true })
    
    if (existingSettings) {
      console.log('ℹ️  Mahnwesen-Einstellungen existieren bereits')
      console.log('   ID:', existingSettings._id)
      console.log('   Erstellt am:', existingSettings.erstelltAm)
      console.log('')
      console.log('⚠️  Möchten Sie die bestehenden Einstellungen überschreiben?')
      console.log('   Führen Sie das Script mit --force aus, um zu überschreiben')
      
      if (!process.argv.includes('--force')) {
        console.log('')
        console.log('✅ Keine Änderungen vorgenommen')
        process.exit(0)
      }
      
      console.log('')
      console.log('🔄 Aktualisiere bestehende Einstellungen...')
      await settingsCollection.updateOne(
        { _id: existingSettings._id },
        { 
          $set: {
            ...defaultSettings,
            zuletztGeaendert: new Date()
          }
        }
      )
      console.log('✅ Mahnwesen-Einstellungen erfolgreich aktualisiert')
    } else {
      console.log('🔄 Erstelle neue Mahnwesen-Einstellungen...')
      const result = await settingsCollection.insertOne(defaultSettings)
      console.log('✅ Mahnwesen-Einstellungen erfolgreich erstellt')
      console.log('   ID:', result.insertedId)
    }
    
    console.log('')
    console.log('📊 Konfiguration:')
    console.log('   Mahngebühren Stufe 1:', defaultSettings.mahngebuehrenStufe1, '€')
    console.log('   Mahngebühren Stufe 2:', defaultSettings.mahngebuehrenStufe2, '€')
    console.log('   Mahngebühren Stufe 3:', defaultSettings.mahngebuehrenStufe3, '€')
    console.log('   Zahlungsfristen:', defaultSettings.zahlungsfristStufe1, 'Tage')
    console.log('   Verzugszinssatz:', defaultSettings.verzugszinssatz, '%')
    console.log('')
    console.log('✅ Initialisierung abgeschlossen!')
    
  } catch (error) {
    console.error('❌ Fehler bei der Initialisierung:', error.message)
    process.exit(1)
  } finally {
    if (client) {
      await client.close()
      console.log('🔌 Datenbankverbindung geschlossen')
    }
  }
}

// Script ausführen
initMahnwesenSettings()

