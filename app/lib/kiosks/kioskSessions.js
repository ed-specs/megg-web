// lib/kiosks/kioskSessions.js - Helper for Kiosk Session Firebase Queries

import { db } from "../../config/firebaseConfig";
import { 
  collection, 
  query, 
  where, 
  doc,
  onSnapshot,
  orderBy
} from "firebase/firestore";

/**
 * Listen to all active kiosk sessions in real-time
 * @param {Function} callback - Callback function to handle session updates
 * @returns {Function} Unsubscribe function
 */
export function listenToActiveKioskSessions(callback) {
  try {
    const sessionsRef = collection(db, "kioskSessions");
    const q = query(
      sessionsRef,
      where("status", "==", "active"),
      orderBy("startTime", "desc")
    );
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const sessions = [];
      querySnapshot.forEach((doc) => {
        sessions.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      callback(sessions);
    }, (error) => {
      if (process.env.NODE_ENV !== 'production') {
        console.error("Error listening to active kiosk sessions:", error);
      }
      callback([]);
    });
    
    return unsubscribe;
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error("Error setting up listener for active kiosk sessions:", error);
    }
    return () => {}; // Return empty unsubscribe function
  }
}

/**
 * Listen to a specific user's kiosk session in real-time
 * @param {string} userId - User's account ID (e.g., "MEGG-679622")
 * @param {Function} callback - Callback function to handle session updates
 * @returns {Function} Unsubscribe function
 */
export function listenToUserKioskSession(userId, callback) {
  try {
    const kioskId = `KIOSK-${userId}`;
    const sessionDocRef = doc(db, "kioskSessions", kioskId);
    
    const unsubscribe = onSnapshot(sessionDocRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        callback({
          id: doc.id,
          ...data
        });
      } else {
        callback(null);
      }
    }, (error) => {
      if (process.env.NODE_ENV !== 'production') {
        console.error("Error listening to user's kiosk session:", error);
      }
      callback(null);
    });
    
    return unsubscribe;
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error("Error setting up listener for user's kiosk session:", error);
    }
    return () => {}; // Return empty unsubscribe function
  }
}

/**
 * Check if a heartbeat is stale (older than 5 minutes)
 * @param {Timestamp} lastHeartbeat - Firebase Timestamp of last heartbeat
 * @returns {boolean} True if stale, false otherwise
 */
export function isHeartbeatStale(lastHeartbeat) {
  if (!lastHeartbeat) return true;
  
  try {
    // Convert Firebase Timestamp to milliseconds
    const lastHeartbeatMs = lastHeartbeat.toMillis ? lastHeartbeat.toMillis() : lastHeartbeat.seconds * 1000;
    const now = Date.now();
    const fiveMinutesInMs = 5 * 60 * 1000; // 5 minutes
    
    return (now - lastHeartbeatMs) > fiveMinutesInMs;
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error("Error checking heartbeat staleness:", error);
    }
    return true;
  }
}

/**
 * Format timestamp to readable date/time string
 * @param {Timestamp} timestamp - Firebase Timestamp
 * @returns {string} Formatted date/time string
 */
export function formatTimestamp(timestamp) {
  if (!timestamp) return "N/A";
  
  try {
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000);
    return date.toLocaleString();
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error("Error formatting timestamp:", error);
    }
    return "Invalid date";
  }
}

/**
 * Calculate time difference from now in human-readable format
 * @param {Timestamp} timestamp - Firebase Timestamp
 * @returns {string} Human-readable time difference (e.g., "5 minutes ago")
 */
export function getTimeAgo(timestamp) {
  if (!timestamp) return "N/A";
  
  try {
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000);
    const now = new Date();
    const diffInMs = now - date;
    const diffInMinutes = Math.floor(diffInMs / 60000);
    
    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes === 1) return "1 minute ago";
    if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours === 1) return "1 hour ago";
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return "1 day ago";
    return `${diffInDays} days ago`;
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error("Error calculating time ago:", error);
    }
    return "N/A";
  }
}

