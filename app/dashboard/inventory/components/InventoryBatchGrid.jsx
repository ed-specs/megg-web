import { Package, RefreshCw } from "lucide-react";

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
            <div className="flex flex-col gap-4">
              <div className="flex flex-1 flex-col gap-2">
                <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                <div className="h-3 bg-gray-200 rounded w-full"></div>
              </div>
              <div className="flex flex-1 flex-col gap-2">
                <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                <div className="h-3 bg-gray-200 rounded w-full"></div>
              </div>
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
              ? "No weight logs found for your linked machines. Make sure you have machines linked to your account."
              : "No batches match the current page."
            }
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {currentItems.map((batch, index) => (
        <div
          key={index}
          onClick={() => handleBatchSelect(batch.batchNumber)}
          className={`flex flex-col gap-4 rounded-lg border transition-colors duration-150 p-4 cursor-pointer ${
            selectedBatch === batch.batchNumber
              ? "border-2 border-blue-500"
              : "border-gray-300 hover:bg-gray-100"
          }`}
        >
          {/* title and date */}
          <div className="flex items-center">
            <div className="flex flex-1 flex-col gap-1">
              <h3 className="font-medium">{batch.batchNumber}</h3>
              <p className="text-sm text-gray-500">
                {batch.totalEggs.toLocaleString()} eggs total
              </p>
            </div>
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-500">
              <Package className="w-5 h-5" />
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex flex-1 flex-col gap-1 text-xs text-gray-500">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-full bg-blue-500"></div>
                From
              </div>
              <span className="flex gap-2 text-sm items-center">
                {batch.fromDate}
              </span>
            </div>

            <div className="flex flex-1 flex-col gap-1 text-xs text-gray-500">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-full bg-green-500"></div>
                To
              </div>
              <span className="flex gap-2 text-sm items-center">
                {batch.toDate}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
