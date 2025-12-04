import { db } from "../config/firebaseConfig"
import { collection, addDoc, serverTimestamp, query, where, orderBy, limit, getDocs } from "firebase/firestore"
import { devLog, devError } from "./auth-helpers"

/**
 * Save an audit log entry
 * @param {string} accountId - User's account ID
 * @param {string} action - Action type (e.g., 'password_changed', 'email_updated')
 * @param {string} description - Human-readable description
 * @param {Object} metadata - Additional data (optional)
 */
export async function saveAuditLog(accountId, action, description, metadata = {}) {
  try {
    if (!accountId) {
      devError("Cannot save audit log: accountId is required")
      return null
    }

    const auditData = {
      accountId,
      action, // 'password_changed', 'email_updated', 'profile_updated', 'settings_changed', 'login', 'logout', 'session_revoked'
      description,
      metadata: {
        ...metadata,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
        timestamp: new Date().toISOString()
      },
      createdAt: serverTimestamp()
    }

    const docRef = await addDoc(collection(db, "auditLogs"), auditData)
    devLog(`Audit log saved: ${action}`, docRef.id)
    return docRef.id
  } catch (error) {
    devError("Error saving audit log:", error)
    return null
  }
}

/**
 * Get audit logs for a user
 * @param {string} accountId - User's account ID
 * @param {number} limitCount - Number of logs to fetch (default: 50)
 * @returns {Promise<Array>} - Array of audit log entries
 */
export async function getUserAuditLogs(accountId, limitCount = 50) {
  try {
    if (!accountId) {
      devError("Cannot get audit logs: accountId is required")
      return []
    }

    const logsRef = collection(db, "auditLogs")
    const q = query(
      logsRef,
      where("accountId", "==", accountId),
      orderBy("createdAt", "desc"),
      limit(limitCount)
    )

    const querySnapshot = await getDocs(q)
    const logs = []

    querySnapshot.forEach((doc) => {
      const data = doc.data()
      logs.push({
        id: doc.id,
        action: data.action,
        description: data.description,
        metadata: data.metadata || {},
        createdAt: data.createdAt 
          ? (data.createdAt.toDate ? data.createdAt.toDate().toISOString() : new Date(data.createdAt).toISOString())
          : new Date().toISOString()
      })
    })

    return logs
  } catch (error) {
    devError("Error getting audit logs:", error)
    return []
  }
}

/**
 * Get audit logs by action type
 * @param {string} accountId - User's account ID
 * @param {string} actionType - Action type to filter by
 * @param {number} limitCount - Number of logs to fetch
 */
export async function getAuditLogsByType(accountId, actionType, limitCount = 20) {
  try {
    if (!accountId || !actionType) {
      return []
    }

    const logsRef = collection(db, "auditLogs")
    const q = query(
      logsRef,
      where("accountId", "==", accountId),
      where("action", "==", actionType),
      orderBy("createdAt", "desc"),
      limit(limitCount)
    )

    const querySnapshot = await getDocs(q)
    const logs = []

    querySnapshot.forEach((doc) => {
      const data = doc.data()
      logs.push({
        id: doc.id,
        action: data.action,
        description: data.description,
        metadata: data.metadata || {},
        createdAt: data.createdAt 
          ? (data.createdAt.toDate ? data.createdAt.toDate().toISOString() : new Date(data.createdAt).toISOString())
          : new Date().toISOString()
      })
    })

    return logs
  } catch (error) {
    devError("Error getting audit logs by type:", error)
    return []
  }
}

