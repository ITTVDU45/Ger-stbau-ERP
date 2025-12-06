import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

interface ProjektStunden {
  projektName: string
  gesamtStunden: number
  freigegebeneStunden: number
  offeneStunden: number
  eintraege: number
}

interface ZeiterfassungPDFDocumentProps {
  mitarbeiterName: string
  personalnummer?: string
  projektStunden: ProjektStunden[]
  gesamtStatistik: {
    gesamt: number
    freigegeben: number
    offen: number
    anzahlEintraege: number
  }
  zeitraum?: string
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 30,
    borderBottom: 2,
    borderBottomColor: '#2563eb',
    paddingBottom: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 3,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  infoLabel: {
    width: 120,
    fontSize: 10,
    color: '#475569',
    fontWeight: 'bold',
  },
  infoValue: {
    fontSize: 10,
    color: '#1e293b',
  },
  section: {
    marginTop: 20,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: 10,
  },
  statsContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 10,
  },
  statCard: {
    flex: 1,
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'solid',
  },
  statLabel: {
    fontSize: 9,
    color: '#64748b',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  statValueGreen: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#16a34a',
  },
  statValueOrange: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ea580c',
  },
  table: {
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    padding: 8,
    fontWeight: 'bold',
    fontSize: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
    borderBottomStyle: 'solid',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 8,
    fontSize: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    borderBottomStyle: 'solid',
  },
  tableRowTotal: {
    flexDirection: 'row',
    padding: 8,
    fontSize: 9,
    backgroundColor: '#f8fafc',
    borderTopWidth: 2,
    borderTopColor: '#cbd5e1',
    borderTopStyle: 'solid',
    fontWeight: 'bold',
  },
  col1: {
    width: '35%',
  },
  col2: {
    width: '13%',
    textAlign: 'right',
  },
  col3: {
    width: '17%',
    textAlign: 'right',
  },
  col4: {
    width: '17%',
    textAlign: 'right',
  },
  col5: {
    width: '18%',
    textAlign: 'right',
    fontWeight: 'bold',
  },
  textGreen: {
    color: '#16a34a',
  },
  textOrange: {
    color: '#ea580c',
  },
  textBlue: {
    color: '#2563eb',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    borderTopStyle: 'solid',
    paddingTop: 10,
    fontSize: 8,
    color: '#94a3b8',
    textAlign: 'center',
  },
})

export default function ZeiterfassungPDFDocument({
  mitarbeiterName,
  personalnummer,
  projektStunden,
  gesamtStatistik,
  zeitraum,
}: ZeiterfassungPDFDocumentProps) {
  const datum = new Date().toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Stundenübersicht</Text>
          <Text style={styles.subtitle}>Mitarbeiter: {mitarbeiterName}</Text>
          {personalnummer && (
            <Text style={styles.subtitle}>Personalnummer: {personalnummer}</Text>
          )}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Erstellt am:</Text>
            <Text style={styles.infoValue}>{datum}</Text>
          </View>
          {zeitraum && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Zeitraum:</Text>
              <Text style={styles.infoValue}>{zeitraum}</Text>
            </View>
          )}
        </View>

        {/* Statistiken */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Gesamt</Text>
            <Text style={styles.statValue}>{gesamtStatistik.gesamt.toFixed(1)} Std.</Text>
            <Text style={styles.statLabel}>{gesamtStatistik.anzahlEintraege} Einträge</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Freigegeben</Text>
            <Text style={styles.statValueGreen}>{gesamtStatistik.freigegeben.toFixed(1)} Std.</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Offen</Text>
            <Text style={styles.statValueOrange}>{gesamtStatistik.offen.toFixed(1)} Std.</Text>
          </View>
        </View>

        {/* Tabelle */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Stunden pro Projekt</Text>
          
          <View style={styles.table}>
            {/* Header */}
            <View style={styles.tableHeader}>
              <Text style={styles.col1}>Projekt</Text>
              <Text style={styles.col2}>Einträge</Text>
              <Text style={styles.col3}>Freigegeben</Text>
              <Text style={styles.col4}>Offen</Text>
              <Text style={styles.col5}>Gesamt</Text>
            </View>

            {/* Rows */}
            {projektStunden.map((projekt, index) => (
              <View key={index} style={styles.tableRow}>
                <Text style={styles.col1}>{projekt.projektName}</Text>
                <Text style={styles.col2}>{projekt.eintraege}</Text>
                <Text style={[styles.col3, styles.textGreen]}>
                  {projekt.freigegebeneStunden.toFixed(1)} Std.
                </Text>
                <Text style={[styles.col4, styles.textOrange]}>
                  {projekt.offeneStunden.toFixed(1)} Std.
                </Text>
                <Text style={[styles.col5, styles.textBlue]}>
                  {projekt.gesamtStunden.toFixed(1)} Std.
                </Text>
              </View>
            ))}

            {/* Total Row */}
            {projektStunden.length > 1 && (
              <View style={styles.tableRowTotal}>
                <Text style={styles.col1}>Gesamt</Text>
                <Text style={styles.col2}>{gesamtStatistik.anzahlEintraege}</Text>
                <Text style={[styles.col3, styles.textGreen]}>
                  {gesamtStatistik.freigegeben.toFixed(1)} Std.
                </Text>
                <Text style={[styles.col4, styles.textOrange]}>
                  {gesamtStatistik.offen.toFixed(1)} Std.
                </Text>
                <Text style={[styles.col5, styles.textBlue]}>
                  {gesamtStatistik.gesamt.toFixed(1)} Std.
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>Stundenübersicht erstellt am {datum}</Text>
          <Text>Dieses Dokument wurde automatisch generiert.</Text>
        </View>
      </Page>
    </Document>
  )
}

