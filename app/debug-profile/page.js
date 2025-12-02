"use client"

import { useState, useEffect } from "react"
import { auth, db } from "../config/firebaseConfig"
import { collection, getDocs, doc, getDoc } from "firebase/firestore"
import { getCurrentUser, getStoredUser, getUserAccountId } from "../utils/auth-utils"

export default function DebugProfilePage() {
  const [debugInfo, setDebugInfo] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const debugUserData = async () => {
      try {
        console.log("=== PROFILE DEBUG START ===")
        
        // Get all authentication data
        const firebaseUser = auth.currentUser
        const currentUser = getCurrentUser()
        const storedUser = getStoredUser()
        const accountId = getUserAccountId()
        
        console.log("Firebase User:", firebaseUser)
        console.log("Current User:", currentUser)
        console.log("Stored User:", storedUser)
        console.log("Account ID:", accountId)
        
        // Check localStorage
        const localStorageData = {
          user: localStorage.getItem("user"),
          customAuthUser: localStorage.getItem("customAuthUser"),
          useCustomAuth: localStorage.getItem("useCustomAuth")
        }
        
        console.log("LocalStorage Data:", localStorageData)
        
        // Try to find user documents in Firestore
        const userSearchResults = {}
        
        // 1. Try with Account ID
        if (accountId) {
          try {
            const accountIdDoc = await getDoc(doc(db, "users", accountId))
            userSearchResults.accountId = {
              id: accountId,
              exists: accountIdDoc.exists(),
              data: accountIdDoc.exists() ? accountIdDoc.data() : null
            }
          } catch (error) {
            userSearchResults.accountId = { error: error.message }
          }
        }
        
        // 2. Try with Firebase UID
        if (firebaseUser?.uid) {
          try {
            const uidDoc = await getDoc(doc(db, "users", firebaseUser.uid))
            userSearchResults.firebaseUid = {
              id: firebaseUser.uid,
              exists: uidDoc.exists(),
              data: uidDoc.exists() ? uidDoc.data() : null
            }
          } catch (error) {
            userSearchResults.firebaseUid = { error: error.message }
          }
        }
        
        // 3. List all users to see what's actually in the collection
        try {
          const usersSnapshot = await getDocs(collection(db, "users"))
          const allUsers = []
          usersSnapshot.forEach((doc) => {
            allUsers.push({
              id: doc.id,
              data: doc.data()
            })
          })
          userSearchResults.allUsers = allUsers
        } catch (error) {
          userSearchResults.allUsers = { error: error.message }
        }
        
        setDebugInfo({
          firebaseUser: firebaseUser ? {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName
          } : null,
          currentUser: currentUser ? {
            uid: currentUser.uid,
            email: currentUser.email
          } : null,
          storedUser,
          accountId,
          localStorageData,
          userSearchResults
        })
        
        console.log("=== PROFILE DEBUG END ===")
        
      } catch (error) {
        console.error("Debug error:", error)
        setDebugInfo({ error: error.message })
      } finally {
        setLoading(false)
      }
    }

    debugUserData()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Debugging profile data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-gray-900">Profile Debug Information</h1>
        
        <div className="bg-white rounded-lg shadow-lg p-6">
          <pre className="bg-gray-100 p-4 rounded-lg overflow-auto text-sm">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </div>
        
        <div className="mt-8 space-y-4">
          <h2 className="text-xl font-semibold">Quick Actions</h2>
          <div className="flex gap-4">
            <button 
              onClick={() => window.location.reload()}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Refresh Debug
            </button>
            <button 
              onClick={() => {
                localStorage.clear()
                window.location.reload()
              }}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
            >
              Clear LocalStorage & Refresh
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
