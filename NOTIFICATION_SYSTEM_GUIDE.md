# MEGG Notification System Guide

## Overview
The MEGG application uses a centralized notification system that stores all notifications in the Firestore `notifications` collection. This guide explains how to properly create and manage notifications throughout the application.

---

## Table of Contents
1. [Architecture](#architecture)
2. [Creating Notifications](#creating-notifications)
3. [Notification Types](#notification-types)
4. [Icon Mapping](#icon-mapping)
5. [Best Practices](#best-practices)
6. [Examples](#examples)

---

## Architecture

### Data Flow
```
Action/Event → createNotification() → Firestore 'notifications' collection → Real-time listeners → UI Display
```

### Key Components
- **NotificationsService.js** (`app/lib/notifications/NotificationsService.js`)
  - Core service for creating/managing notifications
  - Handles notification settings checks
  - Maps notification types to icons

- **Header.js** (`app/dashboard/components/Header.js`)
  - Displays notification dropdown
  - Real-time listener for live updates
  - Shows unread count badge

- **Notifications Page** (`app/dashboard/notifications/page.jsx`)
  - Full notification list view
  - Mark as read/delete functionality

---

## Creating Notifications

### Method 1: Using NotificationsService (Direct)
For server-side or direct Firestore access:

```javascript
import { createNotification } from "../lib/notifications/NotificationsService"

// Basic usage
await createNotification(
  accountId,    // User's account ID (e.g., "MEGG-679622")
  message,      // Notification message (string)
  type,         // Notification type (string)
  read          // Optional: mark as read (default: false)
)

// Example
await createNotification(
  "MEGG-679622",
  "Your password has been successfully updated",
  "password_change",
  false
)
```

### Method 2: Using Notification Utils (Recommended)
For client-side usage with automatic account ID retrieval:

```javascript
import { saveInAppNotification } from "../../utils/notification-utils"

// Automatically gets current user's account ID
await saveInAppNotification(
  "Your password has been successfully updated",
  "password_change"
)
```

---

## Notification Types

### Authentication & Security
| Type | Description | Icon | Color |
|------|-------------|------|-------|
| `login` | User logged in | login | Blue (#105588) |
| `logout` | User logged out | logout | Blue |
| `password_change` | Password updated | lock | Red |
| `security_session_revoked` | Device session revoked | shield | Red |

### Profile Updates
| Type | Description | Icon | Color |
|------|-------------|------|-------|
| `name_updated` | Full name changed | user | Blue |
| `email_updated` | Email address changed | mail | Purple |
| `phone_updated` | Phone number changed | phone | Teal |
| `address_updated` | Address changed | map | Orange |
| `birthday_updated` | Birthday changed | calendar | Pink |
| `age_updated` | Age updated | calendar | Pink |
| `gender_updated` | Gender updated | user | Blue |
| `profile_image_added` | Profile image added | image | Indigo |
| `profile_image_updated` | Profile image changed | image | Indigo |
| `profile_image_removed` | Profile image removed | image | Indigo |

### Farm Management
| Type | Description | Icon | Color |
|------|-------------|------|-------|
| `farm_info_updated` | Farm info changed | farm | Green |
| `farm_name_updated` | Farm name changed | farm | Green |
| `farm_address_updated` | Farm address changed | farm | Green |
| `farm_primary_changed` | Primary farm changed | building | Green |

### Inventory Management
| Type | Description | Icon | Color |
|------|-------------|------|-------|
| `inventory_data_filtered` | Inventory filtered | filter | Yellow |
| `inventory_refreshed` | Inventory refreshed | refresh | Blue |
| `inventory_refresh_failed` | Refresh failed | alert | Red |
| `inventory_load_failed` | Load failed | alert | Red |

### Batch Operations
| Type | Description | Icon | Color |
|------|-------------|------|-------|
| `batch_status_updated` | Batch status changed | check | Emerald |
| `batch_status_update_failed` | Status update failed | alert | Red |
| `batch_list_exported` | Batch list exported | download | Green |
| `batch_details_exported` | Batch details exported | download | Green |
| `batch_export_failed` | Export failed | alert | Red |

### Settings
| Type | Description | Icon | Color |
|------|-------------|------|-------|
| `settings_change` | Settings updated | settings | Gray |

---

## Icon Mapping

The system automatically assigns icons based on notification type. Icons are defined in `NotificationsService.js`:

```javascript
const iconMap = {
  "login": "login",
  "logout": "logout",
  "password_change": "lock",
  "settings_change": "settings",
  "farm_info_updated": "farm",
  "farm_name_updated": "farm",
  "farm_address_updated": "farm",
  "profile_image_added": "image",
  "profile_image_removed": "image",
  "profile_image_updated": "image",
  "name_updated": "user",
  "email_updated": "mail",
  "phone_updated": "phone",
  "address_updated": "map",
  "birthday_updated": "calendar",
  "age_updated": "calendar",
  "gender_updated": "user",
  "inventory_data_filtered": "filter",
  "inventory_refreshed": "refresh",
  "inventory_refresh_failed": "alert",
  "inventory_load_failed": "alert",
  "batch_status_updated": "check",
  "batch_status_update_failed": "alert",
  "batch_list_exported": "download",
  "batch_details_exported": "download",
  "batch_export_failed": "alert",
  "security_session_revoked": "shield",
  "farm_primary_changed": "building",
}
```

---

## Best Practices

### ✅ DO

1. **Use Descriptive Messages**
   ```javascript
   // Good
   await saveInAppNotification(
     "Your password has been successfully updated",
     "password_change"
   )
   
   // Bad
   await saveInAppNotification(
     "Password changed",
     "password_change"
   )
   ```

2. **Use Appropriate Notification Types**
   - Always use existing types when possible
   - If creating a new type, add it to the iconMap in NotificationsService.js

3. **Handle Errors Gracefully**
   ```javascript
   try {
     await saveInAppNotification(message, type)
   } catch (error) {
     console.error("Error creating notification:", error)
     // Don't block the main operation if notification fails
   }
   ```

4. **Wrap in Try-Catch Blocks**
   - Notifications should NEVER break the main functionality
   - Always handle notification failures silently

5. **Use Audit Logs for Critical Events**
   - Notifications are for user-facing alerts
   - Audit logs are for system tracking and compliance
   - Use both when appropriate:
   ```javascript
   // Password change example
   await saveInAppNotification("Password updated", "password_change")
   await saveAuditLog(accountId, 'password_changed', 'Password was changed successfully', { method: 'firebase_auth' })
   ```

### ❌ DON'T

1. **Don't create notifications for page views**
   ```javascript
   // Bad - Don't do this
   await saveInAppNotification("You viewed your security settings", "security_page_viewed")
   ```

2. **Don't block user actions waiting for notifications**
   ```javascript
   // Bad
   const notificationId = await createNotification(...)
   if (!notificationId) {
     throw new Error("Failed to create notification")
   }
   
   // Good
   createNotification(...).catch(err => console.error("Notification failed:", err))
   // Continue with main action
   ```

3. **Don't use audit logs as notifications**
   - Audit logs are for system tracking
   - Notifications are for user alerts
   - They serve different purposes

4. **Don't create duplicate notification types**
   - Check existing types first
   - Reuse types when possible

---

## Examples

### Example 1: Password Change (Full Implementation)
```javascript
// In change-password page
try {
  // Update password
  await updatePassword(user, newPassword)
  
  // Create in-app notification (non-blocking)
  await saveInAppNotification(
    "Your password has been successfully updated",
    "password_change"
  )
  
  // Send email notification (non-blocking)
  await fetch('/api/notifications/send-email', {
    method: 'POST',
    body: JSON.stringify({
      accountId: docId,
      subject: '🔐 Password Changed Successfully - MEGG',
      message: 'Your password has been updated...'
    })
  })
  
  // Save audit log for compliance (non-blocking)
  await saveAuditLog(
    docId,
    'password_changed',
    'Password was changed successfully',
    { method: 'firebase_auth' }
  )
  
  setGlobalMessage("Password updated successfully!")
} catch (error) {
  console.error("Error changing password:", error)
  setGlobalMessage("Failed to update password")
}
```

### Example 2: Profile Update
```javascript
// After updating profile
await updateDoc(userDocRef, {
  fullName: newFullName
})

// Create notification
await saveInAppNotification(
  `Your name was updated to ${newFullName}`,
  "name_updated"
)
```

### Example 3: Batch Export
```javascript
// After exporting batch
const result = await exportBatch(batchId)

if (result.success) {
  await saveInAppNotification(
    `Batch ${batchId} exported successfully`,
    "batch_list_exported"
  )
} else {
  await saveInAppNotification(
    `Failed to export batch ${batchId}`,
    "batch_export_failed"
  )
}
```

### Example 4: Session Revoked
```javascript
// When revoking a device session
await updateDoc(userDocRef, {
  fcmTokens: updatedTokens
})

await saveInAppNotification(
  "A device session was revoked from your account.",
  "security_session_revoked"
)

await saveAuditLog(
  accountId,
  'session_revoked',
  'A device session was revoked',
  { sessionId: sessionId.substring(0, 20) + '...' }
)
```

---

## Notification Settings

Notifications respect user preferences stored in `notificationSettings` collection:

### Always Allowed (Cannot be Disabled)
- Login/Logout
- Password changes
- Security alerts
- Profile updates
- Farm updates
- Settings changes

### User-Configurable
- Defect alerts (`defectAlerts` setting)
- Machine alerts (`machineAlerts` setting)
- Email notifications (`emailNotifications` setting)
- Push notifications (`pushNotificationsEnabled` setting)

### Checking Settings
The `checkNotificationSettings()` function automatically handles this:
```javascript
// In NotificationsService.js
if (userId) {
  const notificationsEnabled = await checkNotificationSettings(userId, type)
  if (!notificationsEnabled) {
    return null // Don't create notification if disabled
  }
}
```

---

## Testing Notifications

### Manual Testing
1. Perform the action that should trigger a notification
2. Check the notification bell icon in the header (should show unread count)
3. Click the bell to see the notification dropdown
4. Verify the notification appears in `/dashboard/notifications`

### Firestore Console
1. Navigate to Firebase Console → Firestore Database
2. Open the `notifications` collection
3. Find the notification by accountId
4. Verify fields: `accountId`, `message`, `type`, `icon`, `createdAt`, `read`

---

## Adding New Notification Types

When adding a new notification type:

1. **Choose an appropriate type name**
   - Use snake_case format
   - Be descriptive and specific
   - Example: `machine_linked`, `batch_archived`

2. **Add to iconMap in NotificationsService.js**
   ```javascript
   const iconMap = {
     // ... existing types
     "your_new_type": "icon_name",
   }
   ```

3. **Add icon handling in Header.js** (if using new icon)
   ```javascript
   } else if (notif.icon === "your_icon") {
     <div className="w-12 h-12 bg-blue-500 flex items-center justify-center rounded-full">
       <YourIcon className="w-5 h-5 text-white" strokeWidth={2.5} />
     </div>
   ```

4. **Add icon handling in notifications/page.jsx** (same as Header.js)

5. **Update this documentation**

---

## Troubleshooting

### Notifications not appearing?
1. Check if user has an accountId
2. Verify notification settings in `notificationSettings` collection
3. Check browser console for errors
4. Verify Firestore rules allow read/write to notifications collection

### Icons not showing?
1. Verify the icon is in the iconMap
2. Check if the icon import exists in Header.js and notifications/page.jsx
3. Ensure the icon name matches exactly

### Real-time updates not working?
1. Check if Firestore real-time listeners are set up correctly
2. Verify user is authenticated
3. Check browser network tab for WebSocket connections

---

## Summary

**Remember: The notification system is centralized!**

- ✅ **Always use** `NotificationsService.js` or `saveInAppNotification()`
- ✅ **Store in** Firestore `notifications` collection
- ✅ **Display via** real-time listeners in Header.js and notifications page
- ❌ **Never** create custom notification storage
- ❌ **Never** mix audit logs with notifications (they're separate systems)
- ❌ **Never** block user actions waiting for notifications

For questions or issues, refer to:
- `app/lib/notifications/NotificationsService.js`
- `app/utils/notification-utils.js`
- `app/dashboard/notifications/page.jsx`
- `app/dashboard/components/Header.js`

---

**Last Updated:** December 2025
**Version:** 1.0

