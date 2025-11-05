import { redirect } from 'next/navigation'

export default async function DashboardIndex() {
  // Direct redirect to admin dashboard (no authentication required)
  redirect('/dashboard/admin/uebersicht')
}