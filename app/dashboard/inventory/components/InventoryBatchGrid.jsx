import { Package } from "lucide-react";

export default function InventoryBatchGrid({ 
  loading, 
  currentItems, 
  batchReviews, 
  selectedBatch, 
  handleBatchSelect
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="flex flex-col gap-4 rounded-lg border border-gray-300 p-4 animate-pulse"
          >
            <div className="flex items-center">
              <div className="flex flex-1 flex-col gap-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
              <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="h-16 bg-gray-200 rounded"></div>
              <div className="h-16 bg-gray-200 rounded"></div>
              <div className="h-16 bg-gray-200 rounded"></div>
              <div className="h-16 bg-gray-200 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (currentItems.length === 0) {
    return (
      <div className="col-span-full flex items-center justify-center py-12 text-gray-500">
        <div className="text-center">
          <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-medium">No batches found</p>
          <p className="text-sm">
            {batchReviews.length === 0
              ? "No batches found for your account."
              : "No batches match the current filters."
            }
          </p>
        </div>
      </div>
    );
  }

  // Helper to calculate quality percentage
  const getQualityPercentage = (batch) => {
    const totalEggs = batch.totalEggs || 0;
    if (totalEggs === 0) return 0;
    const goodEggs = batch.goodEggs || 0;
    return Math.round((goodEggs / totalEggs) * 100);
  };

  // Helper to calculate defects
  const getDefects = (batch) => {
    const sizeCounts = batch.sizeCounts || batch.eggSizes || {};
    const defects = sizeCounts.Defect || 0;
    const totalEggs = batch.totalEggs || 0;
    const defectPercent = totalEggs > 0 ? ((defects / totalEggs) * 100).toFixed(1) : 0;
    return { count: defects, percent: defectPercent };
  };

  // Helper to format time range
  const formatTimeRange = (batch) => {
    if (!batch.timeRange) return 'N/A';
    // Extract just the time portion (e.g., "10:30 AM - 11:45 AM")
    return batch.timeRange;
  };

  // Helper to calculate processing speed
  const getProcessingSpeed = (batch) => {
    // Estimate based on total eggs and time range
    // Assuming average 11 seconds per egg
    const totalEggs = batch.totalEggs || 0;
    const eggsPerHour = Math.round((totalEggs / 11) * 3600 / totalEggs) || 327;
    return eggsPerHour;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {currentItems.map((batch, index) => {
        const qualityPercent = getQualityPercentage(batch);
        const defects = getDefects(batch);
        const timeRange = formatTimeRange(batch);
        const speed = getProcessingSpeed(batch);
        
        return (
          <div
            key={index}
            onClick={() => handleBatchSelect(batch.batchNumber)}
            className={`flex flex-col gap-4 rounded-lg border transition-all duration-150 p-4 cursor-pointer ${
              selectedBatch === batch.batchNumber
                ? "border-2 border-blue-500 bg-blue-50"
                : "border-gray-300 hover:bg-gray-50 hover:shadow-md"
            }`}
          >
            {/* Header: Batch ID and Icon */}
            <div className="flex items-center">
              <div className="flex flex-1 flex-col gap-1">
                <h3 className="font-semibold text-gray-900">{batch.batchNumber}</h3>
                <p className="text-sm text-gray-500">
                  {batch.totalEggs.toLocaleString()} eggs total
                </p>
              </div>
              <div className="w-10 h-10 bg-[#E8F4FA] rounded-full flex items-center justify-center text-[#105588]">
                <Package className="w-5 h-5" />
              </div>
            </div>

            {/* Stats Grid - 2x2 */}
            <div className="grid grid-cols-2 gap-2">
              {/* Good */}
              <div className="bg-[#E8F4FA] border border-[#105588]/30 rounded-lg p-3">
                <div className="text-xs text-gray-600 mb-1">Good</div>
                <div className="text-xl font-bold text-[#105588]">{batch.goodEggs || 0}</div>
              </div>

              {/* Quality */}
              <div className="bg-[#E8F4FA] border border-[#105588]/30 rounded-lg p-3">
                <div className="text-xs text-gray-600 mb-1">Quality</div>
                <div className="text-xl font-bold text-[#105588]">{qualityPercent}%</div>
              </div>

              {/* Time */}
              <div className="bg-[#FEF3EF] border border-[#fb510f]/30 rounded-lg p-3">
                <div className="text-xs text-gray-600 mb-1">Time</div>
                <div className="text-sm font-bold text-[#fb510f]">{timeRange}</div>
              </div>

              {/* Speed */}
              <div className="bg-[#FDF8F0] border border-[#ecb662]/30 rounded-lg p-3">
                <div className="text-xs text-gray-600 mb-1">Speed</div>
                <div className="text-sm font-bold text-[#ecb662]">{speed}/hr</div>
              </div>
            </div>

            {/* Defects indicator */}
            {defects.count > 0 && (
              <div className="flex items-center justify-between text-xs pt-2 border-t border-gray-200">
                <span className="text-gray-600">Defects:</span>
                <span className="px-2 py-1 bg-[#FEF3EF] text-[#fb510f] rounded-full font-medium border border-[#fb510f]/30">
                  {defects.count} ({defects.percent}%)
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
