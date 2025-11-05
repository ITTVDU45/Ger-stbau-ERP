import React from 'react'
import { Document, Page, Text, View, StyleSheet, Image, Font } from '@react-pdf/renderer'
import { Angebot, CompanySettings } from '@/lib/db/types'

// Register fonts if needed (optional, for better typography)
// Font.register({
//   family: 'Roboto',
//   src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-light-webfont.ttf'
// })

interface AngebotPDFDocumentProps {
  angebot: Angebot
  settings?: CompanySettings
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    paddingBottom: 15,
    borderBottom: '2 solid #e5e7eb',
  },
  logo: {
    width: 120,
    height: 60,
    objectFit: 'contain',
  },
  companyInfo: {
    fontSize: 8,
    textAlign: 'right',
    color: '#6b7280',
  },
  companyName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 20,
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  label: {
    width: 120,
    fontSize: 9,
    color: '#6b7280',
  },
  value: {
    flex: 1,
    fontSize: 9,
    color: '#111827',
  },
  table: {
    marginTop: 15,
    marginBottom: 15,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    padding: 8,
    fontWeight: 'bold',
    fontSize: 9,
    color: '#374151',
    borderBottom: '1 solid #d1d5db',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 8,
    borderBottom: '1 solid #e5e7eb',
    fontSize: 9,
  },
  tableRowAlt: {
    backgroundColor: '#f9fafb',
  },
  col1: { width: '8%' },
  col2: { width: '40%' },
  col3: { width: '10%', textAlign: 'right' },
  col4: { width: '12%', textAlign: 'right' },
  col5: { width: '15%', textAlign: 'right' },
  col6: { width: '15%', textAlign: 'right' },
  summary: {
    marginTop: 20,
    alignItems: 'flex-end',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    width: '50%',
    marginBottom: 5,
  },
  summaryLabel: {
    width: 150,
    fontSize: 9,
    color: '#6b7280',
    textAlign: 'right',
    paddingRight: 15,
  },
  summaryValue: {
    width: 100,
    fontSize: 9,
    color: '#111827',
    textAlign: 'right',
    fontWeight: 'bold',
  },
  summaryTotal: {
    borderTop: '2 solid #111827',
    paddingTop: 5,
    marginTop: 5,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 7,
    color: '#9ca3af',
    textAlign: 'center',
    borderTop: '1 solid #e5e7eb',
    paddingTop: 10,
  },
  textBlock: {
    fontSize: 9,
    color: '#374151',
    lineHeight: 1.5,
    marginBottom: 10,
  },
})

// Helper to strip HTML tags
const stripHTML = (html: string): string => {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(value)
}

const formatDate = (dateString?: string): string => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('de-DE').format(date)
}

export default function AngebotPDFDocument({ angebot, settings }: AngebotPDFDocumentProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header with Logo and Company Info */}
        <View style={styles.header}>
          <View>
            {settings?.firmenlogo ? (
              <Image src={settings.firmenlogo} style={styles.logo} />
            ) : (
              <Text style={styles.companyName}>
                {settings?.firmenname || 'Ihr Unternehmen'}
              </Text>
            )}
          </View>
          <View style={styles.companyInfo}>
            {settings?.firmenname && <Text style={styles.companyName}>{settings.firmenname}</Text>}
            {settings?.strasse && <Text>{settings.strasse}</Text>}
            {(settings?.plz || settings?.ort) && (
              <Text>{settings.plz} {settings.ort}</Text>
            )}
            {settings?.telefon && <Text>Tel: {settings.telefon}</Text>}
            {settings?.email && <Text>E-Mail: {settings.email}</Text>}
            {settings?.website && <Text>Web: {settings.website}</Text>}
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>Angebot {angebot.angebotsnummer}</Text>

        {/* Customer Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Kunde</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Kundenname:</Text>
            <Text style={styles.value}>{angebot.kundeName || '-'}</Text>
          </View>
        </View>

        {/* Offer Details */}
        <View style={styles.section}>
          <View style={styles.row}>
            <Text style={styles.label}>Datum:</Text>
            <Text style={styles.value}>{formatDate(angebot.datum)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Gültig bis:</Text>
            <Text style={styles.value}>{formatDate(angebot.gueltigBis)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Bauvorhaben:</Text>
            <Text style={styles.value}>{angebot.betreff || '-'}</Text>
          </View>
          {angebot.bauvorhaben && (
            <>
              {angebot.bauvorhaben.adresse && (
                <View style={styles.row}>
                  <Text style={styles.label}>Adresse:</Text>
                  <Text style={styles.value}>
                    {angebot.bauvorhaben.adresse}, {angebot.bauvorhaben.plz} {angebot.bauvorhaben.ort}
                  </Text>
                </View>
              )}
              {angebot.bauvorhaben.beschreibung && (
                <View style={styles.row}>
                  <Text style={styles.label}>Beschreibung:</Text>
                  <Text style={styles.value}>{angebot.bauvorhaben.beschreibung}</Text>
                </View>
              )}
            </>
          )}
        </View>

        {/* Introduction Text */}
        {angebot.einleitungstext && (
          <View style={styles.section}>
            <Text style={styles.textBlock}>{angebot.einleitungstext}</Text>
          </View>
        )}

        {/* Positions Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.col1}>Pos.</Text>
            <Text style={styles.col2}>Beschreibung</Text>
            <Text style={styles.col3}>Menge</Text>
            <Text style={styles.col4}>Einheit</Text>
            <Text style={styles.col5}>Einzelpreis</Text>
            <Text style={styles.col6}>Gesamtpreis</Text>
          </View>

          {angebot.positionen?.map((pos, index) => (
            <View
              key={index}
              style={[styles.tableRow, index % 2 === 1 && styles.tableRowAlt]}
            >
              <Text style={styles.col1}>{pos.position}</Text>
              <View style={styles.col2}>
                <Text>{stripHTML(pos.beschreibung || '')}</Text>
                {pos.verknuepftMitPosition && (
                  <Text style={{ fontSize: 7, color: '#6b7280', marginTop: 2 }}>
                    (bezieht sich auf Pos. {pos.verknuepftMitPosition})
                  </Text>
                )}
              </View>
              <Text style={styles.col3}>{pos.menge}</Text>
              <Text style={styles.col4}>{pos.einheit}</Text>
              <Text style={styles.col5}>{formatCurrency(pos.einzelpreis)}</Text>
              <Text style={styles.col6}>
                {pos.typ === 'miete' ? 'E.P.' : formatCurrency(pos.gesamtpreis)}
              </Text>
            </View>
          ))}
        </View>

        {/* Summary */}
        <View style={styles.summary}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Netto:</Text>
            <Text style={styles.summaryValue}>{formatCurrency(angebot.netto)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>MwSt. ({angebot.mwstSatz}%):</Text>
            <Text style={styles.summaryValue}>{formatCurrency(angebot.mwst)}</Text>
          </View>
          <View style={[styles.summaryRow, styles.summaryTotal]}>
            <Text style={[styles.summaryLabel, { fontSize: 11, color: '#111827' }]}>
              Gesamtsumme:
            </Text>
            <Text style={[styles.summaryValue, { fontSize: 11 }]}>
              {formatCurrency(angebot.brutto)}
            </Text>
          </View>
        </View>

        {/* Closing Text */}
        {angebot.schlusstext && (
          <View style={[styles.section, { marginTop: 20 }]}>
            <Text style={styles.textBlock}>{angebot.schlusstext}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text>
            {settings?.firmenname || 'Ihr Unternehmen'} | 
            {settings?.strasse && ` ${settings.strasse} | `}
            {settings?.plz && settings?.ort && ` ${settings.plz} ${settings.ort} | `}
            {settings?.telefon && ` Tel: ${settings.telefon} | `}
            {settings?.email && ` E-Mail: ${settings.email}`}
          </Text>
          {settings?.steuernummer && (
            <Text style={{ marginTop: 3 }}>Steuernummer: {settings.steuernummer}</Text>
          )}
          {settings?.ustIdNr && (
            <Text>USt-IdNr.: {settings.ustIdNr}</Text>
          )}
          {(settings?.bankname || settings?.iban) && (
            <Text style={{ marginTop: 3 }}>
              {settings?.bankname && `Bank: ${settings.bankname} | `}
              {settings?.iban && `IBAN: ${settings.iban} | `}
              {settings?.bic && `BIC: ${settings.bic}`}
            </Text>
          )}
        </View>
      </Page>
    </Document>
  )
}

