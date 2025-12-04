"use client"

import { useState, useMemo } from "react"
import { X, GitCompare, Search, Check } from "lucide-react"

/**
 * BatchComparisonSelectionModal - Modal to select batches for comparison
 */
export default function BatchComparisonSelectionModal({ 
  batches, 
  onClose,
  onCompare
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedBatches, setSelectedBatches] = useState([])

  // Filter batches by search
  const filteredBatches = useMemo(() => {
    if (!searchQuery) return batches
    
    const query = searchQuery.toLowerCase()
    return batches.filter(batch => 
      batch.batchNumber.toLowerCase().includes(query) ||
      batch.fromDate?.toLowerCase().includes(query) ||
      batch.toDate?.toLowerCase().includes(query)
    )
  }, [batches, searchQuery])

  const toggleBatch = (batchNumber) => {
    setSelectedBatches(prev => {
      if (prev.includes(batchNumber)) {
        return prev.filter(b => b !== batchNumber)
      } else {
        // Max 3 batches
        if (prev.length >= 3) {
          return prev
        }
        return [...prev, batchNumber]
      }
    })
  }

  const handleCompare = () => {
    if (selectedBatches.length < 2) {
      return
    }
    onCompare(selectedBatches)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col my-4 sm:my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-3 sm:p-6 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 pr-2">
            <div className="p-1.5 sm:p-2 bg-purple-100 rounded-lg flex-shrink-0">
              <GitCompare className="w-4 h-4 sm:w-6 sm:h-6 text-purple-600" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-xl font-semibold text-gray-800 truncate">Select Batches to Compare</h2>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5 sm:mt-1">
                Choose 2-3 batches to compare side-by-side
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 hover:bg-gray-200 rounded-lg transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-3 sm:p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <input
              type="text"
              placeholder="Search batch number or date..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none text-xs sm:text-sm"
            />
          </div>
        </div>

        {/* Selection Info */}
        <div className="px-3 sm:px-6 py-2 sm:py-3 bg-purple-50 border-b border-purple-200">
          <div className="flex items-center justify-between text-xs sm:text-sm">
            <span className="text-purple-700 font-medium">
              {selectedBatches.length} / 3 batches selected
            </span>
            {selectedBatches.length > 0 && (
              <button
                onClick={() => setSelectedBatches([])}
                className="text-purple-600 hover:text-purple-800 underline text-xs sm:text-sm"
              >
                Clear Selection
              </button>
            )}
          </div>
          {selectedBatches.length > 0 && (
            <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-2">
              {selectedBatches.map(batchNum => (
                <span key={batchNum} className="px-2 py-0.5 sm:py-1 bg-white border border-purple-300 rounded text-xs font-mono text-purple-900 flex items-center gap-1 max-w-full">
                  <span className="truncate">{batchNum}</span>
                  <button
                    onClick={() => toggleBatch(batchNum)}
                    className="ml-1 hover:bg-purple-100 rounded-full p-0.5 flex-shrink-0"
                  >
                    <X className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Batch List */}
        <div className="flex-1 overflow-auto p-3 sm:p-6">
          {filteredBatches.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <Search className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
              <p className="text-sm sm:text-base text-gray-500">No batches found</p>
              <p className="text-xs sm:text-sm text-gray-400 mt-2">Try adjusting your search</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
              {filteredBatches.map((batch) => {
                const isSelected = selectedBatches.includes(batch.batchNumber)
                const isDisabled = !isSelected && selectedBatches.length >= 3
                
                return (
                  <button
                    key={batch.batchNumber}
                    onClick={() => !isDisabled && toggleBatch(batch.batchNumber)}
                    disabled={isDisabled}
                    className={`
                      text-left p-3 sm:p-4 rounded-lg border-2 transition-all
                      ${isSelected 
                        ? 'border-purple-500 bg-purple-50 shadow-md' 
                        : isDisabled
                        ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                        : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50'
                      }
                    `}
                  >
                    <div className="flex items-start justify-between mb-1.5 sm:mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-xs sm:text-sm text-gray-800 truncate mb-0.5 sm:mb-1">
                          {batch.batchNumber}
                        </h3>
                        <p className="text-xs text-gray-500">
                          {batch.totalEggs?.toLocaleString() || 0} eggs
                        </p>
                      </div>
                      {isSelected && (
                        <div className="flex-shrink-0 w-4 h-4 sm:w-5 sm:h-5 bg-purple-600 rounded-full flex items-center justify-center ml-2">
                          <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" />
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 space-y-0.5 sm:space-y-1">
                      <div className="flex items-center gap-1 truncate">
                        <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-500 rounded-full flex-shrink-0"></span>
                        <span className="truncate">{batch.fromDate || 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-1 truncate">
                        <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-500 rounded-full flex-shrink-0"></span>
                        <span className="truncate">{batch.toDate || 'N/A'}</span>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-3 sm:px-4 py-1.5 sm:py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-medium text-xs sm:text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleCompare}
              disabled={selectedBatches.length < 2}
              className="flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-xs sm:text-sm"
            >
              <GitCompare className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Compare {selectedBatches.length > 0 && `(${selectedBatches.length})`}</span>
            </button>
          </div>
          {selectedBatches.length === 1 && (
            <p className="text-xs text-center text-gray-500 mt-2">
              Select at least one more batch to compare
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

