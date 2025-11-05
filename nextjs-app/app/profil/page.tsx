"use client"

import React, { useEffect, useState } from 'react'
import { Box, Button, Grid, Paper, Typography, Snackbar, Alert } from '@mui/material'
import EditProfil from '../../components/EditProfil'
import ChangePasswordDialog from '../../components/ChangePasswordDialog'
import DeleteAccountDialog from '../../components/DeleteAccountDialog'
import { useAuth } from '../../lib/contexts/AuthContext'
import colors from '../../lib/theme/colors'
import { getProfile } from '../../lib/services/authService'

export default function ProfilPage() {
  const { user, login, logout } = useAuth() as any
  const [editOpen, setEditOpen] = useState(false)
  const [pwOpen, setPwOpen] = useState(false)
  const [delOpen, setDelOpen] = useState(false)
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' as any })

  useEffect(() => {
    async function load() {
      try {
        const res = await getProfile()
        if (res.erfolg && res.benutzer) login(res.benutzer)
      } catch (err) {
        /* ignore */
      }
    }
    if (!user) load()
  }, [])

  const handleSave = async (form: any) => {
    // placeholder: pretend saved
    setSnack({ open: true, message: 'Profil gespeichert', severity: 'success' })
    return Promise.resolve()
  }

  return (
    <Box sx={{ px: { xs: 2, md: 4 }, py: 6 }}>
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ color: colors.secondary.main, fontWeight: 600 }}>{user?.vorname} {user?.nachname}</Typography>
            <Typography variant="body2" sx={{ color: colors.secondary.light }}>{user?.email}</Typography>
            <Box sx={{ mt: 2 }}>
              <Button variant="outlined" onClick={() => setEditOpen(true)} sx={{ mr: 1 }}>Profil bearbeiten</Button>
              <Button variant="outlined" color="error" onClick={() => setDelOpen(true)}>Konto löschen</Button>
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ color: colors.secondary.main, fontWeight: 600 }}>Meine Einstellungen</Typography>
            <Box sx={{ mt: 2 }}>
              <Button variant="contained" onClick={() => setPwOpen(true)}>Passwort ändern</Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      <EditProfil open={editOpen} onClose={() => setEditOpen(false)} user={user} onSave={handleSave} />
      <ChangePasswordDialog open={pwOpen} onClose={() => setPwOpen(false)} user={user} />
      <DeleteAccountDialog open={delOpen} onClose={() => setDelOpen(false)} user={user} />

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack({ ...snack, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity={snack.severity} onClose={() => setSnack({ ...snack, open: false })}>{snack.message}</Alert>
      </Snackbar>
    </Box>
  )
}


