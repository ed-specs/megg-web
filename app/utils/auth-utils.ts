import { auth } from "../config/firebaseConfig";
import { User } from "firebase/auth";

// Custom user interface for stored user data
interface CustomUser {
  uid: string;
  email: string;
  displayName?: string;
  isCustomAuth?: boolean;
}

/**
 * Get the current authenticated user
 * This function handles both Firebase Auth and custom auth sessions
 * @returns {User | CustomUser | null} The current user object or null if not authenticated
 */
export const getCurrentUser = (): User | CustomUser | null => {
  // First try Firebase Auth
  const firebaseUser = auth.currentUser;
  if (firebaseUser) {
    return firebaseUser;
  }

  // If no Firebase Auth user, check for custom auth
  const useCustomAuth = localStorage.getItem("useCustomAuth");
  if (useCustomAuth === "true") {
    const customAuthUser = localStorage.getItem("customAuthUser");
    if (customAuthUser) {
      try {
        const user: CustomUser = JSON.parse(customAuthUser);
        return user;
      } catch (error) {
        console.error("Error parsing custom auth user:", error);
        // Clear invalid custom auth data
        localStorage.removeItem("customAuthUser");
        localStorage.removeItem("useCustomAuth");
        return null;
      }
    }
  }

  return null;
};

/**
 * Check if the current user is authenticated
 * @returns {boolean} True if user is authenticated, false otherwise
 */
export const isAuthenticated = (): boolean => {
  return getCurrentUser() !== null;
};

/**
 * Get the current user's UID
 * @returns {string | null} The user's UID or null if not authenticated
 */
export const getCurrentUserId = (): string | null => {
  const user = getCurrentUser();
  return user ? user.uid : null;
};

/**
 * Get stored user data from localStorage
 * @returns {any | null} Stored user data or null
 */
export const getStoredUser = (): any | null => {
  try {
    const userData = localStorage.getItem("user");
    return userData ? JSON.parse(userData) : null;
  } catch (error) {
    console.error("Error parsing stored user data:", error);
    return null;
  }
};

/**
 * Get user account ID from stored data
 * @returns {string | null} Account ID or null
 */
export const getUserAccountId = (): string | null => {
  const storedUser = getStoredUser();
  return storedUser?.accountId || null;
};

/**
 * Sign out the current user (handles both Firebase Auth and custom auth)
 */
export const signOutUser = async (): Promise<void> => {
  try {
    // Clear custom auth data
    localStorage.removeItem("customAuthUser");
    localStorage.removeItem("useCustomAuth");
    localStorage.removeItem("user");
    localStorage.removeItem("rememberedCredentials");
    
    // Sign out from Firebase Auth if signed in
    if (auth.currentUser) {
      await auth.signOut();
    }
    
    console.log("User signed out successfully");
  } catch (error) {
    console.error("Error signing out:", error);
    throw error;
  }
};

/**
 * Debug function to log current authentication state
 */
export const debugAuthState = (): void => {
  if (process.env.NODE_ENV === 'development') {
    const firebaseUser = auth.currentUser;
    const useCustomAuth = localStorage.getItem("useCustomAuth");
    const customAuthUser = localStorage.getItem("customAuthUser");
    
    console.group("=== Auth Debug Info ===");
    console.log("Firebase Auth User:", firebaseUser);
    console.log("Use Custom Auth:", useCustomAuth);
    console.log("Custom Auth User:", customAuthUser);
    console.log("getCurrentUser() result:", getCurrentUser());
    console.log("isAuthenticated() result:", isAuthenticated());
    console.log("getCurrentUserId() result:", getCurrentUserId());
    console.log("Stored User Data:", getStoredUser());
    console.groupEnd();
  }
};

/**
 * Get user information for debugging machine linking issues
 */
export const debugUserInfo = async (): Promise<User | CustomUser | null> => {
  const user = getCurrentUser();
  if (!user) {
    console.log("No authenticated user found");
    return null;
  }

  if (process.env.NODE_ENV === 'development') {
    console.group("=== User Debug Info ===");
    console.log("User UID:", user.uid);
    console.log("User Email:", user.email);
    console.log("Is Custom Auth:", (user as CustomUser).isCustomAuth);
    console.log("User Object:", user);
    console.log("Account ID:", getUserAccountId());
    console.groupEnd();
  }
  
  return user;
};

/**
 * Validate user session and refresh if needed
 * @returns {Promise<boolean>} True if session is valid
 */
export const validateSession = async (): Promise<boolean> => {
  try {
    const user = getCurrentUser();
    const storedUser = getStoredUser();
    
    if (!user && !storedUser) {
      return false;
    }
    
    // Add additional session validation logic here
    return true;
  } catch (error) {
    console.error("Error validating session:", error);
    return false;
  }
}; 
