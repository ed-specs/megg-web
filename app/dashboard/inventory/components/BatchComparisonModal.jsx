"use client"

import { useState, useMemo } from "react"
import { X, GitCompare, Check, AlertCircle } from "lucide-react"

/**
 * BatchComparisonModal - Compare 2-3 batches side-by-side
 */
export default function BatchComparisonModal({ 
  batches, 
  selectedBatches,
  onClose,
  overviewDataMap
}) {
  const [viewMode, setViewMode] = useState('table') // 'table' or 'differences'

  // Get comparison data
  const comparisonData = useMemo(() => {
    if (!selectedBatches || selectedBatches.length === 0) return []
    
    return selectedBatches.map(batchNumber => {
      const batch = batches.find(b => b.batchNumber === batchNumber)
      const overview = overviewDataMap[batchNumber]
      
      // Calculate defect eggs from eggSizes
      const defectEggs = batch?.eggSizes?.Defect || overview?.defectEggs || 0
      const totalEggs = batch?.totalEggs || 0
      const defectRate = totalEggs > 0 
        ? ((defectEggs / totalEggs) * 100).toFixed(2)
        : '0.00'
      
      return {
        batchNumber,
        totalEggs,
        goodEggs: batch?.goodEggs || overview?.goodEggs || 0,
        defectEggs,
        defectRate,
        fromDate: batch?.fromDate || 'N/A',
        toDate: batch?.toDate || 'N/A',
        status: batch?.status || 'active',
        small: batch?.eggSizes?.Small || 0,
        medium: batch?.eggSizes?.Medium || 0,
        large: batch?.eggSizes?.Large || 0,
        timeRange: overview?.timeRange || 'N/A'
      }
    })
  }, [selectedBatches, batches, overviewDataMap])

  // Find differences
  const differences = useMemo(() => {
    if (comparisonData.length < 2) return []
    
    const diffs = []
    const fields = [
      { key: 'totalEggs', label: 'Total Eggs', type: 'number' },
      { key: 'defectRate', label: 'Defect Rate', type: 'percentage' },
      { key: 'goodEggs', label: 'Good Eggs', type: 'number' },
      { key: 'small', label: 'Small Eggs', type: 'number' },
      { key: 'medium', label: 'Medium Eggs', type: 'number' },
      { key: 'large', label: 'Large Eggs', type: 'number' }
    ]
    
    fields.forEach(field => {
      const values = comparisonData.map(d => parseFloat(d[field.key]) || 0)
      const min = Math.min(...values)
      const max = Math.max(...values)
      
      if (min !== max) {
        const diff = ((max - min) / min * 100).toFixed(1)
        diffs.push({
          field: field.label,
          values,
          min,
          max,
          difference: diff,
          bestBatch: comparisonData[values.indexOf(field.key === 'defectRate' ? min : max)].batchNumber
        })
      }
    })
    
    return diffs
  }, [comparisonData])

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col my-4 sm:my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-3 sm:p-6 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="p-1.5 sm:p-2 bg-blue-100 rounded-lg flex-shrink-0">
              <GitCompare className="w-4 h-4 sm:w-6 sm:h-6 text-blue-600" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-xl font-semibold text-gray-800 truncate">Batch Comparison</h2>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5 sm:mt-1">
                Comparing {selectedBatches.length} batch{selectedBatches.length !== 1 ? 'es' : ''}
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

        {/* View Mode Toggle */}
        <div className="flex items-center gap-2 p-3 sm:p-4 border-b border-gray-200 bg-white overflow-x-auto">
          <button
            onClick={() => setViewMode('table')}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
              viewMode === 'table'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <span className="hidden sm:inline">Side-by-Side</span>
            <span className="sm:hidden">Compare</span>
          </button>
          <button
            onClick={() => setViewMode('differences')}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
              viewMode === 'differences'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <span className="hidden sm:inline">Differences Only ({differences.length})</span>
            <span className="sm:hidden">Diff ({differences.length})</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-3 sm:p-6">
          {comparisonData.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <AlertCircle className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
              <p className="text-sm sm:text-base text-gray-500">No batches selected for comparison</p>
              <p className="text-xs sm:text-sm text-gray-400 mt-2">Select 2-3 batches to compare</p>
            </div>
          ) : viewMode === 'table' ? (
            <>
              {/* Desktop Table View - Hidden on mobile */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-2 sm:px-4 font-semibold text-gray-700 bg-gray-50 sticky left-0 z-10">
                        Metric
                      </th>
                      {comparisonData.map((batch, index) => (
                        <th key={index} className="text-center py-3 px-2 sm:px-4 font-semibold text-gray-700 bg-gray-50 min-w-[120px]">
                          <div className="truncate">{batch.batchNumber}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: 'Date Range', key: 'fromDate', format: (d) => `${d.fromDate} - ${d.toDate}` },
                      { label: 'Status', key: 'status', format: (d) => d.status },
                      { label: 'Total Eggs', key: 'totalEggs', format: (d) => d.totalEggs.toLocaleString() },
                      { label: 'Good Eggs', key: 'goodEggs', format: (d) => d.goodEggs.toLocaleString() },
                      { label: 'Defect Eggs', key: 'defectEggs', format: (d) => d.defectEggs.toLocaleString() },
                      { label: 'Defect Rate', key: 'defectRate', format: (d) => `${d.defectRate}%` },
                      { label: 'Small Eggs', key: 'small', format: (d) => d.small.toLocaleString() },
                      { label: 'Medium Eggs', key: 'medium', format: (d) => d.medium.toLocaleString() },
                      { label: 'Large Eggs', key: 'large', format: (d) => d.large.toLocaleString() },
                      { label: 'Time Range', key: 'timeRange', format: (d) => d.timeRange },
                    ].map((row, rowIndex) => (
                      <tr key={rowIndex} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-2 sm:px-4 font-medium text-gray-700 bg-gray-50 sticky left-0 z-10">
                          {row.label}
                        </td>
                        {comparisonData.map((batch, colIndex) => (
                          <td key={colIndex} className="py-3 px-2 sm:px-4 text-center text-gray-600">
                            {row.format(batch)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View - Show on mobile only */}
              <div className="md:hidden space-y-3">
                {comparisonData.map((batch, batchIndex) => (
                  <div key={batchIndex} className="bg-white border-2 border-gray-200 rounded-xl overflow-hidden">
                    {/* Batch Header */}
                    <div className="bg-blue-50 px-3 py-2 border-b border-blue-100">
                      <h3 className="font-semibold text-blue-900 text-sm truncate">{batch.batchNumber}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          batch.status.toLowerCase() === 'active' 
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {batch.status}
                        </span>
                      </div>
                    </div>

                    {/* Batch Data */}
                    <div className="p-3 space-y-2">
                      {[
                        { label: 'Date Range', value: `${batch.fromDate} - ${batch.toDate}`, icon: '📅' },
                        { label: 'Total Eggs', value: batch.totalEggs.toLocaleString(), icon: '🥚', highlight: true },
                        { label: 'Good Eggs', value: batch.goodEggs.toLocaleString(), icon: '✅' },
                        { label: 'Defect Eggs', value: batch.defectEggs.toLocaleString(), icon: '❌' },
                        { label: 'Defect Rate', value: `${batch.defectRate}%`, icon: '📊', highlight: batch.defectRate > 5 },
                        { label: 'Small Eggs', value: batch.small.toLocaleString(), icon: '🔵' },
                        { label: 'Medium Eggs', value: batch.medium.toLocaleString(), icon: '🟢' },
                        { label: 'Large Eggs', value: batch.large.toLocaleString(), icon: '🟡' },
                        { label: 'Time Range', value: batch.timeRange, icon: '⏱️' },
                      ].map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0">
                          <span className="text-xs text-gray-600 flex items-center gap-1.5">
                            <span>{item.icon}</span>
                            <span>{item.label}</span>
                          </span>
                          <span className={`text-sm font-semibold ${
                            item.highlight ? 'text-blue-600' : 'text-gray-800'
                          }`}>
                            {item.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            /* Differences Only View */
            <div className="space-y-3 sm:space-y-4">
              {differences.length === 0 ? (
                <div className="text-center py-8 sm:py-12">
                  <Check className="w-10 h-10 sm:w-12 sm:h-12 text-green-500 mx-auto mb-3 sm:mb-4" />
                  <p className="text-sm sm:text-base text-gray-700 font-medium">All batches are identical</p>
                  <p className="text-xs sm:text-sm text-gray-500 mt-2">No significant differences found</p>
                </div>
              ) : (
                differences.map((diff, index) => (
                  <div key={index} className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4">
                    <div className="flex items-center justify-between mb-2 sm:mb-3">
                      <h4 className="text-sm sm:text-base font-semibold text-gray-800">{diff.field}</h4>
                      <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                        {diff.difference}% diff
                      </span>
                    </div>
                    <div className="space-y-2">
                      {comparisonData.map((batch, batchIndex) => {
                        const value = diff.values[batchIndex]
                        const isBest = batch.batchNumber === diff.bestBatch
                        return (
                          <div key={batchIndex} className="flex items-center justify-between gap-2">
                            <span className="text-xs sm:text-sm text-gray-600 truncate flex-1">
                              {batch.batchNumber}
                            </span>
                            <div className="flex items-center gap-1.5 sm:gap-2">
                              <span className={`text-xs sm:text-sm font-semibold ${
                                isBest ? 'text-green-600' : 'text-gray-700'
                              }`}>
                                {value.toLocaleString()}
                              </span>
                              {isBest && <Check className="w-3 h-3 sm:w-4 sm:h-4 text-green-600 flex-shrink-0" />}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 sm:py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium text-sm sm:text-base"
          >
            Close Comparison
          </button>
        </div>
      </div>
    </div>
  )
}

