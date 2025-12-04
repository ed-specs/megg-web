"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { auth, db } from "../config/firebaseConfig"
import { doc, getDoc } from "firebase/firestore"
import { getCurrentUser, getStoredUser, getUserAccountId } from "../utils/auth-utils"
import { devLog, devError } from "../utils/auth-helpers"
import Image from "next/image"

export default function RouteGuard({ children, requiredRole = null, redirectTo = "/login" }) {
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const router = useRouter()

  const checkAuth = useCallback(async () => {
    try {
      devLog("🔐 Route Guard: Checking authentication...")
      
      // Check if user is authenticated
      const user = getCurrentUser()
      const storedUser = getStoredUser()
      const accountId = getUserAccountId()

      devLog("🔐 Route Guard - Firebase User:", user)
      devLog("🔐 Route Guard - Stored User:", storedUser)
      devLog("🔐 Route Guard - Account ID:", accountId)

      if (!user && !storedUser) {
        devLog("❌ Route Guard: No authenticated user found")
        setError("Please log in to access this page")
        router.push(redirectTo)
        return
      }

      // If no role requirement, just check authentication
      if (!requiredRole) {
        devLog("✅ Route Guard: Authentication check passed (no role required)")
        setIsAuthorized(true)
        setIsLoading(false)
        return
      }

      // Check user role from Firestore
      const docId = accountId || user?.uid
      if (!docId) {
        devLog("❌ Route Guard: No user ID found")
        setError("Unable to verify user identity")
        router.push(redirectTo)
        return
      }

      devLog(`🔍 Route Guard: Checking role for user ID: ${docId}`)
      
      // Get user document from Firestore
      const userDocRef = doc(db, "users", docId)
      const userDoc = await getDoc(userDocRef)

      if (!userDoc.exists()) {
        // Try with stored user role as fallback
        if (storedUser?.role) {
          devLog(`🔄 Route Guard: Using stored user role: ${storedUser.role}`)
          
          if (storedUser.role === requiredRole) {
            devLog(`✅ Route Guard: Access granted (stored role: ${storedUser.role})`)
            setIsAuthorized(true)
          } else {
            devLog(`❌ Route Guard: Access denied (required: ${requiredRole}, has: ${storedUser.role})`)
            setError(`Access denied. This page requires ${requiredRole} role.`)
            router.push("/unauthorized")
          }
        } else {
          devLog("❌ Route Guard: User document not found and no stored role")
          setError("Unable to verify user permissions")
          router.push(redirectTo)
        }
      } else {
        const userData = userDoc.data()
        const userRole = userData.role || "user"
        
        devLog(`🔍 Route Guard: User role from Firestore: ${userRole}`)
        
        if (userRole === requiredRole) {
          devLog(`✅ Route Guard: Access granted (role: ${userRole})`)
          setIsAuthorized(true)
        } else {
          devLog(`❌ Route Guard: Access denied (required: ${requiredRole}, has: ${userRole})`)
          setError(`Access denied. This page requires ${requiredRole} role.`)
          router.push("/unauthorized")
        }
      }

    } catch (error) {
      devError("❌ Route Guard: Error checking authentication:", error)
      setError("Authentication error occurred")
      router.push(redirectTo)
    } finally {
      setIsLoading(false)
    }
  }, [requiredRole, redirectTo, router])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-orange-50 relative overflow-hidden flex items-center justify-center">
        {/* Background elements */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Background Image */}
          <div className="absolute inset-0">
            <Image 
              src="/background.png" 
              alt="Background" 
              fill
              className="object-cover opacity-30"
              priority={false}
            />
          </div>
          
          {/* Logo Background Blur */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] opacity-15">
            <Image 
              src="/Logos/logoblue.png" 
              alt="MEGG Logo Background" 
              fill
              className="object-contain blur-xl scale-200"
              priority={false}
            />
          </div>
        </div>

        {/* Wiggling Logo */}
        <div className="relative z-10">
          <div className="w-32 h-32 md:w-40 md:h-40 animate-wiggle">
            <Image 
              src="/Logos/logoblue.png" 
              alt="MEGG Logo" 
              width={160}
              height={160}
              className="w-full h-full object-contain"
              priority
            />
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-orange-50 relative overflow-hidden">
        {/* Background elements */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Background Image */}
          <div className="absolute inset-0">
            <Image 
              src="/background.png" 
              alt="Background" 
              fill
              className="object-cover opacity-30"
              priority={false}
            />
          </div>
          
          {/* Logo Background Blur */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] opacity-15">
            <Image 
              src="/Logos/logoblue.png" 
              alt="MEGG Logo Background" 
              fill
              className="object-contain blur-xl scale-200"
              priority={false}
            />
          </div>
        </div>

        <div className="container mx-auto text-[#1F2421] relative z-10">
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-gray-200 max-w-md">
              <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-red-600 mb-2">Access Denied</h3>
              <p className="text-gray-700 mb-6">{error}</p>
              <button
                onClick={() => router.push(redirectTo)}
                className="bg-gradient-to-r from-[#105588] to-[#0d4470] text-white py-3 px-6 rounded-2xl hover:from-[#0d4470] hover:to-[#0a3a5c] focus:outline-none focus:ring-4 focus:ring-[#105588]/30 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]"
              >
                Go to Login
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!isAuthorized) {
    return null
  }

  return children
}
