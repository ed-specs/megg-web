import { createNotification } from "../lib/notifications/NotificationsService";
import { getUserAccountId } from "./auth-utils";
import { devError } from "./auth-helpers";

/**
 * Centralized notification helper for in-app notifications
 * Usage: await saveInAppNotification(message, type)
 * 
 * @param {string} message - The notification message
 * @param {string} type - The notification type (e.g., 'batch_list_exported', 'password_change')
 * @returns {Promise<string|null>} - The notification ID or null if failed
 */
export async function saveInAppNotification(message, type) {
  try {
    const accountId = getUserAccountId();
    if (!accountId) {
      devError("Cannot save notification: No account ID found");
      return null;
    }

    const notificationId = await createNotification(accountId, message, type);
    return notificationId;
  } catch (error) {
    devError(`Error creating ${type} notification:`, error);
    // Don't throw - notification failures shouldn't block the main action
    return null;
  }
}

/**
 * Save notification with custom account ID
 * Usage: await saveInAppNotificationForUser(accountId, message, type)
 * 
 * @param {string} accountId - The user's account ID
 * @param {string} message - The notification message
 * @param {string} type - The notification type
 * @returns {Promise<string|null>} - The notification ID or null if failed
 */
export async function saveInAppNotificationForUser(accountId, message, type) {
  try {
    if (!accountId) {
      devError("Cannot save notification: No account ID provided");
      return null;
    }

    const notificationId = await createNotification(accountId, message, type);
    return notificationId;
  } catch (error) {
    devError(`Error creating ${type} notification:`, error);
    return null;
  }
}

