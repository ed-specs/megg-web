"use client";

import { useState, useRef, useEffect } from "react";
import {
  Clock8,
  Package,
  Weight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
} from "lucide-react";
import { db } from "../../../../config/firebaseConfig";
import { collection, query, where, getDocs } from "firebase/firestore";
import LoadingLogo from "../../../components/LoadingLogo";
import { useLoadingDelay } from "../../../components/useLoadingDelay";

// Color palette
const COLORS = {
  darkBlue: '#105588',
  brightOrange: '#FF4A08',
  lightCoral: '#F69664',
  tan: '#E4BE76',
  lightBlue: '#E2F5FC',
  // Lighter versions for backgrounds
  darkBlueLight: '#E2F5FC',
  coralLight: '#FEF0E8',
  tanLight: '#FAF5EB',
  orangeLight: '#FFF0E8',
};

// Function to get color style based on size type
const getSizeTypeColor = (sizeType) => {
  switch (sizeType) {
    case "Small":
      return { color: COLORS.darkBlue };
    case "Medium":
      return { color: COLORS.lightCoral };
    case "Large":
      return { color: COLORS.tan };
    case "Defect":
      return { color: COLORS.brightOrange };
    default:
      return { color: '#6B7280' };
  }
};

// Function to get background color style based on size type
const getSizeTypeBgColor = (sizeType) => {
  switch (sizeType) {
    case "Small":
      return { backgroundColor: COLORS.darkBlueLight };
    case "Medium":
      return { backgroundColor: COLORS.coralLight };
    case "Large":
      return { backgroundColor: COLORS.tanLight };
    case "Defect":
      return { backgroundColor: COLORS.orangeLight };
    default:
      return { backgroundColor: '#F9FAFB' };
  }
};

export default function BatchReview() {
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");

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


  // Fetch batch review data
  useEffect(() => {
    const fetchBatchReviews = async () => {
      try {
        setLoading(true);
        console.log("BatchReview: Starting to fetch batch reviews...");
        
        // Get accountId from stored user data
        const { getUserAccountId } = await import("../../../../utils/auth-utils");
        const accountId = getUserAccountId();
        
        if (!accountId) {
          console.log("BatchReview: No accountId found");
          setBatchReviews([]);
          setLoading(false);
          return;
        }

        console.log(`BatchReview: Fetching batches and good eggs for accountId: ${accountId}`);

        // Fetch batches for this account
        const batchesRef = collection(db, "batches");
        const batchesQuery = query(batchesRef, where("accountId", "==", accountId));
        const batchesSnapshot = await getDocs(batchesQuery);

        // Fetch good eggs to get accurate size distribution
        const eggsRef = collection(db, "eggs");
        const eggsQuery = query(
          eggsRef,
          where("accountId", "==", accountId)
        );
        const eggsSnapshot = await getDocs(eggsQuery);

        // Group good eggs by batch
        const batchEggGroups = {};
        eggsSnapshot.forEach((doc) => {
          const egg = doc.data();
          // Only include good eggs
          if (!egg.quality || egg.quality === 'good') {
            const batchId = egg.batchId || 'Unknown';
            if (!batchEggGroups[batchId]) {
              batchEggGroups[batchId] = {
                smallEggs: 0,
                mediumEggs: 0,
                largeEggs: 0,
                totalEggs: 0
              };
            }
            batchEggGroups[batchId].totalEggs++;
            if (egg.size === 'small') batchEggGroups[batchId].smallEggs++;
            else if (egg.size === 'medium') batchEggGroups[batchId].mediumEggs++;
            else if (egg.size === 'large') batchEggGroups[batchId].largeEggs++;
          }
        });

        const batchReviewsData = [];
        batchesSnapshot.forEach((doc) => {
          const batch = doc.data();
          const batchId = batch.id || 'Unknown';
          const eggGroup = batchEggGroups[batchId] || { smallEggs: 0, mediumEggs: 0, largeEggs: 0, totalEggs: 0 };
          
          // Calculate egg size distribution from good eggs only
          const eggSizes = {};
          if (eggGroup.smallEggs > 0) eggSizes['Small'] = eggGroup.smallEggs;
          if (eggGroup.mediumEggs > 0) eggSizes['Medium'] = eggGroup.mediumEggs;
          if (eggGroup.largeEggs > 0) eggSizes['Large'] = eggGroup.largeEggs;
          
          // Find most common size
          const commonSize = Object.keys(eggSizes).reduce((a, b) => 
            eggSizes[a] > eggSizes[b] ? a : b, 'Unknown'
          );

          const fromDate = batch.createdAt ? new Date(batch.createdAt) : null;
          const toDate = batch.updatedAt ? new Date(batch.updatedAt) : null;

          // Extract batch number (last part after last dash, e.g., "0001" from "BATCH-679622-0001")
          const batchNumber = batch.id && batch.id.includes('-')
            ? batch.id.split('-').pop()
            : (batch.id ? batch.id.replace('BATCH-', '') : 'Unknown');
          
          batchReviewsData.push({
            batchNumber: batchNumber,
            batchId: batchId,
            totalEggs: eggGroup.totalEggs, // Use count from good eggs
            goodEggs: eggGroup.totalEggs, // All are good eggs
            eggSizes,
            commonSize,
            fromDate: fromDate ? fromDate.toLocaleDateString() : 'N/A',
            toDate: toDate ? toDate.toLocaleDateString() : 'N/A',
            timeRange: fromDate && toDate ? 
              `${fromDate.toLocaleDateString()} - ${toDate.toLocaleDateString()}` : 'N/A',
            machineIds: [] // Not available in batches collection
          });
        });

        // Sort by date (newest first)
        batchReviewsData.sort((a, b) => {
          const dateA = a.fromDate !== 'N/A' ? new Date(a.fromDate) : new Date(0);
          const dateB = b.fromDate !== 'N/A' ? new Date(b.fromDate) : new Date(0);
          return dateB - dateA;
        });

        console.log(`BatchReview: Fetched ${batchReviewsData.length} batches`);
        setBatchReviews(batchReviewsData);
        setLoading(false);
      } catch (error) {
        console.error("BatchReview: Error fetching batch reviews:", error);
        setLoading(false);
      }
    };

    fetchBatchReviews();
  }, []);

  // Filter batches based on search query
  const filteredBatches = batchReviews.filter((batch) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      batch.batchNumber?.toLowerCase().includes(query) ||
      batch.batchId?.toLowerCase().includes(query) ||
      batch.totalEggs?.toString().includes(query) ||
      batch.fromDate?.toLowerCase().includes(query) ||
      batch.toDate?.toLowerCase().includes(query)
    );
  });

  // Total pages calculation
  const totalPages = Math.ceil(filteredBatches.length / rowsPerPage);

  // Get current page data
  const indexOfLastItem = currentPage * rowsPerPage;
  const indexOfFirstItem = indexOfLastItem - rowsPerPage;
  const currentItems = filteredBatches.slice(indexOfFirstItem, indexOfLastItem);

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

  // Reset to first page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  return (
    <div className="p-4 sm:p-6">
      {/* Header with Search and Actions */}
      <div className="flex flex-col gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="flex flex-col lg:flex-row gap-3 sm:gap-4">
          <div className="flex-1">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Batch Review</h2>
            <p className="text-sm sm:text-base text-gray-600">Review and analyze egg sorting batches</p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search by batch number, batch ID, total eggs, or date..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* batch review display */}
      <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-300 p-4 sm:p-6 mb-4 sm:mb-6">
        {showLoading ? (
          <div className="py-12">
            <LoadingLogo message="Loading batch data..." size="lg" />
          </div>
        ) : selectedBatch ? (
          <div className="flex flex-col gap-4 sm:gap-6">
            {/* Main overview cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <div className="flex items-center gap-3 sm:gap-4 border border-gray-300 rounded-lg p-3 sm:p-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: COLORS.darkBlueLight }}>
                  <Package className="w-5 h-5" style={{ color: COLORS.darkBlue }} />
                </div>
                <div className="flex flex-1 flex-col gap-1 min-w-0">
                  <h3 className="font-medium text-gray-500 text-xs sm:text-sm">
                    Total Eggs
                  </h3>
                  <span className="text-2xl sm:text-4xl font-semibold" style={{ color: COLORS.darkBlue }}>
                    {overviewData?.totalEggs?.toLocaleString() || 0}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 sm:gap-4 border border-gray-300 rounded-lg p-3 sm:p-4">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                  style={getSizeTypeBgColor(overviewData?.commonSize || "Unknown")}
                >
                  <Weight className="w-5 h-5" style={getSizeTypeColor(overviewData?.commonSize || "Unknown")} />
                </div>
                <div className="flex flex-1 flex-col gap-1 min-w-0">
                  <h3 className="font-medium text-gray-500 text-xs sm:text-sm">
                    Most Common Size
                  </h3>
                  <span className="text-xl sm:text-2xl font-semibold" style={getSizeTypeColor(overviewData?.commonSize || "Unknown")}>
                    {overviewData?.commonSize || "Unknown"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 sm:gap-4 border border-gray-300 rounded-lg p-3 sm:p-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: COLORS.tanLight }}>
                  <Clock8 className="w-5 h-5" style={{ color: COLORS.tan }} />
                </div>
                <div className="flex flex-1 flex-col gap-1 min-w-0">
                  <h3 className="font-medium text-gray-500 text-xs sm:text-sm">
                    Time Range
                  </h3>
                  <span className="text-xs sm:text-sm font-semibold break-words" style={{ color: COLORS.tan }}>
                    {overviewData?.timeRange || "N/A"}
                  </span>
                </div>
              </div>
            </div>

            {/* Egg Size Distribution */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 lg:p-8 shadow-sm">
              <div className="mb-4 sm:mb-6">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-1 sm:mb-2">Size Distribution</h3>
                <p className="text-xs sm:text-sm text-gray-600">Breakdown of eggs by size category</p>
              </div>
              {/* Mobile: Stacked cards, Desktop: Grid */}
              <div className="space-y-2.5 sm:space-y-0 sm:grid sm:grid-cols-3 sm:gap-6 lg:gap-8">
                {overviewData?.eggSizes && Object.keys(overviewData.eggSizes).length > 0 ? (
                  Object.entries(overviewData.eggSizes).map(([size, count]) => {
                    const totalEggs = overviewData?.totalEggs || 1;
                    const percentage = ((count / totalEggs) * 100).toFixed(1);
                    return (
                      <div 
                        key={size} 
                        className="bg-gradient-to-br from-gray-50 to-gray-100/50 sm:bg-transparent rounded-xl sm:rounded-none p-4 sm:p-0 border border-gray-200/60 sm:border-0 shadow-sm sm:shadow-none"
                      >
                        {/* Mobile: Icon and content side by side, Desktop: Centered vertical */}
                        <div className="flex items-center sm:flex-col sm:items-center gap-4 sm:gap-0">
                          {/* Icon */}
                          <div 
                            className="w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 sm:mx-auto mb-0 sm:mb-4 rounded-full flex items-center justify-center shadow-md"
                            style={getSizeTypeBgColor(size)}
                          >
                            <Package className="w-8 h-8 sm:w-10 sm:h-10" style={getSizeTypeColor(size)} />
                          </div>
                          {/* Content */}
                          <div className="flex-1 sm:flex-none text-left sm:text-center min-w-0 sm:w-full">
                            <div className="text-2xl sm:text-2xl lg:text-3xl font-bold mb-1" style={getSizeTypeColor(size)}>
                              {count.toLocaleString()}
                            </div>
                            <div className="text-base sm:text-base font-semibold text-gray-800 mb-0.5 sm:mb-1">{size}</div>
                            <div className="text-xs sm:text-sm font-medium text-gray-600">{percentage}% of total</div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="col-span-full text-center py-8 text-gray-500">
                    <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-sm">No size distribution data available</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center text-center flex-col gap-3 sm:gap-4 justify-center py-6 sm:py-8">
            <div className="bg-gray-100 rounded-full p-3 sm:p-4">
              <Package className="w-8 h-8 sm:w-10 sm:h-10 mx-auto text-gray-500" />
            </div>
            <div className="flex flex-col items-center gap-1">
              <h3 className="text-base sm:text-lg font-medium">
                {batchReviews.length === 0 
                  ? "No batch data available" 
                  : "Select a batch to review"
                }
              </h3>
              <p className="text-gray-500 text-xs sm:text-sm px-4">
                {batchReviews.length === 0
                  ? "No weight logs found for your linked machines. Make sure you have machines linked to your account."
                  : "Click on any batch below to view its details"
                }
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4 sm:gap-6 bg-white rounded-xl sm:rounded-2xl border border-gray-300 p-4 sm:p-6 shadow">
        {/* batch menus (data) */}
        <div className="flex flex-col gap-3 sm:gap-4">
          <h3 className="text-base sm:text-lg font-medium">
            {selectedBatch ? (
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <span className="text-lg sm:text-xl text-gray-500">
                  <span className="font-semibold text-black">
                    {selectedBatch}
                  </span>
                </span>
                <button
                  onClick={() => setSelectedBatch(null)}
                  className="text-xs sm:text-sm cursor-pointer transition-colors text-left sm:text-left"
                  style={{ color: COLORS.darkBlue }}
                  onMouseEnter={(e) => e.target.style.color = '#0D4470'}
                  onMouseLeave={(e) => e.target.style.color = COLORS.darkBlue}
                >
                  (Clear Selection)
                </button>
              </div>
            ) : (
              <span className="text-lg sm:text-xl font-medium">
                Available Batches
              </span>
            )}
          </h3>

          {/* items */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
            {loading ? (
              // Loading skeleton
              Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="flex flex-col gap-3 sm:gap-4 rounded-lg border border-gray-300 p-3 sm:p-4 animate-pulse"
                >
                  <div className="flex items-center">
                    <div className="flex flex-1 flex-col gap-2">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                    <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                  </div>
                  <div className="flex flex-col gap-3 sm:gap-4">
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
              <div className="col-span-full flex items-center justify-center py-8 sm:py-12 text-gray-500">
                <div className="text-center px-4">
                  <Package className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 text-gray-300" />
                  <p className="text-base sm:text-lg font-medium">No batches found</p>
                  <p className="text-xs sm:text-sm">
                    {batchReviews.length === 0
                      ? "No weight logs found for your linked machines. Make sure you have machines linked to your account."
                      : searchQuery
                      ? "No batches match your search criteria."
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
                  className="flex flex-col gap-3 sm:gap-4 rounded-lg border transition-colors duration-150 p-3 sm:p-4 cursor-pointer"
                  style={{
                    borderColor: selectedBatch === batch.batchNumber ? COLORS.darkBlue : '#D1D5DB',
                    borderWidth: selectedBatch === batch.batchNumber ? '2px' : '1px'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedBatch !== batch.batchNumber) {
                      e.currentTarget.style.backgroundColor = '#F9FAFB';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedBatch !== batch.batchNumber) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  
                  {/* title and date */}
                  <div className="flex items-center">
                    <div className="flex flex-1 flex-col gap-1 min-w-0">
                      <h3 className="font-medium text-sm sm:text-base truncate">{batch.batchNumber}</h3>
                      <p className="text-xs sm:text-sm text-gray-500">
                        {batch.totalEggs.toLocaleString()} eggs total
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: COLORS.darkBlueLight }}>
                      <Package className="w-5 h-5" style={{ color: COLORS.darkBlue }} />
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 sm:gap-4">
                    <div className="flex flex-1 flex-col gap-1 text-xs text-gray-500">
                      <div className="flex items-center gap-2">
                        <div className="p-1 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS.darkBlue }}></div>
                        <span>From</span>
                      </div>
                      <span className="flex gap-2 text-xs sm:text-sm items-center pl-3">
                        {batch.fromDate}
                      </span>
                    </div>

                    <div className="flex flex-1 flex-col gap-1 text-xs text-gray-500">
                      <div className="flex items-center gap-2">
                        <div className="p-1 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS.lightCoral }}></div>
                        <span>To</span>
                      </div>
                      <span className="flex gap-2 text-xs sm:text-sm items-center pl-3">
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
        {!loading && filteredBatches.length > 0 && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            {/* Pagination controls */}
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <button
                onClick={goToFirstPage}
                disabled={currentPage === 1}
                className={`p-2.5 sm:p-2 rounded-lg sm:rounded border-2 sm:border transition-all ${
                  currentPage === 1
                    ? "text-gray-300 cursor-not-allowed border-gray-200"
                    : "text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400"
                }`}
                aria-label="First page"
              >
                <ChevronsLeft className="w-5 h-5 sm:w-4 sm:h-4" />
              </button>
              <button
                onClick={goToPreviousPage}
                disabled={currentPage === 1}
                className={`p-2.5 sm:p-2 rounded-lg sm:rounded border-2 sm:border transition-all ${
                  currentPage === 1
                    ? "text-gray-300 cursor-not-allowed border-gray-200"
                    : "text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400"
                }`}
                aria-label="Previous page"
              >
                <ChevronLeft className="w-5 h-5 sm:w-4 sm:h-4" />
              </button>

              <div 
                className="text-sm font-semibold sm:font-medium border-2 sm:border rounded-lg sm:rounded px-4 sm:px-3 py-2.5 sm:py-1.5 whitespace-nowrap shadow-sm sm:shadow-none"
                style={{ 
                  backgroundColor: COLORS.darkBlueLight, 
                  color: COLORS.darkBlue,
                  borderColor: COLORS.darkBlue
                }}
              >
                {currentPage} / {totalPages}
              </div>

              <button
                onClick={goToNextPage}
                disabled={currentPage === totalPages}
                className={`p-2.5 sm:p-2 rounded-lg sm:rounded border-2 sm:border transition-all ${
                  currentPage === totalPages
                    ? "text-gray-300 cursor-not-allowed border-gray-200"
                    : "text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400"
                }`}
                aria-label="Next page"
              >
                <ChevronRight className="w-5 h-5 sm:w-4 sm:h-4" />
              </button>
              <button
                onClick={goToLastPage}
                disabled={currentPage === totalPages}
                className={`p-2.5 sm:p-2 rounded-lg sm:rounded border-2 sm:border transition-all ${
                  currentPage === totalPages
                    ? "text-gray-300 cursor-not-allowed border-gray-200"
                    : "text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400"
                }`}
                aria-label="Last page"
              >
                <ChevronsRight className="w-5 h-5 sm:w-4 sm:h-4" />
              </button>
            </div>

            {/* Rows per page selector */}
            <div className="relative flex justify-center sm:justify-end" ref={rowsDropdownRef}>
              <button
                onClick={() => setShowRowsDropdown(!showRowsDropdown)}
                className="text-sm font-medium border-2 sm:border rounded-lg sm:rounded px-4 sm:px-3 py-2.5 sm:py-1.5 flex items-center gap-2 sm:gap-1.5 hover:bg-gray-50 w-full sm:w-auto justify-center transition-all border-gray-300 hover:border-gray-400 shadow-sm sm:shadow-none"
              >
                <span>{rowsPerPage} per page</span>
                <ChevronDown
                  className={`w-4 h-4 sm:w-3.5 sm:h-3.5 transition-transform duration-200 ${
                    showRowsDropdown ? "rotate-180" : ""
                  }`}
                />
              </button>

              {showRowsDropdown && (
                <div className="absolute top-full mt-2 right-0 sm:right-0 left-0 sm:left-auto border-2 sm:border border-gray-300 bg-white shadow-xl sm:shadow-lg rounded-lg overflow-hidden z-50 min-w-[140px] sm:min-w-[100px]">
                  {[6, 9, 12, 15].map((value) => (
                    <button
                      key={value}
                      onClick={() => {
                        setRowsPerPage(value);
                        setShowRowsDropdown(false);
                        setCurrentPage(1);
                      }}
                      className="px-4 sm:px-3 py-2.5 sm:py-2 text-sm w-full text-left hover:bg-gray-50 font-medium sm:font-normal transition-colors"
                      style={rowsPerPage === value ? {
                        backgroundColor: COLORS.darkBlueLight,
                        color: COLORS.darkBlue
                      } : {}}
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
