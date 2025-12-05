# Data Structure Migration Summary

## Changes Made to Support New Kiosk Format

### 1. **Batch Document Structure**

#### OLD Format:
```javascript
{
  id: "B-679622-0001",
  stats: {
    badEggs: 5  // ❌ Old field
  }
}
```

#### NEW Format:
```javascript
{
  id: "BATCH-679622-0001",  // ✅ Changed prefix
  stats: {
    crackEggs: 5  // ✅ New field name
  }
}
```

### 2. **Egg Document Structure**

#### OLD Format:
```javascript
{
  eggId: "random8chars",  // ❌ Random ID
  quality: "good",        // Stored in quality field
  size: undefined         // ❌ Size not stored separately
}
```

#### NEW Format:
```javascript
{
  eggId: "EGG-6796220001-a3b5c",  // ✅ Structured ID
  quality: "good" | "dirty" | "cracked",  // ✅ From Roboflow
  size: "small" | "medium" | "large"      // ✅ Computed from weight
}
```

### 3. **Files Updated**

#### ✅ Kiosk Frontend (E:\MEGG-FINAL\kiosk-next-frontend)
- `app/services/batchService.ts` - Changed `badEggs` → `crackEggs`
- `app/page.tsx` - Updated batch ID format and egg ID generation
- `app/components/BatchTab.tsx` - UI updated to show "Cracked" instead of "Bad"
- `app/components/BatchModal.tsx` - Changed prefix display

#### ✅ Web Dashboard (D:\CAPSTONE\megg-web-tech)
- `app/lib/overview/sizing/EggSizeStats.js` - Updated to use `crackEggs`
  - Line 88: Changed defect calculation
  - Line 106: Changed total calculation
  - Line 152-158: Changed from `badEggs` to `crackEggs`
  - Line 131-142: Fixed to read `size` field instead of `quality` for egg size
  - Line 228-236: Fixed distribution to use `size` field
- `app/lib/inventory/InventoryData.js` - Already using `crackEggs` ✅

### 4. **Key Behavior Changes**

#### Egg Size Classification
**Before:** Size was stored in `quality` field
```javascript
if (quality === 'small') small++
```

**After:** Size is in separate `size` field
```javascript
if (size === 'small') small++
```

#### Defect Calculation
**Before:** 
```javascript
defect = badEggs + dirtyEggs
mostCommonDefect = bad > dirty ? 'Bad' : 'Dirty'
```

**After:**
```javascript
defect = crackEggs + dirtyEggs
mostCommonDefect = cracked > dirty ? 'Cracked' : 'Dirty'
```

### 5. **Quality Values (from Roboflow)**

The kiosk now uses Roboflow for quality detection:
- `"good"` - Clean, uncracked eggs
- `"dirty"` - Eggs with dirt/stains
- `"cracked"` - Eggs with visible cracks

### 6. **Batch ID Format**

**Old:** `B-679622-0001`
**New:** `BATCH-679622-0001`

All queries and displays have been updated accordingly.

### 7. **Egg ID Format**

**Old:** Random 8 characters (e.g., `a3b5c7d9`)
**New:** Structured format: `EGG-{batchDigits}-{5random}`

Example:
- Batch: `BATCH-679622-0001`
- Egg ID: `EGG-6796220001-a3b5c`

---

## Testing Checklist

- [ ] Create new batch from kiosk
- [ ] Process eggs through sorting
- [ ] Verify batch stats update correctly in dashboard
- [ ] Check overview charts display correct data
- [ ] Verify inventory page shows correct counts
- [ ] Test with dummy data script

## Dummy Data

Use the script in `E:\MEGG-FINAL\kiosk-next-frontend\scripts\uploadDummyDataSimple.js` to generate test data with the new format.

---

**Migration Date:** December 4, 2025
**Status:** ✅ Complete

