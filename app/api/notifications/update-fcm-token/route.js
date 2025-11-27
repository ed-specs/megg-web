import { doc, updateDoc, arrayUnion, getDoc } from "firebase/firestore"
import { db } from "../../../config/firebaseConfig"

export async function POST(request) {
  try {
    const { accountId, fcmToken, deviceInfo } = await request.json()

    if (!accountId || !fcmToken) {
      return Response.json(
        { error: "Account ID and FCM token are required" },
        { status: 400 }
      )
    }

    const userRef = doc(db, "users", accountId)
    
    // Check if user exists
    const userDoc = await getDoc(userRef)
    if (!userDoc.exists()) {
      return Response.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    const userData = userDoc.data()
    const existingTokens = userData.fcmTokens || []
    
    // Check if token already exists
    const tokenExists = existingTokens.some(tokenInfo => tokenInfo.token === fcmToken)
    
    if (tokenExists) {
      // Update existing token's timestamp
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
      // Add new token
      const newTokenInfo = {
        token: fcmToken,
        deviceType: deviceInfo?.deviceType || 'web',
        userAgent: deviceInfo?.userAgent || 'unknown',
        lastUpdated: new Date().toISOString(),
        isActive: true
      }

      await updateDoc(userRef, {
        fcmTokens: arrayUnion(newTokenInfo),
        lastTokenUpdate: new Date().toISOString()
      })
    }

    return Response.json({
      success: true,
      message: "FCM token updated successfully"
    })

  } catch (error) {
    console.error("Error updating FCM token:", error)
    return Response.json(
      { error: "Failed to update FCM token" },
      { status: 500 }
    )
  }
}