"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Search,
  SlidersHorizontal,
  Download,
  RefreshCw,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Package,
  Printer,
} from "lucide-react";
import { exportSortLogs } from "../../../../utils/export-utils";
import { db } from "../../../../config/firebaseConfig";
import { 
  getDocs, 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  startAfter,
  Timestamp 
} from "firebase/firestore";
import { getUserAccountId } from "../../../../utils/auth-utils";
import LoadingLogo from "../../../components/LoadingLogo";
import { useLoadingDelay } from "../../../components/useLoadingDelay";
import BatchSelectionModal from "../../../inventory/components/BatchSelectionModal";
import { saveInAppNotification } from "../../../../utils/notification-utils";

// Cache key prefix
const CACHE_KEY_PREFIX = "sort_logs_cache_";
const CACHE_TIMESTAMP_KEY_PREFIX = "sort_logs_timestamp_";
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Color palette
const COLORS = {
  darkBlue: '#105588',
  brightOrange: '#FF4A08',
  lightCoral: '#F69664',
  tan: '#E4BE76',
  lightBlue: '#E2F5FC',
  // Lighter versions for backgrounds
  darkBlueLight: '#E2F5FC', // Using light blue for dark blue background
  coralLight: '#FEF0E8', // Light coral background
  tanLight: '#FAF5EB', // Light tan background
  orangeLight: '#FFF0E8', // Light orange background
};

// Function to get color style based on size type
const getSizeColor = (size) => {
  switch (size) {
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
const getSizeBgColor = (size) => {
  switch (size) {
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

// Cache management functions
const getCacheKey = (accountId) => `${CACHE_KEY_PREFIX}${accountId}`;
const getTimestampKey = (accountId) => `${CACHE_TIMESTAMP_KEY_PREFIX}${accountId}`;

const getCachedData = (accountId) => {
  try {
    const cacheKey = getCacheKey(accountId);
    const timestampKey = getTimestampKey(accountId);
    const cached = localStorage.getItem(cacheKey);
    const cachedTimestamp = localStorage.getItem(timestampKey);
    
    if (!cached || !cachedTimestamp) return null;
    
    const now = Date.now();
    const cacheTime = parseInt(cachedTimestamp, 10);
    
    // Check if cache is still valid (within 5 minutes)
    if (now - cacheTime > CACHE_DURATION) {
      localStorage.removeItem(cacheKey);
      localStorage.removeItem(timestampKey);
      return null;
    }
    
    return JSON.parse(cached);
  } catch (error) {
    console.error("Error reading cache:", error);
    return null;
  }
};

const setCachedData = (accountId, data) => {
  try {
    const cacheKey = getCacheKey(accountId);
    const timestampKey = getTimestampKey(accountId);
    localStorage.setItem(cacheKey, JSON.stringify(data));
    localStorage.setItem(timestampKey, Date.now().toString());
  } catch (error) {
    console.error("Error writing cache:", error);
  }
};

const clearCache = (accountId) => {
  try {
    const cacheKey = getCacheKey(accountId);
    const timestampKey = getTimestampKey(accountId);
    localStorage.removeItem(cacheKey);
    localStorage.removeItem(timestampKey);
  } catch (error) {
    console.error("Error clearing cache:", error);
  }
};

// Check if new eggs were added by checking the latest good egg timestamp
const checkForNewEggs = async (accountId, lastCachedTimestamp) => {
  try {
    const eggsRef = collection(db, "eggs");
    const q = query(
      eggsRef,
      where("accountId", "==", accountId),
      orderBy("createdAt", "desc"),
      limit(10) // Check more eggs to find a good one
    );
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) return false;
    
    // Find the latest good egg
    for (const doc of snapshot.docs) {
      const egg = doc.data();
      if (!egg.quality || egg.quality === 'good') {
        const latestTimestamp = egg.createdAt 
          ? (egg.createdAt instanceof Timestamp 
              ? egg.createdAt.toMillis() 
              : new Date(egg.createdAt).getTime())
          : 0;
        return latestTimestamp > lastCachedTimestamp;
      }
    }
    
    return false;
  } catch (error) {
    console.error("Error checking for new eggs:", error);
    return true; // Assume new eggs exist if check fails
  }
};

export default function SortLog() {
  // Search state
  const [searchQuery, setSearchQuery] = useState("");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [showRowsDropdown, setShowRowsDropdown] = useState(false);
  const rowsDropdownRef = useRef(null);

  // Filter state
  const [showFilters, setShowFilters] = useState(false);
  const [eggSize, setEggSize] = useState("All Sizes");
  const [date, setDate] = useState("");
  const [batchNumber, setBatchNumber] = useState("All Batches");
  const [sortBy, setSortBy] = useState("Newest First");

  // Data state
  const [allEggs, setAllEggs] = useState([]); // All eggs (cached or fetched)
  const [filteredAndSortedLogs, setFilteredAndSortedLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const showLoading = useLoadingDelay(loading, 500);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [totalEggs, setTotalEggs] = useState(0); // Total count for pagination

  // Export state
  const [isExporting, setIsExporting] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedBatches, setSelectedBatches] = useState([]);

  // Fetch eggs from Firestore with pagination
  const fetchEggs = useCallback(async (accountId, forceRefresh = false) => {
    try {
      setLoading(true);
      console.log("SortLog: Starting to fetch eggs...", { forceRefresh });

      // Check cache first (unless force refresh)
      if (!forceRefresh) {
        const cached = getCachedData(accountId);
        if (cached && cached.eggs && cached.eggs.length > 0) {
          const cacheTimestamp = parseInt(localStorage.getItem(getTimestampKey(accountId)) || "0", 10);
          
          // Check if new eggs were added
          const hasNewEggs = await checkForNewEggs(accountId, cacheTimestamp);
          
          if (!hasNewEggs) {
            console.log("SortLog: Using cached data");
            // Filter cached eggs to only include good eggs
            const filteredCachedEggs = cached.eggs.filter(egg => 
              !egg.quality || egg.quality === 'good'
            );
            setAllEggs(filteredCachedEggs);
            setTotalEggs(filteredCachedEggs.length);
            setLoading(false);
            return;
          } else {
            console.log("SortLog: New eggs detected, refreshing cache");
          }
        }
      }

      console.log(`SortLog: Fetching eggs from Firestore for accountId: ${accountId}`);

      // Fetch all eggs (we'll paginate client-side for filtering/searching)
      // For very large datasets, consider server-side pagination
      const eggsRef = collection(db, "eggs");
      const q = query(
        eggsRef,
        where("accountId", "==", accountId),
        orderBy("createdAt", "desc")
      );
      
      const querySnapshot = await getDocs(q);
      const eggs = [];

      querySnapshot.forEach((doc) => {
        const egg = doc.data();
        // Only include good eggs for sort history
        // Skip if quality exists and is not 'good' (dirty, cracked, etc.)
        if (egg.quality && egg.quality !== 'good') {
          return;
        }
        
        const batchId = egg.batchId || 'Unknown';
        const batchNumber = batchId.includes('-') 
          ? batchId.split('-').pop() 
          : batchId.replace('BATCH-', '');
        const size = egg.size ? egg.size.charAt(0).toUpperCase() + egg.size.slice(1) : 'Unknown';
        
        eggs.push({
          id: doc.id,
          eggId: egg.eggId || doc.id,
          batchNumber: batchNumber,
          batchId: batchId,
          eggSize: size,
          weight: egg.weight || null,
          quality: egg.quality || 'good',
          timestamp: egg.createdAt 
            ? (egg.createdAt instanceof Timestamp 
                ? egg.createdAt.toDate() 
                : new Date(egg.createdAt))
            : new Date(),
          createdAt: egg.createdAt
        });
      });

      console.log(`SortLog: Fetched ${eggs.length} good eggs from Firestore`);

      // Cache the data (already filtered to good eggs only)
      setCachedData(accountId, {
        eggs,
        totalCount: eggs.length,
        fetchedAt: Date.now()
      });

      setAllEggs(eggs);
      setTotalEggs(eggs.length);
      setLoading(false);
    } catch (error) {
      console.error("SortLog: Error fetching eggs:", error);
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    const accountId = getUserAccountId();
    if (accountId) {
      fetchEggs(accountId, false);
    } else {
      setLoading(false);
    }
  }, [fetchEggs]);

  // Filter and sort logs whenever dependencies change
  useEffect(() => {
    let filtered = [...allEggs];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(log => 
        log.eggId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.eggSize?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.batchNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.batchId?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply egg size filter
    if (eggSize !== "All Sizes") {
      filtered = filtered.filter(log => log.eggSize === eggSize);
    }

    // Apply date filter
    if (date) {
      const filterDate = new Date(date);
      filtered = filtered.filter(log => {
        const logDate = new Date(log.timestamp);
        return logDate.toDateString() === filterDate.toDateString();
      });
    }

    // Apply batch number filter
    if (batchNumber !== "All Batches") {
      filtered = filtered.filter(log => log.batchNumber === batchNumber);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      const dateA = new Date(a.timestamp);
      const dateB = new Date(b.timestamp);
      
      switch (sortBy) {
        case "Newest First":
          return dateB - dateA;
        case "Oldest First":
          return dateA - dateB;
        case "Size A-Z":
          return (a.eggSize || "").localeCompare(b.eggSize || "");
        case "Size Z-A":
          return (b.eggSize || "").localeCompare(a.eggSize || "");
        case "Batch Number A-Z":
          return (a.batchNumber || "").localeCompare(b.batchNumber || "");
        case "Batch Number Z-A":
          return (b.batchNumber || "").localeCompare(a.batchNumber || "");
        case "Weight High-Low":
          return (b.weight || 0) - (a.weight || 0);
        case "Weight Low-High":
          return (a.weight || 0) - (b.weight || 0);
        default:
          return dateB - dateA;
      }
    });

    setFilteredAndSortedLogs(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, [allEggs, searchQuery, eggSize, date, batchNumber, sortBy]);

  // Get unique values for filter dropdowns
  const uniqueEggSizes = [...new Set(allEggs.map(log => log.eggSize).filter(Boolean))].sort();
  const uniqueBatchNumbers = [...new Set(allEggs.map(log => log.batchNumber).filter(Boolean))].sort();

  // Pagination calculations
  const totalPages = Math.ceil(filteredAndSortedLogs.length / rowsPerPage);
  const indexOfLastItem = currentPage * rowsPerPage;
  const indexOfFirstItem = indexOfLastItem - rowsPerPage;
  const currentItems = filteredAndSortedLogs.slice(indexOfFirstItem, indexOfLastItem);

  // Handle outside click for dropdowns
  useEffect(() => {
    function handleClickOutside(event) {
      if (rowsDropdownRef.current && !rowsDropdownRef.current.contains(event.target)) {
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
    const accountId = getUserAccountId();
    if (accountId) {
      clearCache(accountId);
      await fetchEggs(accountId, true);
    }
    setIsRefreshing(false);
  };

  // Filter logs by batch selection
  const filterLogsByBatches = (logs, batchNumbers) => {
    if (!batchNumbers || batchNumbers.length === 0) return logs;
    
    return logs.filter(log => {
      // Match by full batchId format (BATCH-679622-0023)
      const logBatchId = log.batchId || (log.batchNumber ? `BATCH-${log.batchNumber}` : '');
      return batchNumbers.includes(logBatchId);
    });
  };

  // Get unique batches from logs for the modal
  const getUniqueBatches = () => {
    const batchMap = new Map();
    filteredAndSortedLogs.forEach(log => {
      // Use batchId (full format like BATCH-679622-0023) if available, otherwise construct it
      const batchId = log.batchId || (log.batchNumber ? `BATCH-${log.batchNumber}` : 'Unknown');
      const batchNum = log.batchNumber || log.batchId || 'Unknown';
      
      if (!batchMap.has(batchId)) {
        // Count eggs in this batch
        const count = filteredAndSortedLogs.filter(l => {
          const lBatchId = l.batchId || (l.batchNumber ? `BATCH-${l.batchNumber}` : 'Unknown');
          return lBatchId === batchId;
        }).length;
        batchMap.set(batchId, {
          batchNumber: batchId, // Use full format like BATCH-679622-0023
          totalEggs: count,
          status: 'Active'
        });
      }
    });
    return Array.from(batchMap.values()).sort((a, b) => 
      a.batchNumber.localeCompare(b.batchNumber)
    );
  };

  // Handle export with batch selection
  const handleExportWithBatches = async (format, batchNumbers) => {
    try {
      setIsExporting(true);
      setShowExportModal(false);
      
      const logsToExport = filterLogsByBatches(filteredAndSortedLogs, batchNumbers);
      await exportSortLogs(logsToExport, format);
      
      // Success notification
      await saveInAppNotification(
        `Successfully exported ${logsToExport.length} sort log${logsToExport.length !== 1 ? 's' : ''} as ${format.toUpperCase()}.`,
        'batch_list_exported'
      );
    } catch (error) {
      console.error('Export failed:', error);
      // Failure notification
      await saveInAppNotification(
        'Failed to export sort logs. Please try again.',
        'batch_export_failed'
      );
    } finally {
      setIsExporting(false);
    }
  };

  // Handle print with batch selection (using PDF like inventory)
  const handlePrintWithBatches = async (batchNumbers) => {
    try {
      setShowExportModal(false);
      
      const logsToPrint = filterLogsByBatches(filteredAndSortedLogs, batchNumbers);
      
      // Generate PDF blob using the same function as PDF export
      const pdfBlob = await exportSortLogs(logsToPrint, 'print');
      
      if (!pdfBlob) {
        throw new Error('Failed to generate PDF for printing');
      }

      // Create blob URL and open PDF directly (same approach as inventory)
      const pdfUrl = URL.createObjectURL(pdfBlob);
      
      // Open PDF directly in new window
      const printWindow = window.open(pdfUrl, '_blank');
      
      if (!printWindow) {
        alert('Please allow popups to print');
        URL.revokeObjectURL(pdfUrl);
        return;
      }
      
      // Wait for PDF to load, then trigger print
      printWindow.onload = () => {
        setTimeout(() => {
          try {
            printWindow.print();
            // Clean up URL after a delay
            setTimeout(() => {
              URL.revokeObjectURL(pdfUrl);
            }, 1000);
          } catch (e) {
            console.error('Print error:', e);
            URL.revokeObjectURL(pdfUrl);
          }
        }, 1000);
      };
      
      // Fallback: try printing after delays
      setTimeout(() => {
        try {
          if (printWindow && !printWindow.closed) {
            printWindow.focus();
            printWindow.print();
            setTimeout(() => {
              URL.revokeObjectURL(pdfUrl);
            }, 1000);
          }
        } catch (e) {
          // Ignore errors
        }
      }, 2000);
      
      // Clean up URL when window closes
      const checkClosed = setInterval(() => {
        if (printWindow.closed) {
          clearInterval(checkClosed);
          URL.revokeObjectURL(pdfUrl);
        }
      }, 500);
    } catch (error) {
      console.error('Error printing sort logs:', error);
      alert('Failed to generate print preview. Please try again.');
    }
  };

  // Navigation functions
  const goToFirstPage = () => setCurrentPage(1);
  const goToPreviousPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));
  const goToNextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));
  const goToLastPage = () => setCurrentPage(totalPages);

  return (
    <div className="p-4 sm:p-6">
      {/* Header with Search and Actions */}
      <div className="flex flex-col lg:flex-row gap-3 sm:gap-4 mb-4 sm:mb-6">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search by egg ID, size, or batch..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span className="hidden sm:inline">Filters</span>
          </button>

          <button
            onClick={() => setShowExportModal(true)}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 text-sm sm:text-base text-white rounded-lg transition-colors"
            style={{ backgroundColor: COLORS.darkBlue }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#0D4470'}
            onMouseLeave={(e) => e.target.style.backgroundColor = COLORS.darkBlue}
            disabled={isExporting}
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">{isExporting ? 'Exporting...' : 'Export'}</span>
          </button>

          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg hover:bg-gray-50"
            disabled={isRefreshing}
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-gray-50 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Egg Size</label>
              <select
                value={eggSize}
                onChange={(e) => setEggSize(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="All Sizes">All Sizes</option>
                {uniqueEggSizes.map(size => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Batch Number</label>
              <select
                value={batchNumber}
                onChange={(e) => setBatchNumber(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="All Batches">All Batches</option>
                {uniqueBatchNumbers.map(batch => (
                  <option key={batch} value={batch}>{batch}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="Newest First">Newest First</option>
                <option value="Oldest First">Oldest First</option>
                <option value="Size A-Z">Size A-Z</option>
                <option value="Size Z-A">Size Z-A</option>
                <option value="Batch Number A-Z">Batch Number A-Z</option>
                <option value="Batch Number Z-A">Batch Number Z-A</option>
                <option value="Weight High-Low">Weight High-Low</option>
                <option value="Weight Low-High">Weight Low-High</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Results Summary */}
      <div className="flex justify-between items-center mb-3 sm:mb-4">
        <p className="text-xs sm:text-sm text-gray-600">
          Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredAndSortedLogs.length)} of {filteredAndSortedLogs.length} results
          {totalEggs > filteredAndSortedLogs.length && (
            <span className="hidden sm:inline text-gray-400"> (from {totalEggs.toLocaleString()} total eggs)</span>
          )}
        </p>
      </div>

      {/* Pagination - Above Table/Cards */}
      {!loading && filteredAndSortedLogs.length > 0 && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-4">
          {/* Pagination controls */}
          <div className="flex items-center justify-center sm:justify-start gap-2 sm:gap-2">
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
                {[10, 25, 50, 100, 200].map((value) => (
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

      {/* Mobile Cards / Desktop Table */}
      <div className="bg-white rounded-lg border border-gray-300 overflow-hidden">
        {showLoading ? (
          <div className="py-12">
            <LoadingLogo message="Loading eggs..." />
          </div>
        ) : currentItems.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium text-gray-500">No eggs found</p>
              <p className="text-sm text-gray-400">
                {filteredAndSortedLogs.length === 0 
                  ? "No eggs available for your account."
                  : "Try adjusting your search or filter criteria."
                }
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Mobile: Card View */}
            <div className="block sm:hidden divide-y divide-gray-200">
              {currentItems.map((egg) => (
                <div key={egg.id} className="p-4 hover:bg-gray-50">
                  <div className="space-y-3">
                    {/* Header Row */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-gray-500 mb-1">Egg ID</div>
                        <div className="text-sm font-mono font-semibold text-gray-900 truncate">
                          {egg.eggId || egg.id}
                        </div>
                      </div>
                      <div className="ml-2">
                        <span 
                          className="inline-flex px-2 py-1 text-xs font-medium rounded-full"
                          style={{
                            ...getSizeBgColor(egg.eggSize),
                            ...getSizeColor(egg.eggSize)
                          }}
                        >
                          {egg.eggSize || 'Unknown'}
                        </span>
                      </div>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="text-xs text-gray-500 mb-0.5">Timestamp</div>
                        <div className="text-sm text-gray-900">
                          {new Date(egg.timestamp).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(egg.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-0.5">Weight</div>
                        <div className="text-sm font-medium text-gray-900">
                          {egg.weight ? `${egg.weight.toFixed(2)}g` : 'N/A'}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-0.5">Batch Number</div>
                        <div className="text-sm font-medium text-gray-900">
                          {egg.batchNumber || 'N/A'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop: Table View */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Timestamp
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Egg ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Size
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Weight (g)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Batch Number
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentItems.map((egg) => (
                    <tr key={egg.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(egg.timestamp).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                        {egg.eggId || egg.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span 
                          className="inline-flex px-2 py-1 text-xs font-medium rounded-full"
                          style={{
                            ...getSizeBgColor(egg.eggSize),
                            ...getSizeColor(egg.eggSize)
                          }}
                        >
                          {egg.eggSize || 'Unknown'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {egg.weight ? `${egg.weight.toFixed(2)}g` : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {egg.batchNumber || 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <BatchSelectionModal
          batches={getUniqueBatches()}
          selectedBatches={selectedBatches}
          setSelectedBatches={setSelectedBatches}
          onClose={() => {
            setShowExportModal(false);
            setSelectedBatches([]);
          }}
          onExport={(format, batchNumbers) => {
            if (format === 'print') {
              handlePrintWithBatches(batchNumbers);
            } else {
              handleExportWithBatches(format, batchNumbers);
            }
          }}
          isExporting={isExporting}
        />
      )}
    </div>
  );
}
