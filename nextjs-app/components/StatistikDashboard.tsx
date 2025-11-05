"use client"

import * as React from 'react'
import { useMemo, useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Grid from '@mui/material/Grid'
import Paper from '@mui/material/Paper'
import colors from '../lib/theme/colors'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import { useCase } from '../lib/contexts/CaseContext'

export default function StatistikDashboard() {
  const { cases = [], loading, refreshCases } = useCase() as any

  useEffect(() => {
    const loadData = async () => {
      if (refreshCases) await refreshCases()
    }
    loadData()
  }, [refreshCases])

  useEffect(() => {
    const handleDatenschutzChange = () => {
      if (refreshCases) refreshCases()
    }
    window.addEventListener('datenschutzChange', handleDatenschutzChange)
    return () => window.removeEventListener('datenschutzChange', handleDatenschutzChange)
  }, [refreshCases])

  const [monat, setMonat] = useState('')
  const [jahr, setJahr] = useState('2025')
  const [status, setStatus] = useState('alle')
  const [filteredCases, setFilteredCases] = useState<any[]>([])

  const jahre = ['2025', '2026', '2027', '2028']

  useEffect(() => setFilteredCases(cases), [cases])

  const applyFilters = () => {
    let filtered = [...cases]
    if (status !== 'alle') filtered = filtered.filter((fall: any) => fall.status === status)
    if (monat) filtered = filtered.filter((fall: any) => new Date(fall.erstelltAm).getMonth() + 1 === parseInt(monat))
    if (jahr) filtered = filtered.filter((fall: any) => new Date(fall.erstelltAm).getFullYear() === parseInt(jahr))
    setFilteredCases(filtered)
  }

  const vermittlerMap = useMemo(() => {
    const map: Record<string, number> = {}; // semicolon required to avoid accidental call of the object below
    ;(cases || []).forEach((fall: any) => {
      const vermittlerArr = Array.isArray(fall.vermitteltVon) ? fall.vermitteltVon : (fall.vermitteltVon ? [fall.vermitteltVon] : [])
      vermittlerArr.forEach((v: any) => {
        if (v && (v.vorname || v.nachname)) {
          const key = `${v.vorname || ''} ${v.nachname || ''}`.trim()
          if (key) map[key] = (map[key] || 0) + 1
        }
      })
    })
    return map
  }, [cases])

  const vermittlerArray = Object.entries(vermittlerMap).map(([name, value]) => ({ name, value }))
  const vermittlerGesamt = vermittlerArray.reduce((acc, v) => acc + v.value, 0)

  const kennzahlen = useMemo(() => {
    const dokumenteGesamt = filteredCases.reduce((acc: number, fall: any) => acc + (fall.dokumente?.length || 0), 0)
    return [
      { label: 'Fälle in Bearbeitung', value: filteredCases.filter((f: any) => f.status === 'In Bearbeitung').length },
      { label: 'Übermittelte Fälle', value: filteredCases.filter((f: any) => f.status === 'Übermittelt').length },
      { label: 'Dokumente hochgeladen', value: dokumenteGesamt },
      { label: 'Vollständig ausgefüllte Fälle', value: filteredCases.filter((f: any) => f.datenschutzAngenommen).length },
      { label: 'Neue Fälle diese Woche', value: filteredCases.filter((fall: any) => new Date(fall.erstelltAm) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length },
      { label: 'Anzahl der Vermittlungen', value: vermittlerGesamt }
    ]
  }, [filteredCases, vermittlerGesamt])

  const faelleProMonat = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - i)
      const monat = date.toLocaleString('de-DE', { month: 'short' })
      const count = filteredCases.filter((fall: any) => {
        const fallDatum = new Date(fall.erstelltAm)
        return fallDatum.getMonth() === date.getMonth() && fallDatum.getFullYear() === date.getFullYear()
      }).length
      return { monat, Fälle: count }
    }).reverse()
  }, [filteredCases])

  const dokumentenUploads = Array.from({ length: 6 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - i)
    const monat = date.toLocaleString('de-DE', { month: 'short' })
    const count = filteredCases.reduce((acc: number, fall: any) => {
      if (fall.dokumente) {
        return acc + fall.dokumente.filter((doc: any) => {
          const docDate = new Date(doc.hochgeladenAm)
          return docDate.getMonth() === date.getMonth() && docDate.getFullYear() === date.getFullYear()
        }).length
      }
      return acc
    }, 0)
    return { monat, Dokumente: count }
  }).reverse()

  const qualitaet = [
    { name: 'Fehlende Angaben', value: filteredCases.filter((fall: any) => !fall.mandant || !fall.erstPartei).length },
    { name: 'Ohne Gutachten', value: filteredCases.filter((fall: any) => !fall.dokumente || fall.dokumente.length === 0).length },
    { name: 'Ohne Kontakt', value: filteredCases.filter((fall: any) => !fall.mandant || !fall.mandant.telefon).length }
  ]

  const fahrzeugtypenArray = useMemo(() => {
    const fahrzeugtypen: Record<string, number> = {}
    filteredCases.forEach((fall: any) => {
      if (fall.erstPartei && fall.erstPartei.kfzModell) {
        const model = fall.erstPartei.kfzModell
        fahrzeugtypen[model] = (fahrzeugtypen[model] || 0) + 1
      }
    })
    return Object.entries(fahrzeugtypen).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 3)
  }, [filteredCases])

  const fahrzeugColors = [colors.primary.main, colors.accent.blue, colors.secondary.light]

  const resetFilters = () => {
    setMonat('')
    setJahr('2025')
    setStatus('alle')
    setFilteredCases(cases)
  }

  useEffect(() => {
    const handleCaseStatusChange = () => { if (refreshCases) refreshCases() }
    window.addEventListener('caseStatusChanged', handleCaseStatusChange)
    return () => window.removeEventListener('caseStatusChanged', handleCaseStatusChange)
  }, [refreshCases])

  return (
    <Box sx={{ mt: 4 }}>
      <Paper elevation={1} sx={{ p: 2, mb: 3, borderRadius: 2, background: '#fff', display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, color: colors.secondary.main, mr: 2 }}>Filter:</Typography>
        <Select value={monat} onChange={(e) => setMonat(e.target.value as string)} displayEmpty size="small" sx={{ minWidth: 120 }}>
          <MenuItem value="">Monat (alle)</MenuItem>
          <MenuItem value="1">Januar</MenuItem>
          <MenuItem value="2">Februar</MenuItem>
          <MenuItem value="3">März</MenuItem>
          <MenuItem value="4">April</MenuItem>
          <MenuItem value="5">Mai</MenuItem>
          <MenuItem value="6">Juni</MenuItem>
          <MenuItem value="7">Juli</MenuItem>
          <MenuItem value="8">August</MenuItem>
          <MenuItem value="9">September</MenuItem>
          <MenuItem value="10">Oktober</MenuItem>
          <MenuItem value="11">November</MenuItem>
          <MenuItem value="12">Dezember</MenuItem>
        </Select>
        <Select value={jahr} onChange={(e) => setJahr(e.target.value as string)} size="small" sx={{ minWidth: 100 }}>{jahre.map(j => <MenuItem key={j} value={j}>{j}</MenuItem>)}</Select>
        <Select value={status} onChange={(e) => setStatus(e.target.value as string)} size="small" sx={{ minWidth: 140 }}>
          <MenuItem value="alle">Status (alle)</MenuItem>
          <MenuItem value="In Bearbeitung">In Bearbeitung</MenuItem>
          <MenuItem value="Übermittelt">Übermittelt</MenuItem>
        </Select>
        <Button variant="outlined" onClick={applyFilters} sx={{ color: colors.primary.main, borderColor: colors.primary.main, fontWeight: 600 }}>Anwenden</Button>
        <Button variant="text" onClick={resetFilters} sx={{ color: colors.secondary.main, fontWeight: 500 }}>Zurücksetzen</Button>
      </Paper>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        {kennzahlen.map((k) => (
          <Grid item xs={6} sm={4} md={2} key={k.label}>
            <Paper elevation={2} sx={{ p: 2, textAlign: 'center', borderRadius: 2, background: colors.background.gradientBlue, color: (colors as any).text?.onDark }}>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>{k.value}</Typography>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>{k.label}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 2, borderRadius: 2, height: 300 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: colors.secondary.main }}>Fälle pro Monat</Typography>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={faelleProMonat as any}>
                <XAxis dataKey="monat" stroke={colors.secondary.light} />
                <YAxis stroke={colors.secondary.light} />
                <Tooltip />
                <Bar dataKey="Fälle" fill={colors.primary.main} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 2, borderRadius: 2, height: 300 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: colors.secondary.main }}>Häufigste Fahrzeugtypen (Top 3)</Typography>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={fahrzeugtypenArray as any} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
                  {fahrzeugtypenArray.map((entry: any, i: number) => (
                    <Cell key={`cell-${entry.name}`} fill={fahrzeugColors[i % fahrzeugColors.length]} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        <Grid item xs={12} md={12}>
          <Paper elevation={2} sx={{ p: 2, borderRadius: 2, height: 340 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: colors.secondary.main }}>Vermittler nach Anzahl</Typography>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={vermittlerArray as any} layout="vertical">
                <XAxis type="number" stroke={colors.secondary.light} allowDecimals={false} />
                <YAxis dataKey="name" type="category" width={180} stroke={colors.secondary.light} />
                <Tooltip />
                <Bar dataKey="value" fill={colors.primary.main} radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}


