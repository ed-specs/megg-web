/**
 * Firebase Cloud Messaging (FCM) Utility Functions
 * Handles push notification token management and messaging
 */

import { getMessaging, getToken, onMessage } from 'firebase/messaging'
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore'
import { db } from '../config/firebaseConfig'
import { devLog, devError } from './auth-helpers'

/**
 * Get FCM token for the current device
 * @returns {Promise<string|null>} FCM token or null if failed
 */
export const getFCMToken = async () => {
  try {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      devLog('FCM: Not in browser environment')
      return null
    }

    // Check if service worker is supported
    if (!('serviceWorker' in navigator)) {
      devLog('FCM: Service Worker not supported')
      return null
    }

    // Check if notifications are supported
    if (!('Notification' in window)) {
      devLog('FCM: Notifications not supported')
      return null
    }

    // Request notification permission
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      devLog('FCM: Notification permission denied')
      return null
    }

    // Get messaging instance
    const messaging = getMessaging()
    
    // Get FCM token
    const token = await getToken(messaging, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY
    })

    if (token) {
      devLog('FCM Token obtained:', token.substring(0, 20) + '...')
      return token
    } else {
      devLog('FCM: No registration token available')
      return null
    }
  } catch (error) {
    devError('Error getting FCM token:', error)
    return null
  }
}

/**
 * Update user's FCM token in Firestore
 * @param {string} accountId - User's account ID
 * @param {string} fcmToken - FCM token to store
 * @returns {Promise<boolean>} Success status
 */
export const updateUserFCMToken = async (accountId, fcmToken) => {
  try {
    if (!accountId || !fcmToken) {
      devLog('FCM: Missing accountId or fcmToken')
      return false
    }

    const userRef = doc(db, 'users', accountId)
    
    // Get current user document to check for existing tokens
    const { getDoc } = await import('firebase/firestore')
    const userDoc = await getDoc(userRef)
    
    if (!userDoc.exists()) {
      devLog('FCM: User document not found')
      return false
    }
    
    const userData = userDoc.data()
    const existingTokens = userData.fcmTokens || []
    
    // Check if token already exists
    const tokenExists = existingTokens.some(tokenInfo => tokenInfo.token === fcmToken)
    
    if (tokenExists) {
      devLog('FCM: Token already exists, updating timestamp only')
      // Update existing token's timestamp and ensure it's active
      const updatedTokens = existingTokens.map(tokenInfo => {
        if (tokenInfo.token === fcmToken) {
          return {
            ...tokenInfo,
            lastUpdated: new Date().toISOString(),
            isActive: true
          }
        }
        return tokenInfo
      })
      
      await updateDoc(userRef, {
        fcmTokens: updatedTokens,
        lastTokenUpdate: new Date().toISOString()
      })
    } else {
      devLog('FCM: Adding new token')
      // Create device info object
      const deviceInfo = {
        token: fcmToken,
        deviceType: getDeviceType(),
        userAgent: navigator.userAgent,
        lastUpdated: new Date().toISOString(),
        isActive: true
      }

      // Add new token to existing tokens
      await updateDoc(userRef, {
        fcmTokens: arrayUnion(deviceInfo),
        lastTokenUpdate: new Date().toISOString()
      })
    }

    devLog('FCM: Token updated successfully for user:', accountId)
    return true
  } catch (error) {
    devError('Error updating FCM token:', error)
    return false
  }
}

/**
 * Remove FCM token from user's document (on logout)
 * @param {string} accountId - User's account ID
 * @param {string} fcmToken - FCM token to remove
 * @returns {Promise<boolean>} Success status
 */
export const removeUserFCMToken = async (accountId, fcmToken) => {
  try {
    if (!accountId || !fcmToken) return false

    const userRef = doc(db, 'users', accountId)
    
    // We need to remove the specific device info object
    // This is a simplified approach - in production, you'd query first
    await updateDoc(userRef, {
      fcmTokens: arrayRemove({
        token: fcmToken,
        deviceType: getDeviceType(),
        userAgent: navigator.userAgent,
        isActive: false
      })
    })

    devLog('FCM: Token removed successfully for user:', accountId)
    return true
  } catch (error) {
    devError('Error removing FCM token:', error)
    return false
  }
}

/**
 * Set up foreground message listener
 * @param {function} callback - Function to call when message received
 */
export const setupForegroundMessageListener = (callback) => {
  try {
    if (typeof window === 'undefined') return

    const messaging = getMessaging()
    
    onMessage(messaging, (payload) => {
      devLog('FCM: Message received in foreground:', payload)
      
      // Show notification
      if (payload.notification) {
        showNotification(payload.notification)
      }
      
      // Call custom callback
      if (callback && typeof callback === 'function') {
        callback(payload)
      }
    })
  } catch (error) {
    devError('Error setting up foreground message listener:', error)
  }
}

/**
 * Show browser notification
 * @param {object} notification - Notification payload
 */
const showNotification = (notification) => {
  try {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title || 'MEGG Notification', {
        body: notification.body || '',
        icon: notification.icon || '/Logos/logoblue.png',
        badge: '/badge.png',
        tag: 'megg-notification',
        requireInteraction: false,
        silent: false
      })
    }
  } catch (error) {
    devError('Error showing notification:', error)
  }
}

/**
 * Get device type based on user agent
 * @returns {string} Device type
 */
const getDeviceType = () => {
  if (typeof window === 'undefined') return 'server'
  
  const userAgent = navigator.userAgent.toLowerCase()
  
  if (/mobile|android|iphone|ipad|tablet/.test(userAgent)) {
    return 'mobile'
  } else if (/electron/.test(userAgent)) {
    return 'desktop'
  } else {
    return 'web'
  }
}

/**
 * Send login success notification to user with retry mechanism
 * @param {string} accountId - User's account ID
 * @param {string} username - User's username
 * @param {number} retryCount - Current retry attempt (default: 0)
 * @returns {Promise<boolean>} Success status
 */
export const sendLoginSuccessNotification = async (accountId, username, retryCount = 0) => {
  const maxRetries = 2
  
  try {
    devLog(`🔔 Sending login notification for ${username} (${accountId}) - Attempt ${retryCount + 1}`)
    
    const response = await fetch('/api/notifications/send-push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: '🎉 Successful Login',
        body: `Welcome back, ${username}! Don't want notifications? Turn it off in settings.`,
        accountId: accountId, // Send to specific user
        data: {
          type: 'login_success',
          accountId,
          timestamp: new Date().toISOString()
        },
        url: '/dashboard/overview'
      })
    })

    const result = await response.json()
    devLog(`Login notification API response (attempt ${retryCount + 1}):`, result)

    if (response.ok && result.success) {
      devLog('✅ Login success notification sent successfully')
      return true
    } else {
      devError(`❌ Failed to send login success notification (attempt ${retryCount + 1}):`, result)
      
      // Retry if we haven't exceeded max retries
      if (retryCount < maxRetries) {
        devLog(`🔄 Retrying notification in 2 seconds... (${retryCount + 1}/${maxRetries})`)
        await new Promise(resolve => setTimeout(resolve, 2000))
        return await sendLoginSuccessNotification(accountId, username, retryCount + 1)
      }
      
      return false
    }
  } catch (error) {
    devError(`❌ Error sending login success notification (attempt ${retryCount + 1}):`, error)
    
    // Retry if we haven't exceeded max retries
    if (retryCount < maxRetries) {
      devLog(`🔄 Retrying notification in 2 seconds... (${retryCount + 1}/${maxRetries})`)
      await new Promise(resolve => setTimeout(resolve, 2000))
      return await sendLoginSuccessNotification(accountId, username, retryCount + 1)
    }
    
    return false
  }
}

/**
 * Initialize FCM for a user (call after login)
 * @param {string} accountId - User's account ID
 * @param {string} username - User's username (optional, for login notification)
 * @returns {Promise<boolean>} Success status
 */
export const initializeFCMForUser = async (accountId, username = null) => {
  try {
    devLog('FCM: Initializing for user:', accountId)
    
    // Get FCM token
    const fcmToken = await getFCMToken()
    if (!fcmToken) {
      devLog('FCM: Could not obtain token')
      return false
    }

    // Update user's FCM token
    const success = await updateUserFCMToken(accountId, fcmToken)
    if (!success) {
      devLog('FCM: Could not update user token')
      return false
    }

    // Set up foreground message listener
    setupForegroundMessageListener((payload) => {
      devLog('FCM: Received notification:', payload)
      // You can add custom handling here
    })

  // Send login success notification if username is provided
  if (username) {
    devLog(`🎯 Login notification scheduled for ${username} (${accountId}) in 5 seconds`)
    // Wait longer to ensure FCM token is properly registered and synced
    setTimeout(async () => {
      devLog(`🚀 Now sending login notification for ${username}`)
      const success = await sendLoginSuccessNotification(accountId, username)
      if (success) {
        devLog(`✅ Login notification completed for ${username}`)
      } else {
        devLog(`❌ Login notification failed for ${username}`)
      }
    }, 5000)
  } else {
    devLog('⚠️ No username provided - skipping login notification')
  }

    devLog('FCM: Successfully initialized for user:', accountId)
    return true
  } catch (error) {
    devError('Error initializing FCM:', error)
    return false
  }
}
