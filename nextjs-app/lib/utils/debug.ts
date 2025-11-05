/**
 * Debug-Utility für kontrolliertes Logging
 * Logs werden nur ausgegeben wenn DEBUG=true in .env gesetzt ist
 */

const DEBUG_ENABLED = process.env.DEBUG === 'true' || process.env.NODE_ENV === 'development'

export const debug = {
  log: (...args: any[]) => {
    if (DEBUG_ENABLED) {
      console.log(...args)
    }
  },
  
  warn: (...args: any[]) => {
    console.warn(...args) // Warnungen immer anzeigen
  },
  
  error: (...args: any[]) => {
    console.error(...args) // Fehler immer anzeigen
  },
  
  // Nur für kritische Info-Messages die immer gezeigt werden sollen
  info: (...args: any[]) => {
    console.log(...args)
  }
}

