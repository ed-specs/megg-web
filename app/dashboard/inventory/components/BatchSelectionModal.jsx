"use client";

import { useState } from "react";
import { X, CheckSquare, Square, Search } from "lucide-react";

export default function BatchSelectionModal({
  batches,
  selectedBatches,
  setSelectedBatches,
  onClose,
  onExport,
  isExporting
}) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredBatches = batches.filter((batch) =>
    batch.batchNumber?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleBatch = (batchNumber) => {
    setSelectedBatches((prev) =>
      prev.includes(batchNumber)
        ? prev.filter((b) => b !== batchNumber)
        : [...prev, batchNumber]
    );
  };

  const toggleSelectAll = () => {
    if (selectedBatches.length === filteredBatches.length) {
      setSelectedBatches([]);
    } else {
      setSelectedBatches(filteredBatches.map((batch) => batch.batchNumber));
    }
  };

  const handleExport = (format) => {
    if (selectedBatches.length === 0) {
      // If no batches selected, export all filtered batches
      onExport(format, []);
    } else {
      onExport(format, selectedBatches);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-2 sm:p-4">
      <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-300 shadow-xl w-full max-w-2xl max-h-[95vh] sm:max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-3 sm:p-6 border-b border-gray-200">
          <div className="min-w-0 flex-1 pr-2">
            <h2 className="text-base sm:text-xl font-semibold truncate">Select Batches to Export</h2>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5 sm:mt-1">
              {selectedBatches.length > 0
                ? `${selectedBatches.length} batch${selectedBatches.length !== 1 ? 'es' : ''} selected`
                : `Select batches or export all ${batches.length} batches`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-3 sm:p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <input
              type="text"
              placeholder="Search batches..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>
        </div>

        {/* Batch List */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              {selectedBatches.length === filteredBatches.length ? (
                <>
                  <CheckSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>Deselect All</span>
                </>
              ) : (
                <>
                  <Square className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>Select All ({filteredBatches.length})</span>
                </>
              )}
            </button>
          </div>

          <div className="space-y-2">
            {filteredBatches.length === 0 ? (
              <div className="text-center py-6 sm:py-8 text-gray-500">
                <p className="text-sm">No batches found</p>
              </div>
            ) : (
              filteredBatches.map((batch) => {
                const isSelected = selectedBatches.includes(batch.batchNumber);
                return (
                  <div
                    key={batch.batchNumber}
                    className={`flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg border transition-colors ${
                      isSelected
                        ? "bg-blue-50 border-blue-300"
                        : "bg-white border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <button
                      onClick={() => toggleBatch(batch.batchNumber)}
                      className="flex-shrink-0 text-blue-500 hover:text-blue-700 transition-colors"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 sm:w-5 sm:h-5" />
                      ) : (
                        <Square className="w-4 h-4 sm:w-5 sm:h-5" />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm sm:text-base font-medium truncate">{batch.batchNumber}</p>
                      <p className="text-xs sm:text-sm text-gray-500">
                        {batch.totalEggs.toLocaleString()} eggs • {batch.status || 'Active'}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer with Export Options */}
        <div className="p-3 sm:p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={() => handleExport('csv')}
                disabled={isExporting}
                className="flex-1 px-3 sm:px-4 py-1.5 sm:py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs sm:text-sm font-medium"
              >
                {isExporting ? 'Exporting...' : 'Export as CSV'}
              </button>
              <button
                onClick={() => handleExport('pdf')}
                disabled={isExporting}
                className="flex-1 px-3 sm:px-4 py-1.5 sm:py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs sm:text-sm font-medium"
              >
                {isExporting ? 'Exporting...' : 'Export as PDF'}
              </button>
            </div>
            <button
              onClick={onClose}
              className="w-full px-3 sm:px-4 py-1.5 sm:py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-xs sm:text-sm font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

