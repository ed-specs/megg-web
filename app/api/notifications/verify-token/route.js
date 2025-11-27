import { doc, getDoc } from "firebase/firestore"
import { db } from "../../../config/firebaseConfig"

export async function POST(request) {
  try {
    const { accountId, token } = await request.json()

    if (!accountId || !token) {
      return Response.json(
        { error: "Account ID and token are required" },
        { status: 400 }
      )
    }

    const userRef = doc(db, "users", accountId)
    const userDoc = await getDoc(userRef)

    if (!userDoc.exists()) {
      return Response.json({
        exists: false,
        message: "User not found"
      })
    }

    const userData = userDoc.data()
    const fcmTokens = userData.fcmTokens || []
    
    // Check if token exists in user's FCM tokens
    const tokenExists = fcmTokens.some(tokenInfo => 
      tokenInfo.token === token && tokenInfo.isActive
    )

    return Response.json({
      exists: tokenExists,
      message: tokenExists ? "Token found" : "Token not found"
    })

  } catch (error) {
    console.error("Error verifying FCM token:", error)
    return Response.json(
      { error: "Failed to verify FCM token" },
      { status: 500 }
    )
  }
}
