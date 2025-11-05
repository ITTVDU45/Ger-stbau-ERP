import { CardKPI, ChartData, TableData } from '../contexts/DashboardContext'

// KPI-Cards Daten
export const dummyCards: CardKPI[] = [
  {
    id: 'active-cases',
    title: 'Aktive Fälle',
    value: 14,
    type: 'count',
    color: '#10b981', // Grün
    icon: '📋'
  },
  {
    id: 'completed-cases',
    title: 'Abgeschlossene Fälle',
    value: 62,
    type: 'count',
    color: '#8b5cf6', // Lila
    icon: '✅'
  },
  {
    id: 'open-tasks',
    title: 'Offene Aufgaben',
    value: 7,
    type: 'count',
    color: '#f59e0b', // Orange
    icon: '⏳'
  },
  {
    id: 'total-cases',
    title: 'Gesamtfälle',
    value: 83,
    type: 'count',
    color: '#6b7280', // Grau
    icon: '📊'
  },
  {
    id: 'gutachter-sum',
    title: 'Gutachter-Summe (abgeschlossen)',
    value: '128.400 €',
    type: 'currency',
    color: '#f59e0b', // Gold
    icon: '💰'
  },
  {
    id: 'billing-active',
    title: 'Abrechnung (aktiv & laufend)',
    value: '42.300 €',
    type: 'currency',
    color: '#3b82f6', // Blau
    icon: '💼'
  },
  {
    id: 'referrals',
    title: 'Vermittlungen über Referenznummern',
    value: 12,
    type: 'count',
    color: '#06b6d4', // Türkis
    icon: '🔗'
  }
]

// Chart-Daten
export const dummyCharts: ChartData[] = [
  {
    id: 'status-distribution',
    title: 'Statusverteilung der Fälle',
    type: 'donut',
    data: [
      { name: 'Aktiv', value: 14, color: '#1b3a4b' },
      { name: 'In Bearbeitung', value: 7, color: '#C7E70C' },
      { name: 'Abgeschlossen', value: 62, color: '#2c5364' }
    ]
  },
  {
    id: 'monthly-revenue',
    title: 'Monatliche Gutachter-Umsätze',
    type: 'line',
    data: [
      { month: 'Jan', revenue: 8500 },
      { month: 'Feb', revenue: 9200 },
      { month: 'Mar', revenue: 11800 },
      { month: 'Apr', revenue: 15200 },
      { month: 'Mai', revenue: 12800 },
      { month: 'Jun', revenue: 14500 }
    ]
  },
  {
    id: 'vehicle-types',
    title: 'Fahrzeugarten-Statistik',
    type: 'pie',
    data: [
      { name: 'PKW', value: 45, color: '#1b3a4b' },
      { name: 'LKW', value: 23, color: '#2c5364' },
      { name: 'Motorrad', value: 15, color: '#C7E70C' },
      { name: 'Transporter', value: 17, color: '#A3E635' }
    ]
  },
  {
    id: 'geographic-overview',
    title: 'Geografische Übersicht',
    type: 'map',
    data: [
      { city: 'Berlin', cases: 12, lat: 52.5200, lng: 13.4050 },
      { city: 'Hamburg', cases: 8, lat: 53.5511, lng: 9.9937 },
      { city: 'München', cases: 15, lat: 48.1351, lng: 11.5820 },
      { city: 'Köln', cases: 6, lat: 50.9375, lng: 6.9603 }
    ]
  }
]

// Tabellen-Daten
export const dummyTables: TableData[] = [
  {
    id: 'open-tasks',
    title: 'Offene Aufgaben',
    type: 'tasks',
    columns: [
      { key: 'id', label: 'ID', type: 'text' },
      { key: 'title', label: 'Aufgabe', type: 'text' },
      { key: 'assignee', label: 'Zuständig', type: 'text' },
      { key: 'priority', label: 'Priorität', type: 'status' },
      { key: 'dueDate', label: 'Fällig', type: 'date' }
    ],
    data: [
      { id: 'T-001', title: 'Gutachtenprüfung - Fall F-1023', assignee: 'Max Mustermann', priority: 'hoch', dueDate: '2025-10-08' },
      { id: 'T-002', title: 'Dokumentation - Schaden B', assignee: 'Anna Schmidt', priority: 'mittel', dueDate: '2025-10-10' },
      { id: 'T-003', title: 'Kalkulation - Versicherung C', assignee: 'Peter Müller', priority: 'niedrig', dueDate: '2025-10-12' }
    ]
  },
  {
    id: 'completed-cases',
    title: 'Abgerechnete Fälle',
    type: 'cases',
    columns: [
      { key: 'id', label: 'Fall-ID', type: 'text' },
      { key: 'client', label: 'Mandant', type: 'text' },
      { key: 'vehicle', label: 'Fahrzeug', type: 'text' },
      { key: 'amount', label: 'Summe (€)', type: 'number' },
      { key: 'status', label: 'Status', type: 'status' },
      { key: 'date', label: 'Datum', type: 'date' }
    ],
    data: [
      { id: 'F-1023', client: 'Müller GmbH', vehicle: 'Audi A6', amount: 2400, status: 'abgeschlossen', date: '2025-10-05' },
      { id: 'F-1024', client: 'Peter L.', vehicle: 'VW Golf', amount: 1700, status: 'aktiv', date: '2025-10-06' },
      { id: 'F-1025', client: 'Anna K.', vehicle: 'BMW 3er', amount: 3200, status: 'abgeschlossen', date: '2025-10-04' }
    ]
  },
  {
    id: 'documents-overview',
    title: 'Dokumentenübersicht',
    type: 'documents',
    columns: [
      { key: 'id', label: 'ID', type: 'text' },
      { key: 'name', label: 'Name', type: 'text' },
      { key: 'type', label: 'Typ', type: 'text' },
      { key: 'size', label: 'Größe', type: 'text' },
      { key: 'uploaded', label: 'Hochgeladen', type: 'date' }
    ],
    data: [
      { id: 'DOC-001', name: 'Gutachten_Mustermann.pdf', type: 'PDF', size: '2.4 MB', uploaded: '2025-10-06' },
      { id: 'DOC-002', name: 'Versicherungspolice.pdf', type: 'PDF', size: '1.8 MB', uploaded: '2025-10-05' },
      { id: 'DOC-003', name: 'Schadenmeldung.docx', type: 'Word', size: '856 KB', uploaded: '2025-10-04' }
    ]
  },
  {
    id: 'partner-referrals',
    title: 'Partnervermittlungen',
    type: 'partners',
    columns: [
      { key: 'id', label: 'Ref-ID', type: 'text' },
      { key: 'partner', label: 'Partner', type: 'text' },
      { key: 'company', label: 'Unternehmen', type: 'text' },
      { key: 'referrals', label: 'Vermittlungen', type: 'number' },
      { key: 'revenue', label: 'Umsatz (€)', type: 'number' }
    ],
    data: [
      { id: 'REF-001', partner: 'Rechtsanwalt Meier', company: 'Meier & Partner', referrals: 5, revenue: 12500 },
      { id: 'REF-002', partner: 'Versicherung ABC', company: 'ABC Versicherungen', referrals: 3, revenue: 8400 },
      { id: 'REF-003', partner: 'Werkstatt Müller', company: 'Auto Müller GmbH', referrals: 4, revenue: 9600 }
    ]
  }
]

// Funktion zum Laden aller Daten (simuliert API-Call)
export async function loadDashboardData(): Promise<{
  cards: CardKPI[]
  charts: ChartData[]
  tables: TableData[]
}> {
  // Simuliere API-Delay
  await new Promise(resolve => setTimeout(resolve, 500))

  return {
    cards: dummyCards,
    charts: dummyCharts,
    tables: dummyTables
  }
}
