import { NextRequest, NextResponse } from 'next/server'
import { Angebot, AngebotPosition } from '@/lib/db/types'

// PDF-Generierung mit HTML/CSS
// In einer produktiven Umgebung würde man hier Puppeteer oder eine PDF-Library verwenden
// Für diese Demo verwenden wir eine einfache HTML-zu-PDF-Konvertierung

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { angebot, positionen, kalkulation }: {
      angebot: Partial<Angebot>
      positionen: AngebotPosition[]
      kalkulation: {
        nettosumme: number
        mwstBetrag: number
        bruttosumme: number
      }
    } = body

    if (!angebot || !positionen || positionen.length === 0) {
      return NextResponse.json(
        { erfolg: false, fehler: 'Ungültige Angebotsdaten' },
        { status: 400 }
      )
    }

    // HTML-Template für PDF
    const html = generatePDFHTML(angebot, positionen, kalkulation)

    // Für eine echte PDF-Generierung würde man hier Puppeteer verwenden:
    // const browser = await puppeteer.launch()
    // const page = await browser.newPage()
    // await page.setContent(html)
    // const pdf = await page.pdf({ format: 'A4', printBackground: true })
    // await browser.close()

    // Vorübergehende Lösung: HTML als Blob zurückgeben
    // In Produktion: PDF-Buffer verwenden
    const htmlBlob = new Blob([html], { type: 'text/html' })
    
    // TODO: Für Produktion Puppeteer oder PDFKit integrieren
    // Momentan wird HTML zurückgegeben, das der Browser als PDF drucken kann
    
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': `attachment; filename="Angebot_${angebot.angebotsnummer || 'Entwurf'}.html"`
      }
    })

  } catch (error) {
    console.error('Fehler bei PDF-Generierung:', error)
    return NextResponse.json(
      { erfolg: false, fehler: 'PDF-Generierung fehlgeschlagen' },
      { status: 500 }
    )
  }
}

function generatePDFHTML(
  angebot: Partial<Angebot>,
  positionen: AngebotPosition[],
  kalkulation: { nettosumme: number; mwstBetrag: number; bruttosumme: number }
): string {
  const formatDate = (date: string | Date | undefined) => {
    if (!date) return '-'
    const d = new Date(date)
    return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
  }

  return `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Angebot ${angebot.angebotsnummer || ''}</title>
  <style>
    @page {
      size: A4;
      margin: 2cm;
    }
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #333;
      background: white;
    }
    .container {
      max-width: 21cm;
      margin: 0 auto;
      padding: 1cm;
    }
    .header {
      margin-bottom: 2cm;
    }
    .header-top {
      display: flex;
      justify-content: space-between;
      margin-bottom: 1cm;
    }
    .header-left h1 {
      font-size: 24pt;
      font-weight: bold;
      color: #1a1a1a;
      margin-bottom: 0.3cm;
    }
    .header-left p {
      font-size: 10pt;
      color: #666;
    }
    .header-right {
      text-align: right;
      font-size: 10pt;
      color: #666;
    }
    .separator {
      border-bottom: 2px solid #e0e0e0;
      margin: 0.5cm 0;
    }
    .company-info {
      font-size: 8pt;
      color: #999;
      margin-bottom: 0.5cm;
    }
    .customer-address {
      margin-bottom: 1cm;
    }
    .customer-address p {
      margin: 0.1cm 0;
    }
    .customer-address .name {
      font-weight: bold;
      font-size: 12pt;
    }
    .subject {
      font-weight: bold;
      font-size: 13pt;
      margin: 1cm 0 0.5cm 0;
    }
    .intro-text {
      margin-bottom: 1cm;
      white-space: pre-line;
    }
    .positions-title {
      font-size: 14pt;
      font-weight: bold;
      margin: 1cm 0 0.5cm 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 1cm;
    }
    th {
      background: #f5f5f5;
      border: 1px solid #ddd;
      padding: 0.3cm;
      text-align: left;
      font-weight: bold;
      font-size: 10pt;
    }
    td {
      border: 1px solid #ddd;
      padding: 0.3cm;
      font-size: 10pt;
    }
    .text-right {
      text-align: right;
    }
    .text-center {
      text-align: center;
    }
    .position-desc {
      font-weight: 500;
    }
    .position-link {
      font-size: 8pt;
      color: #666;
      display: block;
      margin-top: 0.1cm;
    }
    .calculation {
      margin: 1cm 0 1cm auto;
      width: 50%;
      border: 1px solid #ddd;
      background: #f9f9f9;
      padding: 0.5cm;
    }
    .calc-row {
      display: flex;
      justify-content: space-between;
      margin: 0.2cm 0;
      font-size: 10pt;
    }
    .calc-row.total {
      font-size: 12pt;
      font-weight: bold;
      color: #0066cc;
      padding-top: 0.3cm;
      border-top: 2px solid #ddd;
      margin-top: 0.3cm;
    }
    .section-title {
      font-size: 12pt;
      font-weight: bold;
      margin: 1cm 0 0.3cm 0;
    }
    .section-text {
      white-space: pre-line;
      margin-bottom: 0.8cm;
      font-size: 10pt;
    }
    .footer {
      margin-top: 2cm;
      padding-top: 0.5cm;
      border-top: 1px solid #ddd;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1cm;
      font-size: 8pt;
      color: #666;
    }
    .footer div p {
      margin: 0.1cm 0;
    }
    .footer .footer-title {
      font-weight: bold;
      color: #333;
    }
    @media print {
      .container {
        padding: 0;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <div class="header-top">
        <div class="header-left">
          <h1>ANGEBOT</h1>
          ${angebot.angebotsnummer ? `<p>Nr. ${angebot.angebotsnummer}</p>` : ''}
        </div>
        <div class="header-right">
          <p>Datum: ${formatDate(angebot.angebotsdatum)}</p>
          ${angebot.gueltigBis ? `<p>Gültig bis: ${formatDate(angebot.gueltigBis)}</p>` : ''}
        </div>
      </div>
      
      <div class="separator"></div>
      
      <div class="company-info">
        <p>Firma GmbH • Musterstraße 1 • 12345 Musterstadt</p>
      </div>
      
      <div class="customer-address">
        <p class="name">${angebot.kundeName || 'Kundenname'}</p>
        ${angebot.kundenAdresse ? `
          <p>${angebot.kundenAdresse.strasse}</p>
          <p>${angebot.kundenAdresse.plz} ${angebot.kundenAdresse.ort}</p>
        ` : ''}
      </div>
      
      ${angebot.betreff ? `<div class="subject">Betreff: ${angebot.betreff}</div>` : ''}
    </div>

    <!-- Einleitungstext -->
    ${angebot.einleitungstext ? `
      <div class="intro-text">${angebot.einleitungstext}</div>
    ` : ''}

    <!-- Positionen -->
    ${positionen.length > 0 ? `
      <div class="positions-title">Leistungsverzeichnis</div>
      <table>
        <thead>
          <tr>
            <th style="width: 40px;">Pos.</th>
            <th>Beschreibung</th>
            <th class="text-right" style="width: 80px;">Menge</th>
            <th style="width: 80px;">Einheit</th>
            <th class="text-right" style="width: 100px;">Einzelpreis</th>
            <th class="text-right" style="width: 100px;">Gesamtpreis</th>
          </tr>
        </thead>
        <tbody>
          ${positionen.map(pos => `
            <tr>
              <td class="text-center">${pos.position}</td>
              <td>
                <span class="position-desc">${pos.beschreibung}</span>
                ${pos.verknuepftMitPosition ? `
                  <span class="position-link">(bezieht sich auf Pos. ${pos.verknuepftMitPosition})</span>
                ` : ''}
              </td>
              <td class="text-right">${pos.menge.toFixed(2)}</td>
              <td>${pos.prozentsatz && pos.prozentsatz > 0 ? `${pos.prozentsatz}%` : pos.einheit}</td>
              <td class="text-right">${formatCurrency(pos.einzelpreis)}</td>
              <td class="text-right"><strong>${formatCurrency(pos.gesamtpreis)}</strong></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    ` : ''}

    <!-- Kalkulation -->
    <div class="calculation">
      <div class="calc-row">
        <span>Nettosumme:</span>
        <span><strong>${formatCurrency(kalkulation.nettosumme)}</strong></span>
      </div>
      <div class="calc-row">
        <span>zzgl. MwSt. (${angebot.mwstSatz || 19}%):</span>
        <span><strong>${formatCurrency(kalkulation.mwstBetrag)}</strong></span>
      </div>
      <div class="calc-row total">
        <span>Bruttosumme:</span>
        <span>${formatCurrency(kalkulation.bruttosumme)}</span>
      </div>
    </div>

    <!-- Zahlungsbedingungen -->
    ${angebot.zahlungsbedingungen ? `
      <div class="section-title">Zahlungsbedingungen</div>
      <div class="section-text">${angebot.zahlungsbedingungen}</div>
    ` : ''}

    <!-- Schlusstext -->
    ${angebot.schlusstext ? `
      <div class="section-text">${angebot.schlusstext}</div>
    ` : ''}

    <!-- Footer -->
    <div class="footer">
      <div>
        <p class="footer-title">Firma GmbH</p>
        <p>Musterstraße 1</p>
        <p>12345 Musterstadt</p>
      </div>
      <div>
        <p>Tel: +49 123 456789</p>
        <p>Fax: +49 123 456790</p>
        <p>E-Mail: info@firma.de</p>
      </div>
      <div>
        <p>Geschäftsführer: Max Mustermann</p>
        <p>USt-IdNr.: DE123456789</p>
        <p>Steuernr.: 123/456/78901</p>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim()
}

