"use client"

import React from 'react'
import { useDashboard } from '@/lib/contexts/DashboardContext'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import dynamic from 'next/dynamic'

// Map-Komponente dynamisch laden (da sie window verwendet)
const MapChart = dynamic(() => import('./MapChart'), { 
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">Karte wird geladen...</div>
})

// Donut Chart Komponente
const DonutChart = ({ data }: { data: any[] }) => {
  const RADIAN = Math.PI / 180
  const renderCustomizedLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
  }: any) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        className="text-xs font-semibold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={renderCustomizedLabel}
          outerRadius={100}
          innerRadius={60}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  )
}

// Line Chart Komponente
const RevenueLineChart = ({ data }: { data: any[] }) => {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <defs>
          <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#1b3a4b" />
            <stop offset="100%" stopColor="#2c5364" />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="month" stroke="#6b7280" />
        <YAxis stroke="#6b7280" />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: 'white', 
            border: '1px solid #e5e7eb',
            borderRadius: '8px'
          }}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="revenue"
          stroke="url(#lineGradient)"
          strokeWidth={3}
          name="Umsatz (€)"
          dot={{ fill: '#1b3a4b', strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

// Pie Chart Komponente
const VehicleTypePieChart = ({ data }: { data: any[] }) => {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={(entry) => entry.name}
          outerRadius={100}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  )
}

export default function DashboardCharts() {
  const { filteredCharts } = useDashboard()

  const renderChart = (chart: any) => {
    switch (chart.type) {
      case 'donut':
        return <DonutChart data={chart.data} />
      case 'line':
        return <RevenueLineChart data={chart.data} />
      case 'pie':
        return <VehicleTypePieChart data={chart.data} />
      case 'map':
        return <MapChart data={chart.data} />
      default:
        return <div>Chart Type not supported</div>
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {filteredCharts.map((chart) => (
        <Card key={chart.id} className="bg-white">
          <CardHeader>
            <CardTitle className="text-gray-900">{chart.title}</CardTitle>
          </CardHeader>
          <CardContent>
            {renderChart(chart)}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}