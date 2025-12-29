import bcrypt from 'bcryptjs'

const SALT_ROUNDS = 12

export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, SALT_ROUNDS)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash)
}

export function validatePasswordStrength(password: string): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []
  
  if (password.length < 12) {
    errors.push('Passwort muss mindestens 12 Zeichen lang sein')
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Passwort muss mindestens einen Großbuchstaben enthalten')
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Passwort muss mindestens einen Kleinbuchstaben enthalten')
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Passwort muss mindestens eine Ziffer enthalten')
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push('Passwort muss mindestens ein Sonderzeichen enthalten')
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}

