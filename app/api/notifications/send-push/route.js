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

    console.log("🔧 Initializing Firebase Admin services...")
    
    // Check if Firebase Admin credentials are configured
    const hasServiceAccount = !!process.env.FIREBASE_SERVICE_ACCOUNT
    const hasIndividualKeys = !!(
      process.env.FIREBASE_PROJECT_ID && 
      process.env.FIREBASE_CLIENT_EMAIL && 
      process.env.FIREBASE_PRIVATE_KEY
    )
    
    console.log("🔍 Environment check:", {
      hasServiceAccount,
      hasIndividualKeys,
      projectId: process.env.FIREBASE_PROJECT_ID ? "✓" : "✗",
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL ? "✓" : "✗",
      privateKey: process.env.FIREBASE_PRIVATE_KEY ? "✓" : "✗"
    })
    
    if (!hasServiceAccount && !hasIndividualKeys) {
      console.error("❌ Firebase Admin credentials not configured")
      return Response.json(
        { error: "Firebase Admin not configured. Missing environment variables." },
        { status: 500 }
      )
    }

    const { messaging } = getAdminServices()
    console.log("✅ Firebase Admin initialized successfully")

    let tokens = []

    if (accountId) {
      console.log(`📱 Fetching FCM tokens for accountId: ${accountId}`)
      // Send to specific user
      const usersRef = collection(db, "users")
      const q = query(usersRef, where("accountId", "==", accountId))
      const querySnapshot = await getDocs(q)

      if (!querySnapshot.empty) {
        const userData = querySnapshot.docs[0].data()
        console.log(`👤 User found: ${accountId}`)
        
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
            console.log(`🔕 Push notifications disabled for user ${accountId}`)
            return Response.json(
              { error: "Push notifications are disabled for this user", skipped: true },
              { status: 200 } // Return 200 but indicate it was skipped
            )
          }
        } else {
          // No settings found, default to enabled (for backward compatibility)
          console.log(`⚙️ No notification settings found for user ${accountId}, defaulting to enabled`)
        }
        
        const fcmTokens = userData.fcmTokens || []
        console.log(`🔑 Found ${fcmTokens.length} FCM token(s) for user`)
        
        // Extract active tokens
        tokens = fcmTokens
          .filter(tokenInfo => tokenInfo.isActive && tokenInfo.token)
          .map(tokenInfo => tokenInfo.token)
        
        console.log(`✅ ${tokens.length} active token(s) ready to receive notification`)
      } else {
        console.log(`❌ No user found with accountId: ${accountId}`)
      }
    }

    if (tokens.length === 0) {
      console.log(`⚠️ No active FCM tokens found`)
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

    console.log(`📤 Sending notification to ${tokens.length} device(s)...`)
    console.log(`📋 Message:`, { title, body, url: url || "/dashboard/overview" })

    // Send the notification
    const response = await messaging.sendEachForMulticast(message)

    console.log(`✅ Successfully sent notification to ${response.successCount} device(s)`)
    if (response.failureCount > 0) {
      console.log(`❌ Failed to send to ${response.failureCount} device(s)`)
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          console.error(`  Device ${idx}: ${resp.error?.message}`)
        }
      })
    }

    return Response.json({
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount,
      results: response.responses,
    })

  } catch (error) {
    console.error("❌ Error sending push notification:", error)
    console.error("Error details:", {
      message: error.message,
      stack: error.stack,
      code: error.code
    })
    return Response.json(
      { 
        error: "Failed to send push notification",
        details: error.message,
        code: error.code 
      },
      { status: 500 }
    )
  }
}
