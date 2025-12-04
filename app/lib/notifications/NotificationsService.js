import { db } from "../../config/firebaseConfig"
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  getDoc,
  setDoc,
} from "firebase/firestore"
import { devLog, devError } from "../../utils/auth-helpers"

// Generate random 6 alphanumeric characters
function generateRandomAlphanumeric() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// Generate notification document ID in format: NOTIF-{accountId}-{random6alphanumeric}
function generateNotificationId(accountId) {
  const randomPart = generateRandomAlphanumeric()
  return `NOTIF-${accountId}-${randomPart}`
}

// Check if notifications are enabled before creating
async function checkNotificationSettings(userId, type) {
  try {
    // Always allow login, logout, password, settings, and profile-related notifications
    if (type === "login" || 
        type === "logout" ||
        type === "password_change" ||
        type === "settings_change" ||
        type === "security_session_revoked" ||
        type.includes("password") ||
        type.includes("settings") ||
        type.includes("security") ||
        type.includes("profile") || 
        type.includes("name_updated") || 
        type.includes("email_updated") || 
        type.includes("phone_updated") || 
        type.includes("address_updated") || 
        type.includes("birthday_updated") || 
        type.includes("age_updated") ||
        type.includes("gender_updated") ||
        type.includes("farm_")) {
      return true
    }

    const settingsRef = doc(db, "notificationSettings", userId)
    const settingsSnap = await getDoc(settingsRef)

    if (!settingsSnap.exists()) {
      // No settings exist - default to enabled for most types
      // Only disable if it's a type that requires explicit settings
      if (type.includes("defect") || type.includes("machine")) {
        return false
      }
      return true // Default to enabled for login, password, profile changes, etc.
    }

    const settings = settingsSnap.data()

    // Check if general notifications are enabled
    if (!settings.notificationsEnabled) {
      return false
    }

    // Check if in-app notifications are enabled
    if (!settings.inAppNotifications) {
      return false
    }

    // For specific notification types, check relevant settings
    if (type.includes("defect") && !settings.defectAlerts) {
      return false
    }

    if (type.includes("machine") && !settings.machineAlerts) {
      return false
    }
    if (
      type.includes("password") ||
      type.includes("machine_linked") ||
      type.includes("machine_updated") ||
      type.includes("machine_unlinked")
    ) {
      return true
    }


    return true
  } catch (error) {
    devError("Error checking notification settings:", error)
    // On error, allow login notifications but block others
    return type === "login"
  }
}

// Create a new notification
// accountId: The account ID (e.g., "MEGG-679622")
// message: The notification message
// type: The notification type (e.g., "login", "password_change")
// read: Whether the notification is read (default: false)
export async function createNotification(accountId, message, type, read = false) {
  try {
    // Check if notifications are enabled for this user and type
    // Note: The user document ID is the accountId, so we can use it directly for settings check
    // But we also need to check if the user has a uid field for settings lookup
    let userId = null
    let userDocId = null
    try {
      // Try to find user by accountId (document ID might be accountId)
      const userDocRef = doc(db, "users", accountId)
      const userDocSnap = await getDoc(userDocRef)
      
      if (userDocSnap.exists()) {
        userDocId = accountId
        const userData = userDocSnap.data()
        // Use uid if available, otherwise use accountId as document ID
        userId = userData.uid || accountId
      } else {
        // Try querying by accountId field
        const userQuery = query(collection(db, "users"), where("accountId", "==", accountId))
        const userSnapshot = await getDocs(userQuery)
        if (!userSnapshot.empty) {
          const userDoc = userSnapshot.docs[0]
          userDocId = userDoc.id
          const userData = userDoc.data()
          userId = userData.uid || userDoc.id
        }
      }
    } catch (error) {
      devError("Error finding user by accountId:", error)
    }

    // Check notification settings if userId is found
    // For login notifications, always create even if userId is not found
    if (userId) {
      const notificationsEnabled = await checkNotificationSettings(userId, type)
      if (!notificationsEnabled) {
        devLog(`Notifications disabled for account ${accountId} and type ${type}`)
        return null // Don't create notification if disabled
      }
    } else if (type !== "login") {
      // If userId not found and it's not a login notification, skip creation
      devLog(`User not found for account ${accountId}, skipping notification creation for type ${type}`)
      return null
    }
    // For login notifications, proceed even if userId is not found

    // Generate custom document ID
    const notificationId = generateNotificationId(accountId)

    const notificationData = {
      accountId,
      message,
      type,
      read,
      createdAt: serverTimestamp(),
    }

    // Set icon based on notification type
    const iconMap = {
      "login": "login",
      "logout": "logout",
      "password_change": "lock",
      "settings_change": "settings",
      "farm_info_updated": "farm",
      "farm_name_updated": "farm",
      "farm_address_updated": "farm",
      "profile_image_added": "image",
      "profile_image_removed": "image",
      "profile_image_updated": "image",
      "name_updated": "user",
      "email_updated": "mail",
      "phone_updated": "phone",
      "address_updated": "map",
      "birthday_updated": "calendar",
      "age_updated": "calendar",
      "gender_updated": "user",
      // Inventory notifications
      "inventory_data_filtered": "filter",
      "inventory_refreshed": "refresh",
      "inventory_refresh_failed": "alert",
      "inventory_load_failed": "alert",
      // Batch notifications
      "batch_status_updated": "check",
      "batch_status_update_failed": "alert",
      // Export notifications
      "batch_list_exported": "download",
      "batch_details_exported": "download",
      "batch_export_failed": "alert",
      // Security notifications
      "security_session_revoked": "shield",
      // Farm notifications
      "farm_primary_changed": "building",
    }

    // Check if this notification type should use an icon
    if (iconMap[type]) {
      notificationData.icon = iconMap[type]
    } else {
      // For other types, try to get user profile image if available
      try {
        const userQuery = query(collection(db, "users"), where("accountId", "==", accountId))
        const userSnapshot = await getDocs(userQuery)
        if (!userSnapshot.empty) {
          const userData = userSnapshot.docs[0].data()
          if (userData.profileImageUrl) {
            notificationData.profileImage = userData.profileImageUrl
          }
        }
      } catch (error) {
        devError("Error getting user profile image:", error)
      }
    }

    // Create notification with custom document ID
    const notificationRef = doc(db, "notifications", notificationId)
    await setDoc(notificationRef, notificationData)
    
    devLog(`✅ Notification created: ${notificationId} for account ${accountId}`)
    devLog(`   Message: ${message}, Type: ${type}`)
    devLog(`   Icon: ${notificationData.icon || 'none'}, ProfileImage: ${notificationData.profileImage || 'none'}`)
    
    return notificationId
  } catch (error) {
    devError(`❌ Error creating notification for account ${accountId}:`, error)
    devError(`   Error details:`, error.message, error.code)
    throw error
  }
}

// Get notifications for a user by accountId
export async function getUserNotifications(accountId, limitCount = 10) {
  try {
    // Query notifications by accountId
    const q = query(collection(db, "notifications"), where("accountId", "==", accountId))

    const querySnapshot = await getDocs(q)
    let notifications = []

    querySnapshot.forEach((doc) => {
      const data = doc.data()
      notifications.push({
        id: doc.id,
        message: data.message,
        read: data.read || false,
        profileImage: data.profileImage || null, // Only set if exists, don't default to /default.png
        icon: data.icon || null, // Include icon field
        type: data.type,
        accountId: data.accountId,
        createdAt: data.createdAt 
          ? (data.createdAt.toDate ? data.createdAt.toDate().toISOString() : new Date(data.createdAt).toISOString())
          : new Date().toISOString(),
      })
    })

    // Sort the notifications by createdAt in memory instead of in the query
    notifications.sort((a, b) => {
      return new Date(b.createdAt) - new Date(a.createdAt)
    })

    // Apply the limit after sorting
    if (notifications.length > limitCount) {
      notifications = notifications.slice(0, limitCount)
    }

    return notifications
  } catch (error) {
    devError("Error getting notifications:", error)
    throw error
  }
}

// Mark a notification as read
export async function markNotificationAsRead(notificationId) {
  try {
    const notificationRef = doc(db, "notifications", notificationId)
    await updateDoc(notificationRef, {
      read: true,
    })
    return true
  } catch (error) {
    devError("Error marking notification as read:", error)
    throw error
  }
}

// Delete a notification
export async function deleteNotification(notificationId) {
  try {
    const notificationRef = doc(db, "notifications", notificationId)
    await deleteDoc(notificationRef)
    return true
  } catch (error) {
    devError("Error deleting notification:", error)
    throw error
  }
}

// Mark all notifications as read
export async function markAllNotificationsAsRead(accountId) {
  try {
    const q = query(collection(db, "notifications"), where("accountId", "==", accountId), where("read", "==", false))

    const querySnapshot = await getDocs(q)

    const batch = []
    querySnapshot.forEach((document) => {
      const notificationRef = doc(db, "notifications", document.id)
      batch.push(updateDoc(notificationRef, { read: true }))
    })

    await Promise.all(batch)
    return true
  } catch (error) {
    devError("Error marking all notifications as read:", error)
    throw error
  }
}

// Get unread notification count
export async function getUnreadNotificationCount(accountId) {
  try {
    const q = query(collection(db, "notifications"), where("accountId", "==", accountId), where("read", "==", false))

    const querySnapshot = await getDocs(q)
    return querySnapshot.size
  } catch (error) {
    devError("Error getting unread notification count:", error)
    throw error
  }
}

