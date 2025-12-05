# Runtime Error Fix: "Cannot read properties of undefined (reading 'toFixed')"

## Error Details
```
Error: Cannot read properties of undefined (reading 'toFixed')
Location: EggSizeStats component
```

## Root Cause
The `getMachineLinkedEggSizeStats` function was returning a field named `eggsPerMinute`, but the component was trying to access `avgEggsPerHour`.

```javascript
// Function returned:
return { eggsPerMinute, ... }  // ❌ Wrong field name

// Component expected:
stats.avgEggsPerHour.toFixed(1)  // ❌ Undefined!
```

## Fix Applied

### 1. Fixed Field Name Mismatch
**File:** `app/lib/overview/sizing/EggSizeStats.js`

```javascript
// Before:
return { eggsPerMinute, ... }

// After:
const avgEggsPerHour = eggsPerMinute * 60  // Convert to per-hour
return { avgEggsPerHour, ... }
```

### 2. Added Missing Fields to Error Handler
Also fixed the catch block to return all expected fields:

```javascript
catch (error) {
  return {
    totalEggs: 0,
    totalAllEggs: 0,        // ✅ Added
    totalDefects: 0,
    avgEggsPerHour: 0,      // ✅ Fixed field name
    mostCommonSize: "None",
    mostCommonDefect: "None",
    defectRate: "0%"
  }
}
```

### 3. Added Safety Fallbacks
Added null-safe fallbacks to prevent future errors:

**EggSizeStats.js:**
```javascript
// Before:
value={stats.avgEggsPerHour.toFixed(1)}  // ❌ Crashes if undefined

// After:
value={(stats.avgEggsPerHour || 0).toFixed(1)}  // ✅ Safe
```

**EggDefectStats.js:**
```javascript
value={(stats.avgDefectsPerHour || 0).toFixed(1)}  // ✅ Safe
```

**Donut Charts:**
```javascript
// Before:
{((segments[hoveredSegment].value / total) * 100).toFixed(1)}%

// After:
{(((segments[hoveredSegment].value || 0) / (total || 1)) * 100).toFixed(1)}%
```

## Files Updated

1. ✅ `app/lib/overview/sizing/EggSizeStats.js`
   - Fixed return field name: `eggsPerMinute` → `avgEggsPerHour`
   - Added conversion: eggs per minute × 60 = eggs per hour
   - Fixed error handler return object

2. ✅ `app/dashboard/overview/components/ui/EggSizeStats.js`
   - Added safety: `(stats.avgEggsPerHour || 0).toFixed(1)`

3. ✅ `app/dashboard/overview/components/ui/EggDefectStats.js`
   - Added safety: `(stats.avgDefectsPerHour || 0).toFixed(1)`

4. ✅ `app/dashboard/overview/components/ui/EggSizeDonutChart.js`
   - Added null checks and division by zero protection

5. ✅ `app/dashboard/overview/components/ui/EggDefectDonutChart.js`
   - Added null checks and division by zero protection

## Why This Happened

The function was calculating eggs per minute internally but needed to return eggs per hour to match the UI expectation. The field name mismatch caused `undefined` to be accessed, leading to the `.toFixed()` error.

## Benefits of Fix

- ✅ **Correct field names** - Matches UI expectations
- ✅ **Proper unit conversion** - Eggs per minute → eggs per hour
- ✅ **Safe fallbacks** - Won't crash on undefined/null values
- ✅ **Division by zero protection** - Charts won't crash on empty data
- ✅ **Consistent error handling** - Returns all expected fields

## Testing

The dashboard should now:
1. ✅ Load without runtime errors
2. ✅ Display "0.0" instead of crashing when no data
3. ✅ Show correct avg eggs per hour calculation
4. ✅ Handle null/undefined values gracefully

---

**Date Fixed:** December 4, 2025  
**Status:** ✅ Complete - All components updated with safety checks

