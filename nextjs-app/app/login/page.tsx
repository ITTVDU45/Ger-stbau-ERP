"use client"

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Box, Button, TextField, Typography, Paper, Container, Grid, Alert, CircularProgress, InputAdornment, IconButton, Select, MenuItem, FormControl, InputLabel } from '@mui/material'
import { Visibility, VisibilityOff } from '@mui/icons-material'
import colors from '../../lib/theme/colors'
import ChangePasswordDialog from '../../components/ChangePasswordDialog'
import { useAuth } from '../../lib/contexts/AuthContext'

type UserRole = 'ADMIN' | 'GUTACHTER' | 'PARTNER'

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuth() as any
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<UserRole>('GUTACHTER')
  const [showPassword, setShowPassword] = useState(false)
  const [pwDialogOpen, setPwDialogOpen] = useState(false)
  const [formError, setFormError] = useState('')

  const validateLogin = () => {
    if (!email.trim() || !password) { setFormError('Bitte E-Mail und Passwort eingeben.'); return false }
    setFormError('')
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateLogin()) return
    
    // Demo-Login mit ausgewählter Rolle
    const user = {
      vorname: role === 'ADMIN' ? 'Admin' : role === 'GUTACHTER' ? 'Max' : 'Partner',
      nachname: role === 'ADMIN' ? 'User' : role === 'GUTACHTER' ? 'Mustermann' : 'Schmidt',
      email,
      role
    }
    
    login(user, role)
    router.push('/dashboard')
  }

  return (
    <Box sx={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: colors.background.gradientGreen, zIndex: 1300 }}>
      <Container component="main" maxWidth="xs">
        <Paper elevation={3} sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', borderRadius: 2, background: colors.background.paper, border: `1px solid ${colors.secondary.light}`, boxShadow: colors.shadows.md }}>
          <Box sx={{ mb: 3, textAlign: 'center' }}>
            <Typography component="h1" variant="h5" sx={{ fontWeight: 600, color: colors.secondary.main }}>Anmelden</Typography>
            <Typography variant="body2" sx={{ mt: 1, color: colors.text.muted }}>
              Demo-Login (beliebige E-Mail/Passwort)
            </Typography>
          </Box>

          {formError && <Alert severity="error" sx={{ width: '100%', mb: 2 }}>{formError}</Alert>}

          <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
            {/* Rollen-Auswahl */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, color: colors.secondary.main }}>
                Rolle auswählen:
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={4}>
                  <Button
                    fullWidth
                    variant={role === 'GUTACHTER' ? 'contained' : 'outlined'}
                    onClick={() => setRole('GUTACHTER')}
                    sx={{
                      py: 1.5,
                      backgroundColor: role === 'GUTACHTER' ? colors.primary.main : 'transparent',
                      color: role === 'GUTACHTER' ? colors.secondary.main : colors.secondary.light,
                      borderColor: colors.secondary.light,
                      '&:hover': {
                        backgroundColor: role === 'GUTACHTER' ? colors.primary.main : 'rgba(199, 231, 12, 0.1)',
                      }
                    }}
                  >
                    Gutachter
                  </Button>
                </Grid>
                <Grid item xs={4}>
                  <Button
                    fullWidth
                    variant={role === 'ADMIN' ? 'contained' : 'outlined'}
                    onClick={() => setRole('ADMIN')}
                    sx={{
                      py: 1.5,
                      backgroundColor: role === 'ADMIN' ? colors.primary.main : 'transparent',
                      color: role === 'ADMIN' ? colors.secondary.main : colors.secondary.light,
                      borderColor: colors.secondary.light,
                      '&:hover': {
                        backgroundColor: role === 'ADMIN' ? colors.primary.main : 'rgba(199, 231, 12, 0.1)',
                      }
                    }}
                  >
                    Admin
                  </Button>
                </Grid>
                <Grid item xs={4}>
                  <Button
                    fullWidth
                    variant={role === 'PARTNER' ? 'contained' : 'outlined'}
                    onClick={() => setRole('PARTNER')}
                    sx={{
                      py: 1.5,
                      backgroundColor: role === 'PARTNER' ? colors.primary.main : 'transparent',
                      color: role === 'PARTNER' ? colors.secondary.main : colors.secondary.light,
                      borderColor: colors.secondary.light,
                      '&:hover': {
                        backgroundColor: role === 'PARTNER' ? colors.primary.main : 'rgba(199, 231, 12, 0.1)',
                      }
                    }}
                  >
                    Partner
                  </Button>
                </Grid>
              </Grid>
            </Box>
            
            <TextField margin="normal" required fullWidth id="email" label="E-Mail-Adresse" name="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} sx={{ mb: 2 }} />
            <TextField margin="normal" required fullWidth name="password" label="Passwort" type={showPassword ? 'text' : 'password'} id="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} InputProps={{ endAdornment: (<InputAdornment position="end"><IconButton aria-label="Passwort anzeigen/verbergen" onClick={() => setShowPassword(!showPassword)} edge="end">{showPassword ? <VisibilityOff /> : <Visibility />}</IconButton></InputAdornment>) }} sx={{ mb: 2 }} />
            <Button type="submit" fullWidth variant="contained" disabled={!email || !password} sx={{ mt: 3, mb: 2, py: 1.5, backgroundColor: colors.primary.main, color: colors.secondary.main, fontWeight: 600 }}>
              Als {role === 'ADMIN' ? 'Admin' : role === 'GUTACHTER' ? 'Gutachter' : 'Partner'} anmelden
            </Button>
            <Grid container justifyContent="center"><Grid item><Link href="/register">Noch kein Konto? Jetzt registrieren</Link></Grid></Grid>
          </Box>
        </Paper>
      </Container>
      <ChangePasswordDialog open={pwDialogOpen} onClose={() => setPwDialogOpen(false)} user={{ email }} />
    </Box>
  )
}