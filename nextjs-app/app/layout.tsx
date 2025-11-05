import '../styles/globals.css'
import { ApiSnackbarProvider } from '../components/ApiSnackbar'
import LocaleProvider from '../lib/locale'
import { AuthProvider } from '../lib/contexts/AuthContext'
import { Toaster } from '@/components/ui/sonner'

export const metadata = {
  title: 'Gerüstbau ERP Software',
  description: 'Management System für Gerüstbau-Unternehmen'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className="overflow-x-hidden">
      <body className="overflow-x-hidden">
        <AuthProvider>
          <LocaleProvider>
            <ApiSnackbarProvider>
              {children}
              <Toaster 
                position="top-right"
                richColors
                closeButton
                duration={4000}
              />
            </ApiSnackbarProvider>
          </LocaleProvider>
        </AuthProvider>
      </body>
    </html>
  )
}


