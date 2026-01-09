import PDFDocument from 'pdfkit'
import { Rechnung, AngebotPosition } from '@/lib/db/types'

interface CompanySettings {
  firmenname?: string
  strasse?: string
  hausnummer?: string
  plz?: string
  ort?: string
  telefon?: string
  email?: string
  website?: string
  ustIdNr?: string
  steuernummer?: string
  handelsregister?: string
  bankname?: string
  iban?: string
  bic?: string
  kontoinhaber?: string
  logo?: string
}

type TemplateType = 'modern' | 'klassisch' | 'kompakt'

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR'
  }).format(value)
}

const formatDate = (date: Date | string | undefined): string => {
  if (!date) return '-'
  const d = date instanceof Date ? date : new Date(date)
  return d.toLocaleDateString('de-DE')
}

// Template-spezifische Farben
const templateColors = {
  modern: { primary: '#4F46E5', secondary: '#6366F1', text: '#1F2937' },
  klassisch: { primary: '#1F2937', secondary: '#374151', text: '#1F2937' },
  kompakt: { primary: '#4B5563', secondary: '#6B7280', text: '#1F2937' }
}

export async function generateInvoicePDF(
  rechnung: Rechnung,
  company: CompanySettings,
  template: TemplateType = 'modern'
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        info: {
          Title: `Rechnung ${rechnung.rechnungsnummer}`,
          Author: company.firmenname || 'Gerüstbau ERP',
          Subject: 'Rechnung',
          Creator: 'Gerüstbau ERP System'
        }
      })

      const chunks: Buffer[] = []
      doc.on('data', (chunk) => chunks.push(chunk))
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', reject)

      const colors = templateColors[template]
      const isKompakt = template === 'kompakt'
      const fontSize = isKompakt ? { small: 8, normal: 9, medium: 10, large: 14, title: 20 }
        : { small: 9, normal: 10, medium: 12, large: 16, title: 24 }

      // Header
      drawHeader(doc, rechnung, company, colors, fontSize)

      // Empfänger
      drawRecipient(doc, rechnung, colors, fontSize)

      // Positionen-Tabelle
      drawPositionsTable(doc, rechnung.positionen as AngebotPosition[], colors, fontSize)

      // Kalkulation
      drawCalculation(doc, rechnung, colors, fontSize)

      // Zahlungsinfos
      drawPaymentInfo(doc, rechnung, company, colors, fontSize)

      // Footer
      drawFooter(doc, company, colors, fontSize)

      doc.end()
    } catch (error) {
      reject(error)
    }
  })
}

function drawHeader(
  doc: PDFKit.PDFDocument,
  rechnung: Rechnung,
  company: CompanySettings,
  colors: typeof templateColors.modern,
  fontSize: { small: number, normal: number, medium: number, large: number, title: number }
) {
  const pageWidth = 595.28 // A4 width in points

  // Firmenname
  doc.fontSize(fontSize.large)
    .fillColor(colors.primary)
    .text(company.firmenname || 'Ihre Firma', 50, 50)

  // Firmenadresse
  doc.fontSize(fontSize.small)
    .fillColor(colors.text)
    .text(`${company.strasse || ''} ${company.hausnummer || ''}`, 50, 70)
    .text(`${company.plz || ''} ${company.ort || ''}`, 50, 82)

  if (company.telefon) {
    doc.text(`Tel: ${company.telefon}`, 50, 94)
  }
  if (company.email) {
    doc.text(`E-Mail: ${company.email}`, 50, 106)
  }

  // RECHNUNG Titel
  doc.fontSize(fontSize.title)
    .fillColor(colors.primary)
    .text('RECHNUNG', pageWidth - 200, 50, { align: 'right', width: 150 })

  // Rechnungsinfo
  doc.fontSize(fontSize.normal)
    .fillColor(colors.text)
  
  const infoX = pageWidth - 200
  const infoY = 85
  doc.text(`Rechnungsnr.: ${rechnung.rechnungsnummer}`, infoX, infoY, { align: 'right', width: 150 })
  doc.text(`Datum: ${formatDate(rechnung.rechnungsdatum)}`, infoX, infoY + 14, { align: 'right', width: 150 })
  doc.text(`Fällig am: ${formatDate(rechnung.faelligAm)}`, infoX, infoY + 28, { align: 'right', width: 150 })

  // Trennlinie
  doc.moveTo(50, 140)
    .lineTo(pageWidth - 50, 140)
    .strokeColor(colors.secondary)
    .lineWidth(1)
    .stroke()
}

function drawRecipient(
  doc: PDFKit.PDFDocument,
  rechnung: Rechnung,
  colors: typeof templateColors.modern,
  fontSize: { small: number, normal: number, medium: number, large: number, title: number }
) {
  doc.fontSize(fontSize.small)
    .fillColor('#6B7280')
    .text('Rechnungsempfänger', 50, 160)

  doc.fontSize(fontSize.medium)
    .fillColor(colors.text)
    .text(rechnung.kundeName || 'Kunde', 50, 175)

  doc.fontSize(fontSize.normal)
    .text(rechnung.kundeAdresse || 'Adresse', 50, 192)

  // Rechnungstyp
  let typText = 'Rechnung'
  switch (rechnung.typ) {
    case 'teilrechnung': typText = 'Teilrechnung'; break
    case 'abschlagsrechnung': typText = 'Abschlagsrechnung'; break
    case 'schlussrechnung': typText = 'Schlussrechnung'; break
  }
  
  doc.fontSize(fontSize.medium)
    .fillColor(colors.primary)
    .text(typText, 50, 225)
}

function drawPositionsTable(
  doc: PDFKit.PDFDocument,
  positionen: AngebotPosition[],
  colors: typeof templateColors.modern,
  fontSize: { small: number, normal: number, medium: number, large: number, title: number }
) {
  const tableTop = 260
  const pageWidth = 595.28
  const marginLeft = 50
  const marginRight = 50
  const tableWidth = pageWidth - marginLeft - marginRight

  // Spaltenbreiten
  const colWidths = {
    pos: 30,
    beschreibung: 200,
    menge: 50,
    einheit: 50,
    einzelpreis: 80,
    gesamt: 80
  }

  // Spalten-X-Positionen
  const colX = {
    pos: marginLeft,
    beschreibung: marginLeft + colWidths.pos,
    menge: marginLeft + colWidths.pos + colWidths.beschreibung,
    einheit: marginLeft + colWidths.pos + colWidths.beschreibung + colWidths.menge,
    einzelpreis: marginLeft + colWidths.pos + colWidths.beschreibung + colWidths.menge + colWidths.einheit,
    gesamt: pageWidth - marginRight - colWidths.gesamt
  }

  // Header-Hintergrund
  doc.rect(marginLeft, tableTop, tableWidth, 20)
    .fillColor(colors.primary)
    .fill()

  // Header-Text
  doc.fontSize(fontSize.small)
    .fillColor('#FFFFFF')
    .text('Pos.', colX.pos + 4, tableTop + 5)
    .text('Beschreibung', colX.beschreibung + 4, tableTop + 5)
    .text('Menge', colX.menge + 4, tableTop + 5, { width: colWidths.menge - 8, align: 'right' })
    .text('Einheit', colX.einheit + 4, tableTop + 5)
    .text('Einzelpreis', colX.einzelpreis + 4, tableTop + 5, { width: colWidths.einzelpreis - 8, align: 'right' })
    .text('Gesamt', colX.gesamt + 4, tableTop + 5, { width: colWidths.gesamt - 8, align: 'right' })

  // Zeilen
  let yPos = tableTop + 25
  doc.fillColor(colors.text)

  positionen.forEach((pos, index) => {
    // Seitenwechsel prüfen
    if (yPos > 700) {
      doc.addPage()
      yPos = 50
    }

    // Zebrastreifen
    if (index % 2 === 0) {
      doc.rect(marginLeft, yPos - 3, tableWidth, 18)
        .fillColor('#F9FAFB')
        .fill()
    }

    doc.fontSize(fontSize.small)
      .fillColor(colors.text)
      .text(String(pos.position || index + 1), colX.pos + 4, yPos)
      .text(pos.beschreibung || '', colX.beschreibung + 4, yPos, { width: colWidths.beschreibung - 8 })
      .text(String(pos.menge || 0), colX.menge + 4, yPos, { width: colWidths.menge - 8, align: 'right' })
      .text(pos.einheit || '', colX.einheit + 4, yPos)
      .text(formatCurrency(pos.einzelpreis || 0), colX.einzelpreis + 4, yPos, { width: colWidths.einzelpreis - 8, align: 'right' })
      .text(formatCurrency(pos.gesamtpreis || 0), colX.gesamt + 4, yPos, { width: colWidths.gesamt - 8, align: 'right' })

    yPos += 18

    // Miete: Zeitraum
    if (pos.typ === 'miete' && pos.mietVon && pos.mietBis) {
      doc.fontSize(fontSize.small - 1)
        .fillColor('#6B7280')
        .text(`Zeitraum: ${formatDate(pos.mietVon)} - ${formatDate(pos.mietBis)} (${pos.anzahlTage || 0} Tage)`, 
          colX.beschreibung + 4, yPos, { width: colWidths.beschreibung - 8 })
      yPos += 12
    }
  })

  // Unterstreichung
  doc.moveTo(marginLeft, yPos + 5)
    .lineTo(pageWidth - marginRight, yPos + 5)
    .strokeColor(colors.secondary)
    .lineWidth(0.5)
    .stroke()

  // Y-Position für Kalkulation speichern
  doc.y = yPos + 15
}

function drawCalculation(
  doc: PDFKit.PDFDocument,
  rechnung: Rechnung,
  colors: typeof templateColors.modern,
  fontSize: { small: number, normal: number, medium: number, large: number, title: number }
) {
  const pageWidth = 595.28
  const marginRight = 50
  const calcWidth = 200
  const calcX = pageWidth - marginRight - calcWidth
  let yPos = doc.y + 10

  // Seitenwechsel prüfen
  if (yPos > 650) {
    doc.addPage()
    yPos = 50
  }

  const drawRow = (label: string, value: string, isBold = false, isRed = false) => {
    doc.fontSize(fontSize.normal)
      .fillColor(isRed ? '#DC2626' : colors.text)
    
    if (isBold) {
      doc.font('Helvetica-Bold')
    } else {
      doc.font('Helvetica')
    }

    doc.text(label, calcX, yPos)
      .text(value, calcX + 100, yPos, { width: 100, align: 'right' })
    
    yPos += 16
  }

  // Zwischensumme
  drawRow('Zwischensumme:', formatCurrency(rechnung.zwischensumme || 0))

  // Rabatt
  if (rechnung.rabatt && rechnung.rabatt > 0) {
    const rabattLabel = rechnung.rabattProzent 
      ? `Rabatt (${rechnung.rabattProzent}%):` 
      : 'Rabatt:'
    drawRow(rabattLabel, `-${formatCurrency(rechnung.rabatt)}`, false, true)
  }

  // Netto
  doc.moveTo(calcX, yPos - 5)
    .lineTo(pageWidth - marginRight, yPos - 5)
    .strokeColor(colors.secondary)
    .lineWidth(0.5)
    .stroke()

  drawRow('Netto:', formatCurrency(rechnung.netto || 0), true)

  // MwSt
  drawRow(`MwSt. (${rechnung.mwstSatz || 19}%):`, formatCurrency(rechnung.mwstBetrag || 0))

  // Brutto (Gesamt)
  yPos += 5
  doc.rect(calcX - 5, yPos - 5, calcWidth + 10, 24)
    .fillColor(colors.primary)
    .fill()

  doc.font('Helvetica-Bold')
    .fontSize(fontSize.medium)
    .fillColor('#FFFFFF')
    .text('Gesamtbetrag:', calcX, yPos)
    .text(formatCurrency(rechnung.brutto || 0), calcX + 100, yPos, { width: 100, align: 'right' })

  doc.y = yPos + 40
}

function drawPaymentInfo(
  doc: PDFKit.PDFDocument,
  rechnung: Rechnung,
  company: CompanySettings,
  colors: typeof templateColors.modern,
  fontSize: { small: number, normal: number, medium: number, large: number, title: number }
) {
  let yPos = doc.y

  // Seitenwechsel prüfen
  if (yPos > 700) {
    doc.addPage()
    yPos = 50
  }

  // Rahmen
  doc.rect(50, yPos, 495, 80)
    .strokeColor(colors.secondary)
    .lineWidth(1)
    .stroke()

  doc.font('Helvetica-Bold')
    .fontSize(fontSize.normal)
    .fillColor(colors.primary)
    .text('Zahlungsinformationen', 60, yPos + 10)

  doc.font('Helvetica')
    .fontSize(fontSize.small)
    .fillColor(colors.text)
    .text(`Bitte überweisen Sie den Betrag innerhalb von ${rechnung.zahlungsziel || 14} Tagen auf folgendes Konto:`, 60, yPos + 28)

  if (company.bankname) {
    doc.text(`Bank: ${company.bankname}`, 60, yPos + 42)
  }
  if (company.iban) {
    doc.text(`IBAN: ${company.iban}`, 60, yPos + 54)
  }
  if (company.bic) {
    doc.text(`BIC: ${company.bic}`, 200, yPos + 54)
  }

  doc.text(`Verwendungszweck: ${rechnung.rechnungsnummer}`, 60, yPos + 66)

  doc.y = yPos + 100
}

function drawFooter(
  doc: PDFKit.PDFDocument,
  company: CompanySettings,
  colors: typeof templateColors.modern,
  fontSize: { small: number, normal: number, medium: number, large: number, title: number }
) {
  const pageWidth = 595.28
  const marginLeft = 50
  const marginRight = 50
  
  // Footer am Seitenende
  const footerY = 780

  doc.moveTo(marginLeft, footerY - 10)
    .lineTo(pageWidth - marginRight, footerY - 10)
    .strokeColor('#E5E7EB')
    .lineWidth(0.5)
    .stroke()

  doc.font('Helvetica')
    .fontSize(fontSize.small - 1)
    .fillColor('#9CA3AF')

  const footerText = [
    `${company.firmenname || ''} | ${company.strasse || ''} ${company.hausnummer || ''} | ${company.plz || ''} ${company.ort || ''}`,
    company.ustIdNr ? `USt-IdNr.: ${company.ustIdNr}` : '',
    company.steuernummer ? `Steuernummer: ${company.steuernummer}` : '',
    company.handelsregister || ''
  ].filter(Boolean).join(' | ')

  doc.text(footerText, marginLeft, footerY, {
    width: pageWidth - marginLeft - marginRight,
    align: 'center'
  })
}

export default generateInvoicePDF
