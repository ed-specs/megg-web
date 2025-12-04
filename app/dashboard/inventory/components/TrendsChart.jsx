"use client"

import { useMemo } from "react"
import { TrendingUp, TrendingDown, Calendar } from "lucide-react"

/**
 * TrendsChart - Display trends for defect rate and production volume
 */
export default function TrendsChart({ batches }) {
  // Calculate trends by date
  const trendsData = useMemo(() => {
    if (!batches || batches.length === 0) return { defectTrend: [], productionTrend: [] }

    // Group batches by date
    const batchesByDate = batches.reduce((acc, batch) => {
      const date = batch.fromDate || 'Unknown'
      if (!acc[date]) {
        acc[date] = []
      }
      acc[date].push(batch)
      return acc
    }, {})

    // Calculate defect rate and production for each date
    const defectTrend = []
    const productionTrend = []

    Object.keys(batchesByDate).sort().forEach(date => {
      const dayBatches = batchesByDate[date]
      const totalEggs = dayBatches.reduce((sum, b) => sum + (b.totalEggs || 0), 0)
      const totalDefects = dayBatches.reduce((sum, b) => {
        const defects = b.eggSizes?.Defect || 0
        return sum + defects
      }, 0)
      const defectRate = totalEggs > 0 ? (totalDefects / totalEggs) * 100 : 0

      defectTrend.push({
        date,
        value: defectRate,
        count: dayBatches.length
      })

      productionTrend.push({
        date,
        value: totalEggs,
        count: dayBatches.length
      })
    })

    return { defectTrend, productionTrend }
  }, [batches])

  const { defectTrend, productionTrend } = trendsData

  // Calculate max values for scaling
  const maxDefectRate = Math.max(...defectTrend.map(d => d.value), 10)
  const maxProduction = Math.max(...productionTrend.map(d => d.value), 100)

  // Get latest vs previous for trend indicators
  const latestDefect = defectTrend[defectTrend.length - 1]?.value || 0
  const previousDefect = defectTrend[defectTrend.length - 2]?.value || 0
  const defectChange = previousDefect > 0 ? ((latestDefect - previousDefect) / previousDefect) * 100 : 0

  const latestProduction = productionTrend[productionTrend.length - 1]?.value || 0
  const previousProduction = productionTrend[productionTrend.length - 2]?.value || 0
  const productionChange = previousProduction > 0 ? ((latestProduction - previousProduction) / previousProduction) * 100 : 0

  if (defectTrend.length === 0 && productionTrend.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <p className="text-center text-gray-500">No trend data available</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Defect Rate Trend */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-800">Defect Rate Trend</h3>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">Over {defectTrend.length} day(s)</p>
          </div>
          {defectChange !== 0 && (
            <div className={`flex items-center gap-1 text-sm font-medium ${
              defectChange < 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {defectChange < 0 ? <TrendingDown className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
              <span>{Math.abs(defectChange).toFixed(1)}%</span>
            </div>
          )}
        </div>

        {/* Simple bar chart */}
        <div className="space-y-3">
          {defectTrend.slice(-7).map((item, index) => (
            <div key={index} className="space-y-1">
              <div className="flex items-center justify-between text-xs text-gray-600">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {item.date}
                </span>
                <span className="font-semibold">{item.value.toFixed(2)}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-red-400 to-red-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${(item.value / maxDefectRate) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Production Volume Trend */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-800">Production Volume</h3>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">Over {productionTrend.length} day(s)</p>
          </div>
          {productionChange !== 0 && (
            <div className={`flex items-center gap-1 text-sm font-medium ${
              productionChange > 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {productionChange > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              <span>{Math.abs(productionChange).toFixed(1)}%</span>
            </div>
          )}
        </div>

        {/* Simple bar chart */}
        <div className="space-y-3">
          {productionTrend.slice(-7).map((item, index) => (
            <div key={index} className="space-y-1">
              <div className="flex items-center justify-between text-xs text-gray-600">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {item.date}
                </span>
                <span className="font-semibold">{item.value.toLocaleString()} eggs</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-400 to-blue-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${(item.value / maxProduction) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

