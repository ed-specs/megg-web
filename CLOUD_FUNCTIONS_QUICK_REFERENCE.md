# Cloud Functions Quick Reference

## Installation

```bash
cd D:\CAPSTONE\megg-web-tech\functions
npm install
```

## Deployment

```bash
# Deploy all functions
firebase deploy --only functions

# Deploy specific function
firebase deploy --only functions:autoDisconnectStaleSessions
```

## Function Details

### autoDisconnectStaleSessions
- **Schedule:** Every 5 minutes
- **Action:** Disconnects sessions with `lastHeartbeat` > 10 minutes
- **Status:** `active` → `disconnected`

### cleanupOldSessions
- **Schedule:** Daily at 2:00 AM
- **Action:** Deletes disconnected sessions > 30 days old
- **Status:** Permanently deletes documents

### manualCleanupSessions (HTTP)
```bash
curl -X POST \
  https://[region]-[project].cloudfunctions.net/manualCleanupSessions \
  -H "Content-Type: application/json" \
  -d '{"maxAgeMinutes": 10, "maxAgeDays": 30}'
```

### getSessionStats (HTTP)
```bash
curl https://[region]-[project].cloudfunctions.net/getSessionStats
```

## Common Commands

```bash
# View logs
firebase functions:log

# View specific function logs
firebase functions:log --only autoDisconnectStaleSessions

# List all functions
firebase functions:list

# Test locally
npm run serve
```

## Monitoring

- Firebase Console: https://console.firebase.google.com/
- Navigate to: **Functions** → Select function → **Logs**

## Configuration

| Setting | Default | Location |
|---------|---------|----------|
| Stale threshold | 10 minutes | `functions/index.js:29` |
| Old threshold | 30 days | `functions/index.js:97` |
| Auto-disconnect schedule | Every 5 min | `functions/index.js:23` |
| Cleanup schedule | Daily 2 AM | `functions/index.js:91` |

## Troubleshooting

**Function not running?**
- Check: `firebase functions:list`
- View logs: `firebase functions:log`

**Permission errors?**
- Verify Firebase Admin SDK permissions in Console

**Quota exceeded?**
- Check usage: Firebase Console → Usage and billing

## Cost (Free Tier)

- 2M invocations/month (free)
- Our usage: ~8,760 invocations/month
- **Status:** Well within free tier ✅

## Quick Stats

```bash
# Get session statistics
curl https://[region]-[project].cloudfunctions.net/getSessionStats

# Response
{
  "total": 25,      // Total sessions
  "active": 8,      // Currently active
  "stale": 2,       // Active but no heartbeat >10 min
  "disconnected": 15 // Previously disconnected
}
```

---

**Full Documentation:** See `CLOUD_FUNCTIONS_SETUP.md`

