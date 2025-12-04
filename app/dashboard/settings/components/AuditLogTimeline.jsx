"use client"

import { Lock, Mail, User, Settings, LogIn, LogOut, Shield, Image as ImageIcon, Calendar } from "lucide-react"

/**
 * AuditLogTimeline - Display audit logs in timeline format
 */
export default function AuditLogTimeline({ logs }) {
  const getIcon = (action) => {
    switch (action) {
      case 'password_changed':
        return <Lock className="w-5 h-5 text-red-500" />
      case 'email_updated':
        return <Mail className="w-5 h-5 text-purple-500" />
      case 'profile_updated':
      case 'name_updated':
      case 'phone_updated':
      case 'address_updated':
      case 'birthday_updated':
      case 'age_updated':
      case 'gender_updated':
        return <User className="w-5 h-5 text-blue-500" />
      case 'profile_image_added':
      case 'profile_image_updated':
      case 'profile_image_removed':
        return <ImageIcon className="w-5 h-5 text-indigo-500" />
      case 'settings_changed':
        return <Settings className="w-5 h-5 text-gray-500" />
      case 'login':
        return <LogIn className="w-5 h-5 text-green-500" />
      case 'logout':
        return <LogOut className="w-5 h-5 text-orange-500" />
      case 'session_revoked':
        return <Shield className="w-5 h-5 text-red-500" />
      case 'farm_info_updated':
      case 'farm_name_updated':
      case 'farm_address_updated':
        return <Calendar className="w-5 h-5 text-green-500" />
      default:
        return <Calendar className="w-5 h-5 text-gray-400" />
    }
  }

  const getActionColor = (action) => {
    if (action.includes('password') || action.includes('email') || action === 'session_revoked') {
      return 'border-red-200 bg-red-50'
    }
    if (action.includes('login')) {
      return 'border-green-200 bg-green-50'
    }
    if (action.includes('settings')) {
      return 'border-gray-200 bg-gray-50'
    }
    return 'border-blue-200 bg-blue-50'
  }

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  if (!logs || logs.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
        <p>No activity history available</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {logs.map((log, index) => (
        <div
          key={log.id}
          className={`relative p-4 rounded-lg border-2 transition-colors ${getActionColor(log.action)}`}
        >
          {/* Timeline connector (except for last item) */}
          {index < logs.length - 1 && (
            <div className="absolute left-8 top-16 bottom-0 w-0.5 bg-gray-300 -mb-3" />
          )}

          <div className="flex items-start gap-4">
            {/* Icon */}
            <div className="w-10 h-10 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center flex-shrink-0 relative z-10">
              {getIcon(log.action)}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-800 mb-1">
                {log.description}
              </p>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Calendar className="w-4 h-4" />
                {formatTimestamp(log.createdAt)}
              </div>
              
              {/* Metadata (optional) */}
              {log.metadata && Object.keys(log.metadata).length > 1 && (
                <div className="mt-2 text-xs text-gray-600">
                  {log.metadata.device && (
                    <div className="flex items-center gap-1">
                      <span className="font-medium">Device:</span>
                      <span>{log.metadata.device}</span>
                    </div>
                  )}
                  {log.metadata.location && (
                    <div className="flex items-center gap-1">
                      <span className="font-medium">Location:</span>
                      <span>{log.metadata.location}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

