'use client'

/**
 * StatistikChart - Wrapper für Chart-Komponenten
 * 
 * Unterstützt verschiedene Chart-Typen mit einheitlichem Styling
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  ResponsiveContainer
} from 'recharts'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

export interface ChartData {
  id: string
  typ: 'bar' | 'line' | 'pie' | 'area'
  titel: string
  daten: any[]
  config?: Record<string, any>
}

export interface StatistikChartProps {
  chart: ChartData
  isLoading?: boolean
  error?: string | null
  className?: string
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#84cc16']

export function StatistikChart({
  chart,
  isLoading = false,
  error = null,
  className
}: StatistikChartProps) {
  if (error) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }
  
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    )
  }
  
  const renderChart = () => {
    if (!chart.daten || chart.daten.length === 0) {
      return null
    }
    
    const firstDataPoint = chart.daten[0] || {}
    const xAxisKey = chart.config?.xAxisKey || Object.keys(firstDataPoint)[0]
    const dataKeys = Object.keys(firstDataPoint).filter(key => key !== xAxisKey)
    
    switch (chart.typ) {
      case 'bar':
        return (
          <BarChart data={chart.daten} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey={xAxisKey}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis />
            <ChartTooltip />
            <Legend />
            {dataKeys.map((key, index) => (
              <Bar
                key={key}
                dataKey={key}
                fill={COLORS[index % COLORS.length]}
                name={key.charAt(0).toUpperCase() + key.slice(1)}
              />
            ))}
          </BarChart>
        )
      
      case 'line':
        return (
          <LineChart data={chart.daten} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xAxisKey} />
            <YAxis />
            <ChartTooltip />
            <Legend />
            {dataKeys.map((key, index) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={COLORS[index % COLORS.length]}
                strokeWidth={2}
                name={key.charAt(0).toUpperCase() + key.slice(1)}
              />
            ))}
          </LineChart>
        )
      
      case 'pie':
        return (
          <PieChart>
            <Pie
              data={chart.daten}
              dataKey={chart.config?.dataKey || 'wert'}
              nameKey={chart.config?.nameKey || 'name'}
              cx="50%"
              cy="50%"
              outerRadius={80}
              label
            >
              {chart.daten.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <ChartTooltip />
            <Legend />
          </PieChart>
        )
      
      case 'area':
        return (
          <AreaChart data={chart.daten} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xAxisKey} />
            <YAxis />
            <ChartTooltip />
            <Legend />
            {dataKeys.map((key, index) => (
              <Area
                key={key}
                type="monotone"
                dataKey={key}
                stackId={chart.config?.stacked ? "1" : undefined}
                stroke={COLORS[index % COLORS.length]}
                fill={COLORS[index % COLORS.length]}
                fillOpacity={0.6}
                name={key.charAt(0).toUpperCase() + key.slice(1)}
              />
            ))}
          </AreaChart>
        )
      
      default:
        return null
    }
  }
  
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900">
          {chart.titel}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {chart.daten.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-gray-400">
            Keine Daten verfügbar
          </div>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              {renderChart()}
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
