"use client";

import { useState, useRef, useEffect } from "react";
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
  TrendingUp,
  Package,
} from "lucide-react";
import { exportSortLogs } from "../../../../utils/export-utils";
import { db, auth } from "../../../../config/firebaseConfig";
import { getDocs, collection, query, where, doc, getDoc } from "firebase/firestore";
import LoadingLogo from "../../../components/LoadingLogo";
import { useLoadingDelay } from "../../../components/useLoadingDelay";

// Function to get color based on size type
const getSizeColor = (size) => {
  switch (size) {
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
const getSizeBgColor = (size) => {
  switch (size) {
    case "Small":
      return "bg-blue-50";
    case "Medium":
      return "bg-green-50";
    case "Large":
      return "bg-yellow-50";
    case "Defect":
      return "bg-red-50";
    default:
      return "bg-gray-50";
  }
};

export default function SortLog() {
  // Search state
  const [searchQuery, setSearchQuery] = useState("");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(6);
  const [showRowsDropdown, setShowRowsDropdown] = useState(false);
  const rowsDropdownRef = useRef(null);

  // Filter state
  const [showFilters, setShowFilters] = useState(false);
  const [eggSize, setEggSize] = useState("All Sizes");
  const [date, setDate] = useState("");
  const [batchNumber, setBatchNumber] = useState("All Batches");
  const [sortBy, setSortBy] = useState("Newest First");

  // Data state
  const [sortLogs, setSortLogs] = useState([]);
  const [filteredAndSortedLogs, setFilteredAndSortedLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const showLoading = useLoadingDelay(loading, 500);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Export state
  const [isExporting, setIsExporting] = useState(false);

  // Fetch sort logs from Firestore
  useEffect(() => {
    const fetchSortLogs = async () => {
      try {
        setLoading(true);
        console.log("SortLog: Starting to fetch sort logs...");

        // Get current user
        const user = auth.currentUser;
        if (!user) {
          console.log("SortLog: No authenticated user found");
          setLoading(false);
          return;
        }

        // Get user document to find linked machines
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (!userDoc.exists()) {
          console.log("SortLog: User document not found");
          setLoading(false);
          return;
        }

        const userData = userDoc.data();
        const linkedMachines = userData.linkedMachines || [];
        
        if (linkedMachines.length === 0) {
          console.log("SortLog: No linked machines found for user");
          setSortLogs([]);
          setFilteredAndSortedLogs([]);
          setLoading(false);
          return;
        }

        console.log(`SortLog: Found ${linkedMachines.length} linked machines:`, linkedMachines);

        // Fetch weight logs for linked machines (these are essentially sort logs)
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

        console.log(`SortLog: Fetched ${logs.length} sort logs`);
        setSortLogs(logs);
        setLoading(false);
      } catch (error) {
        console.error("SortLog: Error fetching sort logs:", error);
        setLoading(false);
      }
    };

    fetchSortLogs();
  }, []);

  // Filter and sort logs whenever dependencies change
  useEffect(() => {
    let filtered = [...sortLogs];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(log => 
        log.eggSize?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.batchNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.machineId?.toLowerCase().includes(searchQuery.toLowerCase())
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
        default:
          return dateB - dateA;
      }
    });

    setFilteredAndSortedLogs(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, [sortLogs, searchQuery, eggSize, date, batchNumber, sortBy]);

  // Get unique values for filter dropdowns
  const uniqueEggSizes = [...new Set(sortLogs.map(log => log.eggSize).filter(Boolean))];
  const uniqueBatchNumbers = [...new Set(sortLogs.map(log => log.batchNumber).filter(Boolean))];

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
    // Re-fetch data by triggering the useEffect
    window.location.reload();
  };

  // Handle export
  const handleExport = async (format) => {
    try {
      setIsExporting(true);
      await exportSortLogs(filteredAndSortedLogs, format);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  // Navigation functions
  const goToFirstPage = () => setCurrentPage(1);
  const goToPreviousPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));
  const goToNextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));
  const goToLastPage = () => setCurrentPage(totalPages);

  return (
    <div className="p-6">
      {/* Header with Search and Actions */}
      <div className="flex flex-col lg:flex-row gap-4 mb-6">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search sort logs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters
          </button>

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

      {/* Filters */}
      {showFilters && (
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Results Summary */}
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-gray-600">
          Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredAndSortedLogs.length)} of {filteredAndSortedLogs.length} results
        </p>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-300 overflow-hidden">
        {showLoading ? (
          <div className="py-12">
            <LoadingLogo message="Loading sort logs..." />
          </div>
        ) : currentItems.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium text-gray-500">No sort logs found</p>
              <p className="text-sm text-gray-400">
                {filteredAndSortedLogs.length === 0 
                  ? "No sort logs available for your linked machines."
                  : "Try adjusting your search or filter criteria."
                }
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Egg Size
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Eggs
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Weight (g)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Batch Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Machine ID
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentItems.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getSizeBgColor(log.eggSize)} ${getSizeColor(log.eggSize)}`}>
                        {log.eggSize || 'Unknown'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {(log.totalEggs || 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {log.weight ? `${log.weight.toFixed(2)}g` : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {log.batchNumber || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {log.machineId || 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {!loading && filteredAndSortedLogs.length > 0 && (
        <div className="flex flex-col-reverse gap-4 items-center justify-center md:flex-row md:justify-between mt-6">
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
              {currentPage} of {totalPages}
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
              <div className="absolute bottom-full mb-2 right-0 border bg-white shadow rounded-lg overflow-hidden z-40">
                {[6, 12, 24, 50].map((value) => (
                  <button
                    key={value}
                    onClick={() => {
                      setRowsPerPage(value);
                      setShowRowsDropdown(false);
                      setCurrentPage(1);
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
  );
}
