"use client"

import { useMemo } from "react"
import { TrendingUp, TrendingDown, Calendar } from "lucide-react"

/**
 * TrendsChart - Display trends for defect rate and production volume
 */
export default function TrendsChart({ batches }) {
  // Calculate trends by date (latest 7 days)
  const trendsData = useMemo(() => {
    if (!batches || batches.length === 0) return { defectTrend: [], productionTrend: [] }

    // Group batches by date (using createdAt date)
    const batchesByDate = batches.reduce((acc, batch) => {
      // Use createdAt and format it as YYYY-MM-DD
      let dateKey = 'Unknown'
      if (batch.createdAt) {
        try {
          const dateObj = batch.createdAt instanceof Date 
            ? batch.createdAt 
            : new Date(batch.createdAt)
          dateKey = dateObj.toISOString().split('T')[0] // YYYY-MM-DD format
        } catch (e) {
          console.error('Error parsing date:', batch.createdAt, e)
        }
      }
      
      if (!acc[dateKey]) {
        acc[dateKey] = []
      }
      acc[dateKey].push(batch)
      return acc
    }, {})

    // Remove 'Unknown' dates
    delete batchesByDate['Unknown']

    // Calculate defect rate and production for each date
    const defectTrend = []
    const productionTrend = []

    // Sort dates and get the latest 7 days
    const sortedDates = Object.keys(batchesByDate).sort()
    const last7Days = sortedDates.slice(-7)

    last7Days.forEach(date => {
      const dayBatches = batchesByDate[date]
      
      // Calculate total eggs for the day (using flattened structure)
      const totalEggs = dayBatches.reduce((sum, b) => {
        return sum + (b.totalEggs || 0)
      }, 0)
      
      // Calculate total defects (from eggSizes.Defect) for the day
      const totalDefects = dayBatches.reduce((sum, b) => {
        const defects = b.eggSizes?.Defect || b.sizeCounts?.Defect || 0
        return sum + defects
      }, 0)
      
      const defectRate = totalEggs > 0 ? (totalDefects / totalEggs) * 100 : 0

      // Format date for display (MMM DD)
      const displayDate = new Date(date).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      })

      defectTrend.push({
        date: displayDate,
        value: defectRate,
        count: dayBatches.length
      })

      productionTrend.push({
        date: displayDate,
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
      <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6">
        <p className="text-center text-gray-500 text-sm sm:text-base">No trend data available</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
      {/* Defect Rate Trend */}
      <div className="bg-white border border-gray-200 rounded-xl p-3 sm:p-4 lg:p-6">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <div>
            <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-800">Defect Rate Trend</h3>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5 sm:mt-1">Over {defectTrend.length} day(s)</p>
          </div>
          {defectChange !== 0 && (
            <div className={`flex items-center gap-0.5 sm:gap-1 text-xs sm:text-sm font-medium ${
              defectChange < 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {defectChange < 0 ? <TrendingDown className="w-3 h-3 sm:w-4 sm:h-4" /> : <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4" />}
              <span>{Math.abs(defectChange).toFixed(1)}%</span>
            </div>
          )}
        </div>

        {/* Simple bar chart */}
        <div className="space-y-2 sm:space-y-3">
          {defectTrend.map((item, index) => (
            <div key={index} className="space-y-1">
              <div className="flex items-center justify-between text-xs text-gray-600">
                <span className="flex items-center gap-1 truncate">
                  <Calendar className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{item.date}</span>
                </span>
                <span className="font-semibold flex-shrink-0 ml-2">{item.value.toFixed(2)}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-[#fb510f] to-[#fb510f]/80 h-full rounded-full transition-all duration-500"
                  style={{ width: `${(item.value / maxDefectRate) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Production Volume Trend */}
      <div className="bg-white border border-gray-200 rounded-xl p-3 sm:p-4 lg:p-6">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <div>
            <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-800">Production Volume</h3>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5 sm:mt-1">Over {productionTrend.length} day(s)</p>
          </div>
          {productionChange !== 0 && (
            <div className={`flex items-center gap-0.5 sm:gap-1 text-xs sm:text-sm font-medium ${
              productionChange > 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {productionChange > 0 ? <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4" /> : <TrendingDown className="w-3 h-3 sm:w-4 sm:h-4" />}
              <span>{Math.abs(productionChange).toFixed(1)}%</span>
            </div>
          )}
        </div>

        {/* Simple bar chart */}
        <div className="space-y-2 sm:space-y-3">
          {productionTrend.slice(-7).map((item, index) => (
            <div key={index} className="space-y-1">
              <div className="flex items-center justify-between text-xs text-gray-600">
                <span className="flex items-center gap-1 truncate">
                  <Calendar className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{item.date}</span>
                </span>
                <span className="font-semibold flex-shrink-0 ml-2">{item.value.toLocaleString()} eggs</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-[#105588] to-[#105588]/80 h-full rounded-full transition-all duration-500"
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

