#!/usr/bin/env node

/**
 * Test-Script für Mitarbeiter-API
 * 
 * Testet die behobenen Fehler:
 * 1. POST /api/mitarbeiter - Neuen Mitarbeiter anlegen
 * 2. Validierung von Pflichtfeldern
 * 3. E-Mail-Duplikat-Prüfung
 * 4. Datum-Konvertierung
 */

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000'

// Farben für Console-Output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
}

function log(color, symbol, message) {
  console.log(`${color}${symbol}${colors.reset} ${message}`)
}

function success(message) {
  log(colors.green, '✓', message)
}

function error(message) {
  log(colors.red, '✗', message)
}

function info(message) {
  log(colors.cyan, 'ℹ', message)
}

function warn(message) {
  log(colors.yellow, '⚠', message)
}

// Test-Daten
const testMitarbeiter = {
  vorname: 'Test',
  nachname: 'Mitarbeiter',
  email: `test-${Date.now()}@example.com`,
  telefon: '+49 123 456789',
  beschaeftigungsart: 'festangestellt',
  eintrittsdatum: new Date().toISOString(),
  aktiv: true,
  qualifikationen: ['Gerüstbauer', 'Staplerführerschein'],
  adresse: {
    strasse: 'Teststraße',
    hausnummer: '123',
    plz: '12345',
    ort: 'Teststadt'
  },
  stundensatz: 25.50,
  wochenarbeitsstunden: 40,
  notizen: 'Test-Mitarbeiter für API-Tests'
}

async function testMitarbeiterAnlegen() {
  info('Test 1: Neuen Mitarbeiter anlegen')
  
  try {
    const response = await fetch(`${BASE_URL}/api/mitarbeiter`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testMitarbeiter)
    })

    const data = await response.json()

    if (response.ok && data.erfolg) {
      success(`Mitarbeiter erfolgreich angelegt (ID: ${data.mitarbeiterId})`)
      return data.mitarbeiterId
    } else {
      error(`Fehler beim Anlegen: ${data.fehler || 'Unbekannter Fehler'}`)
      if (data.details) {
        warn(`Details: ${data.details}`)
      }
      return null
    }
  } catch (err) {
    error(`Netzwerkfehler: ${err.message}`)
    return null
  }
}

async function testPflichtfeldValidierung() {
  info('Test 2: Pflichtfeld-Validierung')
  
  const invalidData = {
    vorname: 'Test',
    // nachname fehlt
    // email fehlt
  }

  try {
    const response = await fetch(`${BASE_URL}/api/mitarbeiter`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(invalidData)
    })

    const data = await response.json()

    if (response.status === 400 && !data.erfolg) {
      success(`Validierung funktioniert: ${data.fehler}`)
      return true
    } else {
      error('Validierung sollte fehlschlagen, tat es aber nicht')
      return false
    }
  } catch (err) {
    error(`Netzwerkfehler: ${err.message}`)
    return false
  }
}

async function testEmailDuplikat() {
  info('Test 3: E-Mail-Duplikat-Prüfung')
  
  const email = `duplicate-test-${Date.now()}@example.com`
  const mitarbeiter1 = { ...testMitarbeiter, email }

  try {
    // Ersten Mitarbeiter anlegen
    const response1 = await fetch(`${BASE_URL}/api/mitarbeiter`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(mitarbeiter1)
    })

    const data1 = await response1.json()

    if (!response1.ok || !data1.erfolg) {
      error('Konnte ersten Mitarbeiter nicht anlegen')
      return false
    }

    // Zweiten Mitarbeiter mit gleicher E-Mail anlegen
    const response2 = await fetch(`${BASE_URL}/api/mitarbeiter`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(mitarbeiter1)
    })

    const data2 = await response2.json()

    if (response2.status === 400 && !data2.erfolg && data2.fehler.includes('E-Mail')) {
      success(`Duplikat-Prüfung funktioniert: ${data2.fehler}`)
      return true
    } else {
      error('Duplikat-Prüfung sollte fehlschlagen, tat es aber nicht')
      return false
    }
  } catch (err) {
    error(`Netzwerkfehler: ${err.message}`)
    return false
  }
}

async function testEmailFormatValidierung() {
  info('Test 4: E-Mail-Format-Validierung')
  
  const invalidEmail = { ...testMitarbeiter, email: 'invalid-email' }

  try {
    const response = await fetch(`${BASE_URL}/api/mitarbeiter`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(invalidEmail)
    })

    const data = await response.json()

    if (response.status === 400 && !data.erfolg && data.fehler.includes('E-Mail')) {
      success(`E-Mail-Format-Validierung funktioniert: ${data.fehler}`)
      return true
    } else {
      error('E-Mail-Format-Validierung sollte fehlschlagen')
      return false
    }
  } catch (err) {
    error(`Netzwerkfehler: ${err.message}`)
    return false
  }
}

async function testMitarbeiterAbrufen() {
  info('Test 5: Mitarbeiter abrufen (GET)')
  
  try {
    const response = await fetch(`${BASE_URL}/api/mitarbeiter`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    })

    const data = await response.json()

    if (response.ok && data.erfolg && Array.isArray(data.mitarbeiter)) {
      success(`${data.mitarbeiter.length} Mitarbeiter abgerufen`)
      return true
    } else {
      error('Fehler beim Abrufen der Mitarbeiter')
      return false
    }
  } catch (err) {
    error(`Netzwerkfehler: ${err.message}`)
    return false
  }
}

// Haupt-Test-Funktion
async function runTests() {
  console.log('\n' + '='.repeat(60))
  console.log('🧪 Mitarbeiter-API Tests')
  console.log('='.repeat(60) + '\n')

  info(`Testing gegen: ${BASE_URL}`)
  console.log('')

  const results = {
    passed: 0,
    failed: 0,
    total: 5
  }

  // Test 1: Mitarbeiter anlegen
  const mitarbeiterId = await testMitarbeiterAnlegen()
  if (mitarbeiterId) results.passed++
  else results.failed++
  console.log('')

  // Test 2: Pflichtfeld-Validierung
  const test2 = await testPflichtfeldValidierung()
  if (test2) results.passed++
  else results.failed++
  console.log('')

  // Test 3: E-Mail-Duplikat
  const test3 = await testEmailDuplikat()
  if (test3) results.passed++
  else results.failed++
  console.log('')

  // Test 4: E-Mail-Format
  const test4 = await testEmailFormatValidierung()
  if (test4) results.passed++
  else results.failed++
  console.log('')

  // Test 5: Mitarbeiter abrufen
  const test5 = await testMitarbeiterAbrufen()
  if (test5) results.passed++
  else results.failed++
  console.log('')

  // Zusammenfassung
  console.log('='.repeat(60))
  console.log('📊 Test-Zusammenfassung')
  console.log('='.repeat(60))
  console.log(`Gesamt:      ${results.total}`)
  console.log(`${colors.green}Bestanden:   ${results.passed}${colors.reset}`)
  console.log(`${colors.red}Fehlgeschlagen: ${results.failed}${colors.reset}`)
  console.log('='.repeat(60) + '\n')

  // Exit-Code
  process.exit(results.failed > 0 ? 1 : 0)
}

// Tests ausführen
runTests().catch(err => {
  error(`Unerwarteter Fehler: ${err.message}`)
  console.error(err)
  process.exit(1)
})

