"use client"

import { useEffect, useState } from 'react'
import DashboardModal from './DashboardModal'

/**
 * FieldModal - Reusable modal component for editing form fields in dashboard
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal is open
 * @param {Function} props.onClose - Function to call when modal is closed
 * @param {string} props.title - Modal title
 * @param {string} props.fieldLabel - Label for the field
 * @param {string} props.fieldValue - Current value of the field
 * @param {Function} props.onSave - Function to call when save is clicked (receives new value)
 * @param {string} props.fieldType - Input type: 'text' | 'email' | 'tel' | 'textarea' | 'number' | 'date' | 'select' (default: 'text')
 * @param {Array} props.selectOptions - Options for select type (array of {value, label})
 * @param {Function} props.validate - Optional validation function (returns error message or null)
 * @param {string} props.placeholder - Placeholder text
 * @param {boolean} props.required - Whether the field is required
 * @param {string} props.saveButtonText - Custom save button text (default: "Save")
 * @param {string} props.cancelButtonText - Custom cancel button text (default: "Cancel")
 * @param {boolean} props.isLoading - Show loading state on save button
 */
export default function FieldModal({
  isOpen,
  onClose,
  title,
  fieldLabel,
  fieldValue = "",
  onSave,
  fieldType = "text",
  selectOptions = [],
  validate = null,
  placeholder = "",
  required = false,
  saveButtonText = "Save",
  cancelButtonText = "Cancel",
  isLoading = false
}) {
  const [value, setValue] = useState(fieldValue)
  const [error, setError] = useState("")

  // Reset value when modal opens/closes or fieldValue changes
  useEffect(() => {
    if (isOpen) {
      setValue(fieldValue)
      setError("")
    }
  }, [isOpen, fieldValue])

  const handleCancel = () => {
    setValue(fieldValue)
    setError("")
    onClose()
  }

  const handleSave = () => {
    // Validate required field
    if (required && !value.trim()) {
      setError(`${fieldLabel} is required`)
      return
    }

    // Run custom validation if provided
    if (validate) {
      const validationError = validate(value)
      if (validationError) {
        setError(validationError)
        return
      }
    }

    // Clear error and save
    setError("")
    onSave(value)
  }

  const handleInputChange = (e) => {
    const newValue = e.target.value
    setValue(newValue)
    
    // Clear error when user starts typing
    if (error) {
      setError("")
    }
  }

  return (
    <DashboardModal
      isOpen={isOpen}
      onClose={handleCancel}
      title={title}
      size="md"
    >

        {/* Field */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-[#105588] mb-3">
            {fieldLabel}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
          
          {fieldType === 'textarea' ? (
            <textarea
              value={value}
              onChange={handleInputChange}
              placeholder={placeholder}
              rows={4}
              className={`w-full p-4 bg-gray-50 rounded-2xl border ${
                error ? 'border-red-500' : 'border-gray-200'
              } focus:ring-2 focus:ring-[#105588] focus:border-[#105588] transition-all duration-200 text-gray-800 resize-none`}
              disabled={isLoading}
            />
          ) : fieldType === 'select' ? (
            <select
              value={value}
              onChange={handleInputChange}
              className={`w-full p-4 bg-gray-50 rounded-2xl border ${
                error ? 'border-red-500' : 'border-gray-200'
              } focus:ring-2 focus:ring-[#105588] focus:border-[#105588] transition-all duration-200 text-gray-800`}
              disabled={isLoading}
            >
              <option value="">Select {fieldLabel.toLowerCase()}</option>
              {selectOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              type={fieldType}
              value={value}
              onChange={handleInputChange}
              placeholder={placeholder}
              className={`w-full p-4 bg-gray-50 rounded-2xl border ${
                error ? 'border-red-500' : 'border-gray-200'
              } focus:ring-2 focus:ring-[#105588] focus:border-[#105588] transition-all duration-200 text-gray-800`}
              disabled={isLoading}
            />
          )}

          {/* Error Message */}
          {error && (
            <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-end gap-4 mt-6">
          <button
            onClick={handleCancel}
            disabled={isLoading}
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-2xl hover:bg-gray-300 transition-colors duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cancelButtonText}
          </button>
          
          <button
            onClick={handleSave}
            disabled={isLoading || (required && !value.trim())}
            className="px-6 py-3 bg-[#105588] text-white rounded-2xl hover:bg-[#0d4470] transition-colors duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                Saving...
              </>
            ) : (
              saveButtonText
            )}
          </button>
        </div>
    </DashboardModal>
  )
}

