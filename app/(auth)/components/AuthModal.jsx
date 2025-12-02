"use client"

import { useEffect } from 'react'
import { X } from 'lucide-react'

/**
 * AuthModal - Reusable modal component for authentication pages
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
export default function AuthModal({
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
    
    if (lowerMessage.includes('success') || lowerMessage.includes('created') || lowerMessage.includes('verified') || lowerMessage.includes('updated') || lowerMessage.includes('sent')) {
      return 'success'
    }
    
    if (lowerMessage.includes('error') || lowerMessage.includes('failed') || lowerMessage.includes('invalid') || lowerMessage.includes('expired') || lowerMessage.includes('taken')) {
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
      bg: 'bg-gradient-to-br from-green-400 to-green-600',
      icon: (
        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      )
    },
    error: {
      bg: 'bg-gradient-to-br from-red-400 to-red-600',
      icon: (
        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      )
    },
    warning: {
      bg: 'bg-gradient-to-br from-[#ff4a08] to-[#f69664]',
      icon: (
        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    info: {
      bg: 'bg-gradient-to-br from-[#105588] to-[#0d4470]',
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

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    if (message) {
      document.addEventListener('keydown', handleEscape)
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [message, onClose])

  if (!message) return null

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300"
      onClick={(e) => {
        // Close when clicking backdrop
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-8 max-w-lg w-full mx-4 shadow-2xl border border-white/20 transform animate-in fade-in duration-300 scale-95 relative">
        {/* Close Button */}
        {showCloseButton && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-gray-700"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className={`w-16 h-16 ${iconConfig.bg} rounded-full flex items-center justify-center shadow-lg`}>
            {iconConfig.icon}
          </div>
        </div>

        {/* Message Content */}
        <div className="text-center mb-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-3">
            {modalTitle}
          </h3>
          <p className="text-gray-700 leading-relaxed text-base whitespace-pre-line">
            {message}
          </p>
        </div>

        {/* Action Button */}
        <button
          onClick={handleButtonClick}
          className="w-full bg-gradient-to-r from-[#105588] to-[#0d4470] text-white py-4 px-6 rounded-2xl hover:from-[#0d4470] hover:to-[#0a3a5c] focus:outline-none focus:ring-4 focus:ring-[#105588]/30 transition-all duration-300 font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center group"
        >
          <span>{buttonText}</span>
        </button>
      </div>
    </div>
  )
}

