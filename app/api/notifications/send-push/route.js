import { getAdminServices } from "../../../config/firebase-admin"
import { collection, query, where, getDocs } from "firebase/firestore"
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
