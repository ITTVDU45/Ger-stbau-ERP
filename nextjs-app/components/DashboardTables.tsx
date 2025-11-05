"use client"

import React from 'react'
import { useDashboard } from '@/lib/contexts/DashboardContext'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function DashboardTables() {
  const { filteredTables } = useDashboard()

  // Funktion zum Formatieren von Tabellendaten
  const formatCellValue = (value: any, type?: string) => {
    if (type === 'date') {
      return new Date(value).toLocaleDateString('de-DE')
    }
    if (type === 'number') {
      return value.toLocaleString('de-DE')
    }
    if (type === 'status') {
      const statusColors: { [key: string]: string } = {
        'aktiv': 'bg-blue-100 text-blue-800',
        'abgeschlossen': 'bg-green-100 text-green-800',
        'in Bearbeitung': 'bg-yellow-100 text-yellow-800',
        'hoch': 'bg-red-100 text-red-800',
        'mittel': 'bg-yellow-100 text-yellow-800',
        'niedrig': 'bg-gray-100 text-gray-800'
      }
      return (
        <Badge className={statusColors[value] || 'bg-gray-100 text-gray-800'}>
          {value}
        </Badge>
      )
    }
    return value?.toString() || ''
  }

  // Funktion zum Generieren der Detail-Links basierend auf Tabellentyp
  const getDetailLink = (tableType: string, row: any) => {
    switch (tableType) {
      case 'tasks':
        // Offene Aufgaben → Falldetailseite (extrahiere Fall-ID aus title)
        const caseIdMatch = row.title?.match(/F-\d+/)
        const caseId = caseIdMatch ? caseIdMatch[0] : 'F-1023'
        return `/dashboard/falldetail/${caseId}`
      
      case 'cases':
        // Abgerechnete Fälle → Falldetailseite
        return `/dashboard/falldetail/${row.id}`
      
      case 'documents':
        // Dokumente → Dokumentenseite
        return `/dashboard/dokumente`
      
      case 'partners':
        // Partnervermittlungen → Könnte zu einer Partner-Detailseite führen
        // Für jetzt verwenden wir die erste vermittelte Fall-ID (dummy)
        return `/dashboard/falldetail/F-1023`
      
      default:
        return '/dashboard'
    }
  }

  const renderTable = (tableData: any) => (
    <Table>
      <TableHeader>
        <TableRow>
          {tableData.columns.map((column: any) => (
            <TableHead 
              key={column.key}
              style={{ 
                background: 'linear-gradient(135deg, #C7E70C, #A3E635)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                fontWeight: '600'
              }}
            >
              {column.label}
            </TableHead>
          ))}
          <TableHead 
            className="text-right"
            style={{ 
              background: 'linear-gradient(135deg, #C7E70C, #A3E635)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              fontWeight: '600'
            }}
          >
            Aktion
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tableData.data.map((row: any, index: number) => (
          <TableRow key={index}>
            {tableData.columns.map((column: any) => (
              <TableCell key={column.key}>
                {formatCellValue(row[column.key], column.type)}
              </TableCell>
            ))}
            <TableCell className="text-right">
              <Button 
                asChild 
                size="sm"
                className="btn-gradient-green"
              >
                <Link href={getDetailLink(tableData.type, row)}>
                  Anzeigen
                </Link>
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )

  return (
    <Card className="card-gradient-blue border-0">
      <CardHeader>
        <CardTitle 
          className="text-white text-xl"
          style={{ 
            background: 'linear-gradient(135deg, #C7E70C, #A3E635)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}
        >
          Detailtabellen
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={filteredTables[0]?.id} className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-white/10">
            {filteredTables.map((table) => (
              <TabsTrigger 
                key={table.id} 
                value={table.id}
                className="data-[state=active]:bg-white data-[state=active]:text-gray-900 text-white"
              >
                {table.title}
              </TabsTrigger>
            ))}
          </TabsList>

          {filteredTables.map((table) => (
            <TabsContent key={table.id} value={table.id} className="mt-4">
              <div className="rounded-md border border-white/20 bg-white/5">
                {renderTable(table)}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  )
}