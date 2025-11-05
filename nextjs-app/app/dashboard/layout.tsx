import { AppSidebar } from '@/components/app-sidebar'
import { SidebarProvider } from '@/components/ui/sidebar'
import { NotificationProvider } from '@/lib/contexts/NotificationContext'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // No authentication required - always show admin dashboard
  return (
    <NotificationProvider>
      <div className="flex min-h-screen overflow-hidden">
        <SidebarProvider>
          <AppSidebar />
          <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6 bg-gray-50">
            <div className="max-w-[1600px] mx-auto">
              {children}
            </div>
          </main>
        </SidebarProvider>
      </div>
    </NotificationProvider>
  )
}