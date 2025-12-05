import { collection, getDocs, query, where, orderBy, doc, getDoc } from "firebase/firestore"
import { db } from "../../../config/firebaseConfig"
import { getUserAccountId } from "../../../utils/auth-utils"

// Helpers
const tsToDate = (ts) => {
  try {
    if (!ts) return new Date()
    if (typeof ts?.toDate === 'function') return ts.toDate()
    if (typeof ts?.seconds === 'number') return new Date(ts.seconds * 1000)
    const d = new Date(ts)
    return isNaN(d) ? new Date() : d
  } catch {
    return new Date()
  }
}

const getCurrentAccountId = () => {
  try {
    // Use getUserAccountId which reads directly from localStorage
    const accountId = getUserAccountId()
    console.log('[EggSizeStats] Retrieved accountId from localStorage:', accountId)
    return accountId
  } catch (e) {
    console.error("EggSizeStats: failed to get accountId", e)
    return null
  }
}

const pickMostCommonSize = (counts) => {
  const pairs = [
    ['Small', Number(counts.small || 0)],
    ['Medium', Number(counts.medium || 0)],
    ['Large', Number(counts.large || 0)],
  ]
  const max = Math.max(...pairs.map(([, v]) => v))
  if (max <= 0) return 'None'
  const winners = pairs.filter(([, v]) => v === max).map(([k]) => k)
  return winners.length > 1 ? winners.join(' & ') : winners[0]
}

// Get egg size statistics for linked machines
export const getMachineLinkedEggSizeStats = async (period = 'daily') => {
  try {
    const accountId = getCurrentAccountId()
    console.log('[EggSizeStats] Current accountId:', accountId)
    if (!accountId) {
      return { totalEggs: 0, avgEggsPerHour: 0, sortingAccuracy: "0.00%", mostCommonSize: "None" }
    }

    // Get ALL batches for this account (no date filtering)
    console.log('[EggSizeStats] Fetching ALL batches for accountId:', accountId)

    const qBatches = query(
      collection(db, "batches"),
      where("accountId", "==", accountId)
    )

    const snap = await getDocs(qBatches)
    console.log('[EggSizeStats] Found', snap.size, 'batch documents')
    const batches = snap.docs.map(d => {
      const data = d.data()
      console.log('[EggSizeStats] Batch:', data.id, 'created:', data.createdAt, 'stats:', data.stats)
      return data
    })
    console.log('[EggSizeStats] Processing', batches.length, 'batches')

    // Aggregate counts (from batches)
    let totals = { small: 0, medium: 0, large: 0, defect: 0, good: 0 }
    let totalGoodFromBatches = 0
    let foundGoodField = false
    let earliest = null
    let latest = null
    let minutesSum = 0
    let eggsTotalForRate = 0
    batches.forEach(b => {
      const s = b?.stats || {}
      totals.small += Number(s.smallEggs || 0)
      totals.medium += Number(s.mediumEggs || 0)
      totals.large += Number(s.largeEggs || 0)
      totals.defect += Number((s.crackEggs || 0) + (s.dirtyEggs || 0))
      if (typeof s.goodEggs === 'number') {
        totalGoodFromBatches += Number(s.goodEggs)
        foundGoodField = true
      }
      const good = typeof s.goodEggs === 'number' ? Number(s.goodEggs) : (Number(s.smallEggs||0)+Number(s.mediumEggs||0)+Number(s.largeEggs||0))
      totals.good += good

      const created = tsToDate(b?.createdAt)
      // support both updatedAt and updated_at
      const updatedRaw = (b?.updatedAt !== undefined ? b.updatedAt : b?.updated_at)
      const updated = tsToDate(updatedRaw) || created
      earliest = !earliest || created < earliest ? created : earliest
      latest = !latest || created > latest ? created : latest
      const durMin = Math.max((updated - created) / (1000 * 60), 1)
      minutesSum += durMin
      const totalThisBatch = typeof s.totalEggs === 'number'
        ? Number(s.totalEggs)
        : (Number(s.smallEggs||0) + Number(s.mediumEggs||0) + Number(s.largeEggs||0) + Number((s.crackEggs||0) + (s.dirtyEggs||0)))
      eggsTotalForRate += totalThisBatch
    })

    // Total Eggs Sorted: prefer explicit goodEggs if available
    let totalEggsSorted = foundGoodField ? totalGoodFromBatches : (totals.small + totals.medium + totals.large)
    const totalDefects = totals.defect
    // Eggs per minute: total eggs (including defects) divided by total elapsed minutes
    let eggsPerMinute = minutesSum > 0 ? Number((eggsTotalForRate / minutesSum).toFixed(1)) : 0
    // Expose totalAllEggs (including defects) based on batches aggregate
    let totalAllEggs = Math.round(eggsTotalForRate)
    let mostCommonSize = pickMostCommonSize({ small: totals.small, medium: totals.medium, large: totals.large })

    // Fallbacks: if no eggs found in batches, try reading from eggs collection directly
    if (!foundGoodField || totalEggsSorted === 0) {
      const qEggs = query(
        collection(db, "eggs"),
        where("accountId", "==", accountId)
      )
      const eggsSnap = await getDocs(qEggs)
      let small = 0, medium = 0, large = 0, defect = 0
      let first = null, last = null, totalEggsAll = 0
      let goodCount = 0
      eggsSnap.docs.forEach(d => {
        const e = d.data() || {}
        const created = tsToDate(e?.createdAt)
        console.log('[EggSizeStats] Egg:', e.eggId, 'created:', created, 'size:', e.size, 'quality:', e.quality)
        const q = (e.quality || "").toString().toLowerCase()
        const sz = (e.size || "").toString().toLowerCase()
        if (sz === 'small') small++
        else if (sz === 'medium') medium++
        else if (sz === 'large') large++
        if (q === 'cracked' || q === 'dirty') defect++
        else if (q === 'good') { goodCount++ }
        totalEggsAll++
        first = !first || created < first ? created : first
        last = !last || created > last ? created : last
      })
      totals = { small, medium, large, defect, good: small+medium+large }
      // If we derived counts from eggs, prefer good-only count for Total Eggs Sorted
      totalEggsSorted = goodCount > 0 ? goodCount : (small + medium + large)
      mostCommonSize = (small+medium+large) > 0 ? pickMostCommonSize({ small, medium, large }) : 'None'
      const minutes = first && last ? Math.max((last - first) / (1000*60), 1) : 0
      eggsPerMinute = minutes > 0 ? Number((totalEggsAll / minutes).toFixed(1)) : 0
      totalAllEggs = totalEggsAll
    }
    // Defect stats
    const cracked = batches.reduce((sum, b) => sum + Number((b?.stats?.crackEggs) || 0), 0)
    const dirty = batches.reduce((sum, b) => sum + Number((b?.stats?.dirtyEggs) || 0), 0)
    const mostCommonDefect = (() => {
      if (cracked === 0 && dirty === 0) return 'None'
      if (cracked === dirty) return 'Cracked & Dirty'
      return cracked > dirty ? 'Cracked' : 'Dirty'
    })()
    const denominator = totalEggsSorted + totalDefects
    const defectRate = denominator > 0 ? `${Math.round((totalDefects / denominator) * 100)}%` : '0%'
    
    // Convert eggs per minute to eggs per hour
    const avgEggsPerHour = eggsPerMinute * 60

    return { 
      totalEggs: totalEggsSorted, 
      totalAllEggs, 
      totalDefects, 
      avgEggsPerHour,  // Component expects this field name
      mostCommonSize, 
      mostCommonDefect, 
      defectRate 
    }
  } catch (error) {
    console.error("Error getting egg size stats:", error)
    return {
      totalEggs: 0,
      totalAllEggs: 0,
      totalDefects: 0,
      avgEggsPerHour: 0,  // Component expects this field name
      mostCommonSize: "None",
      mostCommonDefect: "None",
      defectRate: "0%"
    }
  }
}

// Get egg size distribution for linked machines
export const getMachineLinkedEggSizeDistribution = async (period = 'daily') => {
  try {
    const accountId = getCurrentAccountId()
    if (!accountId) return []

    // Get ALL batches (no date filtering)
    const qBatches = query(
      collection(db, "batches"),
      where("accountId", "==", accountId)
    )

    const snapshot = await getDocs(qBatches)
    const docs = snapshot.docs.map(d => d.data())

    // Sum buckets from batch stats
    const sizeCounts = { large: 0, medium: 0, small: 0, defect: 0 }
    docs.forEach(b => {
      const s = b?.stats || {}
      sizeCounts.large += Number(s.largeEggs || 0)
      sizeCounts.medium += Number(s.mediumEggs || 0)
      sizeCounts.small += Number(s.smallEggs || 0)
      sizeCounts.defect += Number((s.crackEggs || 0) + (s.dirtyEggs || 0))
      // Note: if only goodEggs without size buckets, we don't include an 'Unspecified' bucket
    })

    let totalEggs = Object.values(sizeCounts).reduce((a,b)=>a+b,0)

    // Always try to read from eggs collection if batches are empty or for debugging
    if (totalEggs === 0) {
      console.log('[EggSizeStats] No eggs in batches, querying eggs collection directly for accountId:', accountId)
      const qEggs = query(
        collection(db, "eggs"),
        where("accountId", "==", accountId)
      )
      const eggsSnap = await getDocs(qEggs)
      console.log('[EggSizeStats] Found', eggsSnap.size, 'egg documents')
      eggsSnap.docs.forEach(d => {
        const e = d.data() || {}
        const created = tsToDate(e?.createdAt)
        console.log('[EggSizeStats] Egg:', e.eggId, 'created:', created, 'size:', e.size, 'quality:', e.quality)
        const sz = (e.size || "").toString().toLowerCase()
        const q = (e.quality || "").toString().toLowerCase()
        if (sz === 'small') sizeCounts.small++
        else if (sz === 'medium') sizeCounts.medium++
        else if (sz === 'large') sizeCounts.large++
        if (q === 'cracked' || q === 'dirty') sizeCounts.defect++
      })
      totalEggs = Object.values(sizeCounts).reduce((a,b)=>a+b,0)
      console.log('[EggSizeStats] Final sizeCounts:', sizeCounts, 'totalEggs:', totalEggs)
    }
    const colors = {
      large: "#b0b0b0",
      medium: "#fb510f",
      small: "#ecb662",
      defect: "#dc2626"
    }

    const labels = {
      large: "Large",
      medium: "Medium",
      small: "Small",
      defect: "Defect"
    }

    // Create segments for donut chart (use 'label' to match component expectations)
    const segments = Object.entries(sizeCounts).map(([size, count]) => ({
      label: labels[size] || size,
      value: count,  // Also provide 'value' for consistency
      count,
      percentage: totalEggs > 0 ? Math.round((count / totalEggs) * 100) : 0,
      color: colors[size] || "#000000"
    }))

    // Sort by count descending
    segments.sort((a, b) => b.count - a.count)

    return segments
  } catch (error) {
    console.error("Error getting egg size distribution:", error)
    return []
  }
}




