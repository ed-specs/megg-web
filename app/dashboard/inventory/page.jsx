"use client";

import { Navbar } from "../components/NavBar";
import { Header } from "../components/Header";
import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { RefreshCw, Download, Package, Egg, AlertTriangle, CheckCircle, GitCompare, TrendingUp, X, Trash2 } from "lucide-react";
import LoadingLogo from "../components/LoadingLogo";
import ResultModal from "../components/ResultModal";
import { useLoadingDelay } from "../components/useLoadingDelay";
import { exportInventoryBatches, exportBatchDetailsPDF, exportBatchOverviewImage, exportToImage } from "../../utils/export-utils";
import { devLog, devError } from "../../utils/auth-helpers";
import { isValidBatch, safeGet, safeFormatNumber, safePercentage, safeFormatDate } from "../../utils/data-helpers";
import { saveInAppNotification } from "../../utils/notification-utils";

import { getMachineLinkedInventoryData, getMachineLinkedBatchDetails, updateBatchStatus } from "../../lib/inventory/InventoryData";
import { db } from "../../config/firebaseConfig";
import { doc, deleteDoc, collection, query, where, getDocs } from "firebase/firestore";
import QRCode from 'qrcode';

// Import our new components
import InventoryOverviewCards from "./components/InventoryOverviewCards";
import InventoryBatchGrid from "./components/InventoryBatchGrid";
import InventoryPagination from "./components/InventoryPagination";
import QRCodeModal from "./components/QRCodeModal";
import InventorySearchAndFilter from "./components/InventorySearchAndFilter";
import BatchSelectionModal from "./components/BatchSelectionModal";
import StatCard from "./components/StatCard";
import TrendsChart from "./components/TrendsChart";
import BatchComparisonModal from "./components/BatchComparisonModal";
import BatchComparisonSelectionModal from "./components/BatchComparisonSelectionModal";

export default function InventoryPage() {
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(6);
  const [showRowsDropdown, setShowRowsDropdown] = useState(false);

  // Selected batch state
  const [selectedBatch, setSelectedBatch] = useState(null);

  // Data state
  const [batchReviews, setBatchReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const showLoading = useLoadingDelay(loading, 500);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Result modal state
  const [resultMessage, setResultMessage] = useState("");

  // Search and Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState("date"); // date, totalEggs, defectRate, batchNumber
  const [sortDirection, setSortDirection] = useState("desc"); // asc, desc
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // all, active, completed, archived
  const [defectRateThreshold, setDefectRateThreshold] = useState(0);
  const [sizeFilters, setSizeFilters] = useState([]); // Array of selected sizes

  // QR Code state
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState(null);
  const [qrCodeLoading, setQrCodeLoading] = useState(false);

  // Overview data state
  const [overviewData, setOverviewData] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Bulk selection state
  const [selectedBatches, setSelectedBatches] = useState([]);
  const [isExporting, setIsExporting] = useState(false);
  const [showBatchSelectionModal, setShowBatchSelectionModal] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const exportDropdownRef = useRef(null);
  const batchOverviewRef = useRef(null);

  // Analytics & Comparison state
  const [showInsights, setShowInsights] = useState(false);
  const [compareBatches, setCompareBatches] = useState([]);
  const [showComparisonSelectionModal, setShowComparisonSelectionModal] = useState(false);
  const [showComparisonModal, setShowComparisonModal] = useState(false);
  
  // Delete batch state
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [comparisonOverviewData, setComparisonOverviewData] = useState({});

  // Restore filters from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('inventory-filters');
      if (saved) {
        const filters = JSON.parse(saved);
        devLog("Inventory: Restoring saved filters", filters);
        
        if (filters.searchQuery !== undefined) setSearchQuery(filters.searchQuery);
        if (filters.dateFrom !== undefined) setDateFrom(filters.dateFrom);
        if (filters.dateTo !== undefined) setDateTo(filters.dateTo);
        if (filters.statusFilter !== undefined) setStatusFilter(filters.statusFilter);
        if (filters.defectRateThreshold !== undefined) setDefectRateThreshold(filters.defectRateThreshold);
        if (filters.sizeFilters !== undefined) setSizeFilters(filters.sizeFilters);
        if (filters.sortBy !== undefined) setSortBy(filters.sortBy);
        if (filters.sortDirection !== undefined) setSortDirection(filters.sortDirection);
      }
    } catch (error) {
      devError("Inventory: Error restoring filters from localStorage", error);
    }
  }, []); // Only run on mount

  // Save filters to localStorage whenever they change
  useEffect(() => {
    try {
      const filters = {
        searchQuery,
        dateFrom,
        dateTo,
        statusFilter,
        defectRateThreshold,
        sizeFilters,
        sortBy,
        sortDirection
      };
      localStorage.setItem('inventory-filters', JSON.stringify(filters));
      devLog("Inventory: Saved filters to localStorage", filters);
    } catch (error) {
      devError("Inventory: Error saving filters to localStorage", error);
    }
  }, [searchQuery, dateFrom, dateTo, statusFilter, defectRateThreshold, sizeFilters, sortBy, sortDirection]);

  // Fetch inventory data
  useEffect(() => {
    const fetchInventoryData = async () => {
      try {
        setLoading(true);
        devLog("Inventory: Starting to fetch inventory data...");
        
        // Fetch inventory data only for machines linked to the current user
        const inventoryData = await getMachineLinkedInventoryData();
        devLog("Inventory: Fetched inventory data:", inventoryData.length, "batches");
        
        // Validate and filter out invalid batches
        const validBatches = inventoryData.filter(isValidBatch);
        const invalidCount = inventoryData.length - validBatches.length;
        
        if (invalidCount > 0) {
          devLog(`Inventory: Filtered out ${invalidCount} invalid batch(es)`);
        }
        
        setBatchReviews(validBatches);
        
        setLoading(false);
        devLog("Inventory: Inventory data fetch completed successfully");
      } catch (error) {
        devError("Inventory: Error fetching inventory data:", error);
        setResultMessage("Failed to load inventory data. Please refresh the page.");
        await saveInAppNotification(
          'Failed to load inventory data. Please refresh the page.',
          'inventory_load_failed'
        );
        setLoading(false);
      }
    };

    fetchInventoryData();
  }, []);

  // Fetch batch details when a batch is selected
  useEffect(() => {
    const fetchBatchDetails = async () => {
      if (!selectedBatch) {
        setOverviewData(null);
        return;
      }

      try {
        devLog("Inventory: Fetching batch details for:", selectedBatch);
        const batchDetails = await getMachineLinkedBatchDetails(selectedBatch);
        devLog("Inventory: Fetched batch details:", batchDetails);
        setOverviewData(batchDetails);
      } catch (error) {
        devError("Inventory: Error fetching batch details:", error);
        setResultMessage("Failed to load batch details. Please try again.");
        setOverviewData(null);
      }
    };

    fetchBatchDetails();
  }, [selectedBatch]);

  // Generate QR Code (memoized)
  const generateQRCode = useCallback(async (batchNumber) => {
    try {
      setQrCodeLoading(true);
      // Generate URL that points to batch detail page
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const batchUrl = `${baseUrl}/batch/${encodeURIComponent(batchNumber)}`;
      
      const qrCodeUrl = await QRCode.toDataURL(batchUrl, {
        width: 400,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      
      setQrCodeDataUrl(qrCodeUrl);
      setQrCodeLoading(false);
    } catch (error) {
      devError('Error generating QR code:', error);
      setResultMessage("Failed to generate QR code. Please try again.");
      setQrCodeDataUrl(null);
      setQrCodeLoading(false);
    }
  }, []);

  // Download QR Code (memoized)
  const downloadQRCode = useCallback(() => {
    if (!qrCodeDataUrl || !selectedBatch) return;
    
    try {
      const link = document.createElement('a');
      link.download = `QR_Code_${selectedBatch}_${new Date().toISOString().split('T')[0]}.png`;
      link.href = qrCodeDataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setResultMessage("QR Code downloaded successfully!");
    } catch (error) {
      devError("Error downloading QR code:", error);
      setResultMessage("Failed to download QR code. Please try again.");
    }
  }, [qrCodeDataUrl, selectedBatch]);

  // Handle batch selection (memoized)
  const handleBatchSelect = useCallback((batchNumber) => {
    if (selectedBatch === batchNumber) {
      setSelectedBatch(null); // Deselect if already selected
      setQrCodeDataUrl(null); // Clear QR code
    } else {
      setSelectedBatch(batchNumber);
      setSelectedBatches([]); // Clear bulk selection when opening detail
      generateQRCode(batchNumber); // Generate QR code for new selection
    }
  }, [selectedBatch, generateQRCode]);

  // Refresh data (memoized)
  const refreshData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const inventoryData = await getMachineLinkedInventoryData();
      
      // Validate batches
      const validBatches = inventoryData.filter(isValidBatch);
      setBatchReviews(validBatches);
      
      // If a batch is selected, refresh its details too
      if (selectedBatch) {
        const batchDetails = await getMachineLinkedBatchDetails(selectedBatch);
        setOverviewData(batchDetails);
      }
      
      setResultMessage("Inventory data refreshed successfully!");
    } catch (error) {
      devError("Error refreshing inventory data:", error);
      setResultMessage("Failed to refresh inventory data. Please try again.");
      await saveInAppNotification(
        'Could not refresh inventory data. Please try again.',
        'inventory_refresh_failed'
      );
    }
    setIsRefreshing(false);
  }, [selectedBatch]);

  // Calculate defect rate for a batch (memoized with safe data access)
  const calculateDefectRate = useCallback((batch) => {
    const totalEggs = safeGet(batch, 'totalEggs', 0);
    const defectEggs = safeGet(batch, 'eggSizes.Defect', 0);
    
    if (totalEggs === 0) return 0;
    return (defectEggs / totalEggs) * 100;
  }, []);

  // Calculate quick stats (memoized)
  const quickStats = useMemo(() => {
    const totalBatches = batchReviews.length
    const totalEggs = batchReviews.reduce((sum, batch) => sum + (safeGet(batch, 'totalEggs', 0)), 0)
    const activeBatches = batchReviews.filter(batch => 
      safeGet(batch, 'status', 'active').toLowerCase() === 'active'
    ).length
    
    // Calculate average defect rate
    const defectRates = batchReviews.map(batch => calculateDefectRate(batch))
    const avgDefectRate = defectRates.length > 0 
      ? (defectRates.reduce((sum, rate) => sum + rate, 0) / defectRates.length).toFixed(2)
      : '0.00'
    
    return {
      totalBatches,
      totalEggs,
      activeBatches,
      avgDefectRate
    }
  }, [batchReviews, calculateDefectRate])

  // Filter and sort batches (memoized to prevent expensive recalculation)
  const filteredAndSortedBatches = useMemo(() => batchReviews
    .filter((batch) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const batchNumber = safeGet(batch, 'batchNumber', '');
        const fromDate = safeGet(batch, 'fromDate', '');
        const toDate = safeGet(batch, 'toDate', '');
        
        const matchesBatchNumber = batchNumber.toLowerCase().includes(query);
        const matchesDate = 
          fromDate.toLowerCase().includes(query) ||
          toDate.toLowerCase().includes(query);
        if (!matchesBatchNumber && !matchesDate) {
          return false;
        }
      }

      // Date range filter
      if (dateFrom) {
        const batchFromDate = safeGet(batch, 'fromDate', null);
        if (!batchFromDate) return false;
        
        const batchDate = new Date(batchFromDate);
        const fromDate = new Date(dateFrom);
        fromDate.setHours(0, 0, 0, 0);
        if (batchDate < fromDate) return false;
      }
      if (dateTo) {
        const batchToDate = safeGet(batch, 'toDate', null) || safeGet(batch, 'fromDate', null);
        if (!batchToDate) return false;
        
        const batchDate = new Date(batchToDate);
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        if (batchDate > toDate) return false;
      }

      // Status filter
      if (statusFilter !== "all") {
        const batchStatus = safeGet(batch, 'status', 'active').toLowerCase();
        const filterStatus = statusFilter.toLowerCase();
        
        // Normalize status: "active" vs anything else is "not active"
        const normalizedBatchStatus = batchStatus === "active" ? "active" : "not active";
        
        // Check if normalized batch status matches the filter
        if (normalizedBatchStatus !== filterStatus) {
          return false;
        }
      }

      // Defect rate threshold
      if (defectRateThreshold > 0) {
        const defectRate = calculateDefectRate(batch);
        if (defectRate < defectRateThreshold) return false;
      }

      // Size filters
      if (sizeFilters.length > 0) {
        const hasSelectedSize = sizeFilters.some((size) => {
          const count = safeGet(batch, `eggSizes.${size}`, 0);
          return count > 0;
        });
        if (!hasSelectedSize) return false;
      }

      return true;
    })
    .sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case "date":
          const dateA = new Date(safeGet(a, 'fromDate', 0));
          const dateB = new Date(safeGet(b, 'fromDate', 0));
          comparison = dateA - dateB;
          break;
        case "totalEggs":
          comparison = safeGet(a, 'totalEggs', 0) - safeGet(b, 'totalEggs', 0);
          break;
        case "defectRate":
          comparison = calculateDefectRate(a) - calculateDefectRate(b);
          break;
        case "batchNumber":
          comparison = safeGet(a, 'batchNumber', '').localeCompare(safeGet(b, 'batchNumber', ''));
          break;
        default:
          comparison = 0;
      }

      return sortDirection === "desc" ? -comparison : comparison;
    }), [batchReviews, searchQuery, dateFrom, dateTo, statusFilter, defectRateThreshold, sizeFilters, sortBy, sortDirection, calculateDefectRate]);

  // Clear all filters (memoized)
  const clearFilters = useCallback(() => {
    setSearchQuery("");
    setDateFrom("");
    setDateTo("");
    setStatusFilter("all");
    setDefectRateThreshold(0);
    setSizeFilters([]);
    setCurrentPage(1);
    
    // Clear from localStorage
    try {
      localStorage.removeItem('inventory-filters');
      devLog("Inventory: Cleared filters from localStorage");
    } catch (error) {
      devError("Inventory: Error clearing filters from localStorage", error);
    }
  }, []);

  // Handle batch deletion (memoized)
  const handleDeleteBatch = useCallback(async () => {
    if (!selectedBatch || deleteConfirmText !== selectedBatch) {
      setResultMessage("Please type the batch number exactly to confirm deletion.");
      return;
    }

    try {
      setIsDeleting(true);
      
      // Delete batch from Firestore
      const batchRef = doc(db, "batches", selectedBatch);
      await deleteDoc(batchRef);
      
      // Delete all eggs related to this batch
      const eggsRef = collection(db, "eggs");
      const eggsQuery = query(eggsRef, where("batchId", "==", selectedBatch));
      const eggsSnapshot = await getDocs(eggsQuery);
      
      const deletePromises = eggsSnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      
      // Show success message
      setResultMessage(`Batch ${selectedBatch} and ${eggsSnapshot.size} related eggs deleted successfully!`);
      await saveInAppNotification(
        `Batch ${selectedBatch} and ${eggsSnapshot.size} eggs permanently deleted.`,
        'batch_deleted'
      );
      
      // Refresh the batch list
      const inventoryData = await getMachineLinkedInventoryData();
      const validBatches = inventoryData.filter(isValidBatch);
      setBatchReviews(validBatches);
      
      // Close modal and reset
      setShowDeleteConfirmModal(false);
      setDeleteConfirmText("");
      setSelectedBatch(null);
      
    } catch (error) {
      devError("Error deleting batch:", error);
      setResultMessage("Failed to delete batch. Please try again.");
      await saveInAppNotification(
        `Failed to delete batch ${selectedBatch}.`,
        'batch_delete_failed'
      );
    } finally {
      setIsDeleting(false);
    }
  }, [selectedBatch, deleteConfirmText]);

  // Reset pagination and clear selections when filters change
  useEffect(() => {
    setCurrentPage(1);
    setSelectedBatches([]); // Clear bulk selection when filters change
  }, [searchQuery, dateFrom, dateTo, statusFilter, defectRateThreshold, sizeFilters.length, sortBy, sortDirection]);


  // Close export dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target)) {
        setShowExportDropdown(false);
      }
    };

    if (showExportDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showExportDropdown]);

  // Fallback copy method for unsupported browsers
  const fallbackCopyToClipboard = useCallback((text) => {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      
      if (successful) {
        setResultMessage("Batch URL copied to clipboard!");
      } else {
        setResultMessage("Failed to copy URL. Please try manually.");
      }
    } catch (error) {
      devError("Fallback copy failed:", error);
      setResultMessage("Failed to copy URL. Please try manually.");
    }
  }, []);

  // Copy batch URL to clipboard (with proper error handling)
  const copyBatchUrl = useCallback((batchNumber) => {
    try {
      if (typeof window === 'undefined') {
        setResultMessage("Copy not available in this context.");
        return;
      }
      
      const baseUrl = window.location.origin;
      const batchUrl = `${baseUrl}/batch/${encodeURIComponent(batchNumber)}`;
      
      // Check if clipboard API is available
      if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        navigator.clipboard.writeText(batchUrl)
          .then(() => {
            setResultMessage("Batch URL copied to clipboard!");
          })
          .catch((error) => {
            devError("Error copying to clipboard:", error);
            // Fallback to legacy method
            fallbackCopyToClipboard(batchUrl);
          });
      } else {
        // Fallback for browsers that don't support clipboard API
        fallbackCopyToClipboard(batchUrl);
      }
    } catch (error) {
      devError("Error in copyBatchUrl:", error);
      setResultMessage("Failed to copy URL. Please try again.");
    }
  }, [fallbackCopyToClipboard]);

  // Handle exports with progress tracking (memoized)
  const handleExportBatchList = useCallback(async (format, batchNumbers = []) => {
    try {
      setIsExporting(true);
      
      const batchesToExport = batchNumbers.length > 0
        ? filteredAndSortedBatches.filter((batch) => batchNumbers.includes(batch.batchNumber))
        : filteredAndSortedBatches;
      
      await exportInventoryBatches(batchesToExport, format);
      
      setShowBatchSelectionModal(false);
      setSelectedBatches([]);
      setResultMessage(`Batch list exported successfully as ${format.toUpperCase()}!`);
      await saveInAppNotification(
        `Successfully exported ${batchesToExport.length} batch${batchesToExport.length !== 1 ? 'es' : ''} as ${format.toUpperCase()}.`,
        'batch_list_exported'
      );
    } catch (error) {
      devError("Error exporting batch list:", error);
      setResultMessage("Failed to export batch list. Please try again.");
      await saveInAppNotification(
        'Failed to export batch list. Please try again.',
        'batch_export_failed'
      );
    } finally {
      setIsExporting(false);
    }
  }, [filteredAndSortedBatches]);

  const handleExportBatchDetails = useCallback(async (format) => {
    if (!selectedBatch || !overviewData) return;

    try {
      setIsExporting(true);
      
      if (format === "pdf") {
        await exportBatchDetailsPDF(selectedBatch, overviewData);
      } else if (format === "image") {
        // Wait a bit for the DOM to be ready
        await new Promise(resolve => setTimeout(resolve, 100));
        await exportBatchOverviewImage("batch-overview-container", selectedBatch);
      }
      
      setResultMessage(`Batch details exported successfully as ${format.toUpperCase()}!`);
      await saveInAppNotification(
        `Batch ${selectedBatch} details exported successfully as ${format.toUpperCase()}.`,
        'batch_details_exported'
      );
    } catch (error) {
      devError("Error exporting batch details:", error);
      setResultMessage("Failed to export batch details. Please try again.");
      await saveInAppNotification(
        'Failed to export batch details. Please try again.',
        'batch_export_failed'
      );
    } finally {
      setIsExporting(false);
    }
  }, [selectedBatch, overviewData]);

  // Handle batch comparison from selection modal
  const handleCompareSelected = useCallback(async (selectedBatchNumbers) => {
    setCompareBatches(selectedBatchNumbers)
    
    // Fetch overview data for selected batches
    for (const batchNumber of selectedBatchNumbers) {
      if (!comparisonOverviewData[batchNumber]) {
        try {
          const data = await getMachineLinkedBatchDetails(batchNumber)
          setComparisonOverviewData(prevData => ({
            ...prevData,
            [batchNumber]: data
          }))
        } catch (error) {
          devError("Error loading batch details for comparison:", error)
        }
      }
    }
    
    // Open comparison modal
    setShowComparisonModal(true)
  }, [comparisonOverviewData]);

  // Pagination calculations (memoized)
  const { totalPages, currentItems } = useMemo(() => {
    const total = Math.ceil(filteredAndSortedBatches.length / rowsPerPage);
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const items = filteredAndSortedBatches.slice(startIndex, endIndex);
    
    return {
      totalPages: total,
      currentItems: items
    };
  }, [filteredAndSortedBatches, currentPage, rowsPerPage]);

  // Pagination functions (memoized)
  const goToFirstPage = useCallback(() => setCurrentPage(1), []);
  const goToPreviousPage = useCallback(() => setCurrentPage(prev => Math.max(prev - 1, 1)), []);
  const goToNextPage = useCallback(() => setCurrentPage(prev => Math.min(prev + 1, totalPages)), [totalPages]);
  const goToLastPage = useCallback(() => setCurrentPage(totalPages), [totalPages]);

  return (
    <div className="min-h-screen container mx-auto text-[#1F2421] relative">
      {/* Backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-opacity lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <div
        className={`fixed z-50 inset-y-0 left-0 w-80 bg-white transform shadow-lg transition-transform duration-300 ease-in-out lg:hidden ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Navbar />
      </div>

      {/* MAIN */}
      <div className="flex gap-4 sm:gap-6 p-3 sm:p-4 md:p-6">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block">
          <Navbar />
        </div>

        <div className="flex flex-1 flex-col gap-4 sm:gap-6 w-full min-w-0">
          {/* Header */}
          <Header setSidebarOpen={setSidebarOpen} />

          {/* Main container */}
          <div className="flex flex-col gap-4 sm:gap-6">
            {/* Header Card - Only show when NOT viewing batch details */}
            {!selectedBatch && !showLoading && (
              <div className="bg-white rounded-2xl border border-gray-300 p-4 md:p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                  <div className="min-w-0">
                    <h2 className="text-xl md:text-2xl font-bold text-gray-900">Inventory Batches</h2>
                    <p className="text-gray-600 text-sm mt-1">
                      {filteredAndSortedBatches.length === batchReviews.length
                        ? `Manage and export ${batchReviews.length} batch${batchReviews.length !== 1 ? 'es' : ''}`
                        : `Showing ${filteredAndSortedBatches.length} of ${batchReviews.length} batches`}
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Analytics Button */}
                    <button
                      onClick={() => setShowInsights(true)}
                      className="flex items-center gap-2 px-3 md:px-4 py-2 bg-[#105588] text-white rounded-lg hover:bg-[#0d4470] transition-colors focus:outline-none focus:ring-2 focus:ring-[#105588]"
                    >
                      <TrendingUp className="w-4 md:w-5 h-4 md:h-5" />
                      <span className="text-sm hidden sm:inline">Analytics</span>
                    </button>
                    {/* Export Button */}
                    {filteredAndSortedBatches.length > 0 && (
                      <button
                        onClick={() => setShowBatchSelectionModal(true)}
                        disabled={isExporting}
                        className="flex items-center gap-2 px-3 md:px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <Download className="w-4 md:w-5 h-4 md:h-5" />
                        <span className="text-sm hidden sm:inline">{isExporting ? 'Exporting...' : 'Export'}</span>
                        {selectedBatches.length > 0 && (
                          <span className="px-1.5 py-0.5 bg-blue-600 text-white text-xs rounded-full font-medium">
                            {selectedBatches.length}
                          </span>
                        )}
                      </button>
                    )}
                    <button
                      onClick={refreshData}
                      disabled={isRefreshing}
                      className="flex items-center gap-2 px-3 md:px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <RefreshCw className={`w-4 md:w-5 h-4 md:h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                      <span className="text-sm hidden sm:inline">{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* batch review display */}
            <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-300 p-3 sm:p-4 md:p-6">
              {showLoading ? (
                <div className="py-12">
                  <LoadingLogo message="Loading inventory data..." size="lg" />
                </div>
              ) : selectedBatch ? (
                <div className="flex flex-col gap-6">
                  {/* Header with close button */}
                  <div className="flex flex-col gap-3 sm:gap-4">
                    {/* Batch Number, Status Badge, and Close Button Row */}
                    <div className="flex items-center justify-between gap-2 sm:gap-3">
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                        <h2 className="text-lg sm:text-xl font-semibold truncate">{selectedBatch}</h2>
                        {/* Status Badge */}
                        <span
                          className={`inline-flex items-center px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap flex-shrink-0 ${
                            (overviewData?.status || "active").toLowerCase() === "active"
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {(overviewData?.status || "active").toLowerCase() === "active"
                            ? "Active"
                            : "Not Active"}
                        </span>
                      </div>
                      {/* Close Button */}
                      <button
                        onClick={() => {
                          setSelectedBatch(null)
                          setQrCodeDataUrl(null)
                        }}
                        className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors duration-150 text-xs sm:text-sm font-medium flex-shrink-0"
                      >
                        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        <span className="hidden sm:inline">Close</span>
                      </button>
                    </div>
                    
                    {/* Date, Status Toggle, and Export Row */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
                      <div className="flex items-center gap-2 sm:gap-3">
                        {overviewData?.createdAt && (
                          <p className="text-gray-500 text-xs sm:text-sm">
                            {new Date(overviewData.createdAt).toLocaleDateString('en-US', { 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            })}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                        {/* Export Dropdown for Batch Details */}
                        <div className="relative" ref={exportDropdownRef}>
                          <button
                            onClick={() => setShowExportDropdown(!showExportDropdown)}
                            disabled={isExporting}
                            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150 text-xs sm:text-sm font-medium"
                          >
                            <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            <span className="hidden xs:inline">{isExporting ? 'Exporting...' : 'Export'}</span>
                          </button>
                          
                          {showExportDropdown && (
                            <div className="absolute left-0 sm:right-0 sm:left-auto mt-2 w-44 sm:w-48 bg-white border border-gray-300 rounded-lg shadow-lg z-50">
                              <button
                                onClick={() => {
                                  handleExportBatchDetails('pdf');
                                  setShowExportDropdown(false);
                                }}
                                className="w-full text-left px-3 sm:px-4 py-2 hover:bg-gray-50 rounded-lg text-xs sm:text-sm"
                              >
                                Export as PDF
                              </button>
                            </div>
                          )}
                        </div>
                        {/* Remove Batch Button */}
                        <button
                          onClick={() => setShowDeleteConfirmModal(true)}
                          className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors duration-150 text-xs sm:text-sm font-medium whitespace-nowrap"
                        >
                          <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          <span className="hidden sm:inline">Remove Batch</span>
                          <span className="sm:hidden">Remove</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col-reverse xl:flex-row gap-6">
                    {/* Overview Cards */}
                    <div id="batch-overview-container" ref={batchOverviewRef}>
                      <InventoryOverviewCards 
                        overviewData={overviewData} 
                        selectedBatch={selectedBatch} 
                      />
                    </div>
                    
                    {/* QR Code Modal */}
                    <QRCodeModal 
                      selectedBatch={selectedBatch}
                      qrCodeDataUrl={qrCodeDataUrl}
                      qrCodeLoading={qrCodeLoading}
                      downloadQRCode={downloadQRCode}
                      copyBatchUrl={copyBatchUrl}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-4 sm:gap-6">

                  {/* Search and Filter Component */}
                  <InventorySearchAndFilter
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    showFilters={showFilters}
                    setShowFilters={setShowFilters}
                    sortBy={sortBy}
                    setSortBy={setSortBy}
                    sortDirection={sortDirection}
                    setSortDirection={setSortDirection}
                    dateFrom={dateFrom}
                    setDateFrom={setDateFrom}
                    dateTo={dateTo}
                    setDateTo={setDateTo}
                    statusFilter={statusFilter}
                    setStatusFilter={setStatusFilter}
                    defectRateThreshold={defectRateThreshold}
                    setDefectRateThreshold={setDefectRateThreshold}
                    sizeFilters={sizeFilters}
                    setSizeFilters={setSizeFilters}
                    onClearFilters={clearFilters}
                  />

                  {/* Batch Grid */}
                  <InventoryBatchGrid 
                    loading={loading}
                    currentItems={currentItems}
                    batchReviews={filteredAndSortedBatches}
                    selectedBatch={selectedBatch}
                    handleBatchSelect={handleBatchSelect}
                  />
                </div>
              )}

              {/* Pagination - Only show when no batch is selected */}
              {!selectedBatch && (
                <div className="mt-6">
                  <InventoryPagination 
                  loading={loading}
                  batchReviews={filteredAndSortedBatches}
                  currentPage={currentPage}
                  totalPages={totalPages}
                  rowsPerPage={rowsPerPage}
                  showRowsDropdown={showRowsDropdown}
                  setCurrentPage={setCurrentPage}
                  setRowsPerPage={setRowsPerPage}
                  setShowRowsDropdown={setShowRowsDropdown}
                  goToFirstPage={goToFirstPage}
                  goToPreviousPage={goToPreviousPage}
                  goToNextPage={goToNextPage}
                  goToLastPage={goToLastPage}
                />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Batch Selection Modal for Export */}
      {showBatchSelectionModal && (
        <BatchSelectionModal
          batches={filteredAndSortedBatches}
          selectedBatches={selectedBatches}
          setSelectedBatches={setSelectedBatches}
          onClose={() => {
            setShowBatchSelectionModal(false);
            setSelectedBatches([]);
          }}
          onExport={handleExportBatchList}
          isExporting={isExporting}
        />
      )}

      {/* Batch Comparison Modal */}
      {showComparisonModal && (
        <BatchComparisonModal
          batches={filteredAndSortedBatches}
          selectedBatches={compareBatches}
          onClose={() => setShowComparisonModal(false)}
          overviewDataMap={comparisonOverviewData}
        />
      )}

      {/* Analytics Modal */}
      {showInsights && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowInsights(false)}
          />
          
          {/* Modal Content */}
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden border border-gray-300">
            {/* Modal Header */}
            <div className="bg-white border-b border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#E8F4FA] rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-[#105588]" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Analytics & Insights</h2>
                  </div>
                </div>
                <button
                  onClick={() => setShowInsights(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              <div className="space-y-4 sm:space-y-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  <StatCard
                    title="Total Batches"
                    value={quickStats.totalBatches}
                    icon={Package}
                    color="blue"
                  />
                  <StatCard
                    title="Total Eggs"
                    value={quickStats.totalEggs}
                    icon={Egg}
                    color="purple"
                  />
                  <StatCard
                    title="Avg Defect Rate"
                    value={`${quickStats.avgDefectRate}%`}
                    icon={AlertTriangle}
                    color="red"
                  />
                  <StatCard
                    title="Active Batches"
                    value={quickStats.activeBatches}
                    icon={CheckCircle}
                    color="green"
                  />
                </div>

                {/* Trends Charts */}
                <TrendsChart batches={filteredAndSortedBatches} />

                {/* Batch Comparison Button */}
                <button
                  onClick={() => {
                    setShowInsights(false);
                    setShowComparisonSelectionModal(true);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 sm:py-3 bg-[#105588] text-white rounded-lg hover:bg-[#0d4470] transition-colors font-medium text-sm sm:text-base"
                >
                  <GitCompare className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>Compare Batches</span>
                </button>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-gray-200 p-3 sm:p-4 bg-gray-50">
              <button
                onClick={() => setShowInsights(false)}
                className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium text-sm sm:text-base"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !isDeleting && setShowDeleteConfirmModal(false)}
          />
          
          {/* Modal Content */}
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full border border-gray-300">
            {/* Modal Header */}
            <div className="bg-red-50 border-b border-red-200 p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Delete Batch</h2>
                  <p className="text-red-600 text-sm">This action cannot be undone</p>
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <div className="space-y-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800 font-medium mb-2">
                    ⚠️ Warning: This will permanently delete:
                  </p>
                  <ul className="text-sm text-yellow-700 space-y-1 ml-4 list-disc">
                    <li>The batch: <strong>{selectedBatch}</strong></li>
                    <li>All eggs associated with this batch</li>
                    <li>All related statistics and history</li>
                  </ul>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type <span className="font-bold text-red-600">{selectedBatch}</span> to confirm:
                  </label>
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder={selectedBatch}
                    disabled={isDeleting}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 disabled:bg-gray-100 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-gray-200 p-4 bg-gray-50 flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirmModal(false);
                  setDeleteConfirmText("");
                }}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteBatch}
                disabled={isDeleting || deleteConfirmText !== selectedBatch}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeleting ? (
                  <span className="flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Deleting...
                  </span>
                ) : (
                  "Delete Permanently"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Comparison Selection Modal */}
      {showComparisonSelectionModal && (
        <BatchComparisonSelectionModal
          batches={filteredAndSortedBatches}
          onClose={() => setShowComparisonSelectionModal(false)}
          onCompare={handleCompareSelected}
        />
      )}

      {/* Result Modal for Success/Error Feedback */}
      <ResultModal
        message={resultMessage}
        onClose={() => setResultMessage("")}
      />
    </div>
  );
}