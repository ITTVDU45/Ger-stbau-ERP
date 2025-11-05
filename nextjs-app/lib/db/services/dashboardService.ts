import { getDatabase } from '../client'

// Server-only imports
let ObjectId: any
if (typeof window === 'undefined') {
  ObjectId = require('mongodb').ObjectId
}

export interface DashboardFilters {
  gutachterId?: string
  timeframe?: '7d' | '30d' | '3m' | '6m' | '1y'
  status?: string[]
  vehicleType?: string
}

export async function getStatusDistribution(gutachterId?: string): Promise<{ erfolg: boolean; data?: any[] }> {
  try {
    const db = await getDatabase()
    const collection = db.collection('faelle')

    const matchStage: any = {}
    if (gutachterId) {
      matchStage.zugewiesenAn = gutachterId
    }

    const pipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: '$status',
          value: { $sum: 1 }
        }
      },
      {
        $project: {
          name: '$_id',
          value: 1,
          _id: 0
        }
      },
      { $sort: { value: -1 } }
    ]

    const data = await collection.aggregate(pipeline).toArray()

    // Map status to German labels and colors
    const statusMap = {
      'offen': { name: 'Offen', color: '#3b82f6' },
      'in_bearbeitung': { name: 'In Bearbeitung', color: '#f59e0b' },
      'uebermittelt': { name: 'Übermittelt', color: '#8b5cf6' },
      'abgeschlossen': { name: 'Abgeschlossen', color: '#10b981' }
    }

    const mappedData = data.map(item => ({
      ...item,
      name: statusMap[item.name as keyof typeof statusMap]?.name || item.name,
      color: statusMap[item.name as keyof typeof statusMap]?.color || '#6b7280'
    }))

    return { erfolg: true, data: mappedData }
  } catch (error) {
    console.error('Error fetching status distribution:', error)
    return { erfolg: false, data: [] }
  }
}

export async function getMonthlyRevenue(filters?: DashboardFilters): Promise<{ erfolg: boolean; data?: any[] }> {
  try {
    const db = await getDatabase()
    const collection = db.collection('faelle')

    const matchStage: any = {}
    if (filters?.gutachterId) {
      matchStage.zugewiesenAn = filters.gutachterId
    }

    // Time filter
    if (filters?.timeframe) {
      const now = new Date()
      const timeMap = {
        '7d': 7,
        '30d': 30,
        '3m': 90,
        '6m': 180,
        '1y': 365
      }
      const days = timeMap[filters.timeframe]
      matchStage.erstelltAm = { $gte: new Date(now.getTime() - days * 24 * 60 * 60 * 1000) }
    }

    const pipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: {
            year: { $year: '$erstellungsdatum' },
            month: { $month: '$erstellungsdatum' }
          },
          revenue: { $sum: '$betrag' },
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          month: {
            $concat: [
              { $toString: '$_id.month' },
              '/',
              { $toString: '$_id.year' }
            ]
          },
          revenue: 1,
          count: 1,
          _id: 0
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]

    const data = await collection.aggregate(pipeline).toArray()

    return { erfolg: true, data }
  } catch (error) {
    console.error('Error fetching monthly revenue:', error)
    return { erfolg: false, data: [] }
  }
}

export async function getVehicleTypeDistribution(gutachterId?: string): Promise<{ erfolg: boolean; data?: any[] }> {
  try {
    const db = await getDatabase()
    const collection = db.collection('faelle')

    const matchStage: any = {}
    if (gutachterId) {
      matchStage.zugewiesenAn = gutachterId
    }

    const pipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: '$fahrzeugart',
          value: { $sum: 1 }
        }
      },
      {
        $project: {
          name: '$_id',
          value: 1,
          _id: 0
        }
      },
      { $sort: { value: -1 } }
    ]

    const data = await collection.aggregate(pipeline).toArray()

    // Map vehicle types to German labels and colors
    const vehicleMap = {
      'pkw': { name: 'PKW', color: '#1b3a4b' },
      'lkw': { name: 'LKW', color: '#2c5364' },
      'motorrad': { name: 'Motorrad', color: '#C7E70C' },
      'transporter': { name: 'Transporter', color: '#A3E635' }
    }

    const mappedData = data.map(item => ({
      ...item,
      name: vehicleMap[item.name as keyof typeof vehicleMap]?.name || item.name,
      color: vehicleMap[item.name as keyof typeof vehicleMap]?.color || '#6b7280'
    }))

    return { erfolg: true, data: mappedData }
  } catch (error) {
    console.error('Error fetching vehicle type distribution:', error)
    return { erfolg: false, data: [] }
  }
}

export async function getLocationDistribution(gutachterId?: string): Promise<{ erfolg: boolean; data?: any[] }> {
  try {
    const db = await getDatabase()
    const collection = db.collection('faelle')

    const matchStage: any = {}
    if (gutachterId) {
      matchStage.zugewiesenAn = gutachterId
    }

    const pipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: '$standort',
          cases: { $sum: 1 }
        }
      },
      {
        $project: {
          city: '$_id',
          cases: 1,
          _id: 0
        }
      },
      { $sort: { cases: -1 } },
      { $limit: 10 }
    ]

    const data = await collection.aggregate(pipeline).toArray()

    // Add coordinates for major German cities (simplified mapping)
    const cityCoordinates: { [key: string]: { lat: number; lng: number } } = {
      'Berlin': { lat: 52.5200, lng: 13.4050 },
      'Hamburg': { lat: 53.5511, lng: 9.9937 },
      'München': { lat: 48.1351, lng: 11.5820 },
      'Köln': { lat: 50.9375, lng: 6.9603 },
      'Frankfurt': { lat: 50.1109, lng: 8.6821 },
      'Stuttgart': { lat: 48.7758, lng: 9.1829 },
      'Düsseldorf': { lat: 51.2277, lng: 6.7735 },
      'Dortmund': { lat: 51.5136, lng: 7.4653 },
      'Essen': { lat: 51.4556, lng: 7.0116 },
      'Leipzig': { lat: 51.3397, lng: 12.3731 }
    }

    const mappedData = data.map(item => ({
      ...item,
      ...(cityCoordinates[item.city] || { lat: 51.1657, lng: 10.4515 }), // Default to Germany center
      city: item.city
    }))

    return { erfolg: true, data: mappedData }
  } catch (error) {
    console.error('Error fetching location distribution:', error)
    return { erfolg: false, data: [] }
  }
}

export async function getRecentTasks(gutachterId?: string, limit: number = 10): Promise<{ erfolg: boolean; aufgaben?: any[] }> {
  try {
    const db = await getDatabase()
    const collection = db.collection('faelle')

    const matchStage: any = {}
    if (gutachterId) {
      matchStage.zugewiesenAn = gutachterId
    }

    const pipeline = [
      { $match: matchStage },
      { $unwind: '$aufgaben' },
      {
        $project: {
          _id: '$aufgaben._id',
          titel: '$aufgaben.titel',
          prioritaet: '$aufgaben.prioritaet',
          faelligAm: '$aufgaben.faelligAm',
          status: '$aufgaben.status',
          fallId: '$_id',
          fallname: '$fallname'
        }
      },
      {
        $match: {
          'status': { $in: ['offen', 'in_bearbeitung'] }
        }
      },
      { $sort: { faelligAm: 1 } },
      { $limit: limit }
    ]

    const aufgaben = await collection.aggregate(pipeline).toArray()

    return { erfolg: true, aufgaben }
  } catch (error) {
    console.error('Error fetching recent tasks:', error)
    return { erfolg: false, aufgaben: [] }
  }
}

export async function getRecentBillings(gutachterId?: string, limit: number = 10): Promise<{ erfolg: boolean; abrechnungen?: any[] }> {
  try {
    const db = await getDatabase()
    const collection = db.collection('faelle')

    const matchStage: any = {}
    if (gutachterId) {
      matchStage.zugewiesenAn = gutachterId
    }

    const pipeline = [
      { $match: matchStage },
      { $unwind: '$abrechnungen' },
      {
        $project: {
          _id: '$abrechnungen._id',
          betrag: '$abrechnungen.betrag',
          status: '$abrechnungen.status',
          faelligAm: '$abrechnungen.faelligAm',
          fallId: '$_id',
          fallname: '$fallname'
        }
      },
      { $sort: { faelligAm: -1 } },
      { $limit: limit }
    ]

    const abrechnungen = await collection.aggregate(pipeline).toArray()

    return { erfolg: true, abrechnungen }
  } catch (error) {
    console.error('Error fetching recent billings:', error)
    return { erfolg: false, abrechnungen: [] }
  }
}
