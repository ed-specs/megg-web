"use client"

import { useState, useRef } from 'react'
import { Upload, X, Save } from 'lucide-react'
import Image from 'next/image'

export default function ImageEditor({ 
  imageSrc, 
  onSave, 
  onCancel, 
  isOpen 
}) {
  const [selectedFile, setSelectedFile] = useState(null)
  const [preview, setPreview] = useState(imageSrc || null)
  const fileInputRef = useRef(null)

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file')
        return
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size must be less than 5MB')
        return
      }

      setSelectedFile(file)
      
      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSave = () => {
    if (selectedFile) {
      onSave(selectedFile)
    } else {
      onCancel()
    }
  }

  const handleCancel = () => {
    setSelectedFile(null)
    setPreview(imageSrc || null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    onCancel()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#105588] to-[#0d4470] text-white p-6 rounded-t-3xl">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Upload Profile Picture</h2>
            <button
              onClick={handleCancel}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Preview Area */}
          <div className="mb-6">
            <div className="relative w-48 h-48 mx-auto rounded-full overflow-hidden border-4 border-gray-200 shadow-lg">
              {preview ? (
                <Image
                  src={preview}
                  alt="Profile Preview"
                  fill
                  className="object-cover rounded-full"
                  style={{ objectFit: 'cover', objectPosition: 'center' }}
                  unoptimized
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                  <Upload className="w-12 h-12 text-gray-400" />
                </div>
              )}
            </div>
          </div>

          {/* File Input */}
          <div className="mb-6">
            <label className="block">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <div className="w-full px-4 py-3 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-[#105588] transition-colors text-center">
                <Upload className="w-6 h-6 mx-auto mb-2 text-gray-400" />
                <span className="text-sm text-gray-600">
                  {selectedFile ? selectedFile.name : 'Click to select image'}
                </span>
                <p className="text-xs text-gray-500 mt-1">
                  PNG, JPG up to 5MB
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-6 bg-gray-50 border-t border-gray-200 rounded-b-3xl">
          <div className="flex justify-end gap-4">
            <button
              onClick={handleCancel}
              className="px-6 py-3 bg-gray-500 text-white rounded-2xl hover:bg-gray-600 transition-colors font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!selectedFile}
              className="px-6 py-3 bg-gradient-to-r from-[#105588] to-[#0d4470] text-white rounded-2xl hover:from-[#0d4470] hover:to-[#0a3a5c] focus:outline-none focus:ring-4 focus:ring-[#105588]/30 transition-all duration-300 font-semibold flex items-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              <Save className="w-5 h-5" />
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
