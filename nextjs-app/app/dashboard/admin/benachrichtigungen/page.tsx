"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useNotifications } from "@/lib/contexts/NotificationContext"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Bell, Check, CheckCheck, Trash2, ExternalLink, Clock, FileText, User } from "lucide-react"
import { formatTimestamp } from "@/lib/utils/fallIdGenerator"

export default function AdminBenachrichtigungenPage() {
  const router = useRouter()
  const {
    notifications,
    unreadCount,
    loading,
    refreshNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications()

  const handleMarkAsRead = async (id: string) => {
    await markAsRead(id)
  }

  const handleMarkAllAsRead = async () => {
    await markAllAsRead()
  }

  const handleDelete = async (id: string) => {
    await deleteNotification(id)
  }

  const handleNavigate = async (notification: any) => {
    if (notification.url) {
      if (!notification.gelesen) {
        await markAsRead(notification._id)
      }
      router.push(notification.url)
    }
  }

  const getTypeIcon = (typ: string) => {
    switch (typ) {
      case 'dokument_hochgeladen':
        return <FileText className="w-5 h-5 text-blue-600" />
      case 'fall_bearbeitet':
        return <Bell className="w-5 h-5 text-orange-600" />
      case 'fall_zugewiesen':
        return <User className="w-5 h-5 text-green-600" />
      case 'status_geaendert':
        return <Clock className="w-5 h-5 text-purple-600" />
      default:
        return <Bell className="w-5 h-5 text-gray-600" />
    }
  }

  const getTypeBadge = (typ: string) => {
    switch (typ) {
      case 'dokument_hochgeladen':
        return <Badge variant="default">Dokument</Badge>
      case 'fall_bearbeitet':
        return <Badge variant="secondary">Bearbeitet</Badge>
      case 'fall_zugewiesen':
        return <Badge className="bg-green-600">Zugewiesen</Badge>
      case 'status_geaendert':
        return <Badge variant="outline">Status</Badge>
      default:
        return <Badge variant="outline">{typ}</Badge>
    }
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Benachrichtigungen</h1>
          <p className="text-gray-600 mt-1">
            {unreadCount > 0 ? `${unreadCount} ungelesene Benachrichtigung${unreadCount > 1 ? 'en' : ''}` : 'Keine ungelesenen Benachrichtigungen'}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button onClick={handleMarkAllAsRead} variant="outline">
            <CheckCheck className="w-4 h-4 mr-2" />
            Alle als gelesen markieren
          </Button>
        )}
      </div>

      {/* Statistik Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Bell className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Gesamt</p>
                <p className="text-2xl font-bold">{notifications.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <Bell className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Ungelesen</p>
                <p className="text-2xl font-bold">{unreadCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCheck className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Gelesen</p>
                <p className="text-2xl font-bold">{notifications.length - unreadCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Benachrichtigungen Liste */}
      {loading ? (
        <Card>
          <CardContent className="p-8 text-center text-gray-600">
            Lade Benachrichtigungen...
          </CardContent>
        </Card>
      ) : notifications.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Bell className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Keine Benachrichtigungen</h3>
            <p className="text-gray-600">Es liegen noch keine Benachrichtigungen vor.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification, index) => (
            <Card
              key={notification._id}
              className={`transition-all hover:shadow-md ${
                !notification.gelesen ? 'bg-blue-50 border-blue-200' : 'bg-white'
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className="mt-1">{getTypeIcon(notification.typ)}</div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">{notification.titel}</h3>
                        {!notification.gelesen && (
                          <Badge variant="destructive" className="h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px]">
                            {index + 1}
                          </Badge>
                        )}
                      </div>
                      {getTypeBadge(notification.typ)}
                    </div>
                    
                    <p className="text-gray-700 mb-3">{notification.nachricht}</p>
                    
                    {notification.metadata && (
                      <div className="text-sm text-gray-600 mb-3">
                        {notification.metadata.fallname && (
                          <span className="font-medium">Fall: {notification.metadata.fallname}</span>
                        )}
                        {notification.metadata.dokumentName && (
                          <span className="ml-3">📄 {notification.metadata.dokumentName}</span>
                        )}
                        {notification.metadata.alterStatus && notification.metadata.neuerStatus && (
                          <span className="ml-3">
                            {notification.metadata.alterStatus} → {notification.metadata.neuerStatus}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTimestamp(new Date(notification.erstelltAm))}
                      </span>
                      {notification.absenderRolle && (
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {notification.absenderRolle === 'gutachter' ? 'Gutachter' : notification.absenderRolle}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {notification.url && (
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleNavigate(notification)}
                      >
                        <ExternalLink className="w-4 h-4 mr-1" />
                        Öffnen
                      </Button>
                    )}
                    
                    {!notification.gelesen && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleMarkAsRead(notification._id!)}
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                    )}
                    
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(notification._id!)}
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

