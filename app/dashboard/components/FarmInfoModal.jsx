"use client";

import { useState, useEffect } from "react";
import { X, AlertCircle, Save } from "lucide-react";
import { db } from "../../config/firebaseConfig";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { getCurrentUser, getUserAccountId } from "../../utils/auth-utils";
import { createNotification } from "../../lib/notifications/NotificationsService";

export default function FarmInfoModal({ isOpen, onClose }) {
  const [farmName, setFarmName] = useState("");
  const [farmAddress, setFarmAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchFarmInfo();
    }
  }, [isOpen]);

  const fetchFarmInfo = async () => {
    try {
      setLoading(true);
      const user = getCurrentUser();
      const accountId = getUserAccountId();
      const docId = accountId || user?.uid;

      if (!docId) {
        setError("Unable to identify user");
        return;
      }

      const userDocRef = doc(db, "users", docId);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        setFarmName(userData.farmName || "");
        setFarmAddress(userData.farmAddress || "");
      }
    } catch (error) {
      console.error("Error fetching farm info:", error);
      setError("Error loading farm information");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!farmName.trim() || !farmAddress.trim()) {
      setError("Please fill in both Farm Name and Farm Address");
      return;
    }

    try {
      setIsSaving(true);
      setError("");

      const user = getCurrentUser();
      const accountId = getUserAccountId();
      const docId = accountId || user?.uid;

      if (!docId) {
        setError("Unable to identify user");
        return;
      }

      const userDocRef = doc(db, "users", docId);
      await updateDoc(userDocRef, {
        farmName: farmName.trim(),
        farmAddress: farmAddress.trim(),
      });

      // Create notification for farm info update
      try {
        await createNotification(
          accountId || docId,
          "You've updated your farm information",
          "farm_info_updated"
        );
      } catch (notifError) {
        console.error("Error creating farm info notification:", notifError);
        // Don't block the save if notification fails
      }

      // Close modal after successful save
      onClose();
    } catch (error) {
      console.error("Error saving farm info:", error);
      setError("Failed to save farm information. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => {
        // Prevent closing by clicking outside
        e.stopPropagation();
      }}
    >
      <div 
        className="bg-white rounded-2xl border border-gray-300 shadow-xl w-full max-w-md m-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - No close button, modal cannot be dismissed */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <AlertCircle className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-[#1F2421]">Farm Information Required</h2>
              <p className="text-sm text-gray-500 mt-1">Please provide your farm details</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              <strong>Important:</strong> Farm name and address are required for generating reports and exports. 
              Please fill in the information below.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-[#1F2421] mb-2">
              Farm Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={farmName}
              onChange={(e) => setFarmName(e.target.value)}
              placeholder="Enter your farm name"
              className="w-full p-3 bg-gray-50 rounded-lg border border-gray-200 focus:ring-2 focus:ring-[#105588] focus:border-[#105588] transition-all duration-200 text-gray-800"
              disabled={loading || isSaving}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#1F2421] mb-2">
              Farm Address <span className="text-red-500">*</span>
            </label>
            <textarea
              value={farmAddress}
              onChange={(e) => setFarmAddress(e.target.value)}
              placeholder="Enter your farm address"
              rows={3}
              className="w-full p-3 bg-gray-50 rounded-lg border border-gray-200 focus:ring-2 focus:ring-[#105588] focus:border-[#105588] transition-all duration-200 text-gray-800 resize-none"
              disabled={loading || isSaving}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={handleSave}
            disabled={loading || isSaving || !farmName.trim() || !farmAddress.trim()}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-colors duration-200 ${
              loading || isSaving || !farmName.trim() || !farmAddress.trim()
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-[#105588] text-white hover:bg-[#0d4470] focus:outline-none focus:ring-4 focus:ring-[#105588]/30"
            }`}
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save & Continue
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

