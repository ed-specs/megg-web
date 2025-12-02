"use client"

import { useState, useEffect } from "react"
import RouteGuard from "../components/RouteGuard"
import FarmInfoModal from "./components/FarmInfoModal"
import { db } from "../config/firebaseConfig"
import { doc, getDoc } from "firebase/firestore"
import { getCurrentUser, getUserAccountId } from "../utils/auth-utils"

export default function DashboardLayout({ children }) {
  const [showFarmModal, setShowFarmModal] = useState(false)
  const [checkingFarmInfo, setCheckingFarmInfo] = useState(true)

  useEffect(() => {
    checkFarmInfo()
  }, [])

  const checkFarmInfo = async () => {
    try {
      const user = getCurrentUser()
      const accountId = getUserAccountId()
      const docId = accountId || user?.uid

      if (!docId) {
        setCheckingFarmInfo(false)
        return
      }

      const userDocRef = doc(db, "users", docId)
      const userDoc = await getDoc(userDocRef)

      if (userDoc.exists()) {
        const userData = userDoc.data()
        const hasFarmName = userData.farmName && userData.farmName.trim() !== ""
        const hasFarmAddress = userData.farmAddress && userData.farmAddress.trim() !== ""

        if (!hasFarmName || !hasFarmAddress) {
          setShowFarmModal(true)
        }
      } else {
        // If user document doesn't exist, show modal
        setShowFarmModal(true)
      }
    } catch (error) {
      console.error("Error checking farm info:", error)
    } finally {
      setCheckingFarmInfo(false)
    }
  }

  return (
    <RouteGuard requiredRole="user" redirectTo="/login">
      {!checkingFarmInfo && (
        <FarmInfoModal 
          isOpen={showFarmModal} 
          onClose={() => {
            setShowFarmModal(false);
            // Re-check farm info after modal closes
            checkFarmInfo();
          }} 
        />
      )}
      {children}
    </RouteGuard>
  )
}
