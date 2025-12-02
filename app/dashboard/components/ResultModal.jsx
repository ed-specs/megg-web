"use client"

import DashboardModal from './DashboardModal'

/**
 * ResultModal - Reusable result modal component for dashboard pages
 * Displays success, error, warning, or info messages
 * 
 * @param {Object} props
 * @param {string} props.message - The message to display
 * @param {string} props.type - Optional: 'success' | 'error' | 'warning' | 'info'. Auto-detected from message if not provided
 * @param {Function} props.onClose - Function to call when modal is closed
 * @param {string} props.title - Optional: Custom title. Auto-generated if not provided
 * @param {string} props.buttonText - Optional: Custom button text (default: "Got it")
 * @param {Function} props.onButtonClick - Optional: Custom button action (default: calls onClose)
 * @param {boolean} props.showCloseButton - Optional: Show X button in top right (default: true)
 */
export default function ResultModal({
  message,
  type = null,
  onClose,
  title = null,
  buttonText = "Got it",
  onButtonClick = null,
  showCloseButton = true
}) {
  // Auto-detect type from message if not provided
  const detectType = () => {
    if (type) return type
    
    const lowerMessage = message?.toLowerCase() || ''
    
    if (lowerMessage.includes('success') || lowerMessage.includes('created') || lowerMessage.includes('verified') || lowerMessage.includes('updated') || lowerMessage.includes('saved') || lowerMessage.includes('sent')) {
      return 'success'
    }
    
    if (lowerMessage.includes('error') || lowerMessage.includes('failed') || lowerMessage.includes('invalid') || lowerMessage.includes('expired') || lowerMessage.includes('taken') || lowerMessage.includes('denied')) {
      return 'error'
    }
    
    if (lowerMessage.includes('verify') || lowerMessage.includes('check') || lowerMessage.includes('attention') || lowerMessage.includes('warning')) {
      return 'warning'
    }
    
    return 'info'
  }

  // Auto-generate title if not provided
  const getTitle = () => {
    if (title) return title
    
    const detectedType = detectType()
    const titles = {
      success: 'Success!',
      error: 'Error',
      warning: 'Attention',
      info: 'Information'
    }
    return titles[detectedType] || 'Information'
  }

  const modalType = detectType()
  const modalTitle = getTitle()

  // Icon configurations
  const iconConfigs = {
    success: {
      bg: 'bg-[#105588]',
      icon: (
        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      )
    },
    error: {
      bg: 'bg-[#FF4A08]',
      icon: (
        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      )
    },
    warning: {
      bg: 'bg-[#F69664]',
      icon: (
        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    info: {
      bg: 'bg-[#105588]',
      icon: (
        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    }
  }

  const iconConfig = iconConfigs[modalType] || iconConfigs.info

  // Handle button click
  const handleButtonClick = () => {
    if (onButtonClick) {
      onButtonClick()
    } else {
      onClose()
    }
  }

  if (!message) return null

  return (
    <DashboardModal
      isOpen={!!message}
      onClose={onClose}
      title={modalTitle}
      size="lg"
      showCloseButton={showCloseButton}
    >
      {/* Icon */}
      <div className="flex justify-center mb-6">
        <div className={`w-16 h-16 ${iconConfig.bg} rounded-full flex items-center justify-center shadow-lg`}>
          {iconConfig.icon}
        </div>
      </div>

      {/* Message Content */}
      <div className="text-center mb-8">
        <p className="text-gray-700 leading-relaxed text-base whitespace-pre-line">
          {message}
        </p>
      </div>

      {/* Action Button */}
      <button
        onClick={handleButtonClick}
        className="w-full bg-[#105588] text-white py-3 px-6 rounded-2xl hover:bg-[#0d4470] focus:outline-none focus:ring-4 focus:ring-[#105588]/30 transition-all duration-200 font-semibold"
      >
        {buttonText}
      </button>
    </DashboardModal>
  )
}

