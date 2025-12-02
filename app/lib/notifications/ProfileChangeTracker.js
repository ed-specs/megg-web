import { createNotification } from "./NotificationsService"

// Track profile changes and create notifications
export async function trackProfileChanges(accountId, oldData, newData) {
  try {
    // Profile change notifications should always be created (similar to login notifications)
    // The createNotification function will handle the notification settings check

    const changes = []

    // Check for profile image change
    if (oldData.profileImageUrl !== newData.profileImageUrl) {
      if (!oldData.profileImageUrl && newData.profileImageUrl) {
        // Profile picture added
        await createNotification(accountId, "You've added a new profile picture", "profile_image_added")
        changes.push("profile picture")
      } else if (oldData.profileImageUrl && !newData.profileImageUrl) {
        // Profile picture removed
        await createNotification(accountId, "You've removed your profile picture", "profile_image_removed")
        changes.push("profile picture")
      } else if (oldData.profileImageUrl && newData.profileImageUrl) {
        // Profile picture updated
        await createNotification(accountId, "You've updated your profile picture", "profile_image_updated")
        changes.push("profile picture")
      }
    }

    // Check for name change
    if (oldData.fullname !== newData.fullname && newData.fullname) {
      await createNotification(accountId, `You've updated your name to ${newData.fullname}`, "name_updated")
      changes.push("name")
    }

    // Check for email change
    if (oldData.email !== newData.email && newData.email) {
      await createNotification(accountId, `You've updated your email to ${newData.email}`, "email_updated")
      changes.push("email")
    }

    // Check for phone change
    if (oldData.phone !== newData.phone && newData.phone) {
      await createNotification(accountId, `You've updated your phone number`, "phone_updated")
      changes.push("phone")
    }

    // Check for address change
    if (oldData.address !== newData.address && newData.address) {
      await createNotification(accountId, `You've updated your address`, "address_updated")
      changes.push("address")
    }

    // Check for birthday change (create notification if birthday changed, regardless of age)
    if (oldData.birthday !== newData.birthday) {
      if (newData.birthday) {
        await createNotification(accountId, `You've updated your birthday`, "birthday_updated")
        changes.push("birthday")
      }
    }

    // Check for age change (create notification if age changed, regardless of birthday)
    if (oldData.age !== newData.age) {
      if (newData.age) {
        await createNotification(accountId, `You've updated your age to ${newData.age}`, "age_updated")
        changes.push("age")
      }
    }

    // Check for gender change
    if (oldData.gender !== newData.gender && newData.gender) {
      await createNotification(accountId, `You've updated your gender to ${newData.gender}`, "gender_updated")
      changes.push("gender")
    }

    // Check for farm name change
    if (oldData.farmName !== newData.farmName && newData.farmName) {
      await createNotification(accountId, `You've updated your farm name to ${newData.farmName}`, "farm_name_updated")
      changes.push("farm name")
    }

    // Check for farm address change
    if (oldData.farmAddress !== newData.farmAddress && newData.farmAddress) {
      await createNotification(accountId, `You've updated your farm address`, "farm_address_updated")
      changes.push("farm address")
    }

    return changes
  } catch (error) {
    console.error("Error tracking profile changes:", error)
    throw error
  }
}

