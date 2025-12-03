/**
 * Shared authentication helper functions
 */

const isDevelopment = process.env.NODE_ENV === 'development'

/**
 * Send verification email to user
 * @param {string} email - User's email address
 * @param {string} otp - One-time password
 * @returns {Promise<Object>} - Result from API
 */
export const sendVerificationEmail = async (email, otp) => {
  try {
    const response = await fetch("/api/send-verification", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, otp }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMessage = errorData.error || `HTTP ${response.status}: Failed to send verification email`
      throw new Error(errorMessage)
    }

    const result = await response.json()
    
    if (isDevelopment) {
      console.log("Verification email sent successfully:", result)
    }
    
    return result
  } catch (error) {
    if (isDevelopment) {
      console.error("Error sending verification email:", error)
    }
    
    // Provide more specific error messages
    if (error.message.includes('EAUTH')) {
      throw new Error("Email authentication failed. Please check email configuration.")
    } else if (error.message.includes('SMTP')) {
      throw new Error("Email server connection failed. Please try again later.")
    } else if (error.message.includes('Invalid email')) {
      throw new Error("Invalid email address format.")
    } else {
      throw new Error(error.message || "Failed to send verification email")
    }
  }
}

/**
 * Safe console log - only logs in development
 * @param {string} message - Message to log
 * @param  {...any} args - Additional arguments
 */
export const devLog = (message, ...args) => {
  if (isDevelopment) {
    console.log(message, ...args)
  }
}

/**
 * Safe console error - only logs in development
 * @param {string} message - Error message
 * @param  {...any} args - Additional arguments
 */
export const devError = (message, ...args) => {
  if (isDevelopment) {
    console.error(message, ...args)
  }
}

