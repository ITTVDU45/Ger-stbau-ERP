"use client"

import React, { useState } from 'react'
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
import { useAuth } from '../lib/contexts/AuthContext'

type DeleteAccountDialogProps = {
  open: boolean
  onClose: () => void
  user?: { email?: string } | null
}

export default function DeleteAccountDialog({ open, onClose, user }: DeleteAccountDialogProps) {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' as 'info' | 'success' | 'error' })
  const { logout } = useAuth() as any

  const handleDelete = async () => {
    setLoading(true)
    try {
      const res = await authService.deleteOwnAccount()
      setSnackbar({ open: true, message: res.nachricht || 'Konto gelöscht.', severity: res.erfolg ? 'success' : 'error' })
      if (res.erfolg) {
        setTimeout(() => {
          logout()
        }, 1500)
      }
    } catch (err) {
      setSnackbar({ open: true, message: 'Fehler beim Löschen des Kontos.', severity: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const handleCloseSnackbar = () => setSnackbar({ ...snackbar, open: false })

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ bgcolor: colors.background.gradientBlue, color: colors.accent.white }}>
        Konto löschen
      </DialogTitle>
      <DialogContent sx={{ py: 3 }}>
        <Typography color="error" sx={{ mb: 2, fontWeight: 600 }}>
          Achtung: Diese Aktion kann nicht rückgängig gemacht werden!<br />
          Um Ihr Konto unwiderruflich zu löschen, geben Sie bitte <b>Konto Löschen</b> ein.
        </Typography>
        <TextField label="Bestätigung" value={input} onChange={(e) => setInput(e.target.value)} fullWidth placeholder="Konto Löschen" />
      </DialogContent>
      <DialogActions>
        <Button
          onClick={onClose}
          variant="outlined"
          sx={{
            color: colors.secondary.main,
            borderColor: colors.secondary.main,
            '&:hover': { borderColor: colors.secondary.dark, backgroundColor: 'transparent' }
          }}
        >
          Abbrechen
        </Button>
        <Button variant="contained" color="error" onClick={handleDelete} disabled={input !== 'Konto Löschen' || loading} sx={{ fontWeight: 600 }}>
          Konto unwiderruflich löschen
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


