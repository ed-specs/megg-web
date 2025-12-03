"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { db } from "../../../config/firebaseConfig"
import { collection, query, where, getDocs } from "firebase/firestore"
import Image from "next/image"
import { Mail } from "lucide-react"
import { getEmailError } from "../../../utils/validation"
import { devError } from "../../../utils/auth-helpers"
import AuthModal from "../../components/AuthModal"
import LoadingLogo from "../../components/LoadingLogo"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [errors, setErrors] = useState({})
  const [globalMessage, setGlobalMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isNavigating, setIsNavigating] = useState(false)
  const router = useRouter()

  const handleInputChange = (e) => {
    setEmail(e.target.value)
    validateField(e.target.value)
  }

  const validateField = (value) => {
    const errorMsg = getEmailError(value)
    setErrors({ email: errorMsg })
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    setIsLoading(true)

    if (!email) {
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
      // Check if user exists first
      const userRef = collection(db, "users")
      const userQuery = query(userRef, where("email", "==", email))
      const userSnap = await getDocs(userQuery)

      if (userSnap.empty) {
        setGlobalMessage("No account found with this email address.")
        setIsLoading(false)
        return
      }

      // Send reset email
      const response = await fetch("/api/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok) {
        // Handle specific error codes
        switch (data.code) {
          case "EMAIL_NOT_CONFIGURED":
            throw new Error("Email service is not configured. Please contact support.")
          case "APP_URL_NOT_CONFIGURED":
            throw new Error("Server configuration error. Please contact support.")
          case "SMTP_CONNECTION_FAILED":
            throw new Error("Email service connection failed. Please try again later.")
          case "EMAIL_SERVICE_UNAVAILABLE":
            throw new Error("Email service is temporarily unavailable. Please try again later.")
          case "permission-denied":
            throw new Error("Access denied. Please try again later.")
          default:
            throw new Error(data.error || "Failed to send reset email")
        }
      }

      setGlobalMessage("Password reset instructions sent to your email.")
      setTimeout(() => {
        setIsNavigating(true)
        router.push("/login")
      }, 4000)
    } catch (err) {
      devError("Reset password error:", err)
      setGlobalMessage(err.message || "An error occurred. Please try again.")
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
              <h1 className="text-4xl font-bold text-[#105588] mb-2 md:text-5xl md:font-bold lg:text-6xl lg:font-bold">Forgot Password</h1>
              <p className="text-gray-600 text-base md:text-lg">Enter your email to reset your password</p>
            </div>
          </div>

          {/* Reset Form */}
          <form onSubmit={handleResetPassword} className="space-y-6">
            {/* Email Field */}
            <div className="relative">
              <div className="bg-gray-100 rounded-2xl px-4 py-4 focus-within:bg-white focus-within:ring-2 focus-within:ring-[#ff4a08] focus-within:ring-opacity-50 focus-within:shadow-lg hover:bg-gray-50 transition-all duration-200 border border-transparent focus-within:border-[#ff4a08]">
                <label className="text-gray-400 text-xs font-medium uppercase tracking-wider block mb-1 focus-within:text-[#ff4a08] transition-colors duration-200">EMAIL</label>
                <div className="flex items-center">
                  <Mail className="w-5 h-5 text-[#ff4a08] mr-3 flex-shrink-0 transition-all duration-200" />
                  <input
                    type="email"
                    name="email"
                    id="email"
                    value={email}
                    className="flex-1 bg-transparent border-0 outline-none text-gray-800 placeholder-gray-400 focus:placeholder-gray-300 text-base p-0 transition-all duration-200"
                    placeholder="johndoe@gmail.com"
                    onChange={handleInputChange}
                    disabled={isLoading}
                  />
                </div>
              </div>
              {errors.email && <span className="text-red-500 text-sm mt-1 block">{errors.email}</span>}
            </div>

            {/* Reset Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#105588] text-white py-4 px-4 rounded-2xl hover:bg-[#0d4470] focus:outline-none focus:ring-2 focus:ring-[#ff4a08] focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-lg relative overflow-hidden"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Sending...
                  </div>
                ) : (
                  <>
                    SEND RESET LINK
                    <div className="absolute bottom-0 left-0 h-1 bg-[#ff4a08] w-1/3 rounded-full"></div>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Back to Login */}
          <div className="mt-8">
            <div className="text-center pt-4">
              <span className="text-gray-500 text-sm">Remember your password? </span>
              <button
                onClick={viewSignIn}
                className="text-[#105588] hover:text-[#ff4a08] transition-colors text-sm font-medium"
              >
                Back to Sign In
              </button>
            </div>
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