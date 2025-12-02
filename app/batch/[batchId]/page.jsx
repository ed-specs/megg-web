"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { db } from "../../config/firebaseConfig";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import InventoryOverviewCards from "../../dashboard/inventory/components/InventoryOverviewCards";
import { Package, RefreshCw } from "lucide-react";

// Helper: robustly convert Firestore Timestamp or JS date-like to Date
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

export default function BatchDetailPage() {
  const params = useParams();
  const batchId = params?.batchId ? decodeURIComponent(params.batchId) : null;
  const [overviewData, setOverviewData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchBatchDetails = async () => {
      if (!batchId) {
        setError("No batch ID provided");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        // Query batch by id, name, or document ID (for public access)
        const batchesRef = collection(db, "batches")
        const qBatches = query(batchesRef, where("id", "==", batchId))
        const snapshot = await getDocs(qBatches)
        
        let batchDoc = null;
        
        // Try to find by id field
        if (!snapshot.empty) {
          batchDoc = snapshot.docs[0];
        } else {
          // Try by name field
          const qByName = query(batchesRef, where("name", "==", batchId))
          const snapshotByName = await getDocs(qByName)
          if (!snapshotByName.empty) {
            batchDoc = snapshotByName.docs[0];
          } else {
            // Try by document ID
            const docRef = doc(db, "batches", batchId)
            const docSnap = await getDoc(docRef)
            if (docSnap.exists()) {
              batchDoc = { id: docSnap.id, data: () => docSnap.data() };
            }
          }
        }
        
        if (!batchDoc) {
          setError("Batch not found");
          setLoading(false);
          return;
        }

        const data = typeof batchDoc.data === 'function' ? batchDoc.data() : batchDoc.data;
        const stats = data?.stats || {}
        const created = tsToDate(data?.createdAt)
        const updated = tsToDate(data?.updatedAt) || created

        // Use fields from Batch collection
        const small = Number(stats.smallEggs || 0)
        const med = Number(stats.mediumEggs || 0)
        const large = Number(stats.largeEggs || 0)
        const crackEggs = Number(stats.crackEggs || 0)
        const dirtyEggs = Number(stats.dirtyEggs || 0)
        const defect = crackEggs + dirtyEggs
        const goodEggs = typeof stats.goodEggs === 'number' ? Number(stats.goodEggs) : (small + med + large)
        const totalEggs = Number(stats.totalEggs || small + med + large + defect)

        // Size breakdown for overview cards
        const sizeBreakdown = {
          Small: small,
          Medium: med,
          Large: large,
          Defect: defect,
        }

        const batchDetails = {
          totalEggs,
          goodEggs,
          totalSort: goodEggs,
          defectEggs: defect,
          timeRange: `${created.toLocaleTimeString()} - ${updated.toLocaleTimeString()}`,
          sizeBreakdown,
          status: data?.status || "unknown",
          createdAt: created,
          updatedAt: updated,
        }
        
        setOverviewData(batchDetails);
      } catch (error) {
        console.error("Error fetching batch details:", error);
        setError("Failed to load batch details");
      } finally {
        setLoading(false);
      }
    };

    fetchBatchDetails();
  }, [batchId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-gray-300 shadow-lg p-8 max-w-2xl w-full">
          <div className="flex items-center flex-col gap-4 justify-center py-6">
            <div className="bg-gray-100 rounded-full p-4">
              <RefreshCw className="w-10 h-10 mx-auto text-gray-300 animate-spin" />
            </div>
            <div className="flex flex-col items-center gap-1">
              <h3 className="text-lg font-medium">Loading batch details...</h3>
              <p className="text-gray-500 text-sm">Fetching batch information...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !overviewData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-gray-300 shadow-lg p-8 max-w-2xl w-full text-center">
          <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Batch Not Found</h2>
          <p className="text-gray-600">{error || "The requested batch could not be found."}</p>
          <p className="text-sm text-gray-500 mt-4">Batch ID: {batchId}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl border border-gray-300 shadow-lg p-6 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{batchId}</h1>
            {overviewData?.createdAt && (
              <p className="text-gray-500 text-sm mt-1">
                {new Date(overviewData.createdAt).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
            )}
          </div>
        </div>

        {/* Overview Cards */}
        <div className="bg-white rounded-2xl border border-gray-300 shadow-lg p-6">
          <InventoryOverviewCards 
            overviewData={overviewData} 
            selectedBatch={batchId} 
          />
        </div>
      </div>
    </div>
  );
}

