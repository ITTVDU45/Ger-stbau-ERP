import { redirect } from 'next/navigation'

export default async function AdminDashboardPage() {
  // Direct redirect to Übersicht (no authentication required)
  redirect('/dashboard/admin/uebersicht')
}
