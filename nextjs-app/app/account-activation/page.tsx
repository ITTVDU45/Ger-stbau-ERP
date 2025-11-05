"use client"

import React, { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Box, Typography, Paper, Container, Alert, CircularProgress, Button } from '@mui/material'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import colors from '@/lib/theme/colors'
import { activateAccount } from '@/lib/services/authService'

export default function AccountActivationPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token') || ''
  const [loading, setLoading] = useState(true)
  const [success, setSuccess] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    async function activate() {
      try {
        const res = await activateAccount(token)
        if (res.erfolg) {
          setSuccess(true)
          setMessage(res.nachricht || 'Konto aktiviert')
          setTimeout(() => router.push('/'), 2500)
        } else {
          setSuccess(false)
          setMessage(res.nachricht || 'Aktivierung fehlgeschlagen')
        }
      } catch (err: any) {
        setSuccess(false)
        setMessage(err?.message || 'Aktivierung fehlgeschlagen')
      } finally {
        setLoading(false)
      }
    }
    if (token) activate(); else setLoading(false)
  }, [token, router])

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', justifyContent: 'center', alignItems: 'center', py: 4, backgroundColor: `${colors.background.paper}10` }}>
      <Container component="main" maxWidth="sm">
        <Paper elevation={3} sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', borderRadius: 2, background: colors.background.paper, border: `1px solid ${colors.secondary.light}`, boxShadow: colors.shadows.md }}>
          <Box sx={{ mb: 3, textAlign: 'center' }}>
            <Typography component="h1" variant="h5" sx={{ fontWeight: 600, color: colors.secondary.main }}>Kontoaktivierung</Typography>
          </Box>

          {loading ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', my: 4 }}>
              <CircularProgress size={60} sx={{ color: colors.primary.main }} />
              <Typography variant="body1" sx={{ mt: 2, color: colors.secondary.main }}>Ihr Konto wird aktiviert...</Typography>
            </Box>
          ) : success ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', my: 4 }}>
              <CheckCircleOutlineIcon sx={{ fontSize: 80, color: colors.primary.main }} />
              <Alert severity="success" sx={{ width: '100%', mt: 2 }}>{message}</Alert>
              <Button variant="contained" sx={{ mt: 3 }} onClick={() => router.push('/')}>Zum Login</Button>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', my: 4 }}>
              <ErrorOutlineIcon sx={{ fontSize: 80, color: '#f44336' }} />
              <Alert severity="error" sx={{ width: '100%', mt: 2 }}>{message || 'Aktivierung fehlgeschlagen.'}</Alert>
            </Box>
          )}
        </Paper>
      </Container>
    </Box>
  )
}


