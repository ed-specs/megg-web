"use client"
import { useState, useEffect } from "react"
import { Bell } from "lucide-react"
import { auth, db } from "../../../config/firebaseConfig"
import { doc, getDoc, updateDoc, setDoc } from "firebase/firestore"
import { usePushNotifications } from "../../../hooks/notifications/UsePushNotification"
import { createNotification } from "../../../lib/notifications/NotificationsService"
import { Navbar } from "../../components/NavBar"
import { Header } from "../../components/Header"
import { getCurrentUser, getStoredUser, getUserAccountId } from "../../../utils/auth-utils"
import ResultModal from "../../components/ResultModal"
import LoadingLogo from "../../components/LoadingLogo"
import { useLoadingDelay } from "../../components/useLoadingDelay"

export default function NotificationSettings() {
  const [globalMessage, setGlobalMessage] = useState("")
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const [pushNotificationsEnabled, setPushNotificationsEnabled] = useState(false)
  const [emailNotifications, setEmailNotifications] = useState(false)
  const [inAppNotifications, setInAppNotifications] = useState(false)
  const [defectAlerts, setDefectAlerts] = useState(false)
  const [machineAlerts, setMachineAlerts] = useState(false)
  const [loading, setLoading] = useState(true)
  const showLoading = useLoadingDelay(loading, 500)
  const [isSidebarOpen, setSidebarOpen] = useState(false)

  const {
    permissionGranted,
    loading: pushLoading,
    error: pushError,
    enablePushNotifications,
    disablePushNotifications,
    getDebugInfo,
  } = usePushNotifications()

  // Load user notification settings
  useEffect(() => {
    const loadNotificationSettings = async () => {
      try {
        const user = getCurrentUser()
        const storedUser = getStoredUser()
        const accountId = getUserAccountId()
        
        // Use accountId from stored user data if available, otherwise use user.uid
        const docId = accountId || user?.uid
        
        if (!docId) {
          setGlobalMessage("Unable to identify user")
          setLoading(false)
          return
        }

        // Check if notification settings document exists
        const settingsRef = doc(db, "notificationSettings", docId)
        const settingsSnap = await getDoc(settingsRef)

        if (settingsSnap.exists()) {
          const data = settingsSnap.data()
          setNotificationsEnabled(data.notificationsEnabled || false)
          setPushNotificationsEnabled(data.pushNotificationsEnabled || false)
          setEmailNotifications(data.emailNotifications || false)
          setInAppNotifications(data.inAppNotifications || false)
          setDefectAlerts(data.defectAlerts || false)
          setMachineAlerts(data.machineAlerts || false)
          } else {
            // Create default settings if none exist
            const defaultSettings = {
              notificationsEnabled: true,
              pushNotificationsEnabled: false,
              emailNotifications: false,
              inAppNotifications: true, // Always enabled by default
              defectAlerts: true,
              machineAlerts: true,
            }
            await setDoc(settingsRef, defaultSettings)
            setNotificationsEnabled(defaultSettings.notificationsEnabled)
            setPushNotificationsEnabled(defaultSettings.pushNotificationsEnabled)
            setEmailNotifications(defaultSettings.emailNotifications)
            setInAppNotifications(defaultSettings.inAppNotifications)
            setDefectAlerts(defaultSettings.defectAlerts)
            setMachineAlerts(defaultSettings.machineAlerts)
          }
      } catch (error) {
        console.error("Error loading notification settings:", error)
        setGlobalMessage("Error loading notification settings")
      } finally {
        setLoading(false)
      }
    }

    loadNotificationSettings()
  }, [])

  // Helper function to save a single setting
  const saveSetting = async (settingName, value) => {
    try {
      const user = getCurrentUser()
      const accountId = getUserAccountId()
      const docId = accountId || user?.uid
      
      if (!docId) {
        setGlobalMessage("Unable to identify user")
        return false
      }

      const settingsRef = doc(db, "notificationSettings", docId)
      await updateDoc(settingsRef, {
        [settingName]: value,
        updatedAt: new Date().toISOString(),
      })
      
      return docId
    } catch (error) {
      console.error(`Error saving ${settingName}:`, error)
      setGlobalMessage(`Error saving ${settingName}`)
      return false
    }
  }

  // Handle email notification toggle
  const handleEmailNotificationToggle = async (enabled) => {
    setEmailNotifications(enabled)
    const docId = await saveSetting('emailNotifications', enabled)
    
    if (docId && enabled) {
      // Create in-app notification
      try {
        await createNotification(
          docId,
          "Email notifications have been enabled. You will now receive email alerts from MEGG!",
          "settings_change"
        )
      } catch (error) {
        console.error('Error creating in-app notification:', error)
      }

      // Send test email
      try {
        const emailResponse = await fetch('/api/notifications/send-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            accountId: docId,
            subject: '📧 Email Notifications Enabled - MEGG',
            message: `
              <h2>Email Notifications Enabled!</h2>
              <p>You have successfully enabled email notifications for your MEGG account.</p>
              <p><strong>What you'll receive:</strong></p>
              <ul>
                <li>Important account updates</li>
                <li>Security alerts</li>
                <li>System notifications (if enabled)</li>
                <li>Defect and machine alerts (if enabled)</li>
              </ul>
              <p>You can manage your notification preferences anytime in your dashboard settings.</p>
            `
          })
        })
        
        const emailResult = await emailResponse.json()
        if (emailResult.success) {
          console.log('Test email sent to:', emailResult.email)
          setGlobalMessage("Email notifications enabled! Check your inbox for a confirmation email.")
        }
      } catch (emailError) {
        console.error('Error sending test email:', emailError)
        setGlobalMessage("Email notifications enabled, but test email failed to send.")
      }
    } else if (docId && !enabled) {
      // Create in-app notification for disabling
      try {
        await createNotification(
          docId,
          "Email notifications have been disabled. You will no longer receive email alerts.",
          "settings_change"
        )
        setGlobalMessage("Email notifications disabled.")
      } catch (error) {
        console.error('Error creating in-app notification:', error)
      }
    }

    // Clear message after 3 seconds
    setTimeout(() => setGlobalMessage(""), 3000)
  }

  // Handle in-app notification toggle
  const handleInAppNotificationToggle = async (enabled) => {
    setInAppNotifications(enabled)
    const docId = await saveSetting('inAppNotifications', enabled)
    
    if (docId && enabled) {
      // Create in-app notification
      try {
        await createNotification(
          docId,
          "In-app notifications have been enabled. You will now see notifications in your dashboard!",
          "settings_change"
        )
        setGlobalMessage("In-app notifications enabled!")
      } catch (error) {
        console.error('Error creating in-app notification:', error)
      }
    } else if (docId && !enabled) {
      // Just show message (can't create in-app notification if they're disabling it)
      setGlobalMessage("In-app notifications disabled.")
    }

    // Clear message after 3 seconds
    setTimeout(() => setGlobalMessage(""), 3000)
  }

  // Handle other toggles
  const handleMasterToggle = async (enabled) => {
    setNotificationsEnabled(enabled)
    const docId = await saveSetting('notificationsEnabled', enabled)
    
    if (docId) {
      if (enabled) {
        await createNotification(
          docId,
          "All notifications have been enabled.",
          "settings_change"
        )
        setGlobalMessage("All notifications enabled!")
      } else {
        setGlobalMessage("All notifications disabled.")
      }
      setTimeout(() => setGlobalMessage(""), 3000)
    }
  }

  const handleDefectAlertsToggle = async (enabled) => {
    setDefectAlerts(enabled)
    await saveSetting('defectAlerts', enabled)
    setGlobalMessage(enabled ? "Defect alerts enabled!" : "Defect alerts disabled.")
    setTimeout(() => setGlobalMessage(""), 3000)
  }

  const handleMachineAlertsToggle = async (enabled) => {
    setMachineAlerts(enabled)
    await saveSetting('machineAlerts', enabled)
    setGlobalMessage(enabled ? "Machine alerts enabled!" : "Machine alerts disabled.")
    setTimeout(() => setGlobalMessage(""), 3000)
  }

  const handlePushNotificationToggle = async (enabled) => {
    try {
      const user = getCurrentUser()
      const storedUser = getStoredUser()
      const accountId = getUserAccountId()
      
      // Use accountId from stored user data if available, otherwise use user.uid
      const docId = accountId || user?.uid
      
      if (!docId) {
        setGlobalMessage("Unable to identify user")
        return
      }

      if (enabled) {
        const success = await enablePushNotifications()
        if (success) {
          setPushNotificationsEnabled(true)
          // Save the setting to Firestore
          const settingsRef = doc(db, "notificationSettings", docId)
          await updateDoc(settingsRef, {
            pushNotificationsEnabled: true,
            updatedAt: new Date().toISOString(),
          })
          
          // Create in-app notification for enabling push notifications
          try {
            await createNotification(
              docId,
              "Push notifications have been enabled. You will now receive browser notifications from MEGG!",
              "settings_change"
            )
            console.log('In-app notification created for push notifications enabled')
          } catch (error) {
            console.error('Error creating in-app notification:', error)
          }
          
          // Send a push notification confirming it's enabled
          try {
            const response = await fetch('/api/notifications/send-push', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                title: '🔔 Push Notifications Enabled',
                body: 'You will now receive push notifications from MEGG!',
                accountId: docId,
                data: {
                  type: 'settings_change',
                  setting: 'push_notifications',
                  enabled: true,
                  timestamp: new Date().toISOString()
                },
                url: '/dashboard/settings/preferences'
              })
            })
            
            if (response.ok) {
              console.log('Push notification confirmation sent')
            }
          } catch (error) {
            console.error('Error sending push notification confirmation:', error)
          }
          
          setGlobalMessage("Push notifications enabled successfully! You should receive a test notification.")
        } else {
          // Permission denied
          setGlobalMessage("Push notifications blocked. Please allow notifications in your browser settings.\n\nTo enable:\n• Click the lock/info icon in the address bar\n• Find 'Notifications' and set it to 'Allow'\n• Refresh the page and try again")
          setPushNotificationsEnabled(false)
        }
      } else {
        await disablePushNotifications()
        setPushNotificationsEnabled(false)
        // Save the setting to Firestore
        const settingsRef = doc(db, "notificationSettings", docId)
        await updateDoc(settingsRef, {
          pushNotificationsEnabled: false,
          updatedAt: new Date().toISOString(),
        })
        
        // Create in-app notification for disabling push notifications
        try {
          await createNotification(
            docId,
            "Push notifications have been disabled. You will no longer receive browser notifications.",
            "settings_change"
          )
          console.log('In-app notification created for push notifications disabled')
        } catch (error) {
          console.error('Error creating in-app notification:', error)
        }
        
        setGlobalMessage("Push notifications disabled")
      }

      // Clear message after 3 seconds
      setTimeout(() => setGlobalMessage(""), 3000)
    } catch (error) {
      console.error("Error toggling push notifications:", error)
      setGlobalMessage("Error updating push notification settings")
    }
  }

  if (showLoading && !notificationsEnabled) {
    return (
      <div className="min-h-screen container mx-auto text-[#1F2421] relative">
        <div className="flex gap-6 p-4 md:p-6">
          <div className="hidden lg:block">
            <Navbar />
          </div>
          <div className="flex flex-1 flex-col gap-6 w-full">
            <Header setSidebarOpen={() => {}} />
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <LoadingLogo message="Loading preferences..." size="lg" />
              </div>
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
      <div className="flex gap-6 p-4 md:p-6">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block">
          <Navbar />
        </div>

        <div className="flex flex-1 flex-col gap-6 w-full">
          {/* Header */}
          <Header setSidebarOpen={setSidebarOpen} />

          {/* Main container */}
          <div className="flex flex-col gap-6">
            {/* General Notification Settings */}
            <div className="bg-white rounded-2xl border border-gray-300 p-6">
              <h2 className="text-xl font-semibold mb-6">Notification Preferences</h2>
              
              <div className="space-y-6">

                {/* Push Notifications */}
                <div className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Bell className="w-5 h-5 text-gray-500" />
                      <div>
                        <h3 className="font-medium text-gray-900">Push Notifications</h3>
                        <p className="text-sm text-gray-500">
                          Browser notifications for real-time alerts
                          {permissionGranted && pushNotificationsEnabled && (
                            <span className="ml-2 text-green-600 text-xs">✓ Enabled</span>
                          )}
                          {!permissionGranted && pushNotificationsEnabled && (
                            <span className="ml-2 text-red-600 text-xs">✗ Blocked by browser</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={pushNotificationsEnabled && permissionGranted}
                        onChange={(e) => handlePushNotificationToggle(e.target.checked)}
                        disabled={!notificationsEnabled || pushLoading}
                        className="sr-only peer"
                      />
                      <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 ${
                        !notificationsEnabled ? 'opacity-50 cursor-not-allowed' : ''
                      }`}></div>
                    </label>
                  </div>
                  
                  {/* Help text for blocked permissions */}
                  {!permissionGranted && (
                    <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-yellow-800 font-medium mb-1">
                        🔒 Browser notifications are blocked
                      </p>
                      <p className="text-xs text-yellow-700 mb-2">
                        To enable push notifications, you need to allow them in your browser:
                      </p>
                      <ol className="text-xs text-yellow-700 space-y-1 ml-4 list-decimal">
                        <li>Click the lock/info icon (🔒 or ⓘ) in your browser's address bar</li>
                        <li>Find "Notifications" in the permissions list</li>
                        <li>Change it from "Block" to "Allow"</li>
                        <li>Refresh this page and toggle the switch above</li>
                      </ol>
                    </div>
                  )}
                </div>

                {/* Email Notifications */}
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <h3 className="font-medium text-gray-900">Email Notifications</h3>
                    <p className="text-sm text-gray-500">Receive notifications via email</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={emailNotifications}
                      onChange={(e) => handleEmailNotificationToggle(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* Info Message */}
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
              <p className="text-sm text-blue-800">
                ℹ️ All changes are saved automatically when you toggle any setting.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Global Message */}
      {/* Global Message Modal */}
      <ResultModal
        message={globalMessage}
        onClose={() => setGlobalMessage("")}
      />
    </div>
  )
}
