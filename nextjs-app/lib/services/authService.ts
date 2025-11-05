export const authService = {
  async requestPasswordReset(email: string) {
    // placeholder: call real API later
    return { erfolg: true, nachricht: 'Reset-E-Mail wurde gesendet.' }
  },
  async deleteOwnAccount() {
    // placeholder
    return { erfolg: true, nachricht: 'Konto gelöscht.' }
  }
}

// Additional placeholder APIs used by migrated pages
export async function activateAccount(token: string) {
  // placeholder: verify token and activate
  console.log('activateAccount token', token)
  return { erfolg: true, nachricht: 'Konto aktiviert' }
}

export async function registerUser(data: any) {
  console.log('registerUser', data)
  return { erfolg: true, nachricht: 'Registrierung erfolgreich', benutzer: { vorname: data.vorname || 'Demo', nachname: data.nachname || 'User', email: data.email } }
}

export async function resetPassword(token: string, neuesPasswort: string) {
  console.log('resetPassword', token)
  return { erfolg: true, nachricht: 'Passwort gesetzt' }
}

export async function getProfile() {
  // placeholder: return demo user
  return { erfolg: true, benutzer: { vorname: 'Demo', nachname: 'User', email: 'demo@example.com', aktiviert: true } }
}

export async function loginUser(email: string, password: string) {
  console.log('loginUser', email)
  return { erfolg: true, benutzer: { vorname: 'Demo', nachname: 'User', email } }
}


