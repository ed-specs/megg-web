import { Package, Weight, Clock8, Calendar } from "lucide-react";

// Function to get color based on size type
const getSizeTypeColor = (sizeType) => {
  switch (sizeType) {
    case "Small":
      return "text-blue-500";
    case "Medium":
      return "text-green-500";
    case "Large":
      return "text-yellow-500";
    case "Defect":
      return "text-red-500";
    default:
      return "text-gray-500";
  }
};

// Function to get background color based on size type
const getSizeTypeBgColor = (sizeType) => {
  switch (sizeType) {
    case "Small":
      return "bg-blue-100";
    case "Medium":
      return "bg-green-100";
    case "Large":
      return "bg-yellow-100";
    case "Defect":
      return "bg-red-100";
    default:
      return "bg-gray-100";
  }
};

export default function InventoryOverviewCards({ overviewData, selectedBatch }) {
  if (!selectedBatch || !overviewData) {
    return null;
  }

  // Format creation date
  const formatDate = (date) => {
    if (!date) return 'N/A';
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <div className="flex flex-1 flex-col gap-6">
      {/* Batch Information */}
      <div className="flex items-center gap-3 sm:gap-4 border border-gray-300 rounded-lg p-3 sm:p-4 bg-gray-50">
        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#E4BE76] rounded-full flex items-center justify-center text-[#1F2421] flex-shrink-0">
          <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <h3 className="font-medium text-gray-500 text-xs sm:text-sm">Batch Created</h3>
          <span className="text-sm sm:text-lg font-semibold text-[#1F2421]">
            {formatDate(overviewData?.createdAt)}
          </span>
        </div>
      </div>

      {/* Main overview cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div className="flex items-center gap-3 sm:gap-4 border border-gray-300 rounded-lg p-3 sm:p-4">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-500 flex-shrink-0">
            <Package className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="flex flex-1 flex-col gap-0.5 sm:gap-1">
            <h3 className="font-medium text-gray-500 text-xs sm:text-sm">Total Eggs</h3>
            <span className="text-2xl sm:text-4xl font-semibold text-purple-500">
              {overviewData?.totalEggs?.toLocaleString() || 0}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-4 border border-gray-300 rounded-lg p-3 sm:p-4">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-500 flex-shrink-0">
            <Package className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="flex flex-1 flex-col gap-0.5 sm:gap-1">
            <h3 className="font-medium text-gray-500 text-xs sm:text-sm">Total Sort</h3>
            <span className="text-2xl sm:text-4xl font-semibold text-blue-500">
              {(
                typeof overviewData?.goodEggs === 'number'
                  ? overviewData.goodEggs
                  : (overviewData?.totalSort || 0)
              ).toLocaleString()}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-4 border border-gray-300 rounded-lg p-3 sm:p-4">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-red-100 rounded-full flex items-center justify-center text-red-500 flex-shrink-0">
            <Weight className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="flex flex-1 flex-col gap-0.5 sm:gap-1">
            <h3 className="font-medium text-gray-500 text-xs sm:text-sm">Total Defects</h3>
            <span className="text-2xl sm:text-4xl font-semibold text-red-500">
              {overviewData?.defectEggs?.toLocaleString() || 0}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-4 border border-gray-300 rounded-lg p-3 sm:p-4">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-100 rounded-full flex items-center justify-center text-green-500 flex-shrink-0">
            <Clock8 className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="flex flex-1 flex-col gap-0.5 sm:gap-1">
            <h3 className="font-medium text-gray-500 text-xs sm:text-sm">Time Range</h3>
            <span className="text-sm sm:text-lg font-semibold text-green-500">
              {overviewData?.timeRange || 'N/A'}
            </span>
          </div>
        </div>
      </div>

      {/* Size breakdown */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {overviewData?.sizeBreakdown && Object.entries(overviewData.sizeBreakdown).map(([size, count]) => (
          <div key={size} className={`flex items-center gap-2 sm:gap-3 border border-gray-300 rounded-lg p-2 sm:p-3 ${getSizeTypeBgColor(size)}`}>
            <div className={`w-6 h-6 sm:w-8 sm:h-8 ${getSizeTypeBgColor(size)} rounded-full flex items-center justify-center ${getSizeTypeColor(size)} flex-shrink-0`}>
              <Package className="w-3 h-3 sm:w-4 sm:h-4" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs sm:text-sm font-medium text-gray-600 truncate">{size}</span>
              <span className={`text-base sm:text-lg font-semibold ${getSizeTypeColor(size)}`}>
                {count?.toLocaleString() || 0}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
