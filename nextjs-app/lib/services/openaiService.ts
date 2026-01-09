import OpenAI from 'openai'
import { KundenDetailBericht } from '@/lib/db/types'

// Lazy initialization to avoid build errors when API key is not set
let openai: OpenAI | null = null

function getOpenAI(): OpenAI {
  if (!openai) {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error('Missing credentials. Please pass an `apiKey`, or set the `OPENAI_API_KEY` environment variable.')
    }
    openai = new OpenAI({
      apiKey
    })
  }
  return openai
}

export interface KIBerichtResult {
  executiveSummary: string
  aktivitaeten: string
  finanzen: string
  projekte: string
  risikenUndEmpfehlungen: string
  highlights: string[]
  offenePunkte: string[]
  naechsteSchritte: string[]
  tokenCount?: number
  generierungsdauer: number
}

export async function generiereKundenbericht(
  bericht: KundenDetailBericht
): Promise<KIBerichtResult> {
  const startTime = Date.now()

  const { kunde, kpis, aktivitaeten, zeitraum } = bericht

  const kundeName = kunde.firma || `${kunde.vorname || ''} ${kunde.nachname || ''}`.trim()
  const zeitraumBeschreibung = getZeitraumBeschreibung(zeitraum.typ)

  // Erstelle einen strukturierten Prompt
  const systemPrompt = `Du bist ein Business-Analyst für ein Gerüstbau-ERP-System. 
Deine Aufgabe ist es, prägnante und professionelle Kundenberichte zu erstellen.
Die Berichte sollen klar strukturiert sein und konkrete Handlungsempfehlungen enthalten.
Schreibe auf Deutsch in einem professionellen, aber verständlichen Stil.
Antworte IMMER im JSON-Format mit den vorgegebenen Feldern.`

  const userPrompt = `Erstelle einen Kundenbericht für folgenden Kunden:

**Kunde:** ${kundeName}
**Kundennummer:** ${kunde.kundennummer || 'N/A'}
**Zeitraum:** ${zeitraumBeschreibung}

**Kennzahlen:**
- Anzahl Anfragen: ${kpis.anzahlAnfragen}
- Angebotsvolumen: ${kpis.angebotsvolumen.toLocaleString('de-DE')} €
- Rechnungsvolumen: ${kpis.rechnungsvolumen.toLocaleString('de-DE')} €
- Offener Betrag: ${kpis.offenerBetrag.toLocaleString('de-DE')} €
- Mahnungen offen: ${kpis.mahnungenOffen}
- Zahlungsquote: ${kpis.zahlungsquote.toFixed(1)}%
- Durchschnittliche Zahlungsdauer: ${kpis.durchschnittlicheZahlungszeit} Tage
- Aktive Projekte: ${kpis.aktiveProjekte}
- Abgeschlossene Projekte: ${kpis.abgeschlosseneProjekte}
- Gesamt Projekte: ${kpis.gesamtprojekte}

**Aktivitäten (Auswahl der letzten ${aktivitaeten.length}):**
${aktivitaeten.slice(0, 10).map(a => `- ${a.typ}: ${a.titel} (${a.status || 'N/A'}) - ${new Date(a.zeitpunkt).toLocaleDateString('de-DE')}`).join('\n')}

**Aufgabe:**
Erstelle einen strukturierten Bericht mit folgenden Abschnitten:

1. **Executive Summary** (2-3 Sätze): Kurze Zusammenfassung der wichtigsten Erkenntnisse
2. **Aktivitäten** (3-4 Sätze): Was ist im Zeitraum passiert?
3. **Finanzen** (3-4 Sätze): Analyse der finanziellen Situation
4. **Projekte** (2-3 Sätze): Status der Projekte
5. **Risiken und Empfehlungen** (3-5 Sätze): Identifizierte Risiken und konkrete Handlungsempfehlungen
6. **Highlights** (3-5 Stichpunkte): Wichtigste Highlights
7. **Offene Punkte** (2-4 Stichpunkte): Was ist noch offen/zu klären?
8. **Nächste Schritte** (3-5 Stichpunkte): Konkrete Handlungsempfehlungen

Verwende eine sachliche, professionelle Sprache. Sei prägnant und fokussiere auf das Wesentliche.

Antworte im JSON-Format mit folgender Struktur:
{
  "executiveSummary": "...",
  "aktivitaeten": "...",
  "finanzen": "...",
  "projekte": "...",
  "risikenUndEmpfehlungen": "...",
  "highlights": ["...", "...", "..."],
  "offenePunkte": ["...", "..."],
  "naechsteSchritte": ["...", "...", "..."]
}`

  try {
    const response = await getOpenAI().chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: userPrompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000,
      response_format: { type: 'json_object' }
    })

    const content = response.choices[0].message.content
    if (!content) {
      throw new Error('Keine gültige Antwort von OpenAI erhalten')
    }

    const result = JSON.parse(content) as KIBerichtResult

    const endTime = Date.now()
    const generierungsdauer = endTime - startTime

    return {
      ...result,
      tokenCount: response.usage?.total_tokens,
      generierungsdauer
    }
  } catch (error) {
    console.error('Fehler bei der KI-Berichterstellung:', error)
    throw new Error('Fehler bei der KI-Berichterstellung')
  }
}

function getZeitraumBeschreibung(typ: string): string {
  const labels: Record<string, string> = {
    all: 'Alle Daten',
    letzte_30_tage: 'Letzte 30 Tage',
    letzte_90_tage: 'Letzte 90 Tage',
    letztes_jahr: 'Letztes Jahr',
    aktuelles_jahr: 'Aktuelles Jahr',
    aktuelles_quartal: 'Aktuelles Quartal',
    vorjahr: 'Vorjahr',
    letztes_quartal: 'Letztes Quartal',
    benutzerdefiniert: 'Benutzerdefinierter Zeitraum'
  }
  return labels[typ] || 'Unbekannter Zeitraum'
}

/**
 * Generiert einen KI-Finanzbericht basierend auf Transaktionen
 */
export async function generateFinanzenKIBericht(data: {
  transaktionen: any[]
  einnahmenGesamt: number
  ausgabenGesamt: number
  zeitraum: any
  kontostand?: number
  kategorien?: any[]
  budgets?: any[]
}) {
  // Kategorien-Analyse vorbereiten (Ausgaben)
  const kategorienAusgabenText = data.kategorien && data.kategorien.length > 0
    ? data.kategorien
        .filter((k: any) => k.typ === 'ausgabe')
        .map((k: any) => {
          const ausgabenSumme = data.transaktionen
            .filter((t: any) => t.typ === 'ausgabe' && t.kategorieId === k._id)
            .reduce((sum: number, t: any) => sum + t.betrag, 0)
          return `- ${k.name}: ${ausgabenSumme.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}`
        })
        .join('\n')
    : 'Keine Kategorien-Daten verfügbar'

  // Kategorien-Analyse vorbereiten (Einnahmen)
  const kategorienEinnahmenText = data.kategorien && data.kategorien.length > 0
    ? data.kategorien
        .filter((k: any) => k.typ === 'einnahme')
        .map((k: any) => {
          const einnahmenSumme = data.transaktionen
            .filter((t: any) => t.typ === 'einnahme' && t.kategorieId === k._id)
            .reduce((sum: number, t: any) => sum + t.betrag, 0)
          return `- ${k.name}: ${einnahmenSumme.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}`
        })
        .join('\n')
    : 'Keine Kategorien-Daten verfügbar'

  // Budget-Analyse vorbereiten
  const budgetText = data.budgets && data.budgets.length > 0
    ? data.budgets.map((b: any) => 
        `- ${b.kategorieName}: ${b.ausgabenAktuell?.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })} von ${b.budgetBetrag?.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })} (${b.prozentAusgelastet?.toFixed(0)}%)`
      ).join('\n')
    : 'Keine Budget-Daten verfügbar'

  const prompt = `
Sie sind ein Finanzanalyst für ein Gerüstbau-Unternehmen.

Analysieren Sie die folgenden Finanzdaten für den Zeitraum ${data.zeitraum.von} bis ${data.zeitraum.bis}:

FINANZÜBERSICHT:
- Aktueller Kontostand: ${data.kontostand ? data.kontostand.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' }) : 'Nicht erfasst'}
- Gesamteinnahmen: ${data.einnahmenGesamt.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
- Gesamtausgaben: ${data.ausgabenGesamt.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
- Saldo (Gewinn/Verlust): ${(data.einnahmenGesamt - data.ausgabenGesamt).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
- Anzahl Transaktionen: ${data.transaktionen.length}

KATEGORIEN-ÜBERSICHT (Einnahmen):
${kategorienEinnahmenText}

KATEGORIEN-ÜBERSICHT (Ausgaben):
${kategorienAusgabenText}

BUDGET-STATUS:
${budgetText}

TRANSAKTIONS-DETAILS (Auszug):
${JSON.stringify(data.transaktionen.slice(0, 30), null, 2)}

Erstellen Sie einen strukturierten, detaillierten Finanzbericht mit folgenden Abschnitten:

1. ZUSAMMENFASSUNG: Kurze Übersicht der finanziellen Situation inkl. Kontostand-Entwicklung und Netto-Cashflow (2-3 Sätze)
2. KENNZAHLEN: Wichtigste Finanzkennzahlen mit konkreten Zahlen (Rentabilität, Cashflow, Liquidität, Einnahmen-Ausgaben-Verhältnis)
3. KATEGORIEANALYSE: Detaillierte Analyse der Einnahmen- und Ausgaben-Kategorien mit Top 5 jeweils und deren Bedeutung für das Geschäft
4. GRÖSSTE TRANSAKTIONEN: Top 5 einzelne Einnahmen und Top 5 einzelne Ausgaben mit Kontext
5. AUFFÄLLIGKEITEN: Ungewöhnliche Muster, Spitzen, Anomalien in den Daten (sowohl Einnahmen als auch Ausgaben) mit konkreten Beispielen
6. EMPFEHLUNGEN: Konkrete, umsetzbare Handlungsempfehlungen für Kostenoptimierung und Umsatzsteigerung
7. RISIKEN: Finanzielle Risiken basierend auf Budgets, Einnahmen- und Ausgaben-Trends
8. LIQUIDITÄTSPROGNOSE: Prognose für die nächsten 30 Tage basierend auf aktuellen Einnahmen/Ausgaben-Trends und Budgets
9. NÄCHSTE SCHRITTE: Prioritäre Maßnahmen mit Zeitrahmen

Antworten Sie im JSON-Format mit exakt diesen Feldern:
{
  "zusammenfassung": "...",
  "kennzahlen": "...",
  "kategorieAnalyse": "...",
  "groessteAusgaben": "...",
  "auffaelligkeiten": "...",
  "empfehlungen": "...",
  "risiken": "...",
  "liquiditaetsprognose": "...",
  "naechsteSchritte": "..."
}

WICHTIG - Formatierung:
- ALLE Felder müssen einfache STRING-Werte sein (keine verschachtelten Objekte oder Arrays!)
- Alle Texte auf Deutsch
- Sehr konkret und handlungsorientiert
- Zahlen immer mit Kontext und Interpretation im Text
- Praxisnahe Empfehlungen speziell für ein Gerüstbau-Unternehmen
- Beziehe Kontostand, Einnahmen, Ausgaben und Budget-Status in die Analyse ein
- Kategorien-spezifische Insights für BEIDE Seiten (Einnahmen: Projektabrechnung, Service etc. / Ausgaben: Personal, Material, Sprit, etc.)
- Analysiere das Verhältnis von Einnahmen zu Ausgaben und die Profitabilität
- Mehrzeilige Texte mit Zeilenumbrüchen formatieren
- Listen mit • oder - darstellen
`

  try {
    const response = await getOpenAI().chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'Sie sind ein erfahrener Finanzanalyst für KMU im Handwerk, speziell Gerüstbau. Antworten Sie präzise, pragmatisch und auf Deutsch. Nutzen Sie JSON für strukturierte Daten. Die Antwort muss im validen JSON-Format sein.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7
    })

    const content = response.choices[0]?.message?.content || '{}'
    const parsed = JSON.parse(content)
    
    // Validiere und konvertiere die erwarteten Felder zu Strings
    const requiredFields = ['zusammenfassung', 'kennzahlen', 'kategorieAnalyse', 'groessteAusgaben', 'auffaelligkeiten', 'empfehlungen', 'risiken', 'liquiditaetsprognose', 'naechsteSchritte']
    for (const field of requiredFields) {
      if (!parsed[field]) {
        parsed[field] = 'Keine Daten verfügbar'
      } else if (typeof parsed[field] === 'object' && parsed[field] !== null) {
        // Wenn das Feld ein Objekt ist, konvertiere es in einen formatierten String
        parsed[field] = JSON.stringify(parsed[field], null, 2)
          .replace(/[{}",]/g, '')
          .replace(/\n\s+/g, '\n')
          .trim()
      }
    }
    
    return parsed
  } catch (error: any) {
    console.error('Fehler beim Generieren des Finanzberichts:', error)
    
    // Fallback-Bericht bei Fehler
    return {
      zusammenfassung: 'Der KI-Bericht konnte aufgrund eines technischen Fehlers nicht generiert werden.',
      kennzahlen: `Einnahmen: ${data.einnahmenGesamt.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}\nAusgaben: ${data.ausgabenGesamt.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}\nSaldo: ${(data.einnahmenGesamt - data.ausgabenGesamt).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}`,
      groessteAusgaben: 'Daten nicht verfügbar',
      auffaelligkeiten: 'Analyse fehlgeschlagen',
      empfehlungen: 'Bitte kontaktieren Sie den Support',
      risiken: 'Keine Risikoanalyse möglich',
      naechsteSchritte: 'Bitte versuchen Sie es später erneut'
    }
  }
}

/**
 * KI-gestützte Beleg-Auslese mit OpenAI Vision API
 */
export interface BelegAusleseResult {
  erfolg: boolean
  confidence: number // 0-1
  daten: {
    datum?: string // YYYY-MM-DD
    bruttobetrag?: number
    nettobetrag?: number
    mwstSatz?: number
    mwstBetrag?: number
    beschreibung?: string
    kategorieVorschlag?: string
    zahlungsart?: string
    lieferant?: string
    name?: string // Name/Titel des Belegs
  }
  rohdaten: string // Komplette KI-Antwort
  fehler?: string
}

/**
 * Konvertiert ALLE Seiten einer PDF in PNG-Bilder mit pdf2pic
 */
async function pdfZuBildKonvertieren(pdfBase64: string): Promise<{ bildBase64: string[]; mimeType: string }> {
  try {
    const { fromBuffer } = await import('pdf2pic')
    const fs = await import('fs')
    const path = await import('path')
    const os = await import('os')

    console.log('📄 Konvertiere PDF zu Bildern mit pdf2pic...')
    
    // PDF Buffer erstellen
    const pdfBuffer = Buffer.from(pdfBase64, 'base64')
    
    // Temporäres Verzeichnis für die Konvertierung
    const tempDir = os.tmpdir()
    const tempOutputPath = path.join(tempDir, `pdf_conversion_${Date.now()}`)
    
    // pdf2pic Optionen konfigurieren
    const options = {
      density: 300,           // DPI für hohe Qualität
      saveFilename: 'converted',
      savePath: tempOutputPath,
      format: 'png',
      width: 2480,            // A4 bei 300 DPI
      height: 3508
    }
    
    // PDF zu Bildern konvertieren - ALLE Seiten (max 5 für Performance)
    const convert = fromBuffer(pdfBuffer, options)
    const seitenBilder: string[] = []
    const maxSeiten = 5 // Max 5 Seiten für Performance
    
    console.log('🔄 Konvertiere alle PDF-Seiten...')
    
    for (let seite = 1; seite <= maxSeiten; seite++) {
      try {
        const result = await convert(seite, { responseType: 'base64' })
        if (result.base64) {
          seitenBilder.push(result.base64)
          console.log(`✅ Seite ${seite} konvertiert`)
        } else {
          // Keine weitere Seite vorhanden
          break
        }
      } catch (error) {
        // Keine weitere Seite vorhanden
        console.log(`ℹ️ PDF hat ${seite - 1} Seite(n)`)
        break
      }
    }
    
    console.log(`✅ PDF erfolgreich zu ${seitenBilder.length} PNG-Bild(ern) konvertiert`)
    
    // Aufräumen: Temporäre Dateien löschen
    try {
      if (fs.existsSync(tempOutputPath)) {
        fs.rmSync(tempOutputPath, { recursive: true, force: true })
      }
    } catch (cleanupError) {
      console.warn('⚠️ Warnung beim Aufräumen temporärer Dateien:', cleanupError)
    }
    
    return {
      bildBase64: seitenBilder,
      mimeType: 'image/png'
    }
  } catch (error: any) {
    console.error('❌ Fehler bei PDF-zu-Bild-Konvertierung:', error)
    throw new Error(`PDF-zu-Bild-Konvertierung fehlgeschlagen: ${error.message}`)
  }
}

/**
 * Verarbeitet PDF-Belege (konvertiert zu Bild und analysiert mit Vision API)
 */
async function verarbeitePDFBeleg(
  pdfBase64: string,
  typ: 'einnahme' | 'ausgabe'
): Promise<BelegAusleseResult> {
  try {
    console.log('📄 Konvertiere PDF zu Bildern für Vision API...')
    const { bildBase64: seitenBilder, mimeType } = await pdfZuBildKonvertieren(pdfBase64)
    console.log(`✅ PDF zu ${seitenBilder.length} Bild(ern) konvertiert, sende an Vision API...`)

    // Baue Content-Array mit allen Seiten
    const contentItems: any[] = [
      {
        type: 'text',
        text: `Analysiere ALLE Seiten dieses mehrseitigen Belegs (${seitenBilder.length} Seite(n)) für eine ${typ === 'einnahme' ? 'Rechnung/Einnahme' : 'Ausgabe/Quittung'}.
        
🔴 WICHTIG: 
- Der BETRAG kann auf JEDER Seite stehen - prüfe ALLE Seiten!
- Suche auf allen Seiten nach dem Gesamtbetrag/Endbetrag
- Der Bruttobetrag ist oft auf der letzten Seite oder in einer Zusammenfassung
- Extrahiere auch Nettobetrag und MwSt, egal auf welcher Seite sie stehen`
      }
    ]

    // Füge alle Seiten-Bilder hinzu
    for (let i = 0; i < seitenBilder.length; i++) {
      contentItems.push({
        type: 'image_url',
        image_url: {
          url: `data:${mimeType};base64,${seitenBilder[i]}`,
          detail: 'high'
        }
      })
    }

    // Jetzt alle Seiten mit Vision API analysieren
    const response = await getOpenAI().chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `Du bist ein Experte für das Auslesen von Rechnungen, Quittungen und Belegen für ein Gerüstbau-Unternehmen. 
Extrahiere alle relevanten Informationen aus dem Beleg.
Antworte IMMER im JSON-Format mit folgendem Schema:
{
  "typ": "einnahme|ausgabe",
  "datum": "YYYY-MM-DD oder null",
  "bruttobetrag": number oder null,
  "nettobetrag": number oder null,
  "mwstSatz": number oder null (z.B. 19 für 19%),
  "mwstBetrag": number oder null,
  "name": "string oder null (Titel/Name des Belegs)",
  "beschreibung": "string oder null",
  "kategorieVorschlag": "string oder null",
  "zahlungsart": "ueberweisung|bar|karte|paypal|lastschrift|sonstige oder null",
  "lieferant": "string oder null",
  "confidence": number (0.0-1.0, deine Einschätzung wie sicher die Extraktion ist)
}

🔴 KRITISCH - TYP ERKENNUNG (EINNAHME vs AUSGABE):
Erkenne automatisch, ob es sich um eine EINNAHME oder AUSGABE handelt:
- AUSGABE: Rechnungen/Belege die das Unternehmen BEZAHLEN muss
  * Lieferantenrechnungen (z.B. "Rechnung von TechVision", "Invoice from...")
  * Ausgaben für Material, Software, Marketing, Benzin, etc.
  * Das Unternehmen ist der KUNDE/EMPFÄNGER der Dienstleistung
  * Typische Begriffe: "Rechnung", "Invoice", "Zahlbar bis", "Fällig am"
  
- EINNAHME: Rechnungen die das Unternehmen AN KUNDEN stellt
  * Ausgehende Rechnungen an Kunden
  * Das Unternehmen ist der LIEFERANT/DIENSTLEISTER
  * Typische Begriffe: "Rechnungssteller: [Firmenname]", "Gerüstbau", "An: [Kundenname]"
  * Bankgutschriften, Zahlungseingänge

Im Zweifelsfall: Wenn es eine Rechnung VON einem Lieferanten ist → "ausgabe"

🔴 KRITISCH - MULTI-PAGE BETRAG EXTRAKTION:
Der BETRAG ist das WICHTIGSTE Feld! Bei mehrseitigen Dokumenten:
- PRÜFE ALLE SEITEN nach dem Gesamtbetrag/Endbetrag
- Der Betrag steht oft auf der LETZTEN Seite oder in einer Zusammenfassung/Übersicht
- Suche auf JEDER Seite nach: "Gesamt", "Total", "Endbetrag", "Summe", "Zu zahlen", "Betrag", "Amount", "Gesamt brutto", "Rechnungsbetrag", "Fälliger Betrag"
- Der Bruttobetrag ist meist der größte, deutlich hervorgehobene Betrag
- Wenn mehrere Beträge auf verschiedenen Seiten: Nimm den FINALEN Gesamtbetrag (inkl. MwSt)
- Format: Nur die Zahl ohne Währung (z.B. 1234.56)
- Verwende PUNKT als Dezimaltrennzeichen
- Bei Komma als Dezimaltrenner (z.B. "1.234,56"): Konvertiere zu "1234.56"

MwSt & Netto (auf ALLEN Seiten suchen):
- Suche nach "Netto", "Nettobetrag", "Zwischensumme"
- Suche nach "MwSt", "Mehrwertsteuer", "USt", "Umsatzsteuer", "VAT"
- MwSt-Satz: Suche nach "19%", "7%", etc.
- Diese Informationen können auf verschiedenen Seiten verteilt sein

Kategorievorschlag - KRITISCH:
Für AUSGABEN wähle EXAKT aus: "Marketing", "Software / Tools", "Material / Einkauf", "Fahrzeuge / Leasing / Sprit", "Miete / Büro", "Versicherungen", "Subunternehmer", "Personal", "Steuern / Abgaben", "Sonstiges"
Für EINNAHMEN wähle EXAKT aus: "Projektabrechnung / Rechnung", "Service & Wartung", "Beratung / Stunden", "Sonstiges"
Verwende die EXAKTE Schreibweise aus der Liste (inkl. " / " und " & ")!

Weitere Hinweise:
- Extrahiere das Datum im Format YYYY-MM-DD (kann auf jeder Seite stehen)
- Name: Kurzer prägnanter Name/Titel des Belegs
- Beschreibung: Zusammenfassung aller wichtigen Details aus ALLEN Seiten
- Lieferant: Name des Händlers/Anbieters
- Confidence: Gib an wie sicher du dir bei der Extraktion bist (0.0 = unsicher, 1.0 = sehr sicher)`
        },
        {
          role: 'user',
          content: contentItems
        }
      ],
      max_tokens: 1500,
      temperature: 0.1
    })

    const content = response.choices[0].message.content
    if (!content) {
      throw new Error('Keine Antwort von OpenAI erhalten')
    }

    // JSON aus der Antwort extrahieren
    let jsonString = content
    const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/```\n([\s\S]*?)\n```/)
    if (jsonMatch) {
      jsonString = jsonMatch[1]
    }

    const parsed = JSON.parse(jsonString)

    // Log für Debug-Zwecke
    console.log('📊 OpenAI Parsed Result:', JSON.stringify(parsed, null, 2))

    return {
      erfolg: true,
      confidence: parsed.confidence || 0.8,
      daten: {
        typ: parsed.typ || undefined, // NEU: Erkannter Typ (einnahme/ausgabe)
        datum: parsed.datum || undefined,
        // Wichtig: Bei Zahlen !== null/undefined prüfen, nicht ||, da 0 ein valider Wert ist
        bruttobetrag: (parsed.bruttobetrag !== null && parsed.bruttobetrag !== undefined) ? Number(parsed.bruttobetrag) : undefined,
        nettobetrag: (parsed.nettobetrag !== null && parsed.nettobetrag !== undefined) ? Number(parsed.nettobetrag) : undefined,
        mwstSatz: (parsed.mwstSatz !== null && parsed.mwstSatz !== undefined) ? Number(parsed.mwstSatz) : undefined,
        mwstBetrag: (parsed.mwstBetrag !== null && parsed.mwstBetrag !== undefined) ? Number(parsed.mwstBetrag) : undefined,
        name: parsed.name || undefined,
        beschreibung: parsed.beschreibung || undefined,
        kategorieVorschlag: parsed.kategorieVorschlag || undefined,
        zahlungsart: parsed.zahlungsart || undefined,
        lieferant: parsed.lieferant || undefined
      },
      rohdaten: content,
      konvertiertesbildBase64: seitenBilder[0], // Erste Seite für Vorschau
      konvertiertesbildMimeType: mimeType
    }
  } catch (error: any) {
    console.error('❌ Fehler bei PDF-Beleg-Auslese:', error)
    return {
      erfolg: false,
      confidence: 0,
      daten: {},
      rohdaten: '',
      fehler: `PDF-Verarbeitung fehlgeschlagen: ${error.message}`
    }
  }
}

export async function leseBelegAus(
  imageBase64: string,
  mimeType: string,
  typ: 'einnahme' | 'ausgabe'
): Promise<BelegAusleseResult> {
  try {
    console.log(`📄 Starte Beleg-Auslese mit MIME-Type: ${mimeType}`)
    
    // Für PDFs: Text-basierte Verarbeitung
    if (mimeType === 'application/pdf') {
      return await verarbeitePDFBeleg(imageBase64, typ)
    }
    
    // Für Bilder: Vision API
    const response = await getOpenAI().chat.completions.create({
      model: 'gpt-4o', // Vision-Modell für Bilder
      messages: [
        {
          role: 'system',
          content: `Du bist ein Experte für das Auslesen von Rechnungen, Quittungen und Belegen für ein Gerüstbau-Unternehmen. 
Extrahiere alle relevanten Informationen aus dem Beleg.
Antworte IMMER im JSON-Format mit folgendem Schema:
{
  "typ": "einnahme|ausgabe",
  "datum": "YYYY-MM-DD oder null",
  "bruttobetrag": number oder null,
  "nettobetrag": number oder null,
  "mwstSatz": number oder null (z.B. 19 für 19%),
  "mwstBetrag": number oder null,
  "name": "string oder null (Titel/Name des Belegs)",
  "beschreibung": "string oder null",
  "kategorieVorschlag": "string oder null",
  "zahlungsart": "ueberweisung|bar|karte|paypal|lastschrift|sonstige oder null",
  "lieferant": "string oder null",
  "confidence": number (0.0-1.0, deine Einschätzung wie sicher die Extraktion ist)
}

🔴 TYP ERKENNUNG (EINNAHME vs AUSGABE):
- AUSGABE: Rechnungen die das Unternehmen BEZAHLEN muss (Lieferantenrechnungen)
- EINNAHME: Rechnungen die das Unternehmen AN KUNDEN stellt
Im Zweifelsfall: Rechnung VON einem Lieferanten → "ausgabe"

KRITISCH - BETRAG EXTRAKTION:
Der BETRAG ist das WICHTIGSTE Feld! Suche intensiv nach dem Gesamtbetrag/Endbetrag:
- Suche nach: "Gesamt", "Total", "Endbetrag", "Summe", "Zu zahlen", "Betrag", "Amount", "Gesamt brutto"
- Der Bruttobetrag ist meist der größte, deutlich sichtbare Betrag auf dem Beleg
- Wenn mehrere Beträge sichtbar sind: Nimm den FINALEN Gesamtbetrag (inkl. MwSt)
- Format: Nur die Zahl ohne Währung (z.B. 1234.56)
- Verwende PUNKT als Dezimaltrennzeichen
- Bei Komma als Dezimaltrenner (z.B. "1.234,56"): Konvertiere zu "1234.56"

Kategorievorschlag - KRITISCH:
Für AUSGABEN wähle EXAKT aus: "Marketing", "Software / Tools", "Material / Einkauf", "Fahrzeuge / Leasing / Sprit", "Miete / Büro", "Versicherungen", "Subunternehmer", "Personal", "Steuern / Abgaben", "Sonstiges"
Für EINNAHMEN wähle EXAKT aus: "Projektabrechnung / Rechnung", "Service & Wartung", "Beratung / Stunden", "Sonstiges"
Verwende die EXAKTE Schreibweise aus der Liste (inkl. " / " und " & ")!

Weitere Hinweise:
- Extrahiere das Datum im Format YYYY-MM-DD
- Bei MwSt: Wenn nur Bruttobetrag sichtbar, versuche Netto/MwSt zu berechnen
- Name: Kurzer prägnanter Name/Titel des Belegs (z.B. "TechVision Rechnung", "Shell Tankrechnung")
- Beschreibung: Detailliertere Beschreibung mit wichtigen Details (Leistungen, Produkte, Zeitraum)
- Lieferant: Name des Händlers/Anbieters (z.B. "TechVision", "Shell", "Amazon")
- Zahlungsart: Erkenne aus dem Beleg die Zahlungsart
- Confidence: Gib an wie sicher du dir bei der Extraktion bist (0.0 = unsicher, 1.0 = sehr sicher)`
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Lese dieses Bild für eine ${typ === 'einnahme' ? 'Rechnung/Einnahme' : 'Ausgabe/Quittung'} aus und extrahiere alle Informationen.`
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${imageBase64}`
              }
            }
          ]
        }
      ],
      max_tokens: 1000,
      temperature: 0.1 // Niedrige Temperature für präzisere Extraktion
    })

    const content = response.choices[0].message.content
    if (!content) {
      throw new Error('Keine Antwort von OpenAI erhalten')
    }

    // JSON aus der Antwort extrahieren (falls in Markdown Code-Block eingebettet)
    let jsonString = content
    const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/```\n([\s\S]*?)\n```/)
    if (jsonMatch) {
      jsonString = jsonMatch[1]
    }

    const parsed = JSON.parse(jsonString)

    // Log für Debug-Zwecke
    console.log('📊 OpenAI Parsed Result (Bild):', JSON.stringify(parsed, null, 2))

    return {
      erfolg: true,
      confidence: parsed.confidence || 0.8,
      daten: {
        typ: parsed.typ || undefined, // NEU: Erkannter Typ (einnahme/ausgabe)
        datum: parsed.datum || undefined,
        // Wichtig: Bei Zahlen !== null/undefined prüfen, nicht ||, da 0 ein valider Wert ist
        bruttobetrag: (parsed.bruttobetrag !== null && parsed.bruttobetrag !== undefined) ? Number(parsed.bruttobetrag) : undefined,
        nettobetrag: (parsed.nettobetrag !== null && parsed.nettobetrag !== undefined) ? Number(parsed.nettobetrag) : undefined,
        mwstSatz: (parsed.mwstSatz !== null && parsed.mwstSatz !== undefined) ? Number(parsed.mwstSatz) : undefined,
        mwstBetrag: (parsed.mwstBetrag !== null && parsed.mwstBetrag !== undefined) ? Number(parsed.mwstBetrag) : undefined,
        name: parsed.name || undefined,
        beschreibung: parsed.beschreibung || undefined,
        kategorieVorschlag: parsed.kategorieVorschlag || undefined,
        zahlungsart: parsed.zahlungsart || undefined,
        lieferant: parsed.lieferant || undefined
      },
      rohdaten: content
    }
  } catch (error: any) {
    console.error('Fehler bei Beleg-Auslese:', error)
    return {
      erfolg: false,
      confidence: 0,
      daten: {},
      rohdaten: '',
      fehler: error.message
    }
  }
}
