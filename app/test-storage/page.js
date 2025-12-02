"use client"

import { useState } from "react"
import { storage } from "../config/firebaseConfig"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { getCurrentUser } from "../utils/auth-utils"

export default function TestStoragePage() {
  const [result, setResult] = useState("")
  const [loading, setLoading] = useState(false)

  const testStoragePermissions = async () => {
    try {
      setLoading(true)
      setResult("Testing Firebase Storage permissions...")

      const user = getCurrentUser()
      if (!user) {
        setResult("❌ No authenticated user found")
        return
      }

      console.log("Testing storage with user:", user.uid)

      // Create a small test file
      const testContent = "test-image-upload"
      const testFile = new Blob([testContent], { type: 'text/plain' })
      
      // Try to upload to storage
      const testRef = ref(storage, `test-uploads/${user.uid}/test.txt`)
      
      setResult("📤 Uploading test file...")
      const uploadResult = await uploadBytes(testRef, testFile)
      
      setResult("✅ Upload successful! Getting download URL...")
      const downloadURL = await getDownloadURL(uploadResult.ref)
      
      setResult(`✅ Storage test successful!\n\nUpload path: test-uploads/${user.uid}/test.txt\nDownload URL: ${downloadURL}`)
      
    } catch (error) {
      console.error("Storage test error:", error)
      setResult(`❌ Storage test failed:\n\nError: ${error.message}\nCode: ${error.code || 'unknown'}`)
    } finally {
      setLoading(false)
    }
  }

  const testImageUpload = async (file) => {
    try {
      setLoading(true)
      setResult("Testing image upload...")

      const user = getCurrentUser()
      if (!user) {
        setResult("❌ No authenticated user found")
        return
      }

      // Validate file
      if (!file.type.startsWith('image/')) {
        setResult("❌ Please select an image file")
        return
      }

      console.log("Testing image upload:", file.name, file.type, file.size)

      const timestamp = Date.now()
      const fileExtension = file.name.split('.').pop()
      const fileName = `test_${timestamp}.${fileExtension}`
      
      const imageRef = ref(storage, `test-images/${user.uid}/${fileName}`)
      
      setResult("📤 Uploading image...")
      const uploadResult = await uploadBytes(imageRef, file)
      
      setResult("✅ Image upload successful! Getting download URL...")
      const downloadURL = await getDownloadURL(uploadResult.ref)
      
      setResult(`✅ Image upload test successful!\n\nFile: ${fileName}\nSize: ${(file.size / 1024 / 1024).toFixed(2)}MB\nDownload URL: ${downloadURL}`)
      
    } catch (error) {
      console.error("Image upload test error:", error)
      setResult(`❌ Image upload test failed:\n\nError: ${error.message}\nCode: ${error.code || 'unknown'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-gray-900">Firebase Storage Test</h1>
        
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Storage Permissions Test</h2>
          <button 
            onClick={testStoragePermissions}
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Testing..." : "Test Storage Permissions"}
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Image Upload Test</h2>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files[0]
              if (file) testImageUpload(file)
            }}
            disabled={loading}
            className="mb-4 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          <p className="text-sm text-gray-600">Select an image to test upload functionality</p>
        </div>
        
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Test Results</h2>
          <pre className="bg-gray-100 p-4 rounded-lg overflow-auto text-sm whitespace-pre-wrap">
            {result || "No tests run yet"}
          </pre>
        </div>
      </div>
    </div>
  )
}
