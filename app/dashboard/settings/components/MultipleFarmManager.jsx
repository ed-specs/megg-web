"use client"

import { useState } from "react"
import { Plus, Trash2, Edit2, Save, X, MapPin, Building2, ArrowUpCircle, AlertTriangle } from "lucide-react"
import DashboardModal from "../../components/DashboardModal"

/**
 * MultipleFarmManager - Manage multiple farms for a user
 */
export default function MultipleFarmManager({ farms, setFarms, primaryFarmName, primaryFarmAddress, onPromoteToPrimary }) {
  const [editingIndex, setEditingIndex] = useState(null)
  const [editingFarm, setEditingFarm] = useState({ name: "", address: "" })
  const [isAdding, setIsAdding] = useState(false)
  const [newFarm, setNewFarm] = useState({ name: "", address: "" })
  const [confirmPromote, setConfirmPromote] = useState(null) // { farm, index }

  const handleAddFarm = () => {
    if (!newFarm.name.trim()) return

    setFarms([...farms, { 
      id: Date.now().toString(),
      name: newFarm.name, 
      address: newFarm.address,
      isPrimary: false,
      createdAt: new Date().toISOString()
    }])
    setNewFarm({ name: "", address: "" })
    setIsAdding(false)
  }

  const handleEditFarm = (index) => {
    setEditingIndex(index)
    setEditingFarm({ ...farms[index] })
  }

  const handleSaveEdit = () => {
    const updatedFarms = [...farms]
    updatedFarms[editingIndex] = editingFarm
    setFarms(updatedFarms)
    setEditingIndex(null)
  }

  const handleDeleteFarm = (index) => {
    if (window.confirm("Are you sure you want to remove this farm?")) {
      const updatedFarms = farms.filter((_, i) => i !== index)
      setFarms(updatedFarms)
    }
  }

  const handlePromoteToPrimary = (index) => {
    const selectedFarm = farms[index]
    setConfirmPromote({ farm: selectedFarm, index })
  }

  const handleConfirmPromote = () => {
    if (confirmPromote) {
      onPromoteToPrimary(confirmPromote.farm, confirmPromote.index)
      setConfirmPromote(null)
    }
  }

  const handleCancelPromote = () => {
    setConfirmPromote(null)
  }

  return (
    <div className="space-y-4">
      {/* Primary Farm (Read-only display from main form) */}
      <div className="bg-gradient-to-r from-green-100 to-blue-100 rounded-xl p-4 border-2 border-green-300">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Building2 className="w-5 h-5 text-green-700 flex-shrink-0" />
              <h4 className="font-semibold text-green-900">Primary Farm</h4>
              <span className="px-2 py-0.5 bg-green-600 text-white text-xs font-semibold rounded-full whitespace-nowrap">
                PRIMARY
              </span>
            </div>
            <p className="font-medium text-gray-800 break-words">{primaryFarmName || "Not set"}</p>
            {primaryFarmAddress && (
              <div className="flex items-start gap-1 mt-1 text-sm text-gray-600">
                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <p className="break-words">{primaryFarmAddress}</p>
              </div>
            )}
            <p className="text-xs text-green-700 mt-2">
              Edit primary farm details in the form above
            </p>
          </div>
        </div>
      </div>

      {/* Additional Farms */}
      {farms.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Additional Farms ({farms.length})
          </h4>
          {farms.map((farm, index) => (
            <div
              key={farm.id || index}
              className="p-4 rounded-xl border border-gray-200 bg-white hover:border-gray-300 transition-colors"
            >
              {editingIndex === index ? (
                /* Edit Mode */
                <div className="space-y-3">
                  <input
                    type="text"
                    value={editingFarm.name}
                    onChange={(e) => setEditingFarm({ ...editingFarm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#105588] focus:border-[#105588] outline-none"
                    placeholder="Farm name"
                  />
                  <textarea
                    value={editingFarm.address}
                    onChange={(e) => setEditingFarm({ ...editingFarm, address: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#105588] focus:border-[#105588] outline-none resize-none"
                    placeholder="Farm address"
                  />
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      onClick={handleSaveEdit}
                      className="flex items-center justify-center gap-1 px-3 py-2 bg-[#105588] text-white rounded-lg hover:bg-[#0d4470] transition-colors text-sm font-medium"
                    >
                      <Save className="w-4 h-4" />
                      Save
                    </button>
                    <button
                      onClick={() => setEditingIndex(null)}
                      className="flex items-center justify-center gap-1 px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                /* View Mode */
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Building2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
                      <h4 className="font-semibold text-gray-800 break-words">{farm.name}</h4>
                      {farm.isPrimary && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full whitespace-nowrap">
                          PRIMARY
                        </span>
                      )}
                    </div>
                    {farm.address && (
                      <div className="flex items-start gap-1 text-sm text-gray-600 mt-1">
                        <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <p className="break-words">{farm.address}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0 sm:ml-3">
                    <button
                      onClick={() => handlePromoteToPrimary(index)}
                      className="flex items-center justify-center gap-2 px-3 py-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors border border-green-200 hover:border-green-300 text-sm font-medium whitespace-nowrap"
                      title="Make this farm primary"
                    >
                      <ArrowUpCircle className="w-4 h-4 flex-shrink-0" />
                      <span>Make Primary</span>
                    </button>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditFarm(index)}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Edit farm"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteFarm(index)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete farm"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add New Farm */}
      {isAdding ? (
        <div className="p-4 rounded-xl border-2 border-dashed border-blue-300 bg-blue-50 space-y-3">
          <h4 className="text-sm font-semibold text-blue-900">Add New Farm</h4>
          <input
            type="text"
            value={newFarm.name}
            onChange={(e) => setNewFarm({ ...newFarm, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#105588] focus:border-[#105588] outline-none"
            placeholder="Farm name"
            autoFocus
          />
          <textarea
            value={newFarm.address}
            onChange={(e) => setNewFarm({ ...newFarm, address: e.target.value })}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#105588] focus:border-[#105588] outline-none resize-none"
            placeholder="Farm address (optional)"
          />
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={handleAddFarm}
              disabled={!newFarm.name.trim()}
              className="flex items-center justify-center gap-1 px-4 py-2 bg-[#105588] text-white rounded-lg hover:bg-[#0d4470] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Add Farm
            </button>
            <button
              onClick={() => {
                setIsAdding(false)
                setNewFarm({ name: "", address: "" })
              }}
              className="flex items-center justify-center gap-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsAdding(true)}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-[#105588] hover:text-[#105588] hover:bg-blue-50 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Another Farm
        </button>
      )}


      {/* Confirm Promote Modal */}
      {confirmPromote && (
        <DashboardModal
          isOpen={!!confirmPromote}
          onClose={handleCancelPromote}
          title="Promote Farm to Primary"
          size="md"
        >
          {/* Message Content */}
          <div className="text-center mb-6">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 bg-amber-500 rounded-full flex items-center justify-center shadow-lg">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
            </div>
            
            <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-2 px-2">
              Make &quot;{confirmPromote.farm.name}&quot; your primary farm?
            </h3>
            
            <p className="text-sm text-gray-600 mb-4 px-2">
              Your current primary farm <strong>&quot;{primaryFarmName || 'farm'}&quot;</strong> will be moved to additional farms.
            </p>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-left">
              <p className="text-xs text-blue-800">
                <strong>Note:</strong> Don&apos;t forget to click &quot;Save Profile Information&quot; to save changes.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <button
              onClick={handleCancelPromote}
              className="flex-1 bg-gray-200 text-gray-700 py-2.5 sm:py-3 px-4 sm:px-6 rounded-xl sm:rounded-2xl hover:bg-gray-300 transition-colors font-semibold text-sm sm:text-base"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmPromote}
              className="flex-1 bg-[#105588] text-white py-2.5 sm:py-3 px-4 sm:px-6 rounded-xl sm:rounded-2xl hover:bg-[#0d4470] transition-colors font-semibold flex items-center justify-center gap-2 text-sm sm:text-base"
            >
              <ArrowUpCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
              <span>Promote to Primary</span>
            </button>
          </div>
        </DashboardModal>
      )}
    </div>
  )
}

