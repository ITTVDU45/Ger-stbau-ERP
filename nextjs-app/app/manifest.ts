import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Gerüstbau ERP - Verwaltungssoftware',
    short_name: 'Gerüstbau ERP',
    description: 'Professionelle ERP-Software für Gerüstbau-Unternehmen. Projekte, Finanzen, Mitarbeiter und Kunden verwalten.',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#2563EB',
    orientation: 'portrait-primary',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any maskable'
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable'
      }
    ],
    categories: ['business', 'productivity', 'finance'],
    lang: 'de-DE',
    dir: 'ltr',
    scope: '/',
    prefer_related_applications: false
  }
}

