"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Upload, Trash2, Save, SaveOff, TriangleAlert } from "lucide-react"
import Image from "next/image"
import { db, auth, storage } from "../../../config/firebaseConfig"
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from "firebase/firestore"
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage"
import { onAuthStateChanged } from "firebase/auth"
import { trackProfileChanges } from "../../../lib/notifications/ProfileChangeTracker"
import { createNotification } from "../../../lib/notifications/NotificationsService"
import { Navbar } from "../../../admin/components/NavBar"
import { Header } from "../../../admin/components/Header"
import { useRouter } from "next/navigation"
import { getCurrentUser, getStoredUser, getUserAccountId } from "../../../utils/auth-utils"
import { devLog, devError } from "../../../utils/auth-helpers"
import ImageEditor from "../../../components/ImageEditor"
import ResultModal from "../../../dashboard/components/ResultModal"
import LoadingLogo from "../../../dashboard/components/LoadingLogo"
import { useLoadingDelay } from "../../../dashboard/components/useLoadingDelay"

export default function EditProfile() {
  const [isSidebarOpen, setSidebarOpen] = useState(false)
  const [profileImage, setProfileImage] = useState("/default.png")
  const [previewImage, setPreviewImage] = useState(null)
  const [showImageEditor, setShowImageEditor] = useState(false)
  const [editedImageFile, setEditedImageFile] = useState(null)
  const [globalMessage, setGlobalMessage] = useState("")
  const [resultMessage, setResultMessage] = useState("")
  const [userData, setUserData] = useState({
    fullname: "",
    birthday: "",
    age: "",
    gender: "",
    email: "",
    phone: "",
    address: "",
    profileImageUrl: "",
  })
  const [loading, setLoading] = useState(true)
  const showLoading = useLoadingDelay(loading, 500)
  const [originalUserData, setOriginalUserData] = useState({})
  const router = useRouter()

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        console.log("=== EDIT PROFILE DEBUG ===")
        
        // Check for authenticated user (same logic as profile page)
        const user = getCurrentUser()
        const storedUser = getStoredUser()
        const accountId = getUserAccountId()

        console.log("🔍 Edit Profile: User from getCurrentUser():", user)
        console.log("🔍 Edit Profile: Stored user from getStoredUser():", storedUser)
        console.log("🔍 Edit Profile: Account ID from getUserAccountId():", accountId)

        if (!user && !storedUser) {
          console.log("❌ Edit Profile: No user data available")
          router.push("/login")
          return
        }

        // Use accountId from stored user data if available, otherwise use user.uid
        const docId = accountId || user?.uid
        
        if (!docId) {
          console.error("No user ID or account ID found")
          router.push("/login")
          return
        }

        console.log("🔍 Edit Profile: Fetching user data with ID:", docId)
        
        const userDocRef = doc(db, "users", docId)
        const userDoc = await getDoc(userDocRef)

        if (userDoc.exists()) {
          const data = userDoc.data()
          console.log("✅ Edit Profile: User data fetched from Firestore:", data)
          
          // Normalize field names and populate form
          const userDataObj = {
            fullname: data.fullName || data.fullname || data.username || "",
            birthday: data.birthday || "",
            age: data.age || "",
            gender: data.gender || "",
            email: data.email || "",
            phone: data.phone || "",
            address: data.address || "",
            profileImageUrl: data.profileImageUrl || "",
            accountId: data.accountId || accountId || docId, // Store accountId for notifications
          }
          
          console.log("📝 Edit Profile: Normalized user data for form:", userDataObj)
          
          setUserData(userDataObj)
          setOriginalUserData(userDataObj)
          setProfileImage(data.profileImageUrl || "/default.png")
        } else {
          console.log("⚠️ Edit Profile: User document not found, trying fallbacks...")
          
          // Use stored user data as fallback
          if (storedUser) {
            const fallbackData = {
              fullname: storedUser.fullName || storedUser.fullname || storedUser.username || "",
              birthday: "",
              age: "",
              gender: "",
              email: storedUser.email || "",
              phone: storedUser.phone || "",
              address: "",
              profileImageUrl: "",
            }
            
            console.log("🔄 Edit Profile: Using stored user data as fallback:", fallbackData)
            
            setUserData(fallbackData)
            setOriginalUserData(fallbackData)
            setProfileImage("/default.png")
          } else {
            setGlobalMessage("Unable to load profile data. Please try again.")
          }
        }
      } catch (error) {
        console.error("❌ Edit Profile: Error fetching user data:", error)
        setGlobalMessage("Error loading profile data")
      } finally {
        setLoading(false)
      }
    }

    fetchUserData()
  }, [router])

  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target
    setUserData((prev) => ({ ...prev, [name]: value }))
  }, [])

  const handleOpenImageEditor = useCallback(() => {
    setShowImageEditor(true)
  }, [])

  const handleImageEditorSave = useCallback((editedFile) => {
    setEditedImageFile(editedFile)
    
    // Create preview from edited file
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreviewImage(e.target.result)
      setShowImageEditor(false)
      console.log("✅ Edit Profile: Image edited and preview updated")
    }
    reader.readAsDataURL(editedFile)
  }, [])

  const handleImageEditorCancel = useCallback(() => {
    setShowImageEditor(false)
  }, [])

  const uploadImageToStorage = useCallback(async (file) => {
    try {
      const user = getCurrentUser()
      const storedUser = getStoredUser()
      const accountId = getUserAccountId()
      
      if (!user && !storedUser) throw new Error("No authenticated user")

      // Use Firebase UID for storage path (storage structure uses UID)
      // But use Account ID for document reference
      const storageUid = user?.uid || accountId
      const docId = accountId || user?.uid
      
      console.log("📤 Edit Profile: Starting upload for storage UID:", storageUid, "document ID:", docId)
      console.log("📤 Edit Profile: File details:", {
        name: file.name,
        size: (file.size / 1024 / 1024).toFixed(2) + "MB",
        type: file.type
      })

      // Create unique filename to avoid conflicts
      const timestamp = Date.now()
      const fileExtension = file.name.split('.').pop()
      const fileName = `profile_${timestamp}.${fileExtension}`
      
      const imageRef = ref(storage, `profile-images/${storageUid}/${fileName}`)
      
      console.log("📤 Edit Profile: Uploading to path:", `profile-images/${storageUid}/${fileName}`)
      
      // Upload the file
      const uploadResult = await uploadBytes(imageRef, file)
      console.log("✅ Edit Profile: Upload completed, getting download URL...")
      
      // Get the download URL
      const downloadURL = await getDownloadURL(uploadResult.ref)
      console.log("✅ Edit Profile: Download URL obtained:", downloadURL)
      
      return downloadURL
    } catch (error) {
      console.error("❌ Edit Profile: Error uploading image:", error)
      
      // Provide more specific error messages
      if (error.code === 'storage/unauthorized') {
        throw new Error("You don't have permission to upload images. Please check your authentication.")
      } else if (error.code === 'storage/canceled') {
        throw new Error("Upload was canceled. Please try again.")
      } else if (error.code === 'storage/unknown') {
        throw new Error("An unknown error occurred during upload. Please try again.")
      } else {
        throw new Error(`Upload failed: ${error.message}`)
      }
    }
  }, [])

  const handleSaveImage = useCallback(async () => {
    try {
      if (!previewImage || !editedImageFile) {
        setGlobalMessage("No image to save. Please upload and edit an image first.")
        return
      }

      setLoading(true)
      
      // Get correct document ID (same logic as data fetching)
      const user = getCurrentUser()
      const storedUser = getStoredUser()
      const accountId = getUserAccountId()
      
      if (!user && !storedUser) {
        setGlobalMessage("No authenticated user found")
        return
      }

      // Use accountId from stored user data if available, otherwise use user.uid
      const docId = accountId || user?.uid
      
      if (!docId) {
        setGlobalMessage("Unable to identify user document")
        return
      }

      console.log("💾 Edit Profile: Saving image to document ID:", docId)

      // Declare notificationAccountId for use throughout the function
      const notificationAccountId = accountId || docId

      // Handle image upload
      console.log("📷 Edit Profile: Processing edited image upload...")
      setGlobalMessage("Uploading image...")
      
      try {
        const imageUrl = await uploadImageToStorage(editedImageFile)
        
        // Get old profile image URL for comparison
        const oldProfileImageUrl = userData.profileImageUrl || originalUserData.profileImageUrl || ""
        
        // Update only the profile image URL
        const userDocRef = doc(db, "users", docId)
        await updateDoc(userDocRef, { profileImageUrl: imageUrl })

        // Create notification for profile image change
        try {
          if (!oldProfileImageUrl && imageUrl) {
            // Profile picture added
            await createNotification(notificationAccountId, "You've added a new profile picture", "profile_image_added")
          } else if (oldProfileImageUrl && imageUrl) {
            // Profile picture updated
            await createNotification(notificationAccountId, "You've updated your profile picture", "profile_image_updated")
          }
        } catch (notifError) {
          console.error("Error creating profile image notification:", notifError)
          // Don't block the save if notification fails
        }

        // Update local state
        setProfileImage(imageUrl)
        setUserData((prev) => ({ ...prev, profileImageUrl: imageUrl }))
        setOriginalUserData((prev) => ({ ...prev, profileImageUrl: imageUrl }))
        setPreviewImage(null)
        setEditedImageFile(null)
        
        console.log("✅ Edit Profile: Image upload completed successfully")
        
        setGlobalMessage("Profile image updated successfully!")

        // Clear message after 3 seconds
        setTimeout(() => setGlobalMessage(""), 3000)
      } catch (uploadError) {
        console.error("❌ Edit Profile: Image upload failed:", uploadError)
        setGlobalMessage(`Image upload failed: ${uploadError.message}`)
      }
    } catch (error) {
      console.error("❌ Edit Profile: Error updating profile image:", error)
      setGlobalMessage("Error updating profile image. Please try again.")
    } finally {
      setLoading(false)
    }
  }, [previewImage, editedImageFile, userData, originalUserData, uploadImageToStorage])

  const handleSaveFields = useCallback(async () => {
    try {
      setLoading(true)
      
      // Get correct document ID (same logic as data fetching)
      const user = getCurrentUser()
      const storedUser = getStoredUser()
      const accountId = getUserAccountId()
      
      if (!user && !storedUser) {
        setGlobalMessage("No authenticated user found")
        return
      }

      // Use accountId from stored user data if available, otherwise use user.uid
      const docId = accountId || user?.uid
      
      if (!docId) {
        setGlobalMessage("Unable to identify user document")
        return
      }

      console.log("💾 Edit Profile: Saving fields to document ID:", docId)

      // Prepare user data without profileImageUrl (only save fields)
      const { profileImageUrl, accountId: userAccountId, ...fieldsData } = userData

      // Update user document using correct document ID
      const userDocRef = doc(db, "users", docId)
      await updateDoc(userDocRef, fieldsData)

      // Track profile changes for notifications (use accountId if available, otherwise use docId)
      const { profileImageUrl: originalImageUrl, accountId: originalAccountId, ...originalFieldsData } = originalUserData
      const notificationAccountId = accountId || userAccountId || originalAccountId || docId
      
      console.log("🔔 Edit Profile: Tracking profile changes...")
      console.log("   Account ID:", notificationAccountId)
      console.log("   Original data:", originalFieldsData)
      console.log("   New data:", fieldsData)
      
      try {
        await trackProfileChanges(notificationAccountId, originalFieldsData, fieldsData)
        console.log("✅ Edit Profile: Profile changes tracked successfully")
      } catch (notifError) {
        console.error("❌ Edit Profile: Error tracking profile changes:", notifError)
        // Don't block the save if notification fails
      }

      setOriginalUserData(userData)
      
      setGlobalMessage("Profile information updated successfully!")

      // Clear message after 3 seconds
      setTimeout(() => setGlobalMessage(""), 3000)
    } catch (error) {
      console.error("❌ Edit Profile: Error updating profile:", error)
      setGlobalMessage("Error updating profile. Please try again.")
    } finally {
      setLoading(false)
    }
  }, [userData, originalUserData])

  const handleRemoveImage = useCallback(async () => {
    try {
      setLoading(true)
      
      // Get correct document ID (same logic as data fetching)
      const user = getCurrentUser()
      const storedUser = getStoredUser()
      const accountId = getUserAccountId()
      
      if (!user && !storedUser) return

      // Use accountId from stored user data if available, otherwise use user.uid
      const docId = accountId || user?.uid
      
      if (!docId) {
        setGlobalMessage("Unable to identify user document")
        return
      }

      console.log("🗑️ Edit Profile: Removing image from document ID:", docId)

      // Delete from storage if exists (use Firebase UID for storage path)
      if (userData.profileImageUrl && userData.profileImageUrl !== "/default.png") {
        try {
          // Use Firebase UID for storage path (storage structure uses UID)
          const storageUid = user?.uid || docId
          const imageRef = ref(storage, `profile-images/${storageUid}`)
          await deleteObject(imageRef)
        } catch (error) {
          console.log("Image not found in storage or already deleted")
        }
      }

      // Update user document using correct document ID
      const userDocRef = doc(db, "users", docId)
      await updateDoc(userDocRef, { profileImageUrl: "" })

      setUserData((prev) => ({ ...prev, profileImageUrl: "" }))
      setProfileImage("/default.png")
      setPreviewImage(null)
      
      setGlobalMessage("Profile image removed successfully!")

      // Clear message after 3 seconds
      setTimeout(() => setGlobalMessage(""), 3000)
    } catch (error) {
      console.error("❌ Edit Profile: Error removing image:", error)
      setGlobalMessage("Error removing image. Please try again.")
    } finally {
      setLoading(false)
    }
  }, [userData])


  const hasImageChanges = useMemo(() => {
    return previewImage !== null && editedImageFile !== null
  }, [previewImage, editedImageFile])

  const hasFieldChanges = useMemo(() => {
    // Compare fields only (excluding profileImageUrl)
    const { profileImageUrl: currentImage, ...currentFields } = userData
    const { profileImageUrl: originalImage, ...originalFields } = originalUserData
    return JSON.stringify(currentFields) !== JSON.stringify(originalFields)
  }, [userData, originalUserData])

  if (showLoading) {
    return (
      <div className="min-h-screen container mx-auto text-[#1F2421] relative">
        <div className="flex gap-6 p-4 md:p-6">
          <div className="hidden lg:block">
            <Navbar />
          </div>
          <div className="flex flex-1 flex-col gap-6 w-full">
            <Header setSidebarOpen={() => {}} />
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <LoadingLogo message="Loading profile..." size="lg" />
              </div>
            </div>
          </div>
        </div>
      </div>
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

            <div className="flex flex-1 flex-col gap-4 md:gap-6 w-full min-w-0">
            {/* Header */}
            <Header setSidebarOpen={setSidebarOpen} />

            {/* Main container */}
            <div className="flex flex-col gap-4 md:gap-6">
            {/* Header Card */}
            <div className="bg-white rounded-2xl border border-gray-300 p-4 md:p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                <div className="min-w-0">
                  <h1 className="text-xl md:text-2xl font-bold text-gray-900">
                    Edit Profile
                  </h1>
                  <p className="text-gray-600 text-sm mt-1">
                    Update your personal information
                  </p>
                </div>
              </div>
            </div>

            {/* Profile Image Section */}
            <div className="bg-white border border-gray-300 rounded-2xl shadow p-4 md:p-6">
              <h2 className="text-lg md:text-xl font-bold text-[#1F2421] mb-4 md:mb-6">Profile Picture</h2>
              <div className="flex flex-col lg:flex-row items-center gap-8">
                <div className="relative">
                  <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-lg">
                    {/* Show preview image if available */}
                    {previewImage ? (
                      <Image
                        key={`preview-${previewImage}`}
                        src={previewImage}
                        alt="Profile Preview"
                        fill
                        className="object-cover rounded-full"
                        style={{ objectFit: 'cover', objectPosition: 'center' }}
                        unoptimized
                        onError={(e) => {
                          e.target.style.display = 'none';
                          const letterAvatar = e.target.nextElementSibling;
                          if (letterAvatar) letterAvatar.style.display = 'flex';
                        }}
                      />
                    ) : profileImage && profileImage !== "/default.png" ? (
                      <Image
                        key={`profile-${profileImage}`}
                        src={profileImage}
                        alt="Profile"
                        fill
                        className="object-cover rounded-full"
                        style={{ objectFit: 'cover', objectPosition: 'center' }}
                        unoptimized
                        onError={(e) => {
                          e.target.style.display = 'none';
                          const letterAvatar = e.target.nextElementSibling;
                          if (letterAvatar) letterAvatar.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    {/* Letter Avatar - shown when no profile image */}
                    <div 
                      className={`absolute inset-0 rounded-full bg-[#105588] flex items-center justify-center ${
                        (previewImage || (profileImage && profileImage !== "/default.png")) ? 'hidden' : 'flex'
                      }`}
                    >
                      <span className="text-white text-4xl font-bold">
                        {(userData?.fullname || "U").charAt(0).toUpperCase()}
                      </span>
                    </div>
                  </div>
                  {previewImage && (
                    <div className="absolute -top-2 -right-2 bg-[#105588] text-white rounded-full p-2 shadow-lg">
                      {editedImageFile ? (
                        <Save className="w-4 h-4" />
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-4">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={handleOpenImageEditor}
                      className="flex items-center gap-2 px-6 py-3 bg-[#105588] text-white rounded-2xl hover:bg-[#0d4470] transition-colors duration-200 font-semibold"
                      disabled={loading}
                    >
                      <Upload className="w-5 h-5" />
                      {previewImage ? 'Change Image' : 'Upload Image'}
                    </button>

                    {(profileImage !== "/default.png" || previewImage) && (
                      <button
                        onClick={handleRemoveImage}
                        className="flex items-center gap-2 px-6 py-3 bg-[#FF4A08] text-white rounded-2xl hover:bg-[#F69664] transition-colors duration-200 font-semibold"
                        disabled={loading}
                      >
                        <Trash2 className="w-5 h-5" />
                        Remove
                      </button>
                    )}
                  </div>
                  
                  {/* Save Image Button */}
                  {hasImageChanges && (
                    <button
                      onClick={handleSaveImage}
                      disabled={loading}
                      className={`flex items-center justify-center gap-3 px-6 py-3 rounded-2xl font-semibold transition-colors duration-200 ${
                        !loading
                          ? "bg-[#105588] text-white hover:bg-[#0d4470] focus:outline-none focus:ring-4 focus:ring-[#105588]/30"
                          : "bg-gray-300 text-gray-500 cursor-not-allowed"
                      }`}
                    >
                      {loading ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                          Saving Image...
                        </>
                      ) : (
                        <>
                          <Save className="w-5 h-5" />
                          Save Profile Image
                        </>
                      )}
                    </button>
                  )}
                  
                  <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-xl border border-gray-200">
                    💡 <strong>Tip:</strong> Use a square image, at least 200x200px for best results
                  </p>
                </div>
              </div>
            </div>

            {/* Profile Information */}
            <div className="bg-white border border-gray-300 rounded-2xl shadow p-4 md:p-6">
              <h2 className="text-lg md:text-xl font-bold text-[#1F2421] mb-4 md:mb-6">Personal Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-[#1F2421] mb-3">
                    Full Name
                  </label>
                  <input
                    type="text"
                    name="fullname"
                    value={userData.fullname}
                    onChange={handleInputChange}
                    className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-[#105588] focus:border-[#105588] transition-all duration-200 text-gray-800"
                    placeholder="Enter your full name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#1F2421] mb-3">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={userData.email}
                    readOnly
                    disabled
                    className="w-full p-4 bg-gray-100 rounded-2xl border border-gray-200 text-gray-500 cursor-not-allowed"
                    placeholder="Enter your email"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Email cannot be changed. Contact support if you need to update your email address.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#1F2421] mb-3">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={userData.phone}
                    onChange={handleInputChange}
                    className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-[#105588] focus:border-[#105588] transition-all duration-200 text-gray-800"
                    placeholder="Enter your phone number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#1F2421] mb-3">
                    Birthday
                  </label>
                  <input
                    type="date"
                    name="birthday"
                    value={userData.birthday}
                    onChange={handleInputChange}
                    className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-[#105588] focus:border-[#105588] transition-all duration-200 text-gray-800"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#1F2421] mb-3">
                    Age
                  </label>
                  <input
                    type="number"
                    name="age"
                    value={userData.age}
                    onChange={handleInputChange}
                    className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-[#105588] focus:border-[#105588] transition-all duration-200 text-gray-800"
                    placeholder="Enter your age"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#1F2421] mb-3">
                    Gender
                  </label>
                  <select
                    name="gender"
                    value={userData.gender}
                    onChange={handleInputChange}
                    className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-[#105588] focus:border-[#105588] transition-all duration-200 text-gray-800"
                  >
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                    <option value="prefer-not-to-say">Prefer not to say</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-[#1F2421] mb-3">
                    Address
                  </label>
                  <textarea
                    name="address"
                    value={userData.address}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-[#105588] focus:border-[#105588] transition-all duration-200 text-gray-800 resize-none"
                    placeholder="Enter your address"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row justify-end gap-4 mt-8">
                <button
                  onClick={() => router.push("/admin/profile")}
                  className="flex items-center gap-3 px-6 py-3 rounded-2xl font-semibold bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors duration-200"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Cancel
                </button>
                
                <button
                  onClick={handleSaveFields}
                  disabled={loading || !hasFieldChanges}
                  className={`flex items-center gap-3 px-6 py-3 rounded-2xl font-semibold transition-colors duration-200 ${
                    hasFieldChanges && !loading
                      ? "bg-[#105588] text-white hover:bg-[#0d4470] focus:outline-none focus:ring-4 focus:ring-[#105588]/30"
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                      Saving Changes...
                    </>
                  ) : hasFieldChanges ? (
                    <>
                      <Save className="w-5 h-5" />
                      Save Profile Information
                    </>
                  ) : (
                    <>
                      <SaveOff className="w-5 h-5" />
                      No Changes
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Global Message Modal */}
      <ResultModal
        message={globalMessage}
        onClose={() => setGlobalMessage("")}
      />

      {/* Image Editor Modal */}
      <ImageEditor
        imageSrc={profileImage}
        isOpen={showImageEditor}
        onSave={handleImageEditorSave}
        onCancel={handleImageEditorCancel}
      />

      {/* Result Modal */}
      {resultMessage && (
        <ResultModal
          message={resultMessage}
          onClose={() => setResultMessage("")}
        />
      )}
    </div>
  )
}
