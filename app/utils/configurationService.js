import { db } from "../config/firebaseConfig"
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from "firebase/firestore"
import { devLog, devError } from "./auth-helpers"

/**
 * Default egg size ranges (fallback)
 * 
 * Data structure:
 * {
 *   small: { min: number, max: number, label: "Small" },
 *   medium: { min: number, max: number, label: "Medium" },
 *   large: { min: number, max: number, label: "Large" }
 * }
 * 
 * Note: The large.max value represents the system maximum weight.
 * Eggs above this weight will not be classified into any category.
 */
export const DEFAULT_EGG_RANGES = {
  small: { min: 35, max: 42, label: "Small" },
  medium: { min: 43, max: 50, label: "Medium" },
  large: { min: 51, max: 58, label: "Large" }
}

/**
 * Get default egg size ranges (hardcoded fallback)
 * @returns {Object} Default egg size ranges object
 */
export function getDefaultRanges() {
  return DEFAULT_EGG_RANGES
}

/**
 * Validate egg size ranges for gaps and overlaps
 * @param {Object} ranges - Object with small, medium, large ranges
 * @returns {Object} Validation result with errors, warnings, and gaps/overlaps
 */
export function validateRanges(ranges) {
  const rangesArray = [
    { name: 'small', ...ranges.small },
    { name: 'medium', ...ranges.medium },
    { name: 'large', ...ranges.large }
  ].sort((a, b) => a.min - b.min)

  const errors = []
  const warnings = []
  const gaps = []
  const overlaps = []

  // Validate each range individually
  rangesArray.forEach((range) => {
    if (range.min >= range.max) {
      errors.push({
        type: 'invalid_range',
        range: range.name,
        message: `${range.name.charAt(0).toUpperCase() + range.name.slice(1)} range: Min (${range.min}) must be less than Max (${range.max})`
      })
    }
    if (range.min < 0 || range.max < 0) {
      errors.push({
        type: 'negative_value',
        range: range.name,
        message: `${range.name.charAt(0).toUpperCase() + range.name.slice(1)} range: Values must be positive`
      })
    }
  })

  // Check for gaps and overlaps between ranges
  for (let i = 0; i < rangesArray.length - 1; i++) {
    const current = rangesArray[i]
    const next = rangesArray[i + 1]
    
    // Check for gaps (current.max + 0.01 < next.min)
    if (current.max + 0.01 < next.min) {
      const gap = {
        from: current.max,
        to: next.min,
        between: `${current.name} and ${next.name}`
      }
      gaps.push(gap)
      warnings.push({
        type: 'gap',
        ...gap,
        message: `Gap between ${current.name} and ${next.name}: ${current.max.toFixed(2)}g to ${next.min.toFixed(2)}g`
      })
    }
    
    // Check for overlaps (current.max >= next.min)
    // Overlaps are now warnings (not errors) - smart adjustment can fix them
    if (current.max >= next.min) {
      const overlap = {
        range1: current.name,
        range2: next.name,
        overlap: current.max - next.min + 0.01
      }
      overlaps.push(overlap)
      warnings.push({
        type: 'overlap',
        ...overlap,
        message: `Overlap between ${current.name} and ${next.name}: ${overlap.overlap.toFixed(2)}g overlap`
      })
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    gaps,
    overlaps
  }
}

/**
 * Get global default configuration for egg size ranges
 * Fetches from Firestore, falls back to hardcoded defaults if not found
 * @returns {Promise<Object>} Egg size ranges object
 */
export async function getGlobalDefaultRanges() {
  try {
    const docRef = doc(db, 'global_configurations', 'egg_size_ranges')
    const docSnap = await getDoc(docRef)
    
    if (docSnap.exists()) {
      const data = docSnap.data()
      if (data.configuration) {
        devLog('Global configuration loaded from Firestore')
        return data.configuration
      }
    }
    
    // If no global config exists, return defaults
    devLog('No global configuration found, using defaults')
    return getDefaultRanges()
  } catch (error) {
    devError('Error fetching global default ranges:', error)
    return getDefaultRanges()
  }
}

/**
 * Get global configuration with full metadata
 * Fetches from global_configurations/egg_size_ranges collection
 * @returns {Promise<Object>} Full global configuration object with metadata
 */
export async function getGlobalConfiguration() {
  try {
    const docRef = doc(db, 'global_configurations', 'egg_size_ranges')
    const docSnap = await getDoc(docRef)
    
    if (docSnap.exists()) {
      return docSnap.data()
    }
    
    // Return default structure if not found
    return {
      id: 'egg_size_ranges',
      type: 'egg_classification',
      version: '1.0',
      configuration: getDefaultRanges(),
      metadata: {
        description: 'Default egg size classification ranges',
        createdAt: new Date().toISOString(),
        lastModifiedAt: new Date().toISOString(),
        isActive: true
      }
    }
  } catch (error) {
    devError('Error fetching global configuration:', error)
    throw error
  }
}

/**
 * Update global configuration for egg size ranges
 * Validates ranges before saving to ensure data integrity
 * 
 * Validation placement:
 * - Frontend: WeightRangeEditor.jsx uses validateRanges() for real-time feedback
 * - Service layer: This function calls validateRanges() before write
 * - Both layers validate to ensure data integrity
 * 
 * @param {Object} ranges - Egg size ranges object
 * @returns {Promise<void>}
 */
export async function updateGlobalConfiguration(ranges) {
  try {
    // Final validation before saving (service layer validation)
    const validation = validateRanges(ranges)
    if (!validation.isValid) {
      const errorMessages = validation.errors.map(e => e.message).join('; ')
      throw new Error(`Validation failed: ${errorMessages}`)
    }

    const docRef = doc(db, 'global_configurations', 'egg_size_ranges')
    const existingDoc = await getDoc(docRef)
    
    const now = new Date().toISOString()
    
    if (existingDoc.exists()) {
      // Update existing document
      await updateDoc(docRef, {
        'configuration': ranges,
        'metadata.lastModifiedAt': now
      })
      devLog('Global configuration updated successfully')
    } else {
      // Create new document
      const globalConfig = {
        id: 'egg_size_ranges',
        type: 'egg_classification',
        version: '1.0',
        configuration: ranges,
        metadata: {
          description: 'Default egg size classification ranges',
          createdAt: now,
          lastModifiedAt: now,
          isActive: true
        }
      }
      await setDoc(docRef, globalConfig)
      devLog('Global configuration created successfully')
    }
  } catch (error) {
    devError('Error updating global configuration:', error)
    throw error
  }
}

/**
 * Get user-specific configuration for egg size ranges
 * @param {string} accountId - User's account ID
 * @returns {Promise<Object|null>} User configuration object or null if not found or not customized
 */
export async function getUserConfiguration(accountId) {
  try {
    if (!accountId) {
      return null
    }
    
    const docRef = doc(db, 'user_configurations', accountId)
    const docSnap = await getDoc(docRef)
    
    if (docSnap.exists()) {
      const data = docSnap.data()
      // Only return user config if it's customized (isCustomized === true)
      if (data.configurations?.eggSizeRanges && data.metadata?.isCustomized === true) {
        devLog('User configuration loaded from Firestore')
        return {
          ranges: data.configurations.eggSizeRanges,
          metadata: data.metadata || {},
          accountId: data.accountId
        }
      }
    }
    
    return null
  } catch (error) {
    devError('Error fetching user configuration:', error)
    return null
  }
}

/**
 * Save or update user-specific configuration for egg size ranges
 * Creates user_configuration if it doesn't exist, updates if it does
 * @param {string} accountId - User's account ID
 * @param {Object} ranges - Egg size ranges object
 * @param {string} uid - Optional user UID for tracking
 * @returns {Promise<void>}
 */
export async function saveUserConfiguration(accountId, ranges, uid = null) {
  try {
    if (!accountId) {
      throw new Error('Account ID is required to save user configuration')
    }

    // Final validation before saving (service layer validation)
    const validation = validateRanges(ranges)
    if (!validation.isValid) {
      const errorMessages = validation.errors.map(e => e.message).join('; ')
      throw new Error(`Validation failed: ${errorMessages}`)
    }

    const docRef = doc(db, 'user_configurations', accountId)
    const existingDoc = await getDoc(docRef)
    
    const now = new Date().toISOString()
    
    if (existingDoc.exists()) {
      // Update existing user configuration
      const existingData = existingDoc.data()
      await updateDoc(docRef, {
        'configurations.eggSizeRanges': ranges,
        'metadata.lastModifiedAt': now,
        'metadata.isCustomized': true
      })
      devLog('User configuration updated successfully')
    } else {
      // Create new user configuration
      const userConfig = {
        accountId,
        uid: uid || existingDoc.data()?.uid || null,
        configurations: {
          eggSizeRanges: ranges
        },
        metadata: {
          lastModifiedAt: now,
          isCustomized: true
        }
      }
      await setDoc(docRef, userConfig)
      devLog('User configuration created successfully')
    }
  } catch (error) {
    devError('Error saving user configuration:', error)
    throw error
  }
}

/**
 * Delete user-specific configuration (reset to global defaults)
 * Actually deletes the document to fully reset to global defaults
 * @param {string} accountId - User's account ID
 * @returns {Promise<void>}
 */
export async function deleteUserConfiguration(accountId) {
  try {
    if (!accountId) {
      throw new Error('Account ID is required to delete user configuration')
    }

    const docRef = doc(db, 'user_configurations', accountId)
    const docSnap = await getDoc(docRef)
    
    if (docSnap.exists()) {
      // Delete the document entirely to reset to global defaults
      await deleteDoc(docRef)
      devLog('User configuration deleted, reset to global defaults')
    } else {
      devLog('No user configuration found to delete')
    }
  } catch (error) {
    devError('Error resetting user configuration:', error)
    throw error
  }
}

/**
 * Get configuration with fallback: User Config → Global Default → Hardcoded Defaults
 * @param {string} accountId - User's account ID
 * @returns {Promise<Object>} Configuration object with ranges, source, and metadata
 */
export async function getConfigurationWithFallback(accountId) {
  try {
    // 1. Try to get user configuration
    if (accountId) {
      const userConfig = await getUserConfiguration(accountId)
      if (userConfig) {
        return {
          ranges: userConfig.ranges,
          source: 'user',
          isCustomized: true,
          lastModified: userConfig.metadata?.lastModifiedAt || null
        }
      }
    }

    // 2. Try to get global default
    const globalConfig = await getGlobalDefaultRanges()
    if (globalConfig) {
      const globalMeta = await getGlobalConfiguration()
      return {
        ranges: globalConfig,
        source: 'global',
        isCustomized: false,
        lastModified: globalMeta.metadata?.lastModifiedAt || null
      }
    }

    // 3. Ultimate fallback to hardcoded defaults
    return {
      ranges: getDefaultRanges(),
      source: 'local',
      isCustomized: false,
      lastModified: null
    }
  } catch (error) {
    devError('Error getting configuration with fallback:', error)
    
    // Fallback to hardcoded defaults on error
    return {
      ranges: getDefaultRanges(),
      source: 'local',
      isCustomized: false,
      lastModified: null
    }
  }
}

/**
 * Create global default configuration (admin function)
 * Initializes the global configuration in Firestore with default values
 * @returns {Promise<void>}
 */
export async function createGlobalDefaultRanges() {
  try {
    const docRef = doc(db, 'global_configurations', 'egg_size_ranges')
    const now = new Date().toISOString()
    
    const globalConfig = {
      id: 'egg_size_ranges',
      type: 'egg_classification',
      version: '1.0',
      configuration: getDefaultRanges(),
      metadata: {
        description: 'Default egg size classification ranges',
        createdAt: now,
        lastModifiedAt: now,
        isActive: true
      }
    }
    
    await setDoc(docRef, globalConfig)
    devLog('Global default ranges created successfully')
  } catch (error) {
    devError('Error creating global default ranges:', error)
    throw error
  }
}

