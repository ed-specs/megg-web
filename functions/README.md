# MEGG Cloud Functions

Automated maintenance tasks for kiosk session management.

## Quick Start

### Install Dependencies
```bash
npm install
```

### Test Locally
```bash
npm run serve
```

### Deploy to Firebase
```bash
npm run deploy
```

### View Logs
```bash
npm run logs
```

## Functions

### 1. autoDisconnectStaleSessions
- **Trigger:** Scheduled (every 5 minutes)
- **Purpose:** Auto-disconnect sessions with no heartbeat for 10+ minutes

### 2. cleanupOldSessions
- **Trigger:** Scheduled (daily at 2:00 AM)
- **Purpose:** Delete disconnected sessions older than 30 days

### 3. manualCleanupSessions
- **Trigger:** HTTP POST
- **Purpose:** Manual cleanup with custom thresholds

### 4. getSessionStats
- **Trigger:** HTTP GET
- **Purpose:** Get current session statistics

## Documentation

See [CLOUD_FUNCTIONS_SETUP.md](../CLOUD_FUNCTIONS_SETUP.md) for complete setup and deployment guide.

## Requirements

- Node.js 18+
- Firebase CLI
- Firebase project with Blaze plan (for scheduled functions)

## Testing

Test endpoints locally:

```bash
# Manual cleanup
curl -X POST http://localhost:5001/[project-id]/[region]/manualCleanupSessions \
  -H "Content-Type: application/json" \
  -d '{"maxAgeMinutes": 10, "maxAgeDays": 30}'

# Session stats
curl http://localhost:5001/[project-id]/[region]/getSessionStats
```

## Monitoring

View logs in Firebase Console or use:
```bash
firebase functions:log
```

## Support

Check the [main documentation](../CLOUD_FUNCTIONS_SETUP.md) for troubleshooting and configuration.

