export function isE164(phone: string): boolean {
  return /^\+?[1-9][0-9]{6,14}$/.test(phone)
}


