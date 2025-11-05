"use client"

import React, { useState, useEffect } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import colors from '../lib/theme/colors'
import { authService } from '../lib/services/authService'

type ChangePasswordDialogProps = {
  open: boolean
  onClose: () => void
  user?: { email?: string } | null
}

export default function ChangePasswordDialog({ open, onClose, user }: ChangePasswordDialogProps) {
  const [email, setEmail] = useState(user?.email || '')
  const [loading, setLoading] = useState(false)
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' as 'info' | 'success' | 'error' })
  const [emailError, setEmailError] = useState('')

  useEffect(() => {
    setEmail(user?.email || '')
  }, [open, user?.email])

  const handleSendLink = async () => {
    setLoading(true)
    if (!email || !email.trim()) {
      setEmailError('Bitte geben Sie eine E-Mail-Adresse ein.')
      setLoading(false)
      return
    }
    if (!/^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email.trim())) {
      setEmailError('Bitte geben Sie eine gültige E-Mail-Adresse ein.')
      setLoading(false)
      return
    }
    setEmailError('')
    try {
      const res = await authService.requestPasswordReset(email.trim())
      setSnackbar({ open: true, message: res.nachricht || 'E-Mail gesendet.', severity: res.erfolg ? 'success' : 'error' })
    } catch (err) {
      setSnackbar({ open: true, message: 'Fehler beim Senden des Links.', severity: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const handleCloseSnackbar = () => setSnackbar({ ...snackbar, open: false })

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ bgcolor: colors.background.gradientBlue, color: colors.accent.white }}>
        Passwort ändern
      </DialogTitle>
      <DialogContent sx={{ py: 3 }}>
        <Typography sx={{ mb: 2 }}>
          Sie erhalten einen Link zum Zurücksetzen Ihres Passworts an Ihre E-Mail-Adresse. Folgen Sie dem Link, um ein neues Passwort zu vergeben.
        </Typography>
        <TextField label="E-Mail-Adresse" value={email} onChange={(e) => setEmail(e.target.value)} fullWidth autoFocus error={!!emailError} helperText={emailError} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ color: colors.secondary.main }}>Abbrechen</Button>
        <Button variant="contained" onClick={handleSendLink} disabled={loading || !!emailError || !email} sx={{ bgcolor: colors.primary.main, color: (colors as any).text?.onPrimary, fontWeight: 600 }}>
          Link senden
        </Button>
      </DialogActions>
      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Dialog>
  )
}


