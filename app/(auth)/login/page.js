"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { db, auth } from "../../config/firebaseConfig"
import { collection, query, where, getDocs, setDoc, doc, updateDoc } from "firebase/firestore"
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, sendPasswordResetEmail } from "firebase/auth"
import Image from "next/image"
import { generateOTP, calculateOTPExpiry } from "../../../app/utils/otp"
import { generateUniqueAccountId, checkAccountIdExists } from "../../../app/utils/accountId"
import { Mail, Eye, EyeOff } from "lucide-react"
import bcrypt from "bcryptjs"
import { smartInitializeFCM } from "../../utils/smart-fcm"
// Removed toast imports - reverting to modal responses

// Enhanced encryption for credentials using a simple key-based approach
const encryptCredentials = (username, password) => {
  try {
    const data = JSON.stringify({ username, password })
    const key = 'megg-auth-key-2024' // In production, this should be more secure
    let encrypted = ''
    
    for (let i = 0; i < data.length; i++) {
      encrypted += String.fromCharCode(
        data.charCodeAt(i) ^ key.charCodeAt(i % key.length)
      )
    }
    
    return btoa(encrypted)
  } catch {
    return null
  }
}

// Function to decrypt credentials
const decryptCredentials = (encrypted) => {
  try {
    const key = 'megg-auth-key-2024'
    const encryptedData = atob(encrypted)
    let decrypted = ''
    
    for (let i = 0; i < encryptedData.length; i++) {
      decrypted += String.fromCharCode(
        encryptedData.charCodeAt(i) ^ key.charCodeAt(i % key.length)
      )
    }
    
    return JSON.parse(decrypted)
  } catch {
    return null
  }
}

const sendVerificationEmail = async (email, otp) => {
  try {
    const response = await fetch("/api/send-verification", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, otp }),
    })

    if (!response.ok) {
      throw new Error("Failed to send verification email")
    }
  } catch (error) {
    console.error("Error sending verification email:", error)
    throw error
  }
}

export default function LoginPage() {
  const [form, setForm] = useState({
    username: "",
    password: "",
  })
  const [errors, setErrors] = useState({})
  const [loginMode, setLoginMode] = useState("username") // "username" or "email"
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [globalMessage, setGlobalMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [currentTime, setCurrentTime] = useState("")
  const [loginAttempts, setLoginAttempts] = useState(0)
  const [lockoutTime, setLockoutTime] = useState(null)
  const router = useRouter()

  // Helper function for role-based routing
  const redirectBasedOnRole = (userRole, delay = 2000) => {
    if (userRole === "admin") {
      setTimeout(() => router.replace("/admin/overview"), delay)
    } else {
      setTimeout(() => router.replace("/dashboard/overview"), delay)
    }
  }

  // Update time every second
  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      const timeString = now.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: false 
      })
      setCurrentTime(timeString)
    }

    updateTime() // Set initial time
    const interval = setInterval(updateTime, 1000) // Update every second

    return () => clearInterval(interval)
  }, [])

  // Rate limiting functions
  const checkRateLimit = () => {
    if (lockoutTime && Date.now() < lockoutTime) {
      const remainingTime = Math.ceil((lockoutTime - Date.now()) / 60000)
      setGlobalMessage(`Too many failed attempts. Please try again in ${remainingTime} minute(s).`)
      return false
    }
    
    if (loginAttempts >= 5) {
      const lockout = Date.now() + 15 * 60 * 1000 // 15 minutes
      setLockoutTime(lockout)
      localStorage.setItem('loginLockout', lockout.toString())
      setGlobalMessage("Too many failed attempts. Please try again in 15 minutes.")
      return false
    }
    return true
  }

  const incrementLoginAttempts = () => {
    const newAttempts = loginAttempts + 1
    setLoginAttempts(newAttempts)
    localStorage.setItem('loginAttempts', newAttempts.toString())
  }

  const resetLoginAttempts = () => {
    setLoginAttempts(0)
    setLockoutTime(null)
    localStorage.removeItem('loginAttempts')
    localStorage.removeItem('loginLockout')
  }

  // Load saved credentials on component mount and handle Google redirect result
  useEffect(() => {
    const savedCredentials = localStorage.getItem("rememberedCredentials")
    if (savedCredentials) {
      const decrypted = decryptCredentials(savedCredentials)
      if (decrypted) {
        setForm((prev) => ({
          ...prev,
          username: decrypted.username,
          password: decrypted.password,
        }))
        setRememberMe(true)
      }
    }

    // Load saved login attempts and lockout time
    const savedAttempts = localStorage.getItem('loginAttempts')
    const savedLockout = localStorage.getItem('loginLockout')
    
    if (savedAttempts) {
      setLoginAttempts(parseInt(savedAttempts))
    }
    
    if (savedLockout) {
      const lockoutTime = parseInt(savedLockout)
      if (Date.now() < lockoutTime) {
        setLockoutTime(lockoutTime)
      } else {
        // Lockout has expired, reset attempts
        resetLoginAttempts()
      }
    }
    // Process Google sign-in redirect result (mobile fallback)
    ;(async () => {
      try {
        const result = await getRedirectResult(auth)
        if (result && result.user) {
          const user = result.user
          // Ensure accountId exists
          const existingUserDoc = await getDocs(query(collection(db, "users"), where("uid", "==", user.uid)))
          let accountId = null
          if (!existingUserDoc.empty) {
            const data = existingUserDoc.docs[0].data()
            accountId = data.accountId || null
          }
          if (!accountId) {
            accountId = await generateUniqueAccountId(db)
          }
          // Use Account ID as document ID for new Google users
          await setDoc(
            doc(db, "users", accountId),
            {
              uid: user.uid,
              username: user.displayName,
              email: user.email,
              accountId,
              role: "user", // Default role for Google sign-in users
              createdAt: new Date().toISOString(),
              lastLogin: new Date().toISOString(),
              provider: "google",
              verified: true,
              deviceId: null, // Will be set when FCM token is available
            },
            { merge: true },
          )
          // Get user role from Firestore for routing
          const userQuery = query(collection(db, "users"), where("email", "==", user.email))
          const userSnapshot = await getDocs(userQuery)
          let userRole = "user" // default role
          
          if (!userSnapshot.empty) {
            const userDoc = userSnapshot.docs[0]
            userRole = userDoc.data().role || "user"
          }
          
          const userData = { uid: user.uid, username: user.displayName, email: user.email, accountId, deviceId: user.uid, role: userRole }
          localStorage.setItem("user", JSON.stringify(userData))
          
          // Initialize FCM for push notifications
          try {
            console.log(`🚀 GOOGLE LOGIN: About to initialize FCM for ${user.displayName} (${accountId})`)
            await smartInitializeFCM(accountId, user.displayName)
            console.log(`✅ GOOGLE LOGIN: FCM initialized successfully for ${user.displayName}`)
          } catch (error) {
            console.error(`❌ GOOGLE LOGIN: FCM initialization failed for ${user.displayName}:`, error)
          }
          
          resetLoginAttempts() // Reset on successful login
          setGlobalMessage("Login successful!")
          redirectBasedOnRole(userRole, 1000)
        }
      } catch (e) {
        // No redirect result or error; ignore
      }
    })()
  }, [])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    validateField(name, value)
  }

  const validateField = (name, value) => {
    let errorMsg = ""

    switch (name) {
      case "username":
        if (!value) {
          errorMsg = loginMode === "email" ? "Email is required." : "Username is required."
        } else if (loginMode === "email") {
          // Email mode validation
          if (!/\S+@\S+\.\S+/.test(value)) {
            errorMsg = "Please enter a valid email address."
          }
        } else {
          // Username mode validation
          if (value.length < 3) {
            errorMsg = "Username must be at least 3 characters."
          }
        }
        break
      case "password":
        if (!value) {
          errorMsg = "Password is required."
        }
        break
      default:
        break
    }

    setErrors((prevErrors) => ({ ...prevErrors, [name]: errorMsg }))
  }

  const switchLoginMode = (mode) => {
    setLoginMode(mode)
    setForm({ ...form, username: "" }) // Clear the input when switching
    setErrors({ ...errors, username: "" }) // Clear validation errors
    setGlobalMessage("") // Clear any global messages
  }

  const resetFields = () => {
    setForm({
      username: "",
      password: "",
    })
    localStorage.removeItem("rememberedCredentials")
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    
    // Check rate limiting
    if (!checkRateLimit()) {
      return
    }
    
    setIsLoading(true)
    setGlobalMessage("")

    // Check for empty fields
    if (!form.username || !form.password) {
      setGlobalMessage("Please fill in all fields.")
      setIsLoading(false)
      return
    }

    // Check if there are any validation errors
    const hasErrors = Object.values(errors).some((error) => error !== "")
    if (hasErrors) {
      setGlobalMessage("Please fix the highlighted errors.")
      setIsLoading(false)
      return
    }

    try {
      // Find user by username or email in Firestore based on login mode
      const usersRef = collection(db, "users")
      let q, querySnapshot

      if (loginMode === "email") {
        // Search by email
        q = query(usersRef, where("email", "==", form.username))
        querySnapshot = await getDocs(q)
      } else {
        // Search by username
        q = query(usersRef, where("username", "==", form.username))
        querySnapshot = await getDocs(q)
      }

      if (querySnapshot.empty) {
        setGlobalMessage(`Invalid ${loginMode} or password.`)
        setIsLoading(false)
        return
      }

      const userDoc = querySnapshot.docs[0]
      const userData = userDoc.data()
      const userEmail = userData.email
      // Ensure accountId exists for dashboard queries
      let ensuredAccountId = userData.accountId || null
      if (!ensuredAccountId) {
        ensuredAccountId = await generateUniqueAccountId(db)
        // Update using the old document ID (userDoc.id) since we're adding accountId
        await updateDoc(
          doc(db, "users", userDoc.id),
          { accountId: ensuredAccountId }
        )
      }

      // Check if user has a hashed password in Firestore
      if (userData.password) {
        // Use bcrypt to compare passwords
        const isPasswordValid = await bcrypt.compare(form.password, userData.password)
        
        if (!isPasswordValid) {
          incrementLoginAttempts()
          setGlobalMessage("Invalid username or password.")
          setIsLoading(false)
          return
        }

        // Password is valid, now try to sign in with Firebase Auth
        // If Firebase Auth fails, we'll still allow login since Firestore password is correct
        let firebaseUser = null
        try {
          const userCredential = await signInWithEmailAndPassword(auth, userEmail, form.password)
          firebaseUser = userCredential.user
        } catch (firebaseError) {
          console.log("Firebase Auth failed, but Firestore password is correct:", firebaseError)
          
          // Create a custom authentication session since Firebase Auth failed
          // This will allow the user to access the application
          const customAuthUser = {
            uid: userDoc.id,
            email: userEmail,
            displayName: userData.username,
            // Add a custom property to identify this as a custom auth session
            isCustomAuth: true
          }
          
          // Store the custom auth user in localStorage
          localStorage.setItem("customAuthUser", JSON.stringify(customAuthUser))
          
          // Set a flag to indicate we're using custom auth
          localStorage.setItem("useCustomAuth", "true")
          
          firebaseUser = customAuthUser
        }

        // Handle Remember Me
        if (rememberMe) {
          const encrypted = encryptCredentials(form.username, form.password)
          localStorage.setItem("rememberedCredentials", encrypted)
        } else {
          localStorage.removeItem("rememberedCredentials")
        }

        // Check if user is verified
        if (!userData.verified) {
          // Generate new OTP and expiry time
          const newOTP = generateOTP()
          const newExpiry = calculateOTPExpiry()

          // Update user document with new OTP using Account ID
          await updateDoc(
            doc(db, "users", userData.accountId),
            {
              verificationOTP: newOTP,
              otpExpiry: newExpiry,
            }
          )

          // Send verification email with OTP
          await sendVerificationEmail(userEmail, newOTP)

          setGlobalMessage("Please verify your email before logging in.")
          router.push(`/verify?email=${userEmail}`)
          setIsLoading(false)
          return
        }

        // Update last login using Account ID as document ID
        await updateDoc(
          doc(db, "users", userData.accountId),
          {
            lastLogin: new Date().toISOString(),
          }
        )

        setGlobalMessage("Login successful!")
        localStorage.setItem(
          "user",
          JSON.stringify({
            uid: firebaseUser?.uid || userDoc.id,
            email: userEmail,
            username: userData.username,
            accountId: ensuredAccountId,
          }),
        )

        // Initialize FCM for push notifications
        try {
          console.log(`🚀 LOGIN: About to initialize FCM for ${userData.username} (${ensuredAccountId})`)
          await smartInitializeFCM(ensuredAccountId, userData.username)
          console.log(`✅ LOGIN: FCM initialized successfully for ${userData.username}`)
        } catch (error) {
          console.error(`❌ LOGIN: FCM initialization failed for ${userData.username}:`, error)
        }

      resetLoginAttempts() // Reset on successful login
      console.log("🕐 LOGIN: Waiting 6 seconds before redirect to allow notification to be sent...")
      redirectBasedOnRole(userData.role, 6000) // Wait 6 seconds for notification
      } else {
        // Fallback to Firebase Auth if no hashed password exists
        const userCredential = await signInWithEmailAndPassword(auth, userEmail, form.password)
        const user = userCredential.user
        // Ensure accountId exists for dashboard queries
        let ensuredAccountId2 = userData.accountId || null
        if (!ensuredAccountId2) {
          ensuredAccountId2 = await generateUniqueAccountId(db)
          // Update using Firebase UID since we're adding accountId to existing document
          await updateDoc(
            doc(db, "users", user.uid),
            { accountId: ensuredAccountId2 }
          )
        }

        // Handle Remember Me
        if (rememberMe) {
          const encrypted = encryptCredentials(form.username, form.password)
          localStorage.setItem("rememberedCredentials", encrypted)
        } else {
          localStorage.removeItem("rememberedCredentials")
        }

        // Check if user is verified
        if (!userData.verified) {
          // Generate new OTP and expiry time
          const newOTP = generateOTP()
          const newExpiry = calculateOTPExpiry()

          // Update user document with new OTP using Account ID
          await updateDoc(
            doc(db, "users", userData.accountId),
            {
              verificationOTP: newOTP,
              otpExpiry: newExpiry,
            }
          )

          // Send verification email with OTP
          await sendVerificationEmail(userEmail, newOTP)

          setGlobalMessage("Please verify your email before logging in.")
          router.push(`/verify?email=${userEmail}`)
          setIsLoading(false)
          return
        }

        // Update last login using Account ID as document ID
        await updateDoc(
          doc(db, "users", userData.accountId),
          {
            lastLogin: new Date().toISOString(),
          }
        )

        setGlobalMessage("Login successful!")
        localStorage.setItem(
          "user",
          JSON.stringify({
            uid: user.uid,
            email: userEmail,
            username: userData.username,
            accountId: ensuredAccountId2,
          }),
        )

        // Initialize FCM for push notifications
        try {
          console.log(`🚀 FALLBACK LOGIN: About to initialize FCM for ${userData.username} (${ensuredAccountId2})`)
          await smartInitializeFCM(ensuredAccountId2, userData.username)
          console.log(`✅ FALLBACK LOGIN: FCM initialized successfully for ${userData.username}`)
        } catch (error) {
          console.error(`❌ FALLBACK LOGIN: FCM initialization failed for ${userData.username}:`, error)
        }

        console.log("🕐 FALLBACK LOGIN: Waiting 3 seconds before redirect to allow notification to be sent...")
        redirectBasedOnRole(userData.role, 3000) // Wait 3 seconds for notification
      }
    } catch (error) {
      console.error("Login error:", error)
      let errorMessage = "Login failed. Please check your credentials."

      if (error.code === "auth/user-not-found" || error.code === "auth/wrong-password") {
        incrementLoginAttempts()
        errorMessage = "Invalid username or password."
      } else if (error.code === "auth/too-many-requests") {
        errorMessage = "Too many failed attempts. Please try again later."
      } else if (error.code === "auth/user-disabled") {
        errorMessage = "This account has been disabled."
      }

      setGlobalMessage(errorMessage)
      resetFields()
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setIsLoading(true)
    try {
      const provider = new GoogleAuthProvider()
      provider.setCustomParameters({
        prompt: "select_account",
      })
      let user = null
      try {
        const result = await signInWithPopup(auth, provider)
        user = result.user
      } catch (popupErr) {
        // Fallback to redirect for mobile/safari popup-blocked scenarios
        await signInWithRedirect(auth, provider)
        return
      }

      // Check if user already exists by email (since they might have registered normally first)
      const existingUserDoc = await getDocs(query(collection(db, "users"), where("email", "==", user.email)))
      
      let accountId = null
      if (!existingUserDoc.empty) {
        // User exists, get their account ID
        const userData = existingUserDoc.docs[0].data()
        accountId = userData.accountId
        
        // Update existing document with Google provider info using Account ID
        await updateDoc(
          doc(db, "users", accountId),
          {
            lastLogin: new Date().toISOString(),
            provider: "google",
            verified: true,
            uid: user.uid, // Update with Google UID
          }
        )
      } else {
        // New Google user, generate account ID and create document
        accountId = await generateUniqueAccountId(db)
        console.log(`Generated new account ID for Google user: ${accountId}`)
        
        // Create new user document using Account ID as document ID
        await setDoc(
          doc(db, "users", accountId),
          {
            uid: user.uid,
            username: user.displayName,
            email: user.email,
            accountId: accountId,
            role: "user", // Default role for Google sign-in users
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
            provider: "google",
            verified: true,
            deviceId: null, // Will be set when FCM token is available
          }
        )
      }

      const userData = {
        uid: user.uid,
        username: user.displayName,
        email: user.email,
        accountId: accountId,
        deviceId: user.uid,
      }

      // Initialize FCM for push notifications
      try {
        console.log(`🚀 GOOGLE SIGNIN: About to initialize FCM for ${user.displayName} (${accountId})`)
        await smartInitializeFCM(accountId, user.displayName)
        console.log(`✅ GOOGLE SIGNIN: FCM initialized successfully for ${user.displayName}`)
      } catch (error) {
        console.error(`❌ GOOGLE SIGNIN: FCM initialization failed for ${user.displayName}:`, error)
      }

      setGlobalMessage("Login successful!")
      localStorage.setItem("user", JSON.stringify(userData))
      setTimeout(() => router.replace("/dashboard/overview"), 2000)
    } catch (error) {
      console.error("Error signing in with Google:", error)
      if (error.code === "permission-denied") {
        setGlobalMessage("Access denied. Please check your permissions.")
      } else {
        setGlobalMessage("Google sign-in failed. Please try again.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  const viewRegister = () => {
    router.push("/register");
  };

  const viewForgotPassword = () => {
    router.push("/forgot-password")
  }

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

      {/* Main Content */}
      <div className="flex flex-col items-center justify-start min-h-[calc(100vh-60px)] px-6 pt-16 relative z-10">
        <div className="w-full max-w-sm mx-auto md:bg-white/80 md:backdrop-blur-sm md:border md:border-gray-200 md:rounded-3xl md:shadow-xl md:p-8 md:max-w-md lg:max-w-lg">
          {/* Logo */}
          <div className="mb-8 text-left md:text-center">
            <div className="relative inline-block mb-8">
              <Image 
                src="/Logos/logoblue.png" 
                alt="MEGG Logo" 
                height={80} 
                width={80} 
                className="object-contain"
              />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-[#105588] mb-2 md:text-5xl md:font-bold lg:text-6xl lg:font-bold">Welcome</h1>
              <p className="text-gray-600 text-base md:text-lg">Sign in to continue</p>
            </div>
          </div>


          {/* Login Mode Toggle */}
          <div className="mb-6">
            <div className="flex bg-gray-100 rounded-2xl p-1">
              <button
                type="button"
                onClick={() => switchLoginMode("username")}
                className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all duration-200 ${
                  loginMode === "username"
                    ? "bg-white text-[#105588] shadow-sm"
                    : "text-gray-600 hover:text-gray-800"
                }`}
              >
                <svg className="w-4 h-4 inline mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
                </svg>
                Username
              </button>
              <button
                type="button"
                onClick={() => switchLoginMode("email")}
                className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all duration-200 ${
                  loginMode === "email"
                    ? "bg-white text-[#105588] shadow-sm"
                    : "text-gray-600 hover:text-gray-800"
                }`}
              >
                <Mail className="w-4 h-4 inline mr-2" />
                Email
              </button>
            </div>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-6">
            {/* Username/Email Field */}
            <div className="relative">
              <div className="bg-gray-100 rounded-2xl px-4 py-4 focus-within:bg-white focus-within:ring-2 focus-within:ring-[#ff4a08] focus-within:ring-opacity-50 focus-within:shadow-lg hover:bg-gray-50 transition-all duration-200 border border-transparent focus-within:border-[#ff4a08]">
                <label className="text-gray-400 text-xs font-medium uppercase tracking-wider block mb-1 focus-within:text-[#ff4a08] transition-colors duration-200">
                  {loginMode === "email" ? "EMAIL" : "USERNAME"}
                </label>
                <div className="flex items-center">
                  {loginMode === "email" ? (
                    <Mail className="w-5 h-5 text-[#ff4a08] mr-3 flex-shrink-0 transition-all duration-200" />
                  ) : (
                    <svg className="w-5 h-5 text-[#ff4a08] mr-3 flex-shrink-0 transition-all duration-200" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
                    </svg>
                  )}
                  <input
                    type={loginMode === "email" ? "email" : "text"}
                    name="username"
                    id="username"
                    value={form.username}
                    className="flex-1 bg-transparent border-0 outline-none text-gray-800 placeholder-gray-400 focus:placeholder-gray-300 text-base p-0 transition-all duration-200"
                    placeholder={loginMode === "email" ? "Enter email" : "Enter username"}
                    onChange={handleInputChange}
                    disabled={isLoading}
                  />
                </div>
              </div>
              {errors.username && <span className="text-red-500 text-sm mt-1 block">{errors.username}</span>}
            </div>

            {/* Password Field */}
            <div className="relative">
              <div className="bg-gray-100 rounded-2xl px-4 py-4 focus-within:bg-white focus-within:ring-2 focus-within:ring-[#ff4a08] focus-within:ring-opacity-50 focus-within:shadow-lg hover:bg-gray-50 transition-all duration-200 border border-transparent focus-within:border-[#ff4a08]">
                <label className="text-gray-400 text-xs font-medium uppercase tracking-wider block mb-1 focus-within:text-[#ff4a08] transition-colors duration-200">PASSWORD</label>
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-[#ff4a08] mr-3 flex-shrink-0 transition-all duration-200" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 616 0z" clipRule="evenodd" />
                  </svg>
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    id="password"
                    value={form.password}
                    className="flex-1 bg-transparent border-0 outline-none text-gray-800 placeholder-gray-400 focus:placeholder-gray-300 text-base p-0 transition-all duration-200"
                    placeholder="Enter password"
                    onChange={handleInputChange}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="ml-2 p-1 text-gray-400 hover:text-[#ff4a08] transition-colors duration-200"
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
              {errors.password && <span className="text-red-500 text-sm mt-1 block">{errors.password}</span>}
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="rememberMe"
                  id="rememberMe"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 text-[#ff4a08] focus:ring-[#ff4a08] border-gray-300 rounded"
                />
                <label htmlFor="rememberMe" className="ml-3 text-sm text-gray-600">
                  Remember me
                </label>
              </div>
              <button
                type="button"
                onClick={viewForgotPassword}
                className="text-sm text-[#105588] hover:text-[#ff4a08] transition-colors"
              >
                Forgot password?
              </button>
            </div>

            {/* Login Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#105588] text-white py-4 px-4 rounded-2xl hover:bg-[#0d4470] focus:outline-none focus:ring-2 focus:ring-[#ff4a08] focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-lg relative overflow-hidden"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Signing in...
                  </div>
                ) : (
                  <>
                    LOGIN
                    <div className="absolute bottom-0 left-0 h-1 bg-[#ff4a08] w-1/3 rounded-full"></div>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Alternative Login Options */}
          <div className="mt-8 space-y-4">
            {/* Divider */}
            <div className="flex items-center">
              <div className="flex-1 border-t border-gray-200"></div>
              <div className="px-4 text-sm text-gray-500">Or continue with</div>
              <div className="flex-1 border-t border-gray-200"></div>
            </div>

            {/* Google Sign In */}
            <button
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full bg-white border border-gray-200 text-gray-700 py-4 px-4 rounded-2xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#ff4a08] focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center shadow-sm"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-gray-600 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-3" viewBox="0 0 48 48">
                    <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
                    <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
                    <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
                    <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
                  </svg>
                  Continue with Google
                </>
              )}
            </button>

            {/* Sign Up Link */}
            <div className="text-center pt-4 pb-6 md:pb-0">
              <span className="text-gray-500 text-sm">Don't have an account? </span>
              <button
                onClick={viewRegister}
                className="text-[#105588] hover:text-[#ff4a08] transition-colors text-sm font-medium"
              >
                Sign up
              </button>
            </div>
          </div>

        </div>
      </div>
      
      {/* Enhanced Global Message Modal */}
      {globalMessage && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-8 max-w-lg w-full mx-4 shadow-2xl border border-white/20 transform animate-in fade-in duration-300 scale-95 animate-in">
            {/* Icon based on message type */}
            <div className="flex justify-center mb-6">
              {globalMessage.toLowerCase().includes('success') || globalMessage.toLowerCase().includes('created') ? (
                // Success Icon
                <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-lg">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              ) : globalMessage.toLowerCase().includes('error') || globalMessage.toLowerCase().includes('failed') || globalMessage.toLowerCase().includes('invalid') ? (
                // Error Icon
                <div className="w-16 h-16 bg-gradient-to-br from-red-400 to-red-600 rounded-full flex items-center justify-center shadow-lg">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              ) : globalMessage.toLowerCase().includes('verify') || globalMessage.toLowerCase().includes('check') ? (
                // Warning/Info Icon
                <div className="w-16 h-16 bg-gradient-to-br from-[#ff4a08] to-[#f69664] rounded-full flex items-center justify-center shadow-lg">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              ) : (
                // Default Info Icon
                <div className="w-16 h-16 bg-gradient-to-br from-[#105588] to-[#0d4470] rounded-full flex items-center justify-center shadow-lg">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              )}
            </div>

            {/* Message Content */}
            <div className="text-center mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                {globalMessage.toLowerCase().includes('success') || globalMessage.toLowerCase().includes('created') ? 'Success!' :
                 globalMessage.toLowerCase().includes('error') || globalMessage.toLowerCase().includes('failed') || globalMessage.toLowerCase().includes('invalid') ? 'Error' :
                 globalMessage.toLowerCase().includes('verify') || globalMessage.toLowerCase().includes('check') ? 'Attention' : 'Information'}
              </h3>
              <p className="text-gray-700 leading-relaxed text-base">{globalMessage}</p>
            </div>

            {/* Action Button */}
            <button
              onClick={() => setGlobalMessage("")}
              className="w-full bg-gradient-to-r from-[#105588] to-[#0d4470] text-white py-4 px-6 rounded-2xl hover:from-[#0d4470] hover:to-[#0a3a5c] focus:outline-none focus:ring-4 focus:ring-[#105588]/30 transition-all duration-300 font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center group"
            >
              <span>Got it</span>
              <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}