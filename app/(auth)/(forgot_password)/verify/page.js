"use client"

import { useState, useEffect, useRef, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { TriangleAlert } from "lucide-react"
import { auth, db } from "../../../config/firebaseConfig"
import { collection, query, where, getDocs, updateDoc, doc } from "firebase/firestore"
import { generateOTP, calculateOTPExpiry } from "../../../utils/otp"
import { sendEmailVerification } from "firebase/auth"
import AuthModal from "../../components/AuthModal"
import LoadingLogo from "../../components/LoadingLogo"

function VerifyPageContent() {
  const [otp, setOtp] = useState(new Array(6).fill(""))
  const [globalMessage, setGlobalMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isNavigating, setIsNavigating] = useState(false)
  const [timeLeft, setTimeLeft] = useState(900) // 15 minutes in seconds
  const [resendCooldown, setResendCooldown] = useState(0) // Cooldown for resend button
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get("email")
  const inputRefs = useRef([])

  useEffect(() => {
    if (!email) {
      setIsNavigating(true)
      router.push("/login")
      return
    }

    // Start countdown timer for OTP expiry
    const timer = setInterval(() => {
      setTimeLeft((prevTime) => {
        if (prevTime <= 1) {
          clearInterval(timer)
          return 0
        }
        return prevTime - 1
      })
    }, 1000)

    // Start countdown timer for resend cooldown
    const resendTimer = setInterval(() => {
      setResendCooldown((prevTime) => {
        if (prevTime <= 1) {
          return 0
        }
        return prevTime - 1
      })
    }, 1000)

    return () => {
      clearInterval(timer)
      clearInterval(resendTimer)
    }
  }, [email, router])

  const handleChange = (e, index) => {
    const value = e.target.value.replace(/\D/, "") // Only allow digits
    if (!value) return

    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)

    // Move to next input if not the last
    if (index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace") {
      if (otp[index]) {
        // Clear current
        const newOtp = [...otp]
        newOtp[index] = ""
        setOtp(newOtp)
      } else if (index > 0) {
        // Go back
        inputRefs.current[index - 1]?.focus()
      }
    }
  }

  const handleResendOTP = async () => {
    setIsLoading(true)
    setGlobalMessage("")

    try {
      // Find user by email
      const usersRef = collection(db, "users")
      const q = query(usersRef, where("email", "==", email))
      const querySnapshot = await getDocs(q)

      if (querySnapshot.empty) {
        setGlobalMessage("User not found.")
        return
      }

      const userDoc = querySnapshot.docs[0]
      const userData = userDoc.data()

      // Generate new OTP and expiry
      const newOTP = generateOTP()
      const newExpiry = calculateOTPExpiry()

      // Update user document with new OTP
      await updateDoc(doc(db, "users", userDoc.id), {
        verificationOTP: newOTP,
        otpExpiry: newExpiry,
      })

      // Send new verification email
      if (auth.currentUser) {
        const actionCodeSettings = {
          url: `${window.location.origin}/verify?email=${email}`,
          handleCodeInApp: true,
        }
        await sendEmailVerification(auth.currentUser, actionCodeSettings)
      }

      setGlobalMessage("New verification code sent!")
      setTimeLeft(900) // Reset timer to 15 minutes
      setResendCooldown(60) // Set 1-minute cooldown for next resend
    } catch (error) {
      console.error("Error resending OTP:", error)
      setGlobalMessage("Failed to resend verification code. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setGlobalMessage("")

    const enteredOTP = otp.join("")

    try {
      // Find user by email
      const usersRef = collection(db, "users")
      const q = query(usersRef, where("email", "==", email))
      const querySnapshot = await getDocs(q)

      if (querySnapshot.empty) {
        setGlobalMessage("User not found.")
        return
      }

      const userDoc = querySnapshot.docs[0]
      const userData = userDoc.data()

      // Check if OTP is expired
      if (new Date() > new Date(userData.otpExpiry)) {
        setGlobalMessage("Verification code has expired. Please request a new one.")
        return
      }

      // Verify OTP
      if (enteredOTP !== userData.verificationOTP) {
        setGlobalMessage("Invalid verification code. Please try again.")
        return
      }

      // Update user verification status
      await updateDoc(doc(db, "users", userDoc.id), {
        verified: true,
        verificationOTP: null,
        otpExpiry: null,
      })

      setGlobalMessage("Email verified successfully!")
      setTimeout(() => {
        setIsNavigating(true)
        router.push("/login")
      }, 2000)
    } catch (error) {
      console.error("Verification error:", error)
      setGlobalMessage("An error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
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
              <h1 className="text-4xl font-bold text-[#105588] mb-2 md:text-5xl md:font-bold lg:text-6xl lg:font-bold">Verify Email</h1>
              <p className="text-gray-600 text-base md:text-lg">
                Enter the 6-digit code sent to{" "}
                <span className="font-medium text-[#105588]">{email || "name@example.com"}</span>
              </p>
            </div>
          </div>

          {/* OTP Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* OTP Input Grid */}
            <div className="flex justify-center gap-3 mb-8">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => (inputRefs.current[index] = el)}
                  type="text"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(e, index)}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  inputMode="numeric"
                  disabled={isLoading}
                  className="w-12 h-12 text-center bg-gray-100 rounded-2xl border border-transparent focus:bg-white focus:ring-2 focus:ring-[#ff4a08] focus:ring-opacity-50 focus:shadow-lg hover:bg-gray-50 transition-all duration-200 focus:border-[#ff4a08] text-lg font-semibold text-[#105588] disabled:opacity-50"
                />
              ))}
            </div>

            {/* Timer and Resend */}
            <div className="bg-gray-100 rounded-2xl p-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-xs font-medium uppercase tracking-wider text-gray-400 mb-1">Time Remaining</span>
                  <span className="text-lg font-bold text-[#105588]">{formatTime(timeLeft)}</span>
                </div>
                <button
                  type="button"
                  onClick={handleResendOTP}
                  disabled={isLoading || resendCooldown > 0}
                  className="px-4 py-2 bg-gradient-to-r from-[#ff4a08] to-[#f69664] text-white rounded-xl hover:from-[#f69664] hover:to-[#ff4a08] focus:outline-none focus:ring-2 focus:ring-[#ff4a08] focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
                >
                  {isLoading ? "Sending..." : resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend Code"}
                </button>
              </div>
            </div>

            {/* Verify Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={isLoading || timeLeft === 0 || otp.some(digit => !digit)}
                className="w-full bg-[#105588] text-white py-4 px-4 rounded-2xl hover:bg-[#0d4470] focus:outline-none focus:ring-2 focus:ring-[#ff4a08] focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-lg relative overflow-hidden"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Verifying...
                  </div>
                ) : (
                  <>
                    VERIFY EMAIL
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
  );
};

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50 to-orange-50">
        <LoadingLogo message="" size="lg" />
      </div>
    }>
      <VerifyPageContent />
    </Suspense>
  );
}
