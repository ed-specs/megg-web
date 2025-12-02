import { getAdminServices } from "../../../config/firebase-admin"
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore"
import { db } from "../../../config/firebaseConfig"

export async function POST(request) {
  try {
    const { title, body, accountId, data, url } = await request.json()

    if (!title || !body) {
      return Response.json(
        { error: "Title and body are required" },
        { status: 400 }
      )
    }

    const { messaging } = getAdminServices()

    let tokens = []

    if (accountId) {
      // Send to specific user
      const usersRef = collection(db, "users")
      const q = query(usersRef, where("accountId", "==", accountId))
      const querySnapshot = await getDocs(q)

      if (!querySnapshot.empty) {
        const userData = querySnapshot.docs[0].data()
        
        // Check if push notifications are enabled for this user
        // Try both accountId and uid as document ID
        let settingsSnap = await getDoc(doc(db, "notificationSettings", accountId))
        if (!settingsSnap.exists() && userData.uid) {
          settingsSnap = await getDoc(doc(db, "notificationSettings", userData.uid))
        }
        
        if (settingsSnap.exists()) {
          const settings = settingsSnap.data()
          // Check if push notifications are disabled
          if (settings.pushNotificationsEnabled === false) {
            console.log(`Push notifications disabled for user ${accountId}`)
            return Response.json(
              { error: "Push notifications are disabled for this user", skipped: true },
              { status: 200 } // Return 200 but indicate it was skipped
            )
          }
        } else {
          // No settings found, default to enabled (for backward compatibility)
          console.log(`No notification settings found for user ${accountId}, defaulting to enabled`)
        }
        
        const fcmTokens = userData.fcmTokens || []
        
        // Extract active tokens
        tokens = fcmTokens
          .filter(tokenInfo => tokenInfo.isActive && tokenInfo.token)
          .map(tokenInfo => tokenInfo.token)
      }
    }

    if (tokens.length === 0) {
      return Response.json(
        { error: "No active FCM tokens found for the specified user" },
        { status: 404 }
      )
    }

    // Prepare the message
    const message = {
      notification: {
        title,
        body,
      },
      data: {
        ...data,
        url: url || "/dashboard/overview",
      },
      tokens: tokens,
    }

    // Send the notification
    const response = await messaging.sendEachForMulticast(message)

    console.log(`Successfully sent notification to ${response.successCount} devices`)
    console.log(`Failed to send to ${response.failureCount} devices`)

    return Response.json({
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount,
      results: response.responses,
    })

  } catch (error) {
    console.error("Error sending push notification:", error)
    return Response.json(
      { error: "Failed to send push notification" },
      { status: 500 }
    )
  }
}
