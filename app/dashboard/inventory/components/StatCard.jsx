"use client"

/**
 * StatCard - Quick stats display card
 */
export default function StatCard({ title, value, icon: Icon, color = "blue", trend, subtitle }) {
  const colorClasses = {
    blue: "bg-[#E8F4FA] text-[#105588] border-[#105588]/20",
    green: "bg-[#E8F4FA] text-[#105588] border-[#105588]/20",
    purple: "bg-[#E8F4FA] text-[#105588] border-[#105588]/20",
    red: "bg-[#FEF3EF] text-[#fb510f] border-[#fb510f]/20",
    yellow: "bg-[#FDF8F0] text-[#ecb662] border-[#ecb662]/20",
    gray: "bg-gray-100 text-gray-600 border-gray-200"
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3 sm:p-4 lg:p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs sm:text-sm font-medium text-gray-500 mb-0.5 sm:mb-1 truncate">
            {title}
          </p>
          <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800 truncate">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-0.5 sm:mt-1 truncate">
              {subtitle}
            </p>
          )}
          {trend !== undefined && (
            <div className={`flex items-center gap-1 mt-1 sm:mt-2 text-xs font-medium ${
              trend >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              <span>{trend >= 0 ? '↑' : '↓'}</span>
              <span>{Math.abs(trend).toFixed(1)}%</span>
            </div>
          )}
        </div>
        {Icon && (
          <div className={`w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 rounded-lg flex items-center justify-center flex-shrink-0 ml-2 sm:ml-3 border ${colorClasses[color]}`}>
            <Icon className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
          </div>
        )}
      </div>
    </div>
  )
}

