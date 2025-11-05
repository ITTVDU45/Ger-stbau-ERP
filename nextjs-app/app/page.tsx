import { redirect } from 'next/navigation'

export default function RootPage() {
  // Redirect root directly to admin dashboard
  redirect('/dashboard/admin/uebersicht')
}


