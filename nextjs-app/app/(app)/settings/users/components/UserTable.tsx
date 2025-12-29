'use client'

import { useEffect, useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Loader2 } from 'lucide-react'

interface UserTableProps {
  refreshTrigger: number
}

export default function UserTable({ refreshTrigger }: UserTableProps) {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    loadUsers()
  }, [refreshTrigger])
  
  const loadUsers = async () => {
    try {
      // Placeholder: In production würde hier ein API-Call stattfinden
      // const res = await fetch('/api/users')
      // const data = await res.json()
      // setUsers(data.users)
      
      // Für jetzt zeigen wir eine Platzhalter-Nachricht
      setUsers([])
    } catch (error) {
      console.error('Fehler beim Laden der Benutzer:', error)
    } finally {
      setLoading(false)
    }
  }
  
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }
  
  if (users.length === 0) {
    return (
      <div className="text-center p-8 text-gray-500">
        <p>Noch keine Benutzer vorhanden.</p>
        <p className="text-sm mt-2">Laden Sie Benutzer über den Button oben ein.</p>
      </div>
    )
  }
  
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>E-Mail</TableHead>
          <TableHead>Rolle</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Erstellt am</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => (
          <TableRow key={user._id}>
            <TableCell>{user.firstName} {user.lastName}</TableCell>
            <TableCell>{user.email}</TableCell>
            <TableCell>
              <Badge variant={user.role === 'SUPERADMIN' ? 'default' : 'secondary'}>
                {user.role}
              </Badge>
            </TableCell>
            <TableCell>
              <Badge variant={user.status === 'ACTIVE' ? 'default' : 'secondary'}>
                {user.status}
              </Badge>
            </TableCell>
            <TableCell>
              {new Date(user.createdAt).toLocaleDateString('de-DE')}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

