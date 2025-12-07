"use client"

import { useState, useEffect, useCallback } from "react"
import { Monitor, Smartphone, Globe, Clock, Shield, Trash2, CheckCircle } from "lucide-react"
import { Navbar } from "../../components/NavBar"
import { Header } from "../../components/Header"
import { getUserAccountId } from "../../../utils/auth-utils"
import { db } from "../../../config/firebaseConfig"
import { collection, query, where, getDocs, doc, deleteDoc, updateDoc, orderBy, limit } from "firebase/firestore"
import { devLog, devError } from "../../../utils/auth-helpers"
import { saveInAppNotification } from "../../../utils/notification-utils"
import ResultModal from "../../components/ResultModal"
import LoadingLogo from "../../components/LoadingLogo"
import { useLoadingDelay } from "../../components/useLoadingDelay"

export default function SecurityPage() {
  const [isSidebarOpen, setSidebarOpen] = useState(false)
  const [sessions, setSessions] = useState([])
  const [loginHistory, setLoginHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const showLoading = useLoadingDelay(loading, 500)
  const [globalMessage, setGlobalMessage] = useState("")
  const [revoking, setRevoking] = useState(null)

  const loadSecurityData = useCallback(async () => {
    try {
      const accountId = getUserAccountId()
      if (!accountId) {
        setGlobalMessage("Unable to identify user")
        setLoading(false)
        return
      }

      // Get active FCM tokens (sessions)
      const userRef = doc(db, "users", accountId)
      const userDoc = await getDocs(query(collection(db, "users"), where("accountId", "==", accountId)))
      
      if (!userDoc.empty) {
        const userData = userDoc.docs[0].data()
        const fcmTokens = userData.fcmTokens || []
        
        // Transform FCM tokens to session objects
        const sessionData = fcmTokens.map((tokenInfo, index) => ({
          id: tokenInfo.token,
          device: getDeviceName(tokenInfo.userAgent || tokenInfo.deviceInfo),
          location: "Philippines", // Would need IP geolocation API for real location
          lastActive: tokenInfo.lastUsed || tokenInfo.createdAt,
          isCurrent: index === 0, // First token is usually current
          userAgent: tokenInfo.userAgent,
          deviceInfo: tokenInfo.deviceInfo
        }))
        
        setSessions(sessionData)
      }

      // Get login history from notifications
      const notificationsRef = collection(db, "notifications")
      const loginQuery = query(
        notificationsRef,
        where("accountId", "==", accountId),
        where("type", "==", "login"),
        orderBy("createdAt", "desc"),
        limit(10)
      )
      
      const loginSnapshot = await getDocs(loginQuery)
      const history = loginSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate().toISOString() : new Date().toISOString()
      }))
      
      setLoginHistory(history)
      
    } catch (error) {
      devError("Error loading security data:", error)
      setGlobalMessage("Error loading security information")
    } finally {
      setLoading(false)
    }
  }, [])

  // Load sessions and login history on mount
  useEffect(() => {
    loadSecurityData()
  }, [loadSecurityData])

  const getDeviceName = (userAgentOrDevice) => {
    if (!userAgentOrDevice) return "Unknown Device"
    
    const ua = typeof userAgentOrDevice === 'string' ? userAgentOrDevice : userAgentOrDevice.userAgent || ""
    
    // Detect OS
    let os = "Unknown"
    if (ua.includes("Windows")) os = "Windows PC"
    else if (ua.includes("Mac")) os = "Mac"
    else if (ua.includes("Android")) os = "Android"
    else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS"
    else if (ua.includes("Linux")) os = "Linux"
    
    // Detect Browser
    let browser = "Unknown"
    if (ua.includes("Chrome")) browser = "Chrome"
    else if (ua.includes("Firefox")) browser = "Firefox"
    else if (ua.includes("Safari")) browser = "Safari"
    else if (ua.includes("Edge")) browser = "Edge"
    
    return `${os} - ${browser}`
  }

  const formatTime = (timestamp) => {
    if (!timestamp) return "Unknown"
    
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`
    return date.toLocaleDateString()
  }

  const handleRevokeSession = useCallback(async (sessionId, isCurrent) => {
    if (isCurrent) {
      setGlobalMessage("Cannot revoke current session. Please log out instead.")
      return
    }

    try {
      setRevoking(sessionId)
      const accountId = getUserAccountId()
      if (!accountId) return

      // Remove FCM token from user document
      const userQuery = query(collection(db, "users"), where("accountId", "==", accountId))
      const userSnapshot = await getDocs(userQuery)
      
      if (!userSnapshot.empty) {
        const userDocRef = userSnapshot.docs[0].ref
        const userData = userSnapshot.docs[0].data()
        const updatedTokens = (userData.fcmTokens || []).filter(t => t.token !== sessionId)
        
        await updateDoc(userDocRef, {
          fcmTokens: updatedTokens
        })
        
        // Update local state
        setSessions(prev => prev.filter(s => s.id !== sessionId))
        
        await saveInAppNotification(
          "A device session was revoked from your account.",
          "security_session_revoked"
        )
        
        setGlobalMessage("Session revoked successfully!")
      }
    } catch (error) {
      devError("Error revoking session:", error)
      setGlobalMessage("Failed to revoke session. Please try again.")
    } finally {
      setRevoking(null)
    }
  }, [])

  if (showLoading) {
    return (
      <div className="min-h-screen container mx-auto text-[#1F2421] relative">
        <div className="flex gap-4 md:gap-6 p-3 md:p-4 lg:p-6">
          <div className="hidden lg:block">
            <Navbar />
          </div>
          <div className="flex flex-1 flex-col gap-4 md:gap-6 w-full min-w-0">
            <Header setSidebarOpen={setSidebarOpen} />
            <div className="bg-white rounded-2xl border border-gray-300 p-8 md:p-12">
              <LoadingLogo message="Loading security settings..." size="lg" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen container mx-auto text-[#1F2421] relative">
      {/* Backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-opacity lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <div
        className={`fixed z-50 inset-y-0 left-0 w-80 bg-white transform shadow-lg transition-transform duration-300 ease-in-out lg:hidden ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Navbar />
      </div>

      {/* MAIN */}
      <div className="flex gap-4 md:gap-6 p-3 md:p-4 lg:p-6">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block">
          <Navbar />
        </div>

        <div className="flex flex-1 flex-col gap-4 md:gap-6 w-full min-w-0">
          {/* Header */}
          <Header setSidebarOpen={setSidebarOpen} />

          {/* Main container */}
          <div className="flex flex-col gap-4 md:gap-6">
            {/* Header Card */}
            <div className="bg-white rounded-2xl border border-gray-300 p-4 md:p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                <div className="min-w-0">
                  <h1 className="text-xl md:text-2xl font-bold text-gray-900">
                    Security
                  </h1>
                  <p className="text-gray-600 text-sm mt-1">
                    Manage your active sessions and login history
                  </p>
                </div>
              </div>
            </div>

            {/* Active Sessions */}
            <div className="bg-white rounded-2xl border border-gray-300 p-4 md:p-6">
              <div className="flex items-center gap-3 mb-4 md:mb-6">
                <Shield className="w-5 h-5 md:w-6 md:h-6 text-[#105588]" />
                <h2 className="text-lg md:text-xl font-semibold">Active Sessions</h2>
              </div>

              {sessions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Monitor className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No active sessions found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {sessions.map((session) => (
                    <div
                      key={session.id}
                      className={`p-4 rounded-xl border-2 transition-colors ${
                        session.isCurrent
                          ? "border-green-300 bg-green-50"
                          : "border-gray-200 bg-white hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                            session.isCurrent ? "bg-green-500" : "bg-blue-500"
                          }`}>
                            {session.device.includes("Android") || session.device.includes("iOS") ? (
                              <Smartphone className="w-6 h-6 text-white" />
                            ) : (
                              <Monitor className="w-6 h-6 text-white" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-gray-800">{session.device}</h3>
                              {session.isCurrent && (
                                <span className="px-2 py-0.5 bg-green-500 text-white text-xs font-semibold rounded-full">
                                  Current
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                              <Globe className="w-4 h-4" />
                              {session.location}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                              <Clock className="w-4 h-4" />
                              Last active: {formatTime(session.lastActive)}
                            </div>
                          </div>
                        </div>
                        {!session.isCurrent && (
                          <button
                            onClick={() => handleRevokeSession(session.id, session.isCurrent)}
                            disabled={revoking === session.id}
                            className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                          >
                            <Trash2 className="w-4 h-4" />
                            {revoking === session.id ? "Revoking..." : "Revoke"}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Login History */}
            <div className="bg-white rounded-2xl border border-gray-300 p-4 md:p-6">
              <div className="flex items-center gap-3 mb-4 md:mb-6">
                <Clock className="w-5 h-5 md:w-6 md:h-6 text-[#105588]" />
                <h2 className="text-lg md:text-xl font-semibold">Login History</h2>
              </div>

              {loginHistory.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No login history available</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {loginHistory.map((login) => (
                    <div
                      key={login.id}
                      className="p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-gray-800 mb-1">{login.message}</p>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Clock className="w-4 h-4" />
                            {formatTime(login.timestamp)}
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Security Tips */}
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl border border-blue-200 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">🔐 Security Tips</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">✓</span>
                  <span>Use a strong, unique password for your MEGG account</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">✓</span>
                  <span>Enable two-factor authentication when available</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">✓</span>
                  <span>Review and revoke suspicious sessions regularly</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">✓</span>
                  <span>Change your password immediately if you notice unauthorized access</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">✓</span>
                  <span>Never share your password or verification codes with anyone</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Global Message Modal */}
      <ResultModal
        message={globalMessage}
        onClose={() => setGlobalMessage("")}
      />
    </div>
  )
}

