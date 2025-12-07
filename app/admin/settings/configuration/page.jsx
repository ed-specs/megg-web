"use client"

import { useState, useEffect } from "react"
import { Sliders } from "lucide-react"
import { Navbar } from "../../components/NavBar"
import { Header } from "../../components/Header"
import { getGlobalConfiguration, getDefaultRanges, updateGlobalConfiguration } from "../../../utils/configurationService"
import { devLog, devError } from "../../../utils/auth-helpers"
import { createNotification } from "../../../lib/notifications/NotificationsService"
import { getUserAccountId } from "../../../utils/auth-utils"
import LoadingLogo from "../../../dashboard/components/LoadingLogo"
import { useLoadingDelay } from "../../../dashboard/components/useLoadingDelay"
import ResultModal from "../../../dashboard/components/ResultModal"
import WeightRangeEditor from "./components/WeightRangeEditor"

export default function AdminConfigurationPage() {
  const [eggRanges, setEggRanges] = useState(getDefaultRanges())
  const [loading, setLoading] = useState(true)
  const [globalMessage, setGlobalMessage] = useState("")
  const [isSidebarOpen, setSidebarOpen] = useState(false)
  const [editingRange, setEditingRange] = useState(null)
  const [lastModified, setLastModified] = useState(null)
  
  const showLoading = useLoadingDelay(loading, 500)

  // Load global configuration
  useEffect(() => {
    const loadConfiguration = async () => {
      try {
        setLoading(true)
        const globalConfig = await getGlobalConfiguration()
        
        setEggRanges(globalConfig.configuration || getDefaultRanges())
        setLastModified(globalConfig.metadata?.lastModifiedAt || null)
        
        devLog(`Global configuration loaded successfully`)
      } catch (error) {
        devError('Error loading global configuration:', error)
        setGlobalMessage("Error loading global configuration. Using default values.")
        setTimeout(() => setGlobalMessage(""), 3000)
      } finally {
        setLoading(false)
      }
    }

    loadConfiguration()
  }, [])

  const handleEditRange = (rangeType) => {
    setEditingRange(rangeType)
  }

  const handleSaveRange = async (rangeType, newRange, adjustedRange = null) => {
    try {
      const accountId = getUserAccountId()
      
      if (!accountId) {
        setGlobalMessage("Unable to identify admin user. Please log in again.")
        setTimeout(() => setGlobalMessage(""), 3000)
        return
      }

      const updatedRanges = {
        ...eggRanges,
        [rangeType]: newRange
      }

      // If smart adjustment was applied, include the adjusted range(s)
      if (adjustedRange) {
        // Ensure the primary adjusted range includes the label
        updatedRanges[adjustedRange.rangeType] = {
          ...adjustedRange.range,
          label: adjustedRange.label || eggRanges[adjustedRange.rangeType]?.label || adjustedRange.rangeType.charAt(0).toUpperCase() + adjustedRange.rangeType.slice(1)
        }
        devLog('Smart adjustment applied:', {
          targetRange: adjustedRange.rangeType,
          adjustment: updatedRanges[adjustedRange.rangeType]
        })
        
        // Handle cascading adjustments (e.g., when Small overlaps Medium and Large)
        if (adjustedRange.cascadingAdjustments && adjustedRange.cascadingAdjustments.length > 0) {
          adjustedRange.cascadingAdjustments.forEach(cascadingAdj => {
            updatedRanges[cascadingAdj.targetRange] = {
              ...cascadingAdj.adjustment,
              label: cascadingAdj.targetRangeLabel || eggRanges[cascadingAdj.targetRange]?.label || cascadingAdj.targetRange.charAt(0).toUpperCase() + cascadingAdj.targetRange.slice(1)
            }
            devLog('Cascading adjustment applied:', {
              targetRange: cascadingAdj.targetRange,
              adjustment: updatedRanges[cascadingAdj.targetRange]
            })
          })
        }
      }
      
      devLog('Saving global ranges:', updatedRanges)
      devLog('Adjusted range details:', adjustedRange ? {
        rangeType: adjustedRange.rangeType,
        range: adjustedRange.range,
        finalRange: updatedRanges[adjustedRange.rangeType]
      } : 'No adjusted range')

      // Save to global_configurations (updates global defaults for all users)
      await updateGlobalConfiguration(updatedRanges)
      
      devLog('Global configuration saved successfully to Firestore')
      
      // Get range label for notification
      const rangeLabels = {
        small: 'Small',
        medium: 'Medium',
        large: 'Large'
      }
      const rangeLabel = rangeLabels[rangeType] || rangeType
      
      // Create notification for global weight range change
      let notificationMessage
      
      // If smart adjustment was applied, create a concise combined message
      if (adjustedRange) {
        const adjustedLabel = rangeLabels[adjustedRange.rangeType] || adjustedRange.rangeType
        let rangesList = `${rangeLabel}: ${newRange.min.toFixed(2)}-${newRange.max.toFixed(2)}g, ${adjustedLabel}: ${adjustedRange.range.min.toFixed(2)}-${adjustedRange.range.max.toFixed(2)}g`
        
        // Add cascading adjustments if any
        if (adjustedRange.cascadingAdjustments && adjustedRange.cascadingAdjustments.length > 0) {
          adjustedRange.cascadingAdjustments.forEach(cascadingAdj => {
            const cascadingLabel = rangeLabels[cascadingAdj.targetRange] || cascadingAdj.targetRange
            rangesList += `, ${cascadingLabel}: ${cascadingAdj.adjustment.min.toFixed(2)}-${cascadingAdj.adjustment.max.toFixed(2)}g`
          })
        }
        
        notificationMessage = `Global ${rangesList} (auto-adjusted)`
      } else {
        notificationMessage = `Global ${rangeLabel} range updated to ${newRange.min.toFixed(2)}g - ${newRange.max.toFixed(2)}g`
      }
      
      try {
        await createNotification(
          accountId,
          notificationMessage,
          "settings_change"
        )
      } catch (notifError) {
        devError('Error creating notification:', notifError)
        // Don't block the save if notification fails
      }
      
      setEggRanges(updatedRanges)
      setEditingRange(null)
      setLastModified(new Date().toISOString())
      setGlobalMessage(adjustedRange ? "Global configuration saved with smart adjustment applied! This will affect all users." : "Global configuration has been saved successfully! This will affect all users.")
      
      setTimeout(() => setGlobalMessage(""), 3000)
    } catch (error) {
      devError('Error saving global configuration:', error)
      setGlobalMessage(error.message || "Error saving global configuration. Please check for overlaps or invalid ranges.")
      setTimeout(() => setGlobalMessage(""), 5000)
    }
  }

  const handleCancelEdit = () => {
    setEditingRange(null)
  }

  const formatDate = (dateString) => {
    if (!dateString) return "N/A"
    try {
      const date = new Date(dateString)
      return date.toLocaleString()
    } catch {
      return "N/A"
    }
  }

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
                <LoadingLogo message="Loading global configuration..." size="lg" />
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
      <div className="flex gap-4 md:gap-6 p-3 md:p-4 lg:p-6">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block">
          <Navbar />
        </div>

        <div className="flex flex-1 flex-col gap-6 w-full">
          {/* Header */}
          <Header setSidebarOpen={setSidebarOpen} />

          {/* Main container */}
          <div className="flex flex-col gap-4 md:gap-6">
            {/* Header Card */}
            <div className="bg-white rounded-2xl border border-gray-300 p-4 md:p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                <div className="min-w-0">
                  <h1 className="text-xl md:text-2xl font-bold text-gray-900">
                    Global Egg Weight Configuration
                  </h1>
                  <p className="text-gray-600 text-sm mt-1">
                    Manage global egg size classification ranges (affects all users)
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-gray-500" />
                  <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700">
                    Global
                  </span>
                </div>
              </div>
              {lastModified && (
                <div className="mt-3 text-xs text-gray-500">
                  Last modified: {formatDate(lastModified)}
                </div>
              )}
            </div>

            {/* Configuration Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
              {/* Small Eggs */}
              <div className="bg-white rounded-2xl border border-gray-300 p-4 md:p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#105588' }}>
                      <span className="text-white font-bold text-lg">S</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Small</h3>
                      <p className="text-sm text-gray-500">
                        {eggRanges.small.min.toFixed(2)}g - {eggRanges.small.max.toFixed(2)}g
                      </p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleEditRange('small')}
                  className="w-full text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  style={{ backgroundColor: '#105588' }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#0d4470'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = '#105588'}
                >
                  Edit Range
                </button>
              </div>

              {/* Medium Eggs */}
              <div className="bg-white rounded-2xl border border-gray-300 p-4 md:p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#F69664' }}>
                      <span className="text-white font-bold text-lg">M</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Medium</h3>
                      <p className="text-sm text-gray-500">
                        {eggRanges.medium.min.toFixed(2)}g - {eggRanges.medium.max.toFixed(2)}g
                      </p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleEditRange('medium')}
                  className="w-full text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  style={{ backgroundColor: '#F69664' }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#f5854a'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = '#F69664'}
                >
                  Edit Range
                </button>
              </div>

              {/* Large Eggs */}
              <div className="bg-white rounded-2xl border border-gray-300 p-4 md:p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FF4A08' }}>
                      <span className="text-white font-bold text-lg">L</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Large</h3>
                      <p className="text-sm text-gray-500">
                        {eggRanges.large.min.toFixed(2)}g - {eggRanges.large.max.toFixed(2)}g
                      </p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleEditRange('large')}
                  className="w-full text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  style={{ backgroundColor: '#FF4A08' }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#e64207'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = '#FF4A08'}
                >
                  Edit Range
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Weight Range Editor Modal */}
      {editingRange && (
        <WeightRangeEditor
          rangeType={editingRange}
          currentRange={eggRanges[editingRange]}
          allRanges={eggRanges}
          onSave={(newRange, adjustedRange = null) => handleSaveRange(editingRange, newRange, adjustedRange)}
          onCancel={handleCancelEdit}
        />
      )}

      {/* Global Message Modal */}
      <ResultModal
        message={globalMessage}
        onClose={() => setGlobalMessage("")}
      />
    </div>
  )
}
