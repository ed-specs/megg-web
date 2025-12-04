import { auth } from "../config/firebaseConfig"
import { devLog, devError } from "./auth-helpers"

/**
 * Get the current authenticated user
 * This function handles both Firebase Auth and custom auth sessions
 * @returns {Object|null} The current user object or null if not authenticated
 */
export const getCurrentUser = () => {
  // First try Firebase Auth
  const firebaseUser = auth.currentUser
  if (firebaseUser) {
    return firebaseUser
  }

  // If no Firebase Auth user, check for custom auth
  const useCustomAuth = localStorage.getItem("useCustomAuth")
  if (useCustomAuth === "true") {
    const customAuthUser = localStorage.getItem("customAuthUser")
    if (customAuthUser) {
      try {
        const user = JSON.parse(customAuthUser)
        return user
      } catch (error) {
        devError("Error parsing custom auth user:", error)
        // Clear invalid custom auth data
        localStorage.removeItem("customAuthUser")
        localStorage.removeItem("useCustomAuth")
        return null
      }
    }
  }

  return null
}

/**
 * Check if the current user is authenticated
 * @returns {boolean} True if user is authenticated, false otherwise
 */
export const isAuthenticated = () => {
  return getCurrentUser() !== null
}

/**
 * Get the current user's UID
 * @returns {string|null} The user's UID or null if not authenticated
 */
export const getCurrentUserId = () => {
  const user = getCurrentUser()
  return user ? user.uid : null
}

/**
 * Sign out the current user (handles both Firebase Auth and custom auth)
 */
export const signOutUser = async () => {
  // Clear custom auth data
  localStorage.removeItem("customAuthUser")
  localStorage.removeItem("useCustomAuth")
  
  // Sign out from Firebase Auth if signed in
  if (auth.currentUser) {
    await auth.signOut()
  }
}

/**
 * Debug function to log current authentication state
 */
export const debugAuthState = () => {
  const firebaseUser = auth.currentUser
  const useCustomAuth = localStorage.getItem("useCustomAuth")
  const customAuthUser = localStorage.getItem("customAuthUser")
  
  devLog("=== Auth Debug Info ===")
  devLog("Firebase Auth User:", firebaseUser)
  devLog("Use Custom Auth:", useCustomAuth)
  devLog("Custom Auth User:", customAuthUser)
  devLog("getCurrentUser() result:", getCurrentUser())
  devLog("isAuthenticated() result:", isAuthenticated())
  devLog("getCurrentUserId() result:", getCurrentUserId())
  devLog("=========================")
}

/**
 * Get stored user data from localStorage
 * @returns {Object|null} The stored user data or null if not found
 */
export const getStoredUser = () => {
  try {
    const storedUser = localStorage.getItem("user")
    if (storedUser) {
      return JSON.parse(storedUser)
    }
    
    // Also check custom auth user
    const customAuthUser = localStorage.getItem("customAuthUser")
    if (customAuthUser) {
      return JSON.parse(customAuthUser)
    }
    
    return null
  } catch (error) {
    console.error("Error parsing stored user data:", error)
    return null
  }
}

/**
 * Get user's account ID from stored data
 * @returns {string|null} The account ID or null if not found
 */
export const getUserAccountId = () => {
  const storedUser = getStoredUser()
  return storedUser?.accountId || null
}

/**
 * Get user information for debugging machine linking issues
 */
export const debugUserInfo = async () => {
  const user = getCurrentUser()
  if (!user) {
    console.log("No authenticated user found")
    return null
  }

  console.log("=== User Debug Info ===")
  console.log("User UID:", user.uid)
  console.log("User Email:", user.email)
  console.log("Is Custom Auth:", user.isCustomAuth)
  console.log("User Object:", user)
  console.log("Stored User Data:", getStoredUser())
  console.log("========================")
  
  return user
} 