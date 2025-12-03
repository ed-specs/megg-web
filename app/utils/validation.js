/**
 * Shared validation utilities for auth forms
 */

/**
 * Email validation regex
 * More comprehensive than simple \S+@\S+\.\S+
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Validate email address
 * @param {string} email - Email to validate
 * @returns {boolean} - True if valid
 */
export const validateEmail = (email) => {
  if (!email) return false
  return EMAIL_REGEX.test(email)
}

/**
 * Get email validation error message
 * @param {string} email - Email to validate
 * @returns {string} - Error message or empty string
 */
export const getEmailError = (email) => {
  if (!email) return "Email is required."
  if (!validateEmail(email)) return "Please enter a valid email address."
  return ""
}

/**
 * Validate phone number
 * @param {string} phone - Phone number to validate
 * @returns {boolean} - True if valid
 */
export const validatePhone = (phone) => {
  if (!phone) return false
  return /^\+?[\d\s-]{10,}$/.test(phone)
}

/**
 * Get phone validation error message
 * @param {string} phone - Phone to validate
 * @returns {string} - Error message or empty string
 */
export const getPhoneError = (phone) => {
  if (!phone) return "Phone number is required."
  if (!validatePhone(phone)) return "Please enter a valid phone number (e.g., +63 912 345 6789)."
  return ""
}

/**
 * Calculate password strength
 * @param {string} password - Password to check
 * @returns {Object} - { score, level, color, width, checks }
 */
export const getPasswordStrength = (password) => {
  let score = 0
  const checks = {
    length: password.length >= 8,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    numbers: /[0-9]/.test(password),
    symbols: /[^A-Za-z0-9]/.test(password)
  }

  Object.values(checks).forEach(check => {
    if (check) score++
  })

  let level = 'weak'
  let color = 'bg-red-500'
  let width = '20%'

  if (score >= 2 && score < 4) {
    level = 'medium'
    color = 'bg-yellow-500'
    width = '60%'
  } else if (score >= 4) {
    level = 'strong'
    color = 'bg-green-500'
    width = '100%'
  }

  return { score, level, color, width, checks }
}

/**
 * Get password validation error message
 * @param {string} password - Password to validate
 * @returns {string} - Error message or empty string
 */
export const getPasswordError = (password) => {
  if (!password) return "Password is required."
  if (password.length < 8) return "Password must be at least 8 characters."
  return ""
}

/**
 * Validate password confirmation
 * @param {string} password - Original password
 * @param {string} confirmPassword - Confirmation password
 * @returns {string} - Error message or empty string
 */
export const getConfirmPasswordError = (password, confirmPassword) => {
  if (!confirmPassword) return "Please confirm your password."
  if (confirmPassword !== password) return "Passwords do not match."
  return ""
}

/**
 * Validate username
 * @param {string} username - Username to validate
 * @param {number} minLength - Minimum length (default: 3)
 * @returns {string} - Error message or empty string
 */
export const getUsernameError = (username, minLength = 3) => {
  if (!username) return "Username is required."
  if (username.length < minLength) return `Username must be at least ${minLength} characters.`
  return ""
}

/**
 * Validate full name
 * @param {string} fullname - Full name to validate
 * @returns {string} - Error message or empty string
 */
export const getFullnameError = (fullname) => {
  if (!fullname) return "Full name is required."
  if (fullname.trim().length < 2) return "Please enter your full name."
  return ""
}

