# Rechtly — Next.js Migration Skeleton

Kurzanleitung zum lokalen Start:

1. Node 18+ installieren
2. Im Ordner `nextjs-app`:
   - `npm install`
   - `.env.local` erstellen mit `N8N_WEBHOOK_URL=`
   - `npm run dev`

Shade CDN: Um das Shade-Designsystem zu nutzen, kann man das CDN in `layout.tsx` einbinden. Beispiel:

```tsx
// In `app/(marketing)/layout.tsx`
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <head>
        <link rel="stylesheet" href="https://cdn.shade.design/latest/shade.min.css" />
      </head>
      <body>{children}</body>
    </html>
  )
}
```

Ersetze die URL mit der passenden Shade-CDN-URL / Version.

Migration: Inhalte aus `GUTACHTERPORTAL_NEU_frontend`/`_backend` werden schrittweise in `components/` und `app/(marketing)` verschoben.


