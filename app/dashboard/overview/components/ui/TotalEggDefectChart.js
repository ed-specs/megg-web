"use client"

import { useState, useRef, useEffect } from "react"
import LoadingLogo from "../../../components/LoadingLogo"
import { useLoadingDelay } from "../../../components/useLoadingDelay"

// Mock function - replace with actual implementation
const getMachineLinkedDailyTotalDefects = async () => {
  return [];
};

const getMachineLinkedMonthlyTotalDefects = async () => {
  return [];
};

export function TotalEggDefectChart({ timeFrame }) {
  const [hoverData, setHoverData] = useState(null)
  const [animationProgress, setAnimationProgress] = useState(0)
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const showLoading = useLoadingDelay(loading, 500)
  const [error, setError] = useState(null)
  const chartRef = useRef(null)
  const lineRef = useRef(null)
  const [chartDimensions, setChartDimensions] = useState({
    width: 0,
    height: 0,
  })
  const [pathLength, setPathLength] = useState(0)
  const maxDefects = data.length > 0 ? Math.max(1, ...data.map((d) => d.defects || 0)) : 1

  // Fetch data when timeFrame changes
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        let fetchedData = []
        if (timeFrame === "daily") {
          fetchedData = await getMachineLinkedDailyTotalDefects()
        } else if (timeFrame === "monthly") {
          fetchedData = await getMachineLinkedMonthlyTotalDefects()
        }

        setData(fetchedData)
      } catch (err) {
        console.error("Error fetching total defects data:", err)
        setError("Failed to load chart data")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [timeFrame])

  // Handle chart resize
  useEffect(() => {
    const handleResize = () => {
      if (chartRef.current) {
        const rect = chartRef.current.getBoundingClientRect()
        setChartDimensions({
          width: rect.width,
          height: rect.height,
        })
      }
    }

    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  // Calculate path length for animation
  useEffect(() => {
    if (lineRef.current) {
      const length = lineRef.current.getTotalLength()
      setPathLength(length)
    }
  }, [data, chartDimensions])

  // Animation effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimationProgress(1)
    }, 100)
    return () => clearTimeout(timer)
  }, [data])

  // Reset animation when data changes
  useEffect(() => {
    setAnimationProgress(0)
  }, [data])

  const padding = 40
  const chartWidth = chartDimensions.width - padding * 2
  const chartHeight = chartDimensions.height - padding * 2

  // Generate SVG path
  const generatePath = () => {
    if (data.length === 0 || chartWidth <= 0 || chartHeight <= 0) return ""

    const points = data.map((item, index) => {
      const x = padding + (index / (data.length - 1)) * chartWidth
      const y = padding + chartHeight - ((item.defects || 0) / maxDefects) * chartHeight
      return `${x},${y}`
    })

    return `M ${points.join(" L ")}`
  }

  // Generate area path for gradient fill
  const generateAreaPath = () => {
    if (data.length === 0 || chartWidth <= 0 || chartHeight <= 0) return ""

    const points = data.map((item, index) => {
      const x = padding + (index / (data.length - 1)) * chartWidth
      const y = padding + chartHeight - ((item.defects || 0) / maxDefects) * chartHeight
      return `${x},${y}`
    })

    const firstX = padding
    const lastX = padding + chartWidth
    const bottomY = padding + chartHeight

    return `M ${firstX},${bottomY} L ${points.join(" L ")} L ${lastX},${bottomY} Z`
  }

  const formatValue = (value) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`
    }
    return value.toString()
  }

  const formatDate = (dateStr) => {
    const date = new Date(dateStr)
    if (timeFrame === "daily") {
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    } else if (timeFrame === "monthly") {
      return date.toLocaleDateString("en-US", { month: "short", year: "numeric" })
    }
    return dateStr
  }

  if (showLoading) {
    return (
      <div className="h-64 bg-gray-50 rounded-lg">
        <LoadingLogo message="Loading chart data..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 bg-red-50 rounded-lg">
        <div className="text-center">
          <p className="text-red-600 font-medium">{error}</p>
          <p className="text-red-500 text-sm mt-1">Please try refreshing the page</p>
        </div>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
        <div className="text-center">
          <p className="text-gray-500 font-medium">No defect data available</p>
          <p className="text-gray-400 text-sm mt-1">Data will appear when defects are detected</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Chart Container */}
      <div
        ref={chartRef}
        className="relative h-64 bg-gradient-to-br from-red-50 to-orange-100 rounded-lg overflow-hidden"
      >
        <svg
          width="100%"
          height="100%"
          className="absolute inset-0"
          onMouseLeave={() => setHoverData(null)}
        >
          {/* Gradient Definitions */}
          <defs>
            <linearGradient id="defectAreaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgb(239, 68, 68)" stopOpacity="0.3" />
              <stop offset="100%" stopColor="rgb(239, 68, 68)" stopOpacity="0.05" />
            </linearGradient>
          </defs>

          {/* Grid Lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
            <line
              key={ratio}
              x1={padding}
              y1={padding + chartHeight * ratio}
              x2={padding + chartWidth}
              y2={padding + chartHeight * ratio}
              stroke="rgb(203, 213, 225)"
              strokeWidth="1"
              opacity="0.5"
            />
          ))}

          {/* Area Fill */}
          <path
            d={generateAreaPath()}
            fill="url(#defectAreaGradient)"
            opacity={animationProgress}
            style={{
              transition: "opacity 1s ease-in-out",
            }}
          />

          {/* Main Line */}
          <path
            ref={lineRef}
            d={generatePath()}
            fill="none"
            stroke="rgb(239, 68, 68)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              strokeDasharray: pathLength,
              strokeDashoffset: pathLength * (1 - animationProgress),
              transition: "stroke-dashoffset 2s ease-in-out",
            }}
          />

          {/* Data Points */}
          {data.map((item, index) => {
            const x = padding + (index / (data.length - 1)) * chartWidth
            const y = padding + chartHeight - ((item.defects || 0) / maxDefects) * chartHeight

            return (
              <circle
                key={index}
                cx={x}
                cy={y}
                r="6"
                fill="rgb(239, 68, 68)"
                stroke="white"
                strokeWidth="2"
                className="cursor-pointer hover:r-8 transition-all duration-200"
                style={{
                  opacity: animationProgress,
                  transform: `scale(${animationProgress})`,
                  transformOrigin: `${x}px ${y}px`,
                  transition: "opacity 1s ease-in-out, transform 1s ease-in-out",
                }}
                onMouseEnter={() => setHoverData({ ...item, x, y, index })}
              />
            )
          })}

          {/* Y-axis Labels */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
            <text
              key={ratio}
              x={padding - 10}
              y={padding + chartHeight * (1 - ratio) + 5}
              textAnchor="end"
              className="text-xs fill-gray-500"
            >
              {formatValue(Math.round(maxDefects * ratio))}
            </text>
          ))}
        </svg>

        {/* Hover Tooltip */}
        {hoverData && (
          <div
            className="absolute bg-white border border-gray-200 rounded-lg shadow-lg p-3 pointer-events-none z-10"
            style={{
              left: Math.min(hoverData.x + 10, chartDimensions.width - 150),
              top: Math.max(hoverData.y - 60, 10),
            }}
          >
            <div className="text-sm font-medium text-gray-900">
              {formatDate(hoverData.date)}
            </div>
            <div className="text-lg font-bold text-red-600">
              {(hoverData.defects || 0).toLocaleString()} defects
            </div>
          </div>
        )}
      </div>

      {/* X-axis Labels */}
      <div className="flex justify-between mt-2 px-10">
        {data.map((item, index) => {
          // Show only every nth label to avoid crowding
          const showLabel = data.length <= 7 || index % Math.ceil(data.length / 7) === 0
          return (
            <div
              key={index}
              className={`text-xs text-gray-500 ${showLabel ? "" : "invisible"}`}
            >
              {formatDate(item.date)}
            </div>
          )
        })}
      </div>
    </div>
  )
}
