"use client";

import { useState, useRef, useEffect } from "react";
import {
  RefreshCw,
  Clock8,
  Package,
  Weight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
} from "lucide-react";
import { db, auth } from "../../../../config/firebaseConfig";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { exportSortBatchReview } from "../../../../utils/export-utils";
import LoadingLogo from "../../../components/LoadingLogo";
import { useLoadingDelay } from "../../../components/useLoadingDelay";

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

export default function BatchReview() {
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(6);
  const [showRowsDropdown, setShowRowsDropdown] = useState(false);
  const rowsDropdownRef = useRef(null);

  // Selected batch state
  const [selectedBatch, setSelectedBatch] = useState(null);

  // Data state
  const [batchReviews, setBatchReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const showLoading = useLoadingDelay(loading, 500);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Export state
  const [isExporting, setIsExporting] = useState(false);

  // Fetch batch review data
  useEffect(() => {
    const fetchBatchReviews = async () => {
      try {
        setLoading(true);
        console.log("BatchReview: Starting to fetch batch reviews...");
        
        // Get current user
        const user = auth.currentUser;
        if (!user) {
          console.log("BatchReview: No authenticated user found");
          setLoading(false);
          return;
        }

        // Get user document to find linked machines
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (!userDoc.exists()) {
          console.log("BatchReview: User document not found");
          setLoading(false);
          return;
        }

        const userData = userDoc.data();
        const linkedMachines = userData.linkedMachines || [];
        
        if (linkedMachines.length === 0) {
          console.log("BatchReview: No linked machines found for user");
          setBatchReviews([]);
          setLoading(false);
          return;
        }

        console.log(`BatchReview: Found ${linkedMachines.length} linked machines:`, linkedMachines);

        // Fetch weight logs for linked machines
        const weightLogsRef = collection(db, "weightLogs");
        const q = query(weightLogsRef, where("machineId", "in", linkedMachines));
        const querySnapshot = await getDocs(q);

        const logs = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          logs.push({
            id: doc.id,
            ...data,
            // Ensure timestamp is properly formatted
            timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : new Date(data.timestamp)
          });
        });

        console.log(`BatchReview: Fetched ${logs.length} weight logs`);

        // Group logs by batch number and calculate statistics
        const batchGroups = {};
        logs.forEach(log => {
          const batchNumber = log.batchNumber || 'Unknown';
          if (!batchGroups[batchNumber]) {
            batchGroups[batchNumber] = {
              batchNumber,
              logs: [],
              totalEggs: 0,
              eggSizes: {},
              timeRange: '',
              fromDate: '',
              toDate: '',
              machineIds: new Set()
            };
          }
          
          batchGroups[batchNumber].logs.push(log);
          batchGroups[batchNumber].totalEggs += log.totalEggs || 0;
          batchGroups[batchNumber].machineIds.add(log.machineId);
          
          // Count egg sizes
          if (log.eggSize) {
            batchGroups[batchNumber].eggSizes[log.eggSize] = 
              (batchGroups[batchNumber].eggSizes[log.eggSize] || 0) + (log.totalEggs || 0);
          }
        });

        // Convert to array and calculate additional statistics
        const batchReviewsData = Object.values(batchGroups).map(batch => {
          const sortedLogs = batch.logs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
          const fromDate = sortedLogs[0]?.timestamp;
          const toDate = sortedLogs[sortedLogs.length - 1]?.timestamp;
          
          // Find most common size
          const commonSize = Object.keys(batch.eggSizes).reduce((a, b) => 
            batch.eggSizes[a] > batch.eggSizes[b] ? a : b, 'Unknown'
          );

          return {
            ...batch,
            fromDate: fromDate ? fromDate.toLocaleDateString() : 'N/A',
            toDate: toDate ? toDate.toLocaleDateString() : 'N/A',
            timeRange: fromDate && toDate ? 
              `${fromDate.toLocaleDateString()} - ${toDate.toLocaleDateString()}` : 'N/A',
            commonSize,
            machineIds: Array.from(batch.machineIds),
            goodEggs: batch.totalEggs // Assuming all eggs in weight logs are good eggs
          };
        });

        setBatchReviews(batchReviewsData);
        setLoading(false);
        console.log("BatchReview: Batch review data processed successfully");
      } catch (error) {
        console.error("BatchReview: Error fetching batch reviews:", error);
        setLoading(false);
      }
    };

    fetchBatchReviews();
  }, []);

  // Total pages calculation
  const totalPages = Math.ceil(batchReviews.length / rowsPerPage);

  // Get current page data
  const indexOfLastItem = currentPage * rowsPerPage;
  const indexOfFirstItem = indexOfLastItem - rowsPerPage;
  const currentItems = batchReviews.slice(indexOfFirstItem, indexOfLastItem);

  // Get overview data based on selected batch or all batches
  const overviewData = selectedBatch
    ? batchReviews.find((batch) => batch.batchNumber === selectedBatch)
    : null;

  // Handle outside click for rows dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        rowsDropdownRef.current &&
        !rowsDropdownRef.current.contains(event.target)
      ) {
        setShowRowsDropdown(false);
      }
    }

    if (showRowsDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showRowsDropdown]);

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Re-fetch data by reloading the page
    window.location.reload();
  };

  // Handle export
  const handleExport = async (format) => {
    try {
      setIsExporting(true);
      await exportSortBatchReview(batchReviews, format);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  // Navigation functions
  const goToFirstPage = () => setCurrentPage(1);
  const goToPreviousPage = () =>
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  const goToNextPage = () =>
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  const goToLastPage = () => setCurrentPage(totalPages);

  // Handle batch selection
  const handleBatchSelect = (batchNumber) => {
    if (selectedBatch === batchNumber) {
      setSelectedBatch(null); // Deselect if already selected
    } else {
      setSelectedBatch(batchNumber);
    }
  };

  return (
    <div className="p-6">
      {/* Header with Actions */}
      <div className="flex flex-col lg:flex-row gap-4 mb-6">
        <div className="flex-1">
          <h2 className="text-xl font-semibold text-gray-900">Batch Review</h2>
          <p className="text-gray-600">Review and analyze egg sorting batches</p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <div className="relative">
            <button
              onClick={() => document.getElementById('export-dropdown').classList.toggle('hidden')}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              disabled={isExporting}
            >
              <Download className="w-4 h-4" />
              {isExporting ? 'Exporting...' : 'Export'}
            </button>
            
            <div id="export-dropdown" className="hidden absolute right-0 mt-2 w-48 bg-white border border-gray-300 rounded-lg shadow-lg z-10">
              <button
                onClick={() => handleExport('csv')}
                className="w-full text-left px-4 py-2 hover:bg-gray-50 first:rounded-t-lg"
              >
                Export as CSV
              </button>
              <button
                onClick={() => handleExport('excel')}
                className="w-full text-left px-4 py-2 hover:bg-gray-50 last:rounded-b-lg"
              >
                Export as Excel
              </button>
            </div>
          </div>

          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            disabled={isRefreshing}
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* batch review display */}
      <div className="bg-white rounded-2xl border border-gray-300 p-6 mb-6">
        {showLoading ? (
          <div className="py-12">
            <LoadingLogo message="Loading batch data..." size="lg" />
          </div>
        ) : selectedBatch ? (
          <div className="flex flex-col gap-6">
            {/* Main overview cards */}
            <div className="grid grid-cols-4 gap-4">
              <div className="col-span-4 sm:col-span-2 flex items-center gap-4 border border-gray-300 rounded-lg p-4">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-500">
                  <Package className="w-5 h-5" />
                </div>
                <div className="flex flex-1 flex-col gap-1">
                  <h3 className="font-medium text-gray-500 text-sm">
                    Total Eggs
                  </h3>
                  <span className="text-4xl font-semibold text-purple-500">
                    {overviewData?.totalEggs?.toLocaleString() || 0}
                  </span>
                </div>
              </div>

              <div className=" col-span-4 sm:col-span-2 flex items-center gap-4 border border-gray-300 rounded-lg p-4">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-500">
                  <Package className="w-5 h-5" />
                </div>
                <div className="flex flex-1 flex-col gap-1">
                  <h3 className="font-medium text-gray-500 text-sm">
                    Good Eggs
                  </h3>
                  <span className="text-4xl font-semibold text-blue-500">
                    {(overviewData?.goodEggs || 0).toLocaleString()}
                  </span>
                </div>
              </div>

              <div
                className={`col-span-4 sm:col-span-2 flex items-center gap-4 border border-gray-300 rounded-lg p-4`}
              >
                <div
                  className={`w-10 h-10 ${getSizeTypeBgColor(
                    overviewData?.commonSize || "Unknown"
                  )} rounded-full flex items-center justify-center ${getSizeTypeColor(
                    overviewData?.commonSize || "Unknown"
                  )}`}
                >
                  <Weight className="w-5 h-5" />
                </div>
                <div className="flex flex-1 flex-col gap-1">
                  <h3 className="font-medium text-gray-500 text-sm">
                    Most Common Size
                  </h3>
                  <span
                    className={`text-2xl font-semibold ${getSizeTypeColor(
                      overviewData?.commonSize || "Unknown"
                    )}`}
                  >
                    {overviewData?.commonSize || "Unknown"}
                  </span>
                </div>
              </div>

              <div className="col-span-4 sm:col-span-2 flex items-center gap-4 border border-gray-300 rounded-lg p-4">
                <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center text-yellow-500">
                  <Clock8 className="w-5 h-5" />
                </div>
                <div className="flex flex-1 flex-col gap-1">
                  <h3 className="font-medium text-gray-500 text-sm">
                    Time Range
                  </h3>
                  <span className="text-sm font-semibold text-yellow-500">
                    {overviewData?.timeRange || "N/A"}
                  </span>
                </div>
              </div>
            </div>

            {/* Egg Size Distribution */}
            <div className="">
              <h4 className="font-medium text-gray-700 mb-4">
                Egg Size Distribution
              </h4>
              <div className="grid grid-cols-4 gap-4">
                {overviewData?.eggSizes ? Object.entries(overviewData.eggSizes).map(
                  ([size, count]) => (
                    <div
                      key={size}
                      className="col-span-2 md:col-span-1 flex flex-col items-center gap-2"
                    >
                      <div
                        className={`w-12 h-12 ${getSizeTypeBgColor(
                          size
                        )} rounded-full flex items-center justify-center ${getSizeTypeColor(
                          size
                        )}`}
                      >
                        <Weight className="w-5 h-5" />
                      </div>
                      <div className="text-center">
                        <div
                          className={`text-lg font-semibold ${getSizeTypeColor(
                            size
                          )}`}
                        >
                          {count.toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-500">
                          {size}
                        </div>
                      </div>
                    </div>
                  )
                ) : (
                  <div className="col-span-full text-center text-gray-500">
                    No size distribution data available
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center text-center flex-col gap-4 justify-center py-6">
            <div className="bg-gray-100 rounded-full p-4 ">
              <Package className="w-10 h-10 mx-auto text-gray-500" />
            </div>
            <div className="flex flex-col items-center gap-1">
              <h3 className="text-lg font-medium">
                {batchReviews.length === 0 
                  ? "No batch data available" 
                  : "Select a batch to review"
                }
              </h3>
              <p className="text-gray-500 text-sm">
                {batchReviews.length === 0
                  ? "No weight logs found for your linked machines. Make sure you have machines linked to your account."
                  : "Click on any batch below to view its details"
                }
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-6 bg-white rounded-2xl border border-gray-300 p-6 shadow">
        {/* batch menus (data) */}
        <div className="flex flex-col gap-4 ">
          <h3 className="font-medium">
            {selectedBatch ? (
              <div className="flex items-center gap-2">
                <span className="text-xl text-gray-500">
                  <span className="font-semibold text-black">
                    {selectedBatch}
                  </span>
                </span>
                <button
                  onClick={() => setSelectedBatch(null)}
                  className="text-sm text-blue-500 hover:text-blue-600 cursor-pointer"
                >
                  (Clear Selection)
                </button>
              </div>
            ) : (
              <span className="text-xl font-medium">
                Available Batches
              </span>
            )}
          </h3>

          {/* items */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {loading ? (
              // Loading skeleton
              Array.from({ length: 6 }).map((_, index) => (
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
              ))
            ) : currentItems.length === 0 ? (
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
            ) : (
              currentItems.map((batch, index) => (
                <div
                  key={index}
                  onClick={() => handleBatchSelect(batch.batchNumber)}
                  className={`flex flex-col gap-4 rounded-lg border  transition-colors duration-150  p-4 cursor-pointer ${
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
              ))
            )}
          </div>
        </div>

        {/* pagination - only show if there are results */}
        {!loading && batchReviews.length > 0 && (
          <div className="flex flex-col-reverse gap-4 items-center justify-center md:flex-row md:justify-between">
            {/* Pagination controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={goToFirstPage}
                disabled={currentPage === 1}
                className={`p-2 rounded-lg border ${
                  currentPage === 1
                    ? "text-gray-300 cursor-not-allowed"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
              <button
                onClick={goToPreviousPage}
                disabled={currentPage === 1}
                className={`p-2 rounded-lg border ${
                  currentPage === 1
                    ? "text-gray-300 cursor-not-allowed"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="text-sm border rounded-lg px-4 py-2 bg-blue-50 text-blue-600">
                {currentPage}
              </div>

              <button
                onClick={goToNextPage}
                disabled={currentPage === totalPages}
                className={`p-2 rounded-lg border ${
                  currentPage === totalPages
                    ? "text-gray-300 cursor-not-allowed"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={goToLastPage}
                disabled={currentPage === totalPages}
                className={`p-2 rounded-lg border ${
                  currentPage === totalPages
                    ? "text-gray-300 cursor-not-allowed"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>

            {/* Rows per page selector */}
            <div className="relative" ref={rowsDropdownRef}>
              <button
                onClick={() => setShowRowsDropdown(!showRowsDropdown)}
                className="text-sm border rounded-lg px-4 py-2 flex items-center gap-2 hover:bg-gray-50"
              >
                {rowsPerPage} per page
                <ChevronDown
                  className={`w-4 h-4 transition-transform duration-200 ${
                    showRowsDropdown ? "rotate-180" : ""
                  }`}
                />
              </button>

              {showRowsDropdown && (
                <div className="absolute bottom-full mb-2 border bg-white shadow rounded-lg overflow-hidden z-40">
                  {[6, 9, 12, 15].map((value) => (
                    <button
                      key={value}
                      onClick={() => {
                        setRowsPerPage(value);
                        setShowRowsDropdown(false);
                        setCurrentPage(1); // Reset to first page when changing rows per page
                      }}
                      className={`px-4 py-2 text-sm w-full text-left hover:bg-gray-50 ${
                        rowsPerPage === value
                          ? "bg-blue-50 text-blue-600"
                          : ""
                      }`}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
