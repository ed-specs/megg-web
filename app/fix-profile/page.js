"use client"

import { useState, useEffect } from "react"
import { auth, db } from "../config/firebaseConfig"
import { collection, getDocs, doc, getDoc, setDoc } from "firebase/firestore"
import { getCurrentUser, getStoredUser, getUserAccountId } from "../utils/auth-utils"

export default function FixProfilePage() {
  const [status, setStatus] = useState("Checking...")
  const [userInfo, setUserInfo] = useState(null)
  const [allUsers, setAllUsers] = useState([])
  const [canFix, setCanFix] = useState(false)

  useEffect(() => {
    checkAndFix()
  }, [])

  const checkAndFix = async () => {
    try {
      setStatus("🔍 Analyzing user data...")
      
      // Get current authentication state
      const firebaseUser = auth.currentUser
      const storedUser = getStoredUser()
      const accountId = getUserAccountId()
      
      console.log("Firebase User:", firebaseUser)
      console.log("Stored User:", storedUser)
      console.log("Account ID:", accountId)
      
      setUserInfo({
        firebaseUser: firebaseUser ? {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName
        } : null,
        storedUser,
        accountId
      })
      
      // Get all users from Firestore
      setStatus("📊 Checking Firestore documents...")
      const usersSnapshot = await getDocs(collection(db, "users"))
      const users = []
      
      usersSnapshot.forEach((doc) => {
        users.push({
          id: doc.id,
          ...doc.data()
        })
      })
      
      setAllUsers(users)
      
      // Check if user document exists
      let userDocExists = false
      let existingDoc = null
      
      // Check by Account ID
      if (accountId) {
        const accountDoc = users.find(u => u.id === accountId)
        if (accountDoc) {
          userDocExists = true
          existingDoc = accountDoc
          setStatus(`✅ Found user document with Account ID: ${accountId}`)
        }
      }
      
      // Check by Firebase UID
      if (!userDocExists && firebaseUser?.uid) {
        const uidDoc = users.find(u => u.id === firebaseUser.uid)
        if (uidDoc) {
          userDocExists = true
          existingDoc = uidDoc
          setStatus(`✅ Found user document with Firebase UID: ${firebaseUser.uid}`)
        }
      }
      
      // Check by email
      if (!userDocExists && (storedUser?.email || firebaseUser?.email)) {
        const email = storedUser?.email || firebaseUser?.email
        const emailDoc = users.find(u => u.email === email)
        if (emailDoc) {
          userDocExists = true
          existingDoc = emailDoc
          setStatus(`✅ Found user document by email: ${email} (Document ID: ${emailDoc.id})`)
        }
      }
      
      if (!userDocExists) {
        setStatus("❌ No user document found in Firestore")
        setCanFix(true)
      } else {
        setStatus(`✅ User document found: ${existingDoc.id}`)
      }
      
    } catch (error) {
      console.error("Error:", error)
      setStatus(`❌ Error: ${error.message}`)
    }
  }

  const createUserDocument = async () => {
    try {
      setStatus("🔧 Creating user document...")
      
      const firebaseUser = auth.currentUser
      const storedUser = getStoredUser()
      
      if (!firebaseUser && !storedUser) {
        setStatus("❌ No user data available to create document")
        return
      }
      
      // Use Account ID if available, otherwise Firebase UID
      const docId = getUserAccountId() || firebaseUser?.uid
      const email = storedUser?.email || firebaseUser?.email
      
      if (!docId || !email) {
        setStatus("❌ Missing required data (ID or email)")
        return
      }
      
      // Create user document
      const userData = {
        email: email,
        username: storedUser?.username || firebaseUser?.displayName || email.split('@')[0],
        fullName: storedUser?.fullName || firebaseUser?.displayName || "User",
        phone: storedUser?.phone || "",
        role: storedUser?.role || "user",
        accountId: storedUser?.accountId || docId,
        createdAt: new Date(),
        lastLogin: new Date()
      }
      
      await setDoc(doc(db, "users", docId), userData)
      
      setStatus(`✅ User document created successfully with ID: ${docId}`)
      setCanFix(false)
      
      // Refresh the check
      setTimeout(() => {
        checkAndFix()
      }, 1000)
      
    } catch (error) {
      console.error("Error creating document:", error)
      setStatus(`❌ Error creating document: ${error.message}`)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-gray-900">Fix Profile Issue</h1>
        
        {/* Status */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Status</h2>
          <p className="text-lg font-mono bg-gray-100 p-3 rounded">{status}</p>
          
          {canFix && (
            <button 
              onClick={createUserDocument}
              className="mt-4 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 font-semibold"
            >
              🔧 Create Missing User Document
            </button>
          )}
        </div>
        
        {/* User Info */}
        {userInfo && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Current User Info</h2>
            <pre className="bg-gray-100 p-4 rounded-lg overflow-auto text-sm">
              {JSON.stringify(userInfo, null, 2)}
            </pre>
          </div>
        )}
        
        {/* All Users */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">All Users in Firestore ({allUsers.length})</h2>
          {allUsers.length === 0 ? (
            <p className="text-gray-600">No users found in Firestore</p>
          ) : (
            <div className="space-y-4">
              {allUsers.map((user, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="font-mono text-sm">
                    <div><strong>Document ID:</strong> {user.id}</div>
                    <div><strong>Email:</strong> {user.email || 'N/A'}</div>
                    <div><strong>Username:</strong> {user.username || 'N/A'}</div>
                    <div><strong>Account ID:</strong> {user.accountId || 'N/A'}</div>
                    <div><strong>Full Name:</strong> {user.fullName || 'N/A'}</div>
                    <div><strong>Role:</strong> {user.role || 'N/A'}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="mt-8 flex gap-4">
          <button 
            onClick={() => window.location.href = '/dashboard/profile'}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
          >
            ← Back to Profile
          </button>
          <button 
            onClick={() => window.location.reload()}
            className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700"
          >
            🔄 Refresh Check
          </button>
        </div>
      </div>
    </div>
  )
}
