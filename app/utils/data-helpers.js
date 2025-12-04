/**
 * Data validation and safe access utilities
 */

/**
 * Safe nested object access
 * @param {Object} obj - Object to access
 * @param {string} path - Dot-notation path (e.g., 'user.profile.name')
 * @param {*} defaultValue - Default value if path doesn't exist
 * @returns {*} - Value at path or default value
 */
export const safeGet = (obj, path, defaultValue = null) => {
  try {
    if (!obj || !path) return defaultValue
    
    const keys = path.split('.')
    let result = obj
    
    for (const key of keys) {
      if (result === null || result === undefined) {
        return defaultValue
      }
      result = result[key]
    }
    
    return result !== null && result !== undefined ? result : defaultValue
  } catch (error) {
    return defaultValue
  }
}

/**
 * Validate batch data
 * @param {Object} batch - Batch object to validate
 * @returns {boolean} - True if batch is valid
 */
export const isValidBatch = (batch) => {
  if (!batch) return false
  
  return (
    batch.batchNumber &&
    typeof batch.batchNumber === 'string' &&
    batch.batchNumber.trim() !== '' &&
    typeof batch.totalEggs === 'number' &&
    batch.totalEggs >= 0 &&
    batch.fromDate &&
    batch.fromDate !== ''
  )
}

/**
 * Validate and sanitize batch data
 * Returns a clean batch object with guaranteed safe values
 * @param {Object} batch - Batch object to sanitize
 * @returns {Object} - Sanitized batch object
 */
export const sanitizeBatch = (batch) => {
  if (!batch) return null
  
  return {
    batchNumber: safeGet(batch, 'batchNumber', 'Unknown'),
    totalEggs: Math.max(0, parseInt(safeGet(batch, 'totalEggs', 0)) || 0),
    totalSort: Math.max(0, parseInt(safeGet(batch, 'totalSort', 0)) || 0),
    goodEggs: Math.max(0, parseInt(safeGet(batch, 'goodEggs', 0)) || 0),
    defectEggs: Math.max(0, parseInt(safeGet(batch, 'defectEggs', 0)) || 0),
    fromDate: safeGet(batch, 'fromDate', 'N/A'),
    toDate: safeGet(batch, 'toDate', 'N/A'),
    status: safeGet(batch, 'status', 'active'),
    createdAt: safeGet(batch, 'createdAt', null),
    eggSizes: {
      Small: Math.max(0, parseInt(safeGet(batch, 'eggSizes.Small', 0)) || 0),
      Medium: Math.max(0, parseInt(safeGet(batch, 'eggSizes.Medium', 0)) || 0),
      Large: Math.max(0, parseInt(safeGet(batch, 'eggSizes.Large', 0)) || 0),
      Defect: Math.max(0, parseInt(safeGet(batch, 'eggSizes.Defect', 0)) || 0),
    }
  }
}

/**
 * Safe number formatting with fallback
 * @param {*} value - Value to format
 * @param {string} defaultValue - Default if invalid
 * @returns {string} - Formatted number or default
 */
export const safeFormatNumber = (value, defaultValue = '0') => {
  try {
    const num = Number(value)
    if (isNaN(num)) return defaultValue
    return num.toLocaleString()
  } catch {
    return defaultValue
  }
}

/**
 * Safe percentage calculation
 * @param {number} numerator - Numerator value
 * @param {number} denominator - Denominator value
 * @param {number} decimals - Decimal places (default: 2)
 * @returns {string} - Formatted percentage or "0.00%"
 */
export const safePercentage = (numerator, denominator, decimals = 2) => {
  try {
    const num = Number(numerator) || 0
    const denom = Number(denominator) || 0
    
    if (denom === 0) return '0.00%'
    
    const percentage = (num / denom) * 100
    return `${percentage.toFixed(decimals)}%`
  } catch {
    return '0.00%'
  }
}

/**
 * Safe date formatting
 * @param {*} date - Date value (Date object, string, or timestamp)
 * @param {string} defaultValue - Default if invalid
 * @returns {string} - Formatted date or default
 */
export const safeFormatDate = (date, defaultValue = 'N/A') => {
  try {
    if (!date) return defaultValue
    
    const d = date instanceof Date ? date : new Date(date)
    if (isNaN(d.getTime())) return defaultValue
    
    return d.toLocaleDateString('en-US')
  } catch {
    return defaultValue
  }
}

