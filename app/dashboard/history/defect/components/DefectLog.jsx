"use client"

import { useState, useRef, useEffect } from "react"
import { Search, SlidersHorizontal, Download, RefreshCw, ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, TrendingUp, Package, Printer } from 'lucide-react'
import { exportDefectLogs } from "../../../../utils/export-utils"
import { getDocs, collection, query, where } from "firebase/firestore"
import { db } from "../../../../config/firebaseConfig"
import { getUserAccountId } from "../../../../utils/auth-utils"
import LoadingLogo from "../../../components/LoadingLogo"
import { useLoadingDelay } from "../../../components/useLoadingDelay"
import BatchSelectionModal from "../../../inventory/components/BatchSelectionModal"
import { saveInAppNotification } from "../../../../utils/notification-utils"

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

export default function DefectLog() {
  // Search state
  const [searchQuery, setSearchQuery] = useState("")

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [showRowsDropdown, setShowRowsDropdown] = useState(false)
  const rowsDropdownRef = useRef(null)

  // Filter state
  const [showFilters, setShowFilters] = useState(false)
  const [defectType, setDefectType] = useState("All Types")
  const [date, setDate] = useState("")
  const [batchNumber, setBatchNumber] = useState("All Batches")
  const [sortBy, setSortBy] = useState("Newest First")

  // Data state
  const [defectLogs, setDefectLogs] = useState([])
  const [filteredAndSortedLogs, setFilteredAndSortedLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const showLoading = useLoadingDelay(loading, 500)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Export state
  const [isExporting, setIsExporting] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [selectedBatches, setSelectedBatches] = useState([])

  // Fetch defect logs from Firestore
  useEffect(() => {
    const fetchDefectLogs = async () => {
      try {
        setLoading(true)
        console.log("DefectLog: Starting to fetch defect logs...")

        // Get accountId from stored user data
        const { getUserAccountId } = await import("../../../../utils/auth-utils")
        const accountId = getUserAccountId()
        
        if (!accountId) {
          console.log("DefectLog: No accountId found")
          setDefectLogs([])
          setFilteredAndSortedLogs([])
          setLoading(false)
          return
        }

        console.log(`DefectLog: Fetching defect eggs for accountId: ${accountId}`)

        // Fetch eggs with defects (quality !== 'good') for this account
        const eggsRef = collection(db, "eggs")
        const q = query(eggsRef, where("accountId", "==", accountId))
        const querySnapshot = await getDocs(q)

        const logs = []
        querySnapshot.forEach((doc) => {
          const egg = doc.data()
          // Only include cracked and dirty eggs
          if (egg.quality && (egg.quality === 'cracked' || egg.quality === 'dirty')) {
            // Map quality to defect type (capitalize first letter)
            const defectType = egg.quality.charAt(0).toUpperCase() + egg.quality.slice(1)
            
            // Extract batch number (last part after last dash, e.g., "0001" from "BATCH-679622-0001")
            const batchNumber = egg.batchId && egg.batchId.includes('-')
              ? egg.batchId.split('-').pop()
              : (egg.batchId ? egg.batchId.replace('BATCH-', '') : 'Unknown');
            
            logs.push({
              id: doc.id,
              eggId: egg.eggId,
              defectType: defectType,
              batchNumber: batchNumber,
              batchId: egg.batchId || 'Unknown',
              confidence: 1.0, // Default confidence since not stored in eggs
              imageUrl: null, // Not available in eggs collection
              timestamp: egg.createdAt ? new Date(egg.createdAt) : new Date(),
              machineId: 'N/A' // Not available in eggs collection
            })
          }
        })

        console.log(`DefectLog: Fetched ${logs.length} defect logs from ${querySnapshot.size} eggs`)
        setDefectLogs(logs)
        setLoading(false)
      } catch (error) {
        console.error("DefectLog: Error fetching defect logs:", error)
        setLoading(false)
      }
    }

    fetchDefectLogs()
  }, [])

  // Filter and sort logs whenever dependencies change
  useEffect(() => {
    let filtered = [...defectLogs]

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(log => 
        log.defectType?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.batchNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.batchId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.eggId?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Apply defect type filter
    if (defectType !== "All Types") {
      filtered = filtered.filter(log => log.defectType === defectType)
    }

    // Apply date filter
    if (date) {
      const filterDate = new Date(date)
      filtered = filtered.filter(log => {
        const logDate = new Date(log.timestamp)
        return logDate.toDateString() === filterDate.toDateString()
      })
    }

    // Apply batch number filter
    if (batchNumber !== "All Batches") {
      filtered = filtered.filter(log => log.batchNumber === batchNumber)
    }

    // Apply sorting
    filtered.sort((a, b) => {
      const dateA = new Date(a.timestamp)
      const dateB = new Date(b.timestamp)
      
      switch (sortBy) {
        case "Newest First":
          return dateB - dateA
        case "Oldest First":
          return dateA - dateB
        case "Defect Type A-Z":
          return (a.defectType || "").localeCompare(b.defectType || "")
        case "Defect Type Z-A":
          return (b.defectType || "").localeCompare(a.defectType || "")
        case "Batch Number A-Z":
          return (a.batchNumber || "").localeCompare(b.batchNumber || "")
        case "Batch Number Z-A":
          return (b.batchNumber || "").localeCompare(a.batchNumber || "")
        default:
          return dateB - dateA
      }
    })

    setFilteredAndSortedLogs(filtered)
    setCurrentPage(1) // Reset to first page when filters change
  }, [defectLogs, searchQuery, defectType, date, batchNumber, sortBy])

  // Get unique values for filter dropdowns
  const uniqueDefectTypes = [...new Set(defectLogs.map(log => log.defectType).filter(Boolean))]
  const uniqueBatchNumbers = [...new Set(defectLogs.map(log => log.batchNumber).filter(Boolean))]

  // Pagination calculations
  const totalPages = Math.ceil(filteredAndSortedLogs.length / rowsPerPage)
  const indexOfLastItem = currentPage * rowsPerPage
  const indexOfFirstItem = indexOfLastItem - rowsPerPage
  const currentItems = filteredAndSortedLogs.slice(indexOfFirstItem, indexOfLastItem)

  // Handle outside click for dropdowns
  useEffect(() => {
    function handleClickOutside(event) {
      if (rowsDropdownRef.current && !rowsDropdownRef.current.contains(event.target)) {
        setShowRowsDropdown(false)
      }
    }

    if (showRowsDropdown) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [showRowsDropdown])

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true)
    // Re-fetch data by triggering the useEffect
    window.location.reload()
  }

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
      await exportDefectLogs(logsToExport, format);
      
      // Success notification
      await saveInAppNotification(
        `Successfully exported ${logsToExport.length} defect log${logsToExport.length !== 1 ? 's' : ''} as ${format.toUpperCase()}.`,
        'batch_list_exported'
      );
    } catch (error) {
      console.error('Export failed:', error);
      // Failure notification
      await saveInAppNotification(
        'Failed to export defect logs. Please try again.',
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
      const pdfBlob = await exportDefectLogs(logsToPrint, 'print');
      
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
      console.error('Error printing defect logs:', error);
      alert('Failed to generate print preview. Please try again.');
    }
  };

  // Navigation functions
  const goToFirstPage = () => setCurrentPage(1)
  const goToPreviousPage = () => setCurrentPage(prev => Math.max(prev - 1, 1))
  const goToNextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages))
  const goToLastPage = () => setCurrentPage(totalPages)

  // Get defect type color using color palette
  const getDefectTypeColor = (type) => {
    switch (type) {
      case "Cracked": 
        return { color: COLORS.brightOrange, backgroundColor: COLORS.orangeLight };
      case "Dirty": 
        return { color: COLORS.tan, backgroundColor: COLORS.tanLight };
      default: 
        return { color: COLORS.darkBlue, backgroundColor: COLORS.darkBlueLight };
    }
  }

  return (
    <div className="p-4 sm:p-6">
      {/* Header with Search and Actions */}
      <div className="flex flex-col lg:flex-row gap-3 sm:gap-4 mb-4 sm:mb-6">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search by egg ID, defect type, or batch..."
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Defect Type</label>
              <select
                value={defectType}
                onChange={(e) => setDefectType(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="All Types">All Types</option>
                {uniqueDefectTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
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
                <option value="Defect Type A-Z">Defect Type A-Z</option>
                <option value="Defect Type Z-A">Defect Type Z-A</option>
                <option value="Batch Number A-Z">Batch Number A-Z</option>
                <option value="Batch Number Z-A">Batch Number Z-A</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Results Summary */}
      <div className="flex justify-between items-center mb-3 sm:mb-4">
        <p className="text-xs sm:text-sm text-gray-600">
          Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredAndSortedLogs.length)} of {filteredAndSortedLogs.length} results
        </p>
      </div>

      {/* Pagination - Above Table/Cards */}
      {!loading && filteredAndSortedLogs.length > 0 && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-4">
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
      <div className="bg-white rounded-lg border border-gray-300 overflow-hidden" id="defect-log-table">
        {showLoading ? (
          <div className="py-12">
            <LoadingLogo message="Loading defect logs..." />
          </div>
        ) : currentItems.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium text-gray-500">No defect logs found</p>
              <p className="text-sm text-gray-400">
                {filteredAndSortedLogs.length === 0 
                  ? "No defect logs available for your account."
                  : "Try adjusting your search or filter criteria."
                }
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Mobile: Card View */}
            <div className="block sm:hidden divide-y divide-gray-200">
              {currentItems.map((log) => (
                <div key={log.id} className="p-4 hover:bg-gray-50">
                  <div className="space-y-3">
                    {/* Header Row */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-gray-500 mb-1">Egg ID</div>
                        <div className="text-sm font-mono font-semibold text-gray-900 truncate">
                          {log.eggId || log.id || 'N/A'}
                        </div>
                      </div>
                      <div className="ml-2">
                        <span 
                          className="inline-flex px-2 py-1 text-xs font-medium rounded-full"
                          style={getDefectTypeColor(log.defectType)}
                        >
                          {log.defectType || 'Unknown'}
                        </span>
                      </div>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="text-xs text-gray-500 mb-0.5">Timestamp</div>
                        <div className="text-sm text-gray-900">
                          {new Date(log.timestamp).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-0.5">Batch Number</div>
                        <div className="text-sm font-medium text-gray-900">
                          {log.batchNumber || 'N/A'}
                        </div>
                      </div>
                      <div className="col-span-2">
                        <div className="text-xs text-gray-500 mb-0.5">Confidence</div>
                        <div className="text-sm font-medium text-gray-900">
                          {log.confidence ? `${(log.confidence * 100).toFixed(1)}%` : 'N/A'}
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
                      Batch Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Defect Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Confidence
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentItems.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                        {log.eggId || log.id || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {log.batchNumber || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span 
                          className="inline-flex px-2 py-1 text-xs font-medium rounded-full"
                          style={getDefectTypeColor(log.defectType)}
                        >
                          {log.defectType || 'Unknown'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {log.confidence ? `${(log.confidence * 100).toFixed(1)}%` : 'N/A'}
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
  )
}
