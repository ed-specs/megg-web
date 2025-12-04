"use client"

import { useState, useEffect, useCallback, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { db, auth } from "../../../config/firebaseConfig"
import { collection, query, where, getDocs, updateDoc, doc } from "firebase/firestore"
import { signInWithEmailAndPassword, updatePassword, sendPasswordResetEmail } from "firebase/auth"
import Image from "next/image"
import { verifyResetToken } from "../../../utils/token"
import { getPasswordStrength, getEmailError, getPasswordError, getConfirmPasswordError } from "../../../utils/validation"
import { devLog, devError } from "../../../utils/auth-helpers"
import bcrypt from "bcryptjs"
import { Mail, Eye, EyeOff, Lock } from "lucide-react"
import AuthModal from "../../components/AuthModal"
import LoadingLogo from "../../components/LoadingLogo"
import PasswordStrengthIndicator from "../../components/PasswordStrengthIndicator"

function PasswordPageContent() {
  const [form, setForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
  })

  const [errors, setErrors] = useState({})
  const [globalMessage, setGlobalMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isNavigating, setIsNavigating] = useState(false)
  const [isValidToken, setIsValidToken] = useState(false)
  const [userEmail, setUserEmail] = useState("")
  const [userId, setUserId] = useState("")
  const [isForgotPassword, setIsForgotPassword] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, level: 'weak' })
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  const email = searchParams.get("email")

  // Verify the reset token when component mounts
  const verifyToken = useCallback(async () => {
    if (!token || !email) {
      setGlobalMessage("Invalid reset link. Please request a new one.")
      setTimeout(() => {
        setIsNavigating(true)
        router.push("/forgot-password")
      }, 3000)
      return
    }

    try {
      // Find user by email
      const usersRef = collection(db, "users")
      const q = query(usersRef, where("email", "==", email))
      const querySnapshot = await getDocs(q)

      if (querySnapshot.empty) {
        setGlobalMessage("Invalid reset link. Please request a new one.")
        setTimeout(() => {
          setIsNavigating(true)
          router.push("/forgot-password")
        }, 3000)
        return
      }

      const userDoc = querySnapshot.docs[0]
      const userData = userDoc.data()

      // Check if token is expired
      if (new Date() > new Date(userData.resetPasswordExpiry)) {
        setGlobalMessage("Reset link has expired. Please request a new one.")
        setTimeout(() => {
          setIsNavigating(true)
          router.push("/forgot-password")
        }, 3000)
        return
      }

      // Verify token
      const isValid = verifyResetToken(token, userData.resetPasswordToken)
      if (!isValid) {
        setGlobalMessage("Invalid reset link. Please request a new one.")
        setTimeout(() => {
          setIsNavigating(true)
          router.push("/forgot-password")
        }, 3000)
        return
      }

      setIsValidToken(true)
      setUserEmail(email)
      setUserId(userDoc.id)
    } catch (error) {
      devError("Error verifying token:", error)
      setGlobalMessage("An error occurred. Please try again.")
      setTimeout(() => {
        setIsNavigating(true)
        router.push("/forgot-password")
      }, 3000)
    }
  }, [token, email, router])

  // Determine if this is forgot password or reset password flow
  useEffect(() => {
    if (!token && !email) {
      setIsForgotPassword(true)
    } else {
      setIsForgotPassword(false)
      verifyToken()
    }
  }, [token, email, verifyToken])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setForm({ ...form, [name]: value })
    validateField(name, value)
  }

  const validateField = (name, value) => {
    let errorMsg = ""

    switch (name) {
      case "email":
        errorMsg = getEmailError(value)
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

  const handleForgotPassword = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setGlobalMessage("")

    if (!form.email) {
      setGlobalMessage("Please enter your email address.")
      setIsLoading(false)
      return
    }

    if (errors.email) {
      setGlobalMessage("Please fix the highlighted errors.")
      setIsLoading(false)
      return
    }

    try {
      // Use Firebase's built-in password reset
      await sendPasswordResetEmail(auth, form.email)
      setGlobalMessage("Password reset link sent to your email! Please check your inbox.")
    } catch (error) {
      devError("Forgot password error:", error)
      let errorMessage = "An error occurred while sending the reset link."

      if (error.code === "auth/user-not-found") {
        errorMessage = "No account found with this email address."
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "Please enter a valid email address."
      } else if (error.code === "auth/too-many-requests") {
        errorMessage = "Too many requests. Please try again later."
      }

      setGlobalMessage(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setGlobalMessage("")

    if (!form.password || !form.confirmPassword) {
      setGlobalMessage("Please fill in all fields.")
      setIsLoading(false)
      return
    }

    const hasErrors = Object.values(errors).some((error) => error !== "")
    if (hasErrors) {
      setGlobalMessage("Please fix the highlighted errors.")
      setIsLoading(false)
      return
    }

    try {
      if (!isValidToken || !userEmail || !userId) {
        throw new Error("Invalid reset token")
      }

      // Hash the password for Firestore
      const hashedPassword = await bcrypt.hash(form.password, 12)

      // Update password in Firestore
      await updateDoc(doc(db, "users", userId), {
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpiry: null,
        passwordUpdatedAt: new Date().toISOString(),
      })

      // Try to update Firebase Auth password if user is currently signed in
      try {
        if (auth.currentUser && auth.currentUser.email === userEmail) {
          await updatePassword(auth.currentUser, form.password)
        }
      } catch (firebaseError) {
        devLog("Could not update Firebase Auth password:", firebaseError)
        // This is expected if user is not authenticated
      }

      setGlobalMessage("Password updated successfully! You can now login with your username and new password.")

      // Sign out any existing user session
      if (auth.currentUser) {
        await auth.signOut()
      }

      setTimeout(() => {
        setIsNavigating(true)
        router.push("/login")
      }, 3000)
    } catch (error) {
      devError("Reset password error:", error)
      let errorMessage = "An error occurred while resetting your password."

      if (error.message === "Invalid reset token") {
        errorMessage = "Invalid reset link. Please request a new one."
        setTimeout(() => {
          setIsNavigating(true)
          router.push("/forgot-password")
        }, 3000)
      } else if (error.code === "permission-denied") {
        errorMessage = "Access denied. Please try again or contact support."
      }

      setGlobalMessage(errorMessage)
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
              <h1 className="text-4xl font-bold text-[#105588] mb-2 md:text-5xl md:font-bold lg:text-6xl lg:font-bold">
                {isForgotPassword ? "Forgot Password" : "Reset Password"}
              </h1>
              <p className="text-gray-600 text-base md:text-lg">
                {isForgotPassword 
                  ? "Enter your email to receive a reset link"
                  : "Create a new secure password"
                }
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={isForgotPassword ? handleForgotPassword : handleResetPassword} className="space-y-6">
            {isForgotPassword ? (
              // Forgot Password Form - Email Field
              <div className="relative">
                <div className="bg-gray-100 rounded-2xl px-4 py-4 focus-within:bg-white focus-within:ring-2 focus-within:ring-[#ff4a08] focus-within:ring-opacity-50 focus-within:shadow-lg hover:bg-gray-50 transition-all duration-200 border border-transparent focus-within:border-[#ff4a08]">
                  <label className="text-gray-400 text-xs font-medium uppercase tracking-wider block mb-1 focus-within:text-[#ff4a08] transition-colors duration-200">EMAIL</label>
                  <div className="flex items-center">
                    <Mail className="w-5 h-5 text-[#ff4a08] mr-3 flex-shrink-0 transition-all duration-200" />
                    <input
                      type="email"
                      name="email"
                      id="email"
                      value={form.email}
                      className="flex-1 bg-transparent border-0 outline-none text-gray-800 placeholder-gray-400 focus:placeholder-gray-300 text-base p-0 transition-all duration-200"
                      placeholder="johndoe@gmail.com"
                      onChange={handleInputChange}
                      disabled={isLoading}
                    />
                  </div>
                </div>
                {errors.email && <span className="text-red-500 text-sm mt-1 block">{errors.email}</span>}
              </div>
            ) : (
              // Reset Password Form - Password Fields
              <>
                {/* New Password Field */}
                <div className="relative">
                  <div className="bg-gray-100 rounded-2xl px-4 py-4 focus-within:bg-white focus-within:ring-2 focus-within:ring-[#ff4a08] focus-within:ring-opacity-50 focus-within:shadow-lg hover:bg-gray-50 transition-all duration-200 border border-transparent focus-within:border-[#ff4a08]">
                    <label className="text-gray-400 text-xs font-medium uppercase tracking-wider block mb-1 focus-within:text-[#ff4a08] transition-colors duration-200">NEW PASSWORD</label>
                    <div className="flex items-center">
                      <Lock className="w-5 h-5 text-[#ff4a08] mr-3 flex-shrink-0 transition-all duration-200" />
                      <input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        id="password"
                        value={form.password}
                        className="flex-1 bg-transparent border-0 outline-none text-gray-800 placeholder-gray-400 focus:placeholder-gray-300 text-base p-0 transition-all duration-200"
                        placeholder="••••••••••"
                        onChange={handleInputChange}
                        disabled={isLoading || !isValidToken}
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

                {/* Confirm Password Field */}
                <div className="relative">
                  <div className="bg-gray-100 rounded-2xl px-4 py-4 focus-within:bg-white focus-within:ring-2 focus-within:ring-[#ff4a08] focus-within:ring-opacity-50 focus-within:shadow-lg hover:bg-gray-50 transition-all duration-200 border border-transparent focus-within:border-[#ff4a08]">
                    <label className="text-gray-400 text-xs font-medium uppercase tracking-wider block mb-1 focus-within:text-[#ff4a08] transition-colors duration-200">CONFIRM PASSWORD</label>
                    <div className="flex items-center">
                      <Lock className="w-5 h-5 text-[#ff4a08] mr-3 flex-shrink-0 transition-all duration-200" />
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        name="confirmPassword"
                        id="confirmPassword"
                        value={form.confirmPassword}
                        className="flex-1 bg-transparent border-0 outline-none text-gray-800 placeholder-gray-400 focus:placeholder-gray-300 text-base p-0 transition-all duration-200"
                        placeholder="••••••••••"
                        onChange={handleInputChange}
                        disabled={isLoading || !isValidToken}
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
              </>
            )}

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={isLoading || (!isForgotPassword && !isValidToken)}
                className="w-full bg-[#105588] text-white py-4 px-4 rounded-2xl hover:bg-[#0d4470] focus:outline-none focus:ring-2 focus:ring-[#ff4a08] focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-lg relative overflow-hidden"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    {isForgotPassword ? "Sending..." : "Resetting Password..."}
                  </div>
                ) : (
                  <>
                    {isForgotPassword ? "SEND RESET LINK" : "CHANGE PASSWORD"}
                    <div className="absolute bottom-0 left-0 h-1 bg-[#ff4a08] w-1/3 rounded-full"></div>
                  </>
                )}
              </button>
            </div>

            {/* Back to Sign In */}
            <div className="pt-4">
              <button
                type="button"
                onClick={viewSignIn}
                className="w-full bg-white border border-gray-200 text-gray-700 py-4 px-4 rounded-2xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#ff4a08] focus:ring-offset-2 transition-all duration-200 font-medium flex items-center justify-center shadow-sm"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Sign In
              </button>
            </div>
          </form>
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

export default function PasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50 to-orange-50">
        <LoadingLogo message="" size="lg" />
      </div>
    }>
      <PasswordPageContent />
    </Suspense>
  )
}

