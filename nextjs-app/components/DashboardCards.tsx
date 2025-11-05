"use client"

import React from 'react'
import { useDashboard } from '@/lib/contexts/DashboardContext'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function DashboardCards() {
  const { filteredCards } = useDashboard()

  // Funktion zum Formatieren von Werten
  const formatValue = (value: string | number, type: 'count' | 'currency') => {
    if (type === 'currency') {
      return value.toString()
    }
    return value.toLocaleString('de-DE')
  }

  // Navigation-Handler
  const handleCardClick = (cardId: string) => {
    // Hier später echte Navigation implementieren
    console.log(`Navigate to: ${cardId}`)
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {filteredCards.map((card) => (
        <Card
          key={card.id}
          className="cursor-pointer hover:shadow-lg transition-shadow card-gradient-blue border-0"
          onClick={() => handleCardClick(card.id)}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white">
              {card.title}
            </CardTitle>
            {card.icon && <span className="text-lg">{card.icon}</span>}
          </CardHeader>
          <CardContent>
            <div 
              className="text-2xl font-bold" 
              style={{ 
                background: 'linear-gradient(135deg, #C7E70C, #A3E635)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}
            >
              {formatValue(card.value, card.type)}
            </div>
            <p className="text-xs text-white opacity-80">
              {card.type === 'currency' ? 'Euro' : 'Anzahl'}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
