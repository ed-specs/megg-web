# Debugging Guide: "No egg size data available"

## Changes Made to Fix the Issue

### 1. **Extended Date Range** ⏰
**Problem:** "Daily" view only showed eggs from today (midnight to now)
**Fix:** Changed to show last 7 days for better testing coverage

```javascript
// Before:
startDate.setHours(0, 0, 0, 0)  // Only today

// After:
startDate.setDate(endDate.getDate() - 7)  // Last 7 days
```

### 2. **Added Debugging Logs** 🔍
Added console logs to help you see what's happening:
- Current accountId
- Number of batches found
- Date range being queried
- Batch details and filtering
- Egg documents found

### 3. **Fixed Fallback Logic** 🔄
**Problem:** Code only read eggs if batches had no `goodEggs` field
**Fix:** Now reads eggs if `goodEggs` exists but is 0

```javascript
// Before:
if (!foundGoodField) { /* read eggs */ }

// After:
if (!foundGoodField || totalEggsSorted === 0) { /* read eggs */ }
```

## How to Debug

### Step 1: Open Browser Console
1. Open your dashboard
2. Press `F12` to open DevTools
3. Go to **Console** tab
4. Navigate to Overview page

### Step 2: Check Console Logs
Look for these messages:

```
[EggSizeStats] Current accountId: MEGG-679622
[EggSizeStats] Date range: 2025-11-27T... to 2025-12-04T...
[EggSizeStats] Found 1 batch documents
[EggSizeStats] Batch: BATCH-679622-0003 created: 2025-12-04T...
[EggSizeStats] Filtered to 1 batches in date range
```

### Step 3: Check Firestore Data

#### Verify Batches:
```javascript
// In Firebase Console or browser console:
// Check if batch exists
db.collection('batches')
  .where('accountId', '==', 'MEGG-679622')
  .get()
  .then(snap => console.log(snap.size, 'batches found'))
```

#### Verify Eggs:
```javascript
// Check if eggs exist
db.collection('eggs')
  .where('accountId', '==', 'MEGG-679622')
  .get()
  .then(snap => console.log(snap.size, 'eggs found'))
```

## Common Issues & Solutions

### Issue 1: "0 batch documents found"
**Cause:** AccountId mismatch or no batches in Firestore
**Solution:** 
- Check if batch has correct `accountId` field: `"MEGG-679622"`
- Run dummy data script to create test data

### Issue 2: "Batch found but filtered to 0"
**Cause:** Batch `createdAt` is outside date range
**Solution:** 
- Check batch `createdAt` timestamp
- Use "Weekly" or "Monthly" view for older data

### Issue 3: "Eggs not showing in distribution"
**Cause:** Batch has `goodEggs` field but stats are 0
**Solution:** Fixed with fallback logic update

### Issue 4: Wrong field names
**Cause:** Using old `badEggs` or reading size from `quality`
**Solution:** Already fixed in the code

## Testing with Dummy Data

Run this script to create test data:
```bash
cd E:\MEGG-FINAL\kiosk-next-frontend
node scripts/uploadDummyDataSimple.js
```

This will create:
- ✅ 1 Batch: `BATCH-679622-0003`
- ✅ 50 Eggs: `EGG-6796220003-xxxxx`
- ✅ All with `accountId: "MEGG-679622"`

## Quick Checklist

- [ ] Batch exists with `accountId: "MEGG-679622"`
- [ ] Batch ID format: `BATCH-679622-xxxx` (not `B-679622-xxxx`)
- [ ] Batch has `stats.crackEggs` (not `badEggs`)
- [ ] Eggs exist with same `accountId`
- [ ] Egg document ID format: `EGG-6796220003-xxxxx`
- [ ] Egg has `size` field (small/medium/large)
- [ ] Egg has `quality` field (good/dirty/cracked)
- [ ] Dates are within range (check console logs)

## Expected Console Output

When working correctly, you should see:
```
[EggSizeStats] Current accountId: MEGG-679622
[EggSizeStats] Date range: 2025-11-27... to 2025-12-04...
[EggSizeStats] Found 1 batch documents
[EggSizeStats] Batch: BATCH-679622-0003 created: 2025-12-04... stats: {totalEggs: 50, ...}
[EggSizeStats] Filtered to 1 batches in date range
```

Or if reading from eggs directly:
```
[EggSizeStats] No eggs in batches, querying eggs collection...
[EggSizeStats] Found 50 egg documents
[EggSizeStats] Final sizeCounts: {small: 12, medium: 23, large: 15, defect: 8}
```

---

**Last Updated:** December 4, 2025

