import admin from "firebase-admin"

function initializeAdmin() {
  if (admin.apps.length) return

  let credential = null

  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      const json = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
      if (json.private_key && typeof json.private_key === "string") {
        // Handle escaped newlines in JSON
        json.private_key = json.private_key.replace(/\\n/g, "\n")
      }
      console.log("✅ Using FIREBASE_SERVICE_ACCOUNT JSON method")
      credential = admin.credential.cert(json)
    } catch (e) {
      console.error("❌ Failed to parse FIREBASE_SERVICE_ACCOUNT:", e.message)
      throw new Error("Invalid FIREBASE_SERVICE_ACCOUNT JSON: " + e.message)
    }
  } else {
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
    let privateKey = process.env.FIREBASE_PRIVATE_KEY
    
    if (privateKey && typeof privateKey === "string") {
      // Remove surrounding quotes if present
      privateKey = privateKey.trim()
      if ((privateKey.startsWith('"') && privateKey.endsWith('"')) || 
          (privateKey.startsWith("'") && privateKey.endsWith("'"))) {
        privateKey = privateKey.slice(1, -1)
      }
      
      // Replace escaped newlines with actual newlines
      privateKey = privateKey.replace(/\\n/g, "\n")
      
      // Validate the key format
      if (!privateKey.includes("BEGIN PRIVATE KEY")) {
        console.error("❌ FIREBASE_PRIVATE_KEY doesn't contain 'BEGIN PRIVATE KEY'")
        console.error("Key starts with:", privateKey.substring(0, 50))
        throw new Error("Invalid FIREBASE_PRIVATE_KEY format")
      }
    }

    if (!projectId || !clientEmail || !privateKey) {
      console.error("Missing Firebase Admin credentials:", {
        projectId: projectId ? "✓" : "✗",
        clientEmail: clientEmail ? "✓" : "✗",
        privateKey: privateKey ? "✓" : "✗"
      })
      return
    }
    
    try {
      credential = admin.credential.cert({ projectId, clientEmail, privateKey })
    } catch (error) {
      console.error("❌ Failed to create Firebase credential:", error.message)
      console.error("Private key length:", privateKey?.length)
      console.error("Private key starts with:", privateKey?.substring(0, 30))
      console.error("Private key ends with:", privateKey?.substring(privateKey.length - 30))
      throw error
    }
  }

  if (!credential) return

  admin.initializeApp({
    credential,
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  })
}

export function getAdminServices() {
  initializeAdmin()
  if (!admin.apps.length) {
    throw new Error(
      "Firebase Admin not initialized. Provide FIREBASE_SERVICE_ACCOUNT (JSON) or FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY."
    )
  }
  return { firestore: admin.firestore(), messaging: admin.messaging() }
}

export default admin