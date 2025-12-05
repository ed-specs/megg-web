# Updated Fields Reference Guide

## Quick Reference for New Data Structure

### Batches Collection

```javascript
// Document ID: BATCH-679622-0001 (not B-679622-0001)
{
  id: "BATCH-679622-0001",
  accountId: "MEGG-679622",
  name: "BATCH-679622-0001",
  status: "ready" | "processing" | "completed" | "archived",
  stats: {
    totalEggs: 50,
    smallEggs: 12,
    mediumEggs: 23,
    largeEggs: 15,
    goodEggs: 42,
    dirtyEggs: 5,
    crackEggs: 3  // ✅ NEW: was "badEggs"
  },
  createdAt: "2025-12-04T10:00:00.000Z",
  updatedAt: "2025-12-04T12:00:00.000Z"
}
```

### Eggs Collection

```javascript
// Document ID: EGG-6796220001-a3b5c (structured format)
{
  eggId: "EGG-6796220001-a3b5c",  // ✅ NEW format
  accountId: "MEGG-679622",
  batchId: "BATCH-679622-0001",
  weight: 45.23,                   // In grams
  size: "small" | "medium" | "large",  // ✅ NEW: separate field
  quality: "good" | "dirty" | "cracked",  // ✅ From Roboflow
  createdAt: "2025-12-04T10:05:00.000Z"
}
```

## Field Mapping

| Old Field | New Field | Location |
|-----------|-----------|----------|
| `badEggs` | `crackEggs` | batch.stats |
| Random eggId | `EGG-{batchDigits}-{random5}` | egg document ID |
| `B-` prefix | `BATCH-` prefix | batch document ID |
| Size in quality | Size in size field | egg.size |

## Query Examples

### Get all eggs from a batch (NEW format)
```javascript
const eggsQuery = query(
  collection(db, "eggs"),
  where("batchId", "==", "BATCH-679622-0001")  // ✅ Use BATCH- prefix
)
```

### Calculate defects (NEW)
```javascript
const defects = stats.crackEggs + stats.dirtyEggs  // ✅ Use crackEggs
```

### Get egg size (NEW)
```javascript
const eggSize = egg.size  // ✅ Read from size field, not quality
```

### Get egg quality (NEW)
```javascript
const eggQuality = egg.quality  // "good" | "dirty" | "cracked"
```

## Common Mistakes to Avoid

❌ **Don't do this:**
```javascript
// Wrong prefix
const batchId = "B-679622-0001"

// Wrong field name
const defects = stats.badEggs + stats.dirtyEggs

// Reading size from quality
if (egg.quality === 'small') { }
```

✅ **Do this:**
```javascript
// Correct prefix
const batchId = "BATCH-679622-0001"

// Correct field name
const defects = stats.crackEggs + stats.dirtyEggs

// Reading size from size field
if (egg.size === 'small') { }
```

## Roboflow Integration

Quality detection uses Roboflow's egg defect detection model:
- Camera captures egg image
- Roboflow analyzes and returns: `"good"`, `"dirty"`, or `"cracked"`
- Quality is saved to egg document
- Batch stats are updated accordingly

---

**Last Updated:** December 4, 2025

