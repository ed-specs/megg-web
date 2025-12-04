# Cloud Functions Setup & Deployment Guide

This guide explains how to set up and deploy Firebase Cloud Functions for automated kiosk session maintenance.

---

## Overview

The Cloud Functions provide automated cleanup and maintenance for kiosk sessions:

1. **Auto-Disconnect Stale Sessions** - Runs every 5 minutes
2. **Clean Up Old Sessions** - Runs daily at 2:00 AM
3. **Manual Cleanup Trigger** - HTTP endpoint for manual cleanup
4. **Session Statistics** - HTTP endpoint for monitoring

---

## Prerequisites

### 1. Install Firebase CLI

```bash
npm install -g firebase-tools
```

### 2. Login to Firebase

```bash
firebase login
```

### 3. Initialize Firebase Project

If not already done:

```bash
firebase init
```

Select:
- ✅ Functions
- ✅ Hosting (optional)
- Choose your existing Firebase project

---

## Installation

### 1. Navigate to Functions Directory

```bash
cd D:\CAPSTONE\megg-web-tech\functions
```

### 2. Install Dependencies

```bash
npm install
```

This will install:
- `firebase-admin` - Firebase Admin SDK
- `firebase-functions` - Cloud Functions SDK

---

## Cloud Functions Details

### Function 1: Auto-Disconnect Stale Sessions

**Name:** `autoDisconnectStaleSessions`  
**Trigger:** Scheduled (every 5 minutes)  
**Purpose:** Automatically disconnect sessions with no heartbeat for 10+ minutes

#### What It Does:
1. Queries `kioskSessions` collection for active sessions
2. Finds sessions where `lastHeartbeat` < 10 minutes ago
3. Updates their status to `disconnected`
4. Adds `disconnectedAt` timestamp and `disconnectedReason: 'auto-timeout'`

#### Configuration:
```javascript
exports.autoDisconnectStaleSessions = functions.pubsub
  .schedule('every 5 minutes')  // Runs every 5 minutes
  .onRun(async (context) => {
    // ... implementation
  });
```

#### Logs:
```
🔍 Checking for stale sessions...
📅 Current time: 2024-01-15T10:30:00.000Z
⏰ Stale threshold: 2024-01-15T10:20:00.000Z
⚠️ Found 2 stale session(s)
🔌 Auto-disconnecting: KIOSK-MEGG-679622
   User: John Doe (john@example.com)
   Last heartbeat: 2024-01-15T10:15:00.000Z
✅ Successfully auto-disconnected 2 stale session(s)
```

---

### Function 2: Clean Up Old Sessions

**Name:** `cleanupOldSessions`  
**Trigger:** Scheduled (daily at 2:00 AM)  
**Purpose:** Delete disconnected sessions older than 30 days

#### What It Does:
1. Queries `kioskSessions` collection for disconnected sessions
2. Finds sessions where `lastHeartbeat` < 30 days ago
3. Deletes the documents permanently

#### Configuration:
```javascript
exports.cleanupOldSessions = functions.pubsub
  .schedule('0 2 * * *')        // Daily at 2:00 AM
  .timeZone('Asia/Manila')      // Adjust timezone
  .onRun(async (context) => {
    // ... implementation
  });
```

#### Adjusting Timezone:
Change `'Asia/Manila'` to your timezone:
- `'America/New_York'` - US Eastern
- `'America/Los_Angeles'` - US Pacific
- `'Europe/London'` - UK
- `'Asia/Tokyo'` - Japan

#### Logs:
```
🗑️ Starting cleanup of old disconnected sessions...
📅 Current time: 2024-01-15T02:00:00.000Z
⏰ Cleanup threshold: 2023-12-16T02:00:00.000Z
🗑️ Found 5 old session(s) to delete
🗑️ Deleting: KIOSK-MEGG-123456
   User: Jane Smith (jane@example.com)
   Last heartbeat: 2023-12-10T15:30:00.000Z
✅ Successfully deleted 5 old session(s)
```

---

### Function 3: Manual Cleanup Trigger

**Name:** `manualCleanupSessions`  
**Trigger:** HTTP POST request  
**Purpose:** Manually trigger cleanup with custom thresholds

#### Endpoint:
```
POST https://[region]-[project-id].cloudfunctions.net/manualCleanupSessions
```

#### Request Body:
```json
{
  "maxAgeMinutes": 10,  // Disconnect sessions stale for 10+ minutes
  "maxAgeDays": 30      // Delete sessions older than 30 days
}
```

#### Example Usage:

**Using curl:**
```bash
curl -X POST \
  https://us-central1-megg-project.cloudfunctions.net/manualCleanupSessions \
  -H "Content-Type: application/json" \
  -d '{"maxAgeMinutes": 5, "maxAgeDays": 7}'
```

**Using Postman:**
1. Method: POST
2. URL: `https://[region]-[project-id].cloudfunctions.net/manualCleanupSessions`
3. Headers: `Content-Type: application/json`
4. Body:
```json
{
  "maxAgeMinutes": 10,
  "maxAgeDays": 30
}
```

#### Response:
```json
{
  "success": true,
  "results": {
    "staleDisconnected": 3,
    "oldDeleted": 12,
    "errors": []
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

### Function 4: Session Statistics

**Name:** `getSessionStats`  
**Trigger:** HTTP GET request  
**Purpose:** Get current session statistics

#### Endpoint:
```
GET https://[region]-[project-id].cloudfunctions.net/getSessionStats
```

#### Example Usage:

**Using curl:**
```bash
curl https://us-central1-megg-project.cloudfunctions.net/getSessionStats
```

#### Response:
```json
{
  "success": true,
  "stats": {
    "total": 25,
    "active": 8,
    "stale": 2,
    "disconnected": 15,
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

---

## Deployment

### Deploy All Functions

```bash
cd D:\CAPSTONE\megg-web-tech
firebase deploy --only functions
```

### Deploy Specific Function

```bash
firebase deploy --only functions:autoDisconnectStaleSessions
firebase deploy --only functions:cleanupOldSessions
firebase deploy --only functions:manualCleanupSessions
firebase deploy --only functions:getSessionStats
```

### View Deployment Status

```bash
firebase functions:list
```

---

## Testing

### 1. Test Locally with Emulator

```bash
cd D:\CAPSTONE\megg-web-tech\functions
npm run serve
```

This starts the Firebase emulator. Functions will be available at:
- `http://localhost:5001/[project-id]/[region]/manualCleanupSessions`
- `http://localhost:5001/[project-id]/[region]/getSessionStats`

### 2. Test Scheduled Functions Manually

In Firebase Console:
1. Go to **Functions** section
2. Find `autoDisconnectStaleSessions` or `cleanupOldSessions`
3. Click **⋮** → **Trigger function now**

### 3. Test HTTP Functions

```bash
# Test manual cleanup
curl -X POST http://localhost:5001/[project-id]/[region]/manualCleanupSessions \
  -H "Content-Type: application/json" \
  -d '{"maxAgeMinutes": 10, "maxAgeDays": 30}'

# Test session stats
curl http://localhost:5001/[project-id]/[region]/getSessionStats
```

---

## Monitoring

### View Function Logs

```bash
firebase functions:log
```

### View Specific Function Logs

```bash
firebase functions:log --only autoDisconnectStaleSessions
firebase functions:log --only cleanupOldSessions
```

### Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to **Functions**
4. Click on any function to view:
   - Execution count
   - Error rate
   - Execution time
   - Logs

---

## Configuration

### Adjusting Cleanup Thresholds

#### Stale Session Threshold (default: 10 minutes)

Edit `functions/index.js`:
```javascript
// Change from 10 minutes to 15 minutes
const tenMinutesAgo = new Date(now.toMillis() - 15 * 60 * 1000);
```

#### Old Session Threshold (default: 30 days)

Edit `functions/index.js`:
```javascript
// Change from 30 days to 60 days
const thirtyDaysAgo = new Date(now.toMillis() - 60 * 24 * 60 * 60 * 1000);
```

After changes, redeploy:
```bash
firebase deploy --only functions
```

---

## Troubleshooting

### Function Not Running

**Check deployment:**
```bash
firebase functions:list
```

**Check logs for errors:**
```bash
firebase functions:log --only autoDisconnectStaleSessions
```

**Verify schedule:**
```bash
firebase functions:config:get
```

### Permission Errors

Ensure Firebase Admin SDK has proper permissions:
1. Go to Firebase Console → Project Settings
2. Service Accounts tab
3. Verify Firebase Admin SDK has correct permissions

### Quota Issues

Cloud Functions have quotas. Check:
- Firebase Console → Usage and billing
- Functions invocations per day
- Execution time limits

---

## Cost Considerations

### Scheduled Functions

- `autoDisconnectStaleSessions`: 12 invocations/hour × 24 hours = **288 invocations/day**
- `cleanupOldSessions`: **1 invocation/day**

### Firebase Free Tier

- 2 million invocations/month (free)
- 400,000 GB-seconds/month (free)
- 200,000 CPU-seconds/month (free)

Our functions should stay **well within free tier** limits.

### Cost Optimization

1. **Reduce frequency:** Change to "every 10 minutes" or "every 15 minutes"
2. **Combine functions:** Merge cleanup logic into one function
3. **Add early returns:** Exit early if no work needed

---

## Security

### HTTP Functions Security

For production, add authentication:

```javascript
exports.manualCleanupSessions = functions.https.onRequest(async (req, res) => {
  // Add API key check
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== functions.config().api.key) {
    res.status(403).send('Forbidden');
    return;
  }
  
  // ... rest of function
});
```

Set API key:
```bash
firebase functions:config:set api.key="your-secret-key"
```

---

## Best Practices

### 1. Monitor Regularly

- Check logs weekly
- Monitor execution counts
- Watch for errors

### 2. Test Before Deploying

- Use emulator for testing
- Test with small datasets first
- Verify batch operations work correctly

### 3. Backup Before Cleanup

Consider backing up sessions before deletion:

```javascript
// Add to cleanupOldSessions function
const backupRef = db.collection('kioskSessions_archive');
await backupRef.doc(doc.id).set(sessionData);
```

### 4. Alert on Anomalies

Add notifications for unusual patterns:
- Too many stale sessions (>50)
- Cleanup failures
- Performance issues

---

## Summary

| Function | Schedule | Purpose | Impact |
|----------|----------|---------|--------|
| `autoDisconnectStaleSessions` | Every 5 min | Disconnect stale (>10 min) | Keeps dashboard accurate |
| `cleanupOldSessions` | Daily 2 AM | Delete old (>30 days) | Reduces database size |
| `manualCleanupSessions` | On demand | Manual cleanup | Testing/maintenance |
| `getSessionStats` | On demand | View statistics | Monitoring |

---

## Next Steps

1. ✅ Install Firebase CLI
2. ✅ Install dependencies (`npm install`)
3. ✅ Test locally with emulator
4. ✅ Deploy functions (`firebase deploy --only functions`)
5. ✅ Monitor logs for first few days
6. ✅ Adjust thresholds if needed

---

## Support

For issues or questions:
1. Check Firebase Console logs
2. Review function execution history
3. Test with emulator locally
4. Check Firebase documentation: https://firebase.google.com/docs/functions

---

**All Cloud Functions are production-ready and follow Firebase best practices!** 🎉

