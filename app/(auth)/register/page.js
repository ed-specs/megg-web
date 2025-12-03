"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { auth, db } from "../../config/firebaseConfig"
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth"
import { collection, query, where, getDocs, setDoc, doc } from "firebase/firestore"
import Image from "next/image"
import { generateOTP, calculateOTPExpiry } from "../../utils/otp"
import { generateUniqueAccountId, checkAccountIdExists } from "../../utils/accountId"
import { getPasswordStrength, getEmailError, getPhoneError, getPasswordError, getConfirmPasswordError, getUsernameError, getFullnameError } from "../../utils/validation"
import { sendVerificationEmail, devLog, devError } from "../../utils/auth-helpers"
import { Eye, EyeOff } from "lucide-react"
import { smartInitializeFCM } from "../../utils/smart-fcm"
import AuthModal from "../components/AuthModal"
import LoadingLogo from "../components/LoadingLogo"
import PasswordStrengthIndicator from "../components/PasswordStrengthIndicator"

export default function RegisterPage() {
  const [form, setForm] = useState({
    fullname: "",
    username: "",
    phone: "", 
    email: "",
    password: "",
    confirmPassword: "",
    role: "user", // Default role
  })

  const [accountId, setAccountId] = useState("")
  const [isGeneratingId, setIsGeneratingId] = useState(true)

  const [errors, setErrors] = useState({})
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, level: 'weak' })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [globalMessage, setGlobalMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isNavigating, setIsNavigating] = useState(false)
  const router = useRouter()

  // Generate account ID when component mounts
  useEffect(() => {
    const generateId = async () => {
      try {
        setIsGeneratingId(true)
        const id = await generateUniqueAccountId(db)
        setAccountId(id)
      } catch (error) {
        devError("Error generating account ID:", error)
        setGlobalMessage("Error generating account ID. Please refresh the page.")
      } finally {
        setIsGeneratingId(false)
      }
    }
    generateId()
  }, [])

  // Handle input changes and real-time validation
  const handleInputChange = (e) => {
    const { name, value } = e.target
    setForm({ ...form, [name]: value })
    validateField(name, value)
  }

  const validateField = (name, value) => {
    let errorMsg = ""

    switch (name) {
      case "fullname":
        errorMsg = getFullnameError(value)
        break
      case "username":
        errorMsg = getUsernameError(value)
        break
      case "email":
        errorMsg = getEmailError(value)
        break
      case "phone":
        errorMsg = getPhoneError(value)
        break
      case "password":
        errorMsg = getPasswordError(value)
        // Update password strength
        setPasswordStrength(getPasswordStrength(value))
        break
      case "confirmPassword":
        errorMsg = getConfirmPasswordError(form.password, value)
        break
      default:
        break
    }

    setErrors((prevErrors) => ({ ...prevErrors, [name]: errorMsg }))
  }
  

  const handleRegister = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setGlobalMessage("")

    // Check for empty fields
    const emptyFields = Object.entries(form).filter(([key, value]) => value === "")
    if (emptyFields.length > 0) {
      setGlobalMessage("Please fill in all fields.")
      setIsLoading(false)
      return
    }

    // Check if there are any remaining validation errors
    const hasErrors = Object.values(errors).some((error) => error !== "")
    if (hasErrors) {
      setGlobalMessage("Please fix the highlighted errors.")
      setIsLoading(false)
      return
    }

    try {
      // Step 1: Check username availability
      const userRef = collection(db, "users")
      const usernameQuery = query(userRef, where("username", "==", form.username))

      try {
        const usernameSnapshot = await getDocs(usernameQuery)
        if (!usernameSnapshot.empty) {
          setGlobalMessage("Username already taken.")
          setIsLoading(false)
          return
        }
      } catch (error) {
        devError("Error checking username:", error)
        setGlobalMessage("Error checking username availability. Please try again.")
        setIsLoading(false)
        return
      }

      // Step 2: Check email availability (Firebase will also check this, but we check early)
      const emailQuery = query(userRef, where("email", "==", form.email))
      try {
        const emailSnapshot = await getDocs(emailQuery)
        if (!emailSnapshot.empty) {
          setGlobalMessage("Email already registered. Please use a different email.")
          setIsLoading(false)
          return
        }
      } catch (error) {
        devError("Error checking email:", error)
        setGlobalMessage("Error checking email availability. Please try again.")
        setIsLoading(false)
        return
      }

      // Step 3: Final check to ensure account ID is still unique
      const finalCheck = await checkAccountIdExists(accountId, db)
      if (finalCheck) {
        setGlobalMessage("Account ID collision detected. Please try again.")
        setIsLoading(false)
        return
      }

      // Step 4: Generate OTP and test email sending BEFORE creating user
      const otp = generateOTP()
      const otpExpiry = calculateOTPExpiry()

      // Test email sending first (this is the critical step)
      try {
        await sendVerificationEmail(form.email, otp)
        setGlobalMessage("Email verification sent successfully. Creating your account...")
      } catch (emailError) {
        devError("Email sending failed:", emailError)
        setGlobalMessage("Failed to send verification email. Please check your email address and try again.")
        setIsLoading(false)
        return
      }

      // Step 5: Only NOW create user in Firebase Auth (after email test passes)
      const userCredential = await createUserWithEmailAndPassword(auth, form.email, form.password)

      // Step 6: Update user profile
      await updateProfile(userCredential.user, {
        displayName: form.username,
      })

      // Step 7: Store user data in Firestore (email already tested, so this should work)
      try {
        await setDoc(doc(db, "users", accountId), {
          fullname: form.fullname,
          username: form.username,
          email: form.email,
          phone: form.phone,
          role: form.role, // Add user role
          accountId: accountId, // Keep for reference
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString(),
          uid: userCredential.user.uid, // Firebase Auth UID
          verified: false,
          verificationOTP: otp,
          otpExpiry: otpExpiry,
          deviceId: null, // Will be set when FCM token is available
        })

        // Create default notification settings with push notifications enabled by default
        try {
          await setDoc(doc(db, "notificationSettings", accountId), {
            notificationsEnabled: true,
            pushNotificationsEnabled: true, // Enable by default for new users
            emailNotifications: false, // Disabled by default
            inAppNotifications: true, // Always enabled by default
            defectAlerts: true,
            machineAlerts: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })
          devLog("Default notification settings created for new user")
        } catch (error) {
          devError("Error creating notification settings:", error)
        }

        // Initialize FCM for push notifications (no login notification for new users)
        try {
          await smartInitializeFCM(accountId) // No username = no login notification
          devLog("FCM initialized successfully for new user")
        } catch (error) {
          devError("FCM initialization failed:", error)
        }

        // Success! Everything worked
        setGlobalMessage(`Account created successfully! Your Account ID is ${accountId}. Verification email sent to ${form.email}.`)
        setTimeout(() => router.push(`/verify?email=${form.email}`), 3000)
        
      } catch (firestoreError) {
        devError("Error saving user data to Firestore:", firestoreError)
        
        // Rollback: Delete the Firebase Auth user since Firestore save failed
        try {
          await userCredential.user.delete()
          setGlobalMessage("Failed to save user data. Your account was not created. Please try again.")
        } catch (deleteError) {
          devError("Error deleting auth user during rollback:", deleteError)
          setGlobalMessage("Registration failed and cleanup failed. Please contact support.")
        }
        setIsLoading(false)
        return
      }
    } catch (error) {
      let errorMessage = "Registration failed. Please try again."

      if (error.code === "auth/email-already-in-use") {
        errorMessage = "Email already registered. Please use a different email."
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "Invalid email address."
      } else if (error.code === "auth/operation-not-allowed") {
        errorMessage = "Email/password registration is not enabled."
      } else if (error.code === "auth/weak-password") {
        errorMessage = "Password is too weak."
      }

      setGlobalMessage(errorMessage)
      devError("Registration error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const viewSignIn = () => {
    setIsNavigating(true)
    router.push("/login")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-orange-50 relative overflow-hidden">
      {/* Page Navigation Loading */}
      {isNavigating && (
        <div className="fixed inset-0 bg-white/90 backdrop-blur-sm z-[100] flex items-center justify-center">
          <LoadingLogo message="" size="lg" />
        </div>
      )}
      
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
      <div className="flex flex-col items-center justify-start min-h-screen px-6 py-8 relative z-10">
        <div className="w-full max-w-sm mx-auto md:bg-white/80 md:backdrop-blur-sm md:border md:border-gray-200 md:rounded-3xl md:shadow-xl md:p-8 md:max-w-2xl lg:max-w-3xl">
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
              <p className="text-gray-600 text-base md:text-lg">Create your account</p>
            </div>
          </div>


          {/* Registration Form */}
          <form onSubmit={handleRegister} className="space-y-6">
            {/* Two-column layout for desktop, single column for mobile */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Full Name Field */}
              <div className="relative">
                <div className="bg-gray-100 rounded-2xl px-4 py-4 focus-within:bg-white focus-within:ring-2 focus-within:ring-[#ff4a08] focus-within:ring-opacity-50 focus-within:shadow-lg hover:bg-gray-50 transition-all duration-200 border border-transparent focus-within:border-[#ff4a08]">
                  <label className="text-gray-400 text-xs font-medium uppercase tracking-wider block mb-1 focus-within:text-[#ff4a08] transition-colors duration-200">FULL NAME</label>
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-[#ff4a08] mr-3 flex-shrink-0 transition-all duration-200" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                    <input
                      type="text"
                      name="fullname"
                      id="fullname"
                      className="flex-1 bg-transparent border-0 outline-none text-gray-800 placeholder-gray-400 focus:placeholder-gray-300 text-base p-0 transition-all duration-200"
                      placeholder="Juan Dela Cruz"
                      onChange={handleInputChange}
                      disabled={isLoading}
                    />
                  </div>
                </div>
                {errors.fullname && <span className="text-red-500 text-sm mt-1 block">{errors.fullname}</span>}
              </div>

              {/* Username Field */}
              <div className="relative">
                <div className="bg-gray-100 rounded-2xl px-4 py-4 focus-within:bg-white focus-within:ring-2 focus-within:ring-[#ff4a08] focus-within:ring-opacity-50 focus-within:shadow-lg hover:bg-gray-50 transition-all duration-200 border border-transparent focus-within:border-[#ff4a08]">
                  <label className="text-gray-400 text-xs font-medium uppercase tracking-wider block mb-1 focus-within:text-[#ff4a08] transition-colors duration-200">USERNAME</label>
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-[#ff4a08] mr-3 flex-shrink-0 transition-all duration-200" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
                    </svg>
                    <input
                      type="text"
                      name="username"
                      id="username"
                      className="flex-1 bg-transparent border-0 outline-none text-gray-800 placeholder-gray-400 focus:placeholder-gray-300 text-base p-0 transition-all duration-200"
                      placeholder="juandelacruz"
                      onChange={handleInputChange}
                      disabled={isLoading}
                    />
                  </div>
                </div>
                {errors.username && <span className="text-red-500 text-sm mt-1 block">{errors.username}</span>}
              </div>

              {/* Phone Field */}
              <div className="relative">
                <div className="bg-gray-100 rounded-2xl px-4 py-4 focus-within:bg-white focus-within:ring-2 focus-within:ring-[#ff4a08] focus-within:ring-opacity-50 focus-within:shadow-lg hover:bg-gray-50 transition-all duration-200 border border-transparent focus-within:border-[#ff4a08]">
                  <label className="text-gray-400 text-xs font-medium uppercase tracking-wider block mb-1 focus-within:text-[#ff4a08] transition-colors duration-200">PHONE NUMBER</label>
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-[#ff4a08] mr-3 flex-shrink-0 transition-all duration-200" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                    </svg>
                    <input
                      type="tel"
                      name="phone"
                      id="phone"
                      className="flex-1 bg-transparent border-0 outline-none text-gray-800 placeholder-gray-400 focus:placeholder-gray-300 text-base p-0 transition-all duration-200"
                      placeholder="+63 912 345 6789"
                      onChange={handleInputChange}
                      disabled={isLoading}
                    />
                  </div>
                </div>
                {errors.phone && <span className="text-red-500 text-sm mt-1 block">{errors.phone}</span>}
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
                      className="flex-1 bg-transparent border-0 outline-none text-gray-800 placeholder-gray-400 focus:placeholder-gray-300 text-base p-0 transition-all duration-200"
                      placeholder="••••••••••"
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
                {/* Password Strength Indicator */}
                <PasswordStrengthIndicator strength={passwordStrength} password={form.password} />
                {errors.password && <span className="text-red-500 text-sm mt-1 block">{errors.password}</span>}
              </div>
            </div>

            {/* Full-width fields */}
            <div className="space-y-6">
              {/* Email Field */}
              <div className="relative">
                <div className="bg-gray-100 rounded-2xl px-4 py-4 focus-within:bg-white focus-within:ring-2 focus-within:ring-[#ff4a08] focus-within:ring-opacity-50 focus-within:shadow-lg hover:bg-gray-50 transition-all duration-200 border border-transparent focus-within:border-[#ff4a08]">
                  <label className="text-gray-400 text-xs font-medium uppercase tracking-wider block mb-1 focus-within:text-[#ff4a08] transition-colors duration-200">EMAIL</label>
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-[#ff4a08] mr-3 flex-shrink-0 transition-all duration-200" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                      <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                    </svg>
                    <input
                      type="email"
                      name="email"
                      id="email"
                      className="flex-1 bg-transparent border-0 outline-none text-gray-800 placeholder-gray-400 focus:placeholder-gray-300 text-base p-0 transition-all duration-200"
                      placeholder="juan@example.com"
                      onChange={handleInputChange}
                      disabled={isLoading}
                    />
                  </div>
                </div>
                {errors.email && <span className="text-red-500 text-sm mt-1 block">{errors.email}</span>}
              </div>

              {/* Account ID Field */}
              <div className="relative">
                <div className="bg-gray-100 rounded-2xl px-4 py-4 opacity-75">
                  <label className="text-gray-400 text-xs font-medium uppercase tracking-wider block mb-1 focus-within:text-[#ff4a08] transition-colors duration-200">ACCOUNT ID</label>
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-[#ff4a08] mr-3 flex-shrink-0 transition-all duration-200" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" />
                      <path d="M2 13.692V16a2 2 0 002 2h12a2 2 0 002-2v-2.308A24.974 24.974 0 0110 15c-2.796 0-5.487-.46-8-1.308z" />
                    </svg>
                    <input
                      type="text"
                      name="accountId"
                      id="accountId"
                      className="flex-1 bg-transparent border-0 outline-none text-gray-800 placeholder-gray-500 text-base p-0 font-mono"
                      value={isGeneratingId ? "Generating..." : accountId || "Error generating ID"}
                      disabled={true}
                      readOnly
                    />
                  </div>
                </div>
                <span className="text-xs text-gray-500 mt-1 block">This ID will be assigned to your account</span>
              </div>

              {/* Confirm Password Field */}
              <div className="relative">
                <div className="bg-gray-100 rounded-2xl px-4 py-4 focus-within:bg-white focus-within:ring-2 focus-within:ring-[#ff4a08] focus-within:ring-opacity-50 focus-within:shadow-lg hover:bg-gray-50 transition-all duration-200 border border-transparent focus-within:border-[#ff4a08]">
                  <label className="text-gray-400 text-xs font-medium uppercase tracking-wider block mb-1 focus-within:text-[#ff4a08] transition-colors duration-200">CONFIRM PASSWORD</label>
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-[#ff4a08] mr-3 flex-shrink-0 transition-all duration-200" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      name="confirmPassword"
                      id="confirmPassword"
                      className="flex-1 bg-transparent border-0 outline-none text-gray-800 placeholder-gray-400 focus:placeholder-gray-300 text-base p-0 transition-all duration-200"
                      placeholder="••••••••••"
                      onChange={handleInputChange}
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="ml-2 p-1 text-gray-400 hover:text-[#ff4a08] transition-colors duration-200"
                      disabled={isLoading}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
                {errors.confirmPassword && <span className="text-red-500 text-sm mt-1 block">{errors.confirmPassword}</span>}
              </div>
            </div>

            {/* Create Account Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#105588] text-white py-4 px-4 rounded-2xl hover:bg-[#0d4470] focus:outline-none focus:ring-2 focus:ring-[#ff4a08] focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-lg relative overflow-hidden"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Creating account...
                  </div>
                ) : (
                  <>
                    CREATE ACCOUNT
                    <div className="absolute bottom-0 left-0 h-1 bg-[#ff4a08] w-1/3 rounded-full"></div>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Sign In Link */}
          <div className="mt-8">
            {/* Divider */}
            <div className="flex items-center mb-6">
              <div className="flex-1 border-t border-gray-200"></div>
              <div className="px-4 text-sm text-gray-500">Already have an account?</div>
              <div className="flex-1 border-t border-gray-200"></div>
            </div>

            {/* Sign In Button */}
            <button
              onClick={viewSignIn}
              className="w-full bg-white border border-gray-200 text-gray-700 py-4 px-4 rounded-2xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#ff4a08] focus:ring-offset-2 transition-all duration-200 font-medium flex items-center justify-center shadow-sm"
            >
              <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
              Back to Sign In
            </button>
          </div>

        </div>
      </div>
      
      {/* Global Message Modal */}
      <AuthModal
        message={globalMessage}
        onClose={() => setGlobalMessage("")}
      />
    </div>
  )
}