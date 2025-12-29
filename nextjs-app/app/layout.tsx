import '../styles/globals.css'
import { ApiSnackbarProvider } from '../components/ApiSnackbar'
import LocaleProvider from '../lib/locale'
import { Toaster } from '@/components/ui/sonner'

export const metadata = {
  title: 'Gerüstbau ERP Software',
  description: 'Management System für Gerüstbau-Unternehmen',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
    userScalable: true
  },
  themeColor: '#2563EB',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Gerüstbau ERP'
  },
  manifest: '/manifest.json'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className="overflow-x-hidden">
      <body className="overflow-x-hidden">
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
      </body>
    </html>
  )
}


