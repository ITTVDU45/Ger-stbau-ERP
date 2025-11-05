"use client"

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Box, Typography, Paper, TextField, Button, Alert, CircularProgress } from '@mui/material'
import colors from '@/lib/theme/colors'
import { resetPassword } from '@/lib/services/authService'

export default function PasswortZuruecksetzenPage({ params }: { params: { token: string } }) {
  const { token } = params
  const router = useRouter()
  const [passwort, setPasswort] = useState('')
  const [passwortBestaetigen, setPasswortBestaetigen] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const validatePassword = (pw: string) => {
    const minLength = pw.length >= 8
    const hasUpperCase = /[A-Z]/.test(pw)
    const hasNumber = /\d/.test(pw)
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(pw)
    if (!minLength || !hasUpperCase || !hasNumber || !hasSpecialChar) return 'Passwort muss mindestens 8 Zeichen, 1 Großbuchstaben, 1 Zahl und 1 Sonderzeichen enthalten.'
    return ''
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const pwError = validatePassword(passwort)
    if (pwError) { setError(pwError); return }
    if (passwort !== passwortBestaetigen) { setError('Die Passwörter stimmen nicht überein.'); return }
    setLoading(true)
    try {
      const res = await resetPassword(token, passwort)
      if (res.erfolg) {
        setSuccess(true)
        setTimeout(() => router.push('/'), 1500)
      } else setError(res.nachricht || 'Fehler beim Zurücksetzen des Passworts.')
    } catch (err: any) { setError(err.message || 'Fehler beim Zurücksetzen des Passworts.') }
    finally { setLoading(false) }
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', justifyContent: 'center', alignItems: 'center', py: 4, backgroundColor: `${colors.background.paper}10` }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 2, maxWidth: 480, width: '100%' }}>
        <Typography variant="h5" sx={{ fontWeight: 600, color: colors.secondary.main, mb: 2 }}>Passwort zurücksetzen</Typography>
        {success ? (
          <Alert severity="success">Passwort erfolgreich geändert. Weiterleitung...</Alert>
        ) : (
          <form onSubmit={handleSubmit}>
            <TextField label="Neues Passwort" type="password" value={passwort} onChange={e => setPasswort(e.target.value)} fullWidth required sx={{ mb: 2 }} />
            <TextField label="Passwort bestätigen" type="password" value={passwortBestaetigen} onChange={e => setPasswortBestaetigen(e.target.value)} fullWidth required sx={{ mb: 2 }} />
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            <Button type="submit" variant="contained" fullWidth disabled={loading} sx={{ bgcolor: colors.primary.main }}>{loading ? <CircularProgress size={20} /> : 'Passwort speichern'}</Button>
          </form>
        )}
      </Paper>
    </Box>
  )
}


