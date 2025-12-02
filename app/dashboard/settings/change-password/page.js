"use client"

import { useState } from "react"
import { Save, SaveOff, TriangleAlert } from "lucide-react"
import { auth, db } from "../../../config/firebaseConfig"
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth"
import { createNotification } from "../../../lib/notifications/NotificationsService"
import { doc, getDoc, updateDoc } from "firebase/firestore"
import { Navbar } from "../../components/NavBar"
import { Header } from "../../components/Header"
import { getCurrentUser, getStoredUser, getUserAccountId } from "../../../utils/auth-utils"
import bcrypt from "bcryptjs"
import ResultModal from "../../components/ResultModal"

export default function ChangePasswordPage() {
  const [isSidebarOpen, setSidebarOpen] = useState(false)
  const [globalMessage, setGlobalMessage] = useState("")
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })

  const validate = (name, value) => {
    const validationErrors = { ...errors }

    if (name === "newPassword") {
      validationErrors.newPassword = value.length < 8 ? "Password must be at least 8 characters long." : ""
    }

    if (name === "confirmPassword") {
      validationErrors.confirmPassword = value !== formData.newPassword ? "Passwords do not match." : ""
    }

    setErrors(validationErrors)
  }

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormData({ ...formData, [name]: value })
    validate(name, value)
  }


  const handleSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setGlobalMessage("")

    try {
      const user = getCurrentUser()
      if (!user) {
        setGlobalMessage("No authenticated user found")
        return
      }

      // Validate form
      if (formData.newPassword.length < 8) {
        setGlobalMessage("New password must be at least 8 characters long")
        return
      }

      if (formData.newPassword !== formData.confirmPassword) {
        setGlobalMessage("New passwords do not match")
        return
      }

      // Get correct document ID (same logic as edit-profile)
      const storedUser = getStoredUser()
      const accountId = getUserAccountId()
      
      // Use accountId from stored user data if available, otherwise use user.uid
      const docId = accountId || user?.uid
      
      if (!docId) {
        setGlobalMessage("Unable to identify user document")
        return
      }

      console.log("🔍 Change Password: Using document ID:", docId)

      // Get user document to check if they have a hashed password
      const userDocRef = doc(db, "users", docId)
      const userDoc = await getDoc(userDocRef)

      if (!userDoc.exists()) {
        setGlobalMessage("User document not found")
        return
      }

      const userData = userDoc.data()

      if (userData.hashedPassword) {
        // User has custom auth - verify current password against hashed password
        const isCurrentPasswordValid = await bcrypt.compare(formData.currentPassword, userData.hashedPassword)
        
        if (!isCurrentPasswordValid) {
          setGlobalMessage("Current password is incorrect")
          return
        }

        // Hash the new password and update in Firestore
        const saltRounds = 12
        const newHashedPassword = await bcrypt.hash(formData.newPassword, saltRounds)

        await updateDoc(userDocRef, {
          hashedPassword: newHashedPassword,
          passwordUpdatedAt: new Date().toISOString()
        })

        setGlobalMessage("Password updated successfully!")
      } else {
        // User uses Firebase Auth - use Firebase's password update
        const firebaseUser = auth.currentUser
        if (!firebaseUser) {
          setGlobalMessage("No Firebase user found")
          return
        }

        // Re-authenticate user with current password
        const credential = EmailAuthProvider.credential(firebaseUser.email, formData.currentPassword)
        await reauthenticateWithCredential(firebaseUser, credential)

        // Update password
        await updatePassword(firebaseUser, formData.newPassword)

        // Update timestamp in Firestore
        await updateDoc(userDocRef, {
          passwordUpdatedAt: new Date().toISOString()
        })

        setGlobalMessage("Password updated successfully!")
      }

      // Create in-app notification for password change
      try {
        await createNotification(
          docId,
          "Your password has been successfully updated",
          "password_change"
        )
        console.log("In-app notification created for password change")
      } catch (notifError) {
        console.error("Error creating password change notification:", notifError)
        // Don't block the password change if notification fails
      }

      // Send email notification for password change
      try {
        const emailResponse = await fetch('/api/notifications/send-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            accountId: docId,
            subject: '🔐 Password Changed Successfully - MEGG',
            message: `
              <h2 style="color: #111827; font-size: 24px; font-weight: 600; margin: 0 0 16px 0;">Password Changed Successfully! ✅</h2>
              <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
                Your MEGG account password has been successfully updated on <strong>${new Date().toLocaleString()}</strong>.
              </p>
              <div style="background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); border: 1px solid #93c5fd; border-radius: 16px; padding: 20px; margin: 20px 0;">
                <p style="color: #1e40af; font-size: 14px; margin: 0; line-height: 1.5;">
                  <strong>✓ Your account is secure</strong><br>
                  You can now use your new password to log in to your account.
                </p>
              </div>
              <p style="color: #6b7280; font-size: 14px; margin: 16px 0 0 0;">
                If you did not make this change, please contact support immediately or reset your password.
              </p>
            `
          })
        })
        
        const emailResult = await emailResponse.json()
        if (emailResult.success) {
          console.log('Password change email sent to:', emailResult.email)
        } else if (emailResult.skipped) {
          console.log('Email skipped (email notifications disabled)')
        }
      } catch (emailError) {
        console.error('Error sending password change email:', emailError)
        // Don't block the password change if email fails
      }

      // Send push notification for password change
      try {
        const pushResponse = await fetch('/api/notifications/send-push', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: '🔐 Password Changed',
            body: 'Your password has been successfully updated.',
            accountId: docId,
            data: {
              type: 'password_change',
              timestamp: new Date().toISOString()
            },
            url: '/dashboard/settings/change-password'
          })
        })
        
        const pushResult = await pushResponse.json()
        if (pushResult.success) {
          console.log('Password change push notification sent')
        } else if (pushResult.skipped) {
          console.log('Push notification skipped (disabled by user)')
        }
      } catch (pushError) {
        console.error('Error sending password change push notification:', pushError)
        // Don't block the password change if push notification fails
      }

      // Clear form
      setFormData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      })

      // Clear message after 5 seconds
      setTimeout(() => setGlobalMessage(""), 5000)

    } catch (error) {
      console.error("Error changing password:", error)
      
      if (error.code === "auth/wrong-password") {
        setGlobalMessage("Current password is incorrect")
      } else if (error.code === "auth/weak-password") {
        setGlobalMessage("New password is too weak")
      } else if (error.code === "auth/requires-recent-login") {
        setGlobalMessage("Please log out and log back in before changing your password")
      } else {
        setGlobalMessage("Error changing password. Please try again.")
      }
    } finally {
      setLoading(false)
    }
  }

  const hasValidForm = () => {
    return (
      formData.currentPassword &&
      formData.newPassword &&
      formData.confirmPassword &&
      formData.newPassword === formData.confirmPassword &&
      formData.newPassword.length >= 8 &&
      !Object.values(errors).some(error => error)
    )
  }

  return (
    <div className="min-h-screen container mx-auto text-[#1F2421] relative">
      {/* Backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-opacity lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <div
        className={`fixed z-50 inset-y-0 left-0 w-80 bg-white transform shadow-lg transition-transform duration-300 ease-in-out lg:hidden ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Navbar />
      </div>

      {/* MAIN */}
      <div className="flex gap-6 p-4 md:p-6">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block">
          <Navbar />
        </div>

        <div className="flex flex-1 flex-col gap-6 w-full">
          {/* Header */}
          <Header setSidebarOpen={setSidebarOpen} />

          {/* Main container */}
          <div className="flex flex-col gap-6">
            <div className="bg-white border border-gray-300 rounded-2xl shadow p-6">
              <h2 className="text-xl font-bold text-[#1F2421] mb-6">Change Password</h2>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Current Password
                  </label>
                  <input
                    type="password"
                    name="currentPassword"
                    value={formData.currentPassword}
                    onChange={handleChange}
                    className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#105588] focus:border-[#105588] transition-all duration-200"
                    placeholder="Enter your current password"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    New Password
                  </label>
                  <input
                    type="password"
                    name="newPassword"
                    value={formData.newPassword}
                    onChange={handleChange}
                    className={`w-full p-4 bg-gray-50 border rounded-2xl focus:ring-2 focus:ring-[#105588] focus:border-[#105588] transition-all duration-200 ${
                      errors.newPassword ? "border-[#FF4A08]" : "border-gray-200"
                    }`}
                    placeholder="Enter your new password"
                    required
                  />
                  {errors.newPassword && (
                    <p className="text-red-500 text-sm mt-1">{errors.newPassword}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className={`w-full p-4 bg-gray-50 border rounded-2xl focus:ring-2 focus:ring-[#105588] focus:border-[#105588] transition-all duration-200 ${
                      errors.confirmPassword ? "border-[#FF4A08]" : "border-gray-200"
                    }`}
                    placeholder="Confirm your new password"
                    required
                  />
                  {errors.confirmPassword && (
                    <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>
                  )}
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={loading || !hasValidForm()}
                    className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-semibold transition-colors duration-200 ${
                      hasValidForm() && !loading
                        ? "bg-[#105588] text-white hover:bg-[#0d4470]"
                        : "bg-gray-300 text-gray-500 cursor-not-allowed"
                    }`}
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Updating...
                      </>
                    ) : hasValidForm() ? (
                      <>
                        <Save className="w-4 h-4" />
                        Change Password
                      </>
                    ) : (
                      <>
                        <SaveOff className="w-4 h-4" />
                        Change Password
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Security Tips */}
              <div className="mt-8 p-4 bg-gray-50 rounded-2xl border border-gray-200">
                <h3 className="font-semibold text-[#1F2421] mb-2">Password Security Tips</h3>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>• Use at least 8 characters</li>
                  <li>• Include uppercase and lowercase letters</li>
                  <li>• Add numbers and special characters</li>
                  <li>• Avoid common words or personal information</li>
                  <li>• Don't reuse passwords from other accounts</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Global Message */}
      {/* Global Message Modal */}
      <ResultModal
        message={globalMessage}
        onClose={() => setGlobalMessage("")}
      />
    </div>
  )
}
