'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Plus } from 'lucide-react'
import InviteUserDialog from './components/InviteUserDialog'
import UserTable from './components/UserTable'

export default function UsersPage() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  
  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Benutzerverwaltung</h1>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Benutzer einladen
        </Button>
      </div>
      
      <Card className="p-6">
        <UserTable refreshTrigger={refreshTrigger} />
      </Card>
      
      <InviteUserDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={() => {
          setRefreshTrigger(prev => prev + 1)
          setDialogOpen(false)
        }}
      />
    </div>
  )
}

