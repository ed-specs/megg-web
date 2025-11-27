/**
 * Smart FCM Token Management
 * Prevents duplicate tokens and unnecessary notifications
 */

import { getFCMToken, updateUserFCMToken, sendLoginSuccessNotification, setupForegroundMessageListener } from './fcm'

/**
 * Smart FCM initialization that prevents duplicate tokens
 * @param {string} accountId - User's account ID
 * @param {string} username - User's username for notification
 * @returns {Promise<boolean>} Success status
 */
export const smartInitializeFCM = async (accountId, username = null) => {
  try {
    const callId = Math.random().toString(36).substr(2, 9)
    console.log(`🧠 Smart FCM [${callId}]: Initializing for user:`, accountId, username ? `(${username})` : '(no username)')

    // Always generate a fresh FCM token for now (to debug the issue)
    console.log(`🧠 Smart FCM [${callId}]: Generating fresh FCM token`)
    const fcmToken = await getFCMToken()
    if (!fcmToken) {
      console.log(`🧠 Smart FCM [${callId}]: Could not obtain token`)
      return false
    }
    
    console.log(`🧠 Smart FCM [${callId}]: Got FCM token: ${fcmToken.substring(0, 20)}...`)
    const isNewToken = true // Always treat as new for now

    // Update user's FCM token (this will handle duplicates)
    const success = await updateUserFCMToken(accountId, fcmToken)
    if (!success) {
      console.log('🧠 Smart FCM: Could not update user token')
      return false
    }

    // Set up foreground message listener (only once per session)
    if (!window.fcmListenerSetup) {
      setupForegroundMessageListener((payload) => {
        console.log('🧠 Smart FCM: Received notification:', payload)
      })
      window.fcmListenerSetup = true
      console.log('🧠 Smart FCM: Message listener set up')
    }

    // Send login success notification if username is provided (simplified for debugging)
    if (username) {
      const currentTime = Date.now()
      console.log(`🧠 Smart FCM [${callId}]: Login notification scheduled for ${username} (${accountId}) in 5 seconds`)
      
      // Wait longer to ensure FCM token is properly registered and synced
      setTimeout(async () => {
        console.log(`🧠 Smart FCM [${callId}]: Now verifying token and sending login notification for ${username}`)
        
        // Verify token exists before sending notification
        const tokenExists = await verifyTokenInFirestore(accountId, fcmToken)
        if (!tokenExists) {
          console.log(`🧠 Smart FCM [${callId}]: ⚠️ Token not found in Firestore, retrying token update...`)
          await updateUserFCMToken(accountId, fcmToken)
          // Wait a bit more after retry
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
        
        const success = await sendLoginSuccessNotification(accountId, username)
        if (success) {
          console.log(`🧠 Smart FCM [${callId}]: ✅ Login notification completed for ${username}`)
        } else {
          console.log(`🧠 Smart FCM [${callId}]: ❌ Login notification failed for ${username}`)
        }
      }, 5000)
    } else {
      console.log(`🧠 Smart FCM [${callId}]: ⚠️ No username provided - skipping login notification`)
    }

    console.log(`🧠 Smart FCM [${callId}]: Successfully initialized for user:`, accountId)
    return true
  } catch (error) {
    console.error('🧠 Smart FCM: Error initializing:', error)
    return false
  }
}

/**
 * Verify if a token exists in Firestore for the user
 * @param {string} accountId - User's account ID
 * @param {string} token - FCM token to verify
 * @returns {Promise<boolean>} Whether token exists in Firestore
 */
const verifyTokenInFirestore = async (accountId, token) => {
  try {
    const response = await fetch('/api/notifications/verify-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ accountId, token })
    })
    
    const result = await response.json()
    return result.exists || false
  } catch (error) {
    console.error('🧠 Smart FCM: Error verifying token in Firestore:', error)
    return false
  }
}

/**
 * Clear FCM session data (useful for testing or logout)
 */
export const clearFCMSession = () => {
  localStorage.removeItem('fcm_token')
  localStorage.removeItem('fcm_token_timestamp')
  localStorage.removeItem('last_login_notification')
  window.fcmListenerSetup = false
  console.log('🧠 Smart FCM: Session data cleared')
}
