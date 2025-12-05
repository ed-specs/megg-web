import { collection, getDocs, query, where, doc, getDoc, updateDoc } from "firebase/firestore"
import { db } from "../../config/firebaseConfig"
import { getUserAccountId } from "../../utils/auth-utils"

// Helper: robustly convert Firestore Timestamp or JS date-like to Date
const tsToDate = (ts) => {
  try {
    if (!ts) return new Date()
    if (typeof ts?.toDate === 'function') return ts.toDate()
    if (typeof ts?.seconds === 'number') return new Date(ts.seconds * 1000)
    const d = new Date(ts)
    return isNaN(d) ? new Date() : d
  } catch {
    return new Date()
  }
}

/**
 * Get the current user's linked machines
 * @returns {Promise<string[]>} Array of machine IDs linked to the current user
 */
export const getUserLinkedMachines = async () => {
  // Deprecated in the new model (one account == one machine). Kept for compatibility.
  return []
}

// Helper: get current user's accountId (simplified - reads from localStorage)
const getCurrentAccountId = () => {
  try {
    const accountId = getUserAccountId()
    console.log('[InventoryData] Retrieved accountId from localStorage:', accountId)
    return accountId ? String(accountId).trim() : null
  } catch (error) {
    console.error('[InventoryData] Failed to get accountId:', error)
    return null
  }
}

/**
 * Get inventory data grouped by batch only for machines linked to the current user
 * @returns {Promise<Array>} Array of batch inventory objects for machines linked to the current user
 */
export const getMachineLinkedInventoryData = async () => {
  try {
    // New model: use current user's accountId and read aggregate batch docs
    const accountId = getCurrentAccountId()
    if (!accountId) {
      return []
    }

    const normalizedAccountId = accountId.trim()
    const batchesRef = collection(db, "batches")
    const qBatches = query(batchesRef, where("accountId", "==", normalizedAccountId))
    const snapshot = await getDocs(qBatches)

    const inventoryData = snapshot.docs.map((d) => {
      const data = d.data()
      const stats = data?.stats || {}
      const created = tsToDate(data?.createdAt)
      const updated = tsToDate(data?.updatedAt) || created

      // Use fields from Batch collection: smallEggs, mediumEggs, largeEggs, goodEggs, crackEggs, dirtyEggs, totalEggs
      const small = Number(stats.smallEggs || 0)
      const med = Number(stats.mediumEggs || 0)
      const large = Number(stats.largeEggs || 0)
      const crackEggs = Number(stats.crackEggs || 0)
      const dirtyEggs = Number(stats.dirtyEggs || 0)
      const defect = crackEggs + dirtyEggs
      const goodEggs = typeof stats.goodEggs === 'number' ? Number(stats.goodEggs) : (small + med + large)

      // Determine most common size among Small/Medium/Large
      const sizePairs = [
        ["Small", small],
        ["Medium", med],
        ["Large", large],
      ]
      const mostCommonSize = sizePairs.reduce((acc, cur) => (cur[1] > acc[1] ? cur : acc), ["Unknown", -1])[0]

      const eggSizes = {
        Small: small,
        Medium: med,
        Large: large,
        Defect: defect,
      }

      const totalEggs = Number(stats.totalEggs || small + med + large + defect)

      // Use id, name, or document ID for batchNumber (in order of preference)
      const batchNumber = data?.id || data?.name || d.id

      return {
        batchNumber,
        totalEggs,
        totalSort: goodEggs,
        goodEggs,
        commonSize: mostCommonSize,
        timeRange: `${created.toLocaleTimeString()} - ${updated.toLocaleTimeString()}`,
        fromDate: created.toLocaleString(),
        toDate: updated.toLocaleString(),
        eggSizes,
        logs: [],
        sizeCounts: eggSizes,
        status: (data?.status || "active").toLowerCase() === "active" ? "active" : "not active",
        createdAt: created.toISOString(),
        updatedAt: updated.toISOString(),
      }
    })

    // Sort by updated time desc, fallback to batchNumber desc
    inventoryData.sort((a, b) => b.toDate.localeCompare(a.toDate) || b.batchNumber.localeCompare(a.batchNumber))

    return inventoryData
  } catch (error) {
    console.error("InventoryData: Error getting inventory data from batches:", error)
    return []
  }
}

/**
 * Get detailed stats for a specific batch only for machines linked to the current user
 * @param {string} batchId - The batch ID (id, name, or document ID) to get details for
 * @returns {Promise<Object>} Object containing batch statistics and breakdown
 */
export const getMachineLinkedBatchDetails = async (batchId) => {
  try {
    const accountId = getCurrentAccountId()
    if (!accountId) return null

    // Query batch by accountId and match by id, name, or document ID
    const batchesRef = collection(db, "batches")
    const qBatches = query(batchesRef, where("accountId", "==", accountId))
    const snapshot = await getDocs(qBatches)

    // Find the batch that matches the batchId (could be id, name, or document ID)
    const batchDoc = snapshot.docs.find((d) => {
      const data = d.data()
      return data?.id === batchId || data?.name === batchId || d.id === batchId
    })

    if (!batchDoc) {
      return null
    }

    const data = batchDoc.data()
    const stats = data?.stats || {}
    const created = tsToDate(data?.createdAt)
    const updated = tsToDate(data?.updatedAt) || created

    // Use fields from Batch collection
    const small = Number(stats.smallEggs || 0)
    const med = Number(stats.mediumEggs || 0)
    const large = Number(stats.largeEggs || 0)
    const crackEggs = Number(stats.crackEggs || 0)
    const dirtyEggs = Number(stats.dirtyEggs || 0)
    const defect = crackEggs + dirtyEggs
    const goodEggs = typeof stats.goodEggs === 'number' ? Number(stats.goodEggs) : (small + med + large)
    const totalEggs = Number(stats.totalEggs || small + med + large + defect)

    // Size breakdown for overview cards
    const sizeBreakdown = {
      Small: small,
      Medium: med,
      Large: large,
      Defect: defect,
    }

    return {
      totalEggs,
      goodEggs,
      totalSort: goodEggs,
      defectEggs: defect,
      timeRange: `${created.toLocaleTimeString()} - ${updated.toLocaleTimeString()}`,
      sizeBreakdown,
      status: (data?.status || "active").toLowerCase() === "active" ? "active" : "not active",
      createdAt: created,
      updatedAt: updated,
    }
  } catch (error) {
    console.error("InventoryData: Error getting batch details from batches:", error)
    return null
  }
}

/**
 * Update batch status for a specific batch
 * @param {string} batchId - The batch ID (id, name, or document ID) to update
 * @param {string} status - The new status ("active" or "not active")
 * @returns {Promise<boolean>} True if successful, false otherwise
 */
export const updateBatchStatus = async (batchId, status) => {
  try {
    const accountId = getCurrentAccountId()
    if (!accountId) {
      console.error("InventoryData: No accountId found")
      return false
    }

    // Query batch by accountId and match by id, name, or document ID
    const batchesRef = collection(db, "batches")
    const qBatches = query(batchesRef, where("accountId", "==", accountId))
    const snapshot = await getDocs(qBatches)

    // Find the batch that matches the batchId
    const batchDoc = snapshot.docs.find((d) => {
      const data = d.data()
      return data?.id === batchId || data?.name === batchId || d.id === batchId
    })

    if (!batchDoc) {
      console.error("InventoryData: Batch not found:", batchId)
      return false
    }

    // Update the batch status and updatedAt timestamp
    const batchRef = doc(db, "batches", batchDoc.id)
    await updateDoc(batchRef, {
      status: status,
      updatedAt: new Date().toISOString(),
    })

    console.log(`InventoryData: Batch ${batchId} status updated to ${status}`)
    return true
  } catch (error) {
    console.error("InventoryData: Error updating batch status:", error)
    return false
  }
}

/**
 * Get unique batch IDs only for machines linked to the current user
 * @returns {Promise<string[]>} Array of unique batch IDs
 */
export const getMachineLinkedBatchIds = async () => {
  try {
    const accountId = getCurrentAccountId()
    if (!accountId) return []

    const batchesRef = collection(db, "batches")
    const qBatches = query(batchesRef, where("accountId", "==", accountId))
    const snapshot = await getDocs(qBatches)
    return snapshot.docs.map((d) => {
      const data = d.data()
      return data?.id || data?.name || d.id
    })
  } catch (error) {
    console.error("InventoryData: Error getting batch IDs from batches:", error)
    return []
  }
}



