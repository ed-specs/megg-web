/**
 * MEGG Cloud Functions
 * Automated maintenance tasks for kiosk session management
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize Firebase Admin
admin.initializeApp();

const db = admin.firestore();

/**
 * Cloud Function 1: Auto-Disconnect Stale Sessions
 * 
 * Runs every 5 minutes to check for sessions with lastHeartbeat > 10 minutes
 * and automatically marks them as "disconnected"
 * 
 * This handles cases where:
 * - Kiosk loses power unexpectedly
 * - Browser crashes without triggering beforeunload
 * - Network disconnection prevents proper session end
 */
exports.autoDisconnectStaleSessions = functions.pubsub
  .schedule('every 5 minutes')
  .onRun(async (context) => {
    const now = admin.firestore.Timestamp.now();
    const tenMinutesAgo = new Date(now.toMillis() - 10 * 60 * 1000);
    
    console.log('🔍 Checking for stale sessions...');
    console.log('📅 Current time:', now.toDate().toISOString());
    console.log('⏰ Stale threshold:', tenMinutesAgo.toISOString());

    try {
      // Query for active sessions with lastHeartbeat older than 10 minutes
      const staleSessionsQuery = db.collection('kioskSessions')
        .where('status', '==', 'active')
        .where('lastHeartbeat', '<', admin.firestore.Timestamp.fromDate(tenMinutesAgo));

      const staleSessionsSnapshot = await staleSessionsQuery.get();

      if (staleSessionsSnapshot.empty) {
        console.log('✅ No stale sessions found');
        return null;
      }

      console.log(`⚠️ Found ${staleSessionsSnapshot.size} stale session(s)`);

      // Batch update all stale sessions
      const batch = db.batch();
      let disconnectedCount = 0;

      staleSessionsSnapshot.forEach((doc) => {
        const sessionData = doc.data();
        console.log(`🔌 Auto-disconnecting: ${doc.id}`);
        console.log(`   User: ${sessionData.userName} (${sessionData.userEmail})`);
        console.log(`   Last heartbeat: ${sessionData.lastHeartbeat.toDate().toISOString()}`);
        
        batch.update(doc.ref, {
          status: 'disconnected',
          disconnectedAt: now,
          disconnectedReason: 'auto-timeout',
          lastHeartbeat: now // Update to current time for tracking
        });
        
        disconnectedCount++;
      });

      // Commit the batch
      await batch.commit();
      
      console.log(`✅ Successfully auto-disconnected ${disconnectedCount} stale session(s)`);
      
      return {
        success: true,
        disconnectedCount,
        timestamp: now.toDate().toISOString()
      };

    } catch (error) {
      console.error('❌ Error auto-disconnecting stale sessions:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

/**
 * Cloud Function 2: Clean Up Old Disconnected Sessions
 * 
 * Runs daily at 2:00 AM to delete session documents that have been
 * disconnected for more than 30 days
 * 
 * This keeps the database clean and prevents unlimited growth of
 * historical session data
 */
exports.cleanupOldSessions = functions.pubsub
  .schedule('0 2 * * *') // Daily at 2:00 AM
  .timeZone('Asia/Manila') // Adjust timezone as needed
  .onRun(async (context) => {
    const now = admin.firestore.Timestamp.now();
    const thirtyDaysAgo = new Date(now.toMillis() - 30 * 24 * 60 * 60 * 1000);
    
    console.log('🗑️ Starting cleanup of old disconnected sessions...');
    console.log('📅 Current time:', now.toDate().toISOString());
    console.log('⏰ Cleanup threshold:', thirtyDaysAgo.toISOString());

    try {
      // Query for disconnected sessions older than 30 days
      // Note: We check 'lastHeartbeat' as it's the last activity timestamp
      const oldSessionsQuery = db.collection('kioskSessions')
        .where('status', '==', 'disconnected')
        .where('lastHeartbeat', '<', admin.firestore.Timestamp.fromDate(thirtyDaysAgo));

      const oldSessionsSnapshot = await oldSessionsQuery.get();

      if (oldSessionsSnapshot.empty) {
        console.log('✅ No old sessions to clean up');
        return null;
      }

      console.log(`🗑️ Found ${oldSessionsSnapshot.size} old session(s) to delete`);

      // Batch delete all old sessions
      const batch = db.batch();
      let deletedCount = 0;

      oldSessionsSnapshot.forEach((doc) => {
        const sessionData = doc.data();
        console.log(`🗑️ Deleting: ${doc.id}`);
        console.log(`   User: ${sessionData.userName} (${sessionData.userEmail})`);
        console.log(`   Last heartbeat: ${sessionData.lastHeartbeat.toDate().toISOString()}`);
        
        batch.delete(doc.ref);
        deletedCount++;
      });

      // Commit the batch
      await batch.commit();
      
      console.log(`✅ Successfully deleted ${deletedCount} old session(s)`);
      
      return {
        success: true,
        deletedCount,
        timestamp: now.toDate().toISOString()
      };

    } catch (error) {
      console.error('❌ Error cleaning up old sessions:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

/**
 * Cloud Function 3: Manual Session Cleanup Trigger (HTTP)
 * 
 * Provides an HTTP endpoint to manually trigger cleanup
 * Useful for testing or immediate cleanup needs
 * 
 * Usage: POST https://[region]-[project].cloudfunctions.net/manualCleanupSessions
 * Body: { "maxAgeMinutes": 10, "maxAgeDays": 30 }
 */
exports.manualCleanupSessions = functions.https.onRequest(async (req, res) => {
  // Only allow POST requests
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  const maxAgeMinutes = req.body.maxAgeMinutes || 10;
  const maxAgeDays = req.body.maxAgeDays || 30;

  const now = admin.firestore.Timestamp.now();
  const staleThreshold = new Date(now.toMillis() - maxAgeMinutes * 60 * 1000);
  const oldThreshold = new Date(now.toMillis() - maxAgeDays * 24 * 60 * 60 * 1000);

  console.log('🧹 Manual cleanup triggered');
  console.log(`⏰ Stale threshold: ${maxAgeMinutes} minutes`);
  console.log(`⏰ Old threshold: ${maxAgeDays} days`);

  const results = {
    staleDisconnected: 0,
    oldDeleted: 0,
    errors: []
  };

  try {
    // Step 1: Disconnect stale sessions
    const staleQuery = db.collection('kioskSessions')
      .where('status', '==', 'active')
      .where('lastHeartbeat', '<', admin.firestore.Timestamp.fromDate(staleThreshold));

    const staleSnapshot = await staleQuery.get();
    
    if (!staleSnapshot.empty) {
      const staleBatch = db.batch();
      staleSnapshot.forEach((doc) => {
        staleBatch.update(doc.ref, {
          status: 'disconnected',
          disconnectedAt: now,
          disconnectedReason: 'manual-cleanup',
          lastHeartbeat: now
        });
        results.staleDisconnected++;
      });
      await staleBatch.commit();
    }

    // Step 2: Delete old disconnected sessions
    const oldQuery = db.collection('kioskSessions')
      .where('status', '==', 'disconnected')
      .where('lastHeartbeat', '<', admin.firestore.Timestamp.fromDate(oldThreshold));

    const oldSnapshot = await oldQuery.get();
    
    if (!oldSnapshot.empty) {
      const oldBatch = db.batch();
      oldSnapshot.forEach((doc) => {
        oldBatch.delete(doc.ref);
        results.oldDeleted++;
      });
      await oldBatch.commit();
    }

    console.log('✅ Manual cleanup completed successfully');
    console.log(`   Stale sessions disconnected: ${results.staleDisconnected}`);
    console.log(`   Old sessions deleted: ${results.oldDeleted}`);

    res.status(200).json({
      success: true,
      results,
      timestamp: now.toDate().toISOString()
    });

  } catch (error) {
    console.error('❌ Error during manual cleanup:', error);
    results.errors.push(error.message);
    
    res.status(500).json({
      success: false,
      results,
      error: error.message
    });
  }
});

/**
 * Cloud Function 4: Get Session Statistics (HTTP)
 * 
 * Provides session statistics for monitoring
 * 
 * Usage: GET https://[region]-[project].cloudfunctions.net/getSessionStats
 */
exports.getSessionStats = functions.https.onRequest(async (req, res) => {
  try {
    const now = admin.firestore.Timestamp.now();
    const tenMinutesAgo = new Date(now.toMillis() - 10 * 60 * 1000);

    // Get all sessions
    const allSessionsSnapshot = await db.collection('kioskSessions').get();
    
    // Get active sessions
    const activeSessionsSnapshot = await db.collection('kioskSessions')
      .where('status', '==', 'active')
      .get();
    
    // Get stale active sessions
    const staleSessionsSnapshot = await db.collection('kioskSessions')
      .where('status', '==', 'active')
      .where('lastHeartbeat', '<', admin.firestore.Timestamp.fromDate(tenMinutesAgo))
      .get();

    // Get disconnected sessions
    const disconnectedSessionsSnapshot = await db.collection('kioskSessions')
      .where('status', '==', 'disconnected')
      .get();

    const stats = {
      total: allSessionsSnapshot.size,
      active: activeSessionsSnapshot.size,
      stale: staleSessionsSnapshot.size,
      disconnected: disconnectedSessionsSnapshot.size,
      timestamp: now.toDate().toISOString()
    };

    console.log('📊 Session statistics:', stats);

    res.status(200).json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('❌ Error getting session stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

