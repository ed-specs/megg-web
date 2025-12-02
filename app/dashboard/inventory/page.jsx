"use client";

import { Navbar } from "../components/NavBar";
import { Header } from "../components/Header";
import { useState, useRef, useEffect } from "react";
import { RefreshCw, Download } from "lucide-react";
import LoadingLogo from "../components/LoadingLogo";
import { useLoadingDelay } from "../components/useLoadingDelay";
import { exportInventoryBatches, exportBatchDetailsPDF, exportBatchOverviewImage, exportToImage } from "../../utils/export-utils";

import { getMachineLinkedInventoryData, getMachineLinkedBatchDetails, updateBatchStatus } from "../../lib/inventory/InventoryData";
import QRCode from 'qrcode';

// Import our new components
import InventoryOverviewCards from "./components/InventoryOverviewCards";
import InventoryBatchGrid from "./components/InventoryBatchGrid";
import InventoryPagination from "./components/InventoryPagination";
import QRCodeModal from "./components/QRCodeModal";
import InventorySearchAndFilter from "./components/InventorySearchAndFilter";
import BatchSelectionModal from "./components/BatchSelectionModal";

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

  // Fetch inventory data
  useEffect(() => {
    const fetchInventoryData = async () => {
      try {
        setLoading(true);
        console.log("Inventory: Starting to fetch inventory data...");
        
        // Fetch inventory data only for machines linked to the current user
        const inventoryData = await getMachineLinkedInventoryData();
        console.log("Inventory: Fetched inventory data:", inventoryData.length, "batches");
        setBatchReviews(inventoryData);
        
        setLoading(false);
        console.log("Inventory: Inventory data fetch completed successfully");
      } catch (error) {
        console.error("Inventory: Error fetching inventory data:", error);
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
        console.log("Inventory: Fetching batch details for:", selectedBatch);
        const batchDetails = await getMachineLinkedBatchDetails(selectedBatch);
        console.log("Inventory: Fetched batch details:", batchDetails);
        setOverviewData(batchDetails);
      } catch (error) {
        console.error("Inventory: Error fetching batch details:", error);
        setOverviewData(null);
      }
    };

    fetchBatchDetails();
  }, [selectedBatch]);

  // Generate QR Code
  const generateQRCode = async (batchNumber) => {
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
      console.error('Error generating QR code:', error);
      setQrCodeDataUrl(null);
      setQrCodeLoading(false);
    }
  };

  // Download QR Code
  const downloadQRCode = () => {
    if (!qrCodeDataUrl || !selectedBatch) return;
    
    const link = document.createElement('a');
    link.download = `QR_Code_${selectedBatch}_${new Date().toISOString().split('T')[0]}.png`;
    link.href = qrCodeDataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle batch selection
  const handleBatchSelect = (batchNumber) => {
    if (selectedBatch === batchNumber) {
      setSelectedBatch(null); // Deselect if already selected
      setQrCodeDataUrl(null); // Clear QR code
    } else {
      setSelectedBatch(batchNumber);
      setSelectedBatches([]); // Clear bulk selection when opening detail
      generateQRCode(batchNumber); // Generate QR code for new selection
    }
  };

  // Refresh data
  const refreshData = async () => {
    setIsRefreshing(true);
    try {
      const inventoryData = await getMachineLinkedInventoryData();
      setBatchReviews(inventoryData);
      
      // If a batch is selected, refresh its details too
      if (selectedBatch) {
        const batchDetails = await getMachineLinkedBatchDetails(selectedBatch);
        setOverviewData(batchDetails);
      }
    } catch (error) {
      console.error("Error refreshing inventory data:", error);
    }
    setIsRefreshing(false);
  };

  // Calculate defect rate for a batch
  const calculateDefectRate = (batch) => {
    if (!batch.totalEggs || batch.totalEggs === 0) return 0;
    const defectEggs = batch.eggSizes?.Defect || 0;
    return (defectEggs / batch.totalEggs) * 100;
  };

  // Filter and sort batches
  const filteredAndSortedBatches = batchReviews
    .filter((batch) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesBatchNumber = batch.batchNumber?.toLowerCase().includes(query);
        const matchesDate = 
          batch.fromDate?.toLowerCase().includes(query) ||
          batch.toDate?.toLowerCase().includes(query);
        if (!matchesBatchNumber && !matchesDate) {
          return false;
        }
      }

      // Date range filter
      if (dateFrom) {
        const batchDate = new Date(batch.fromDate);
        const fromDate = new Date(dateFrom);
        fromDate.setHours(0, 0, 0, 0);
        if (batchDate < fromDate) return false;
      }
      if (dateTo) {
        const batchDate = new Date(batch.toDate || batch.fromDate);
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        if (batchDate > toDate) return false;
      }

      // Status filter
      if (statusFilter !== "all") {
        const batchStatus = (batch.status || "active").toLowerCase();
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
          const count = batch.eggSizes?.[size] || 0;
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
          const dateA = new Date(a.fromDate || 0);
          const dateB = new Date(b.fromDate || 0);
          comparison = dateA - dateB;
          break;
        case "totalEggs":
          comparison = (a.totalEggs || 0) - (b.totalEggs || 0);
          break;
        case "defectRate":
          comparison = calculateDefectRate(a) - calculateDefectRate(b);
          break;
        case "batchNumber":
          comparison = (a.batchNumber || "").localeCompare(b.batchNumber || "");
          break;
        default:
          comparison = 0;
      }

      return sortDirection === "desc" ? -comparison : comparison;
    });

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery("");
    setDateFrom("");
    setDateTo("");
    setStatusFilter("all");
    setDefectRateThreshold(0);
    setSizeFilters([]);
    setCurrentPage(1);
  };

  // Handle batch status toggle
  const handleStatusToggle = async () => {
    if (!selectedBatch || !overviewData) return;

    try {
      setUpdatingStatus(true);
      const currentStatus = (overviewData.status || "active").toLowerCase();
      const newStatus = currentStatus === "active" ? "not active" : "active";
      
      const success = await updateBatchStatus(selectedBatch, newStatus);
      
      if (success) {
        // Update local state
        setOverviewData({
          ...overviewData,
          status: newStatus,
        });

        // Refresh the batch list to reflect status change
        const inventoryData = await getMachineLinkedInventoryData();
        setBatchReviews(inventoryData);
      }
    } catch (error) {
      console.error("Error updating batch status:", error);
    } finally {
      setUpdatingStatus(false);
    }
  };

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

  // Handle exports
  const handleExportBatchList = async (format, batchNumbers = []) => {
    try {
      setIsExporting(true);
      const batchesToExport = batchNumbers.length > 0
        ? filteredAndSortedBatches.filter((batch) => batchNumbers.includes(batch.batchNumber))
        : filteredAndSortedBatches;
      
      await exportInventoryBatches(batchesToExport, format);
      setShowBatchSelectionModal(false);
      setSelectedBatches([]);
    } catch (error) {
      console.error("Error exporting batch list:", error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportBatchDetails = async (format) => {
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
    } catch (error) {
      console.error("Error exporting batch details:", error);
    } finally {
      setIsExporting(false);
    }
  };

  // Pagination calculations (using filtered batches)
  const totalPages = Math.ceil(filteredAndSortedBatches.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const currentItems = filteredAndSortedBatches.slice(startIndex, endIndex);

  // Pagination functions
  const goToFirstPage = () => setCurrentPage(1);
  const goToPreviousPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));
  const goToNextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));
  const goToLastPage = () => setCurrentPage(totalPages);

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
      <div className="flex gap-6 p-4 md:p-6">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block">
          <Navbar />
        </div>

        <div className="flex flex-1 flex-col gap-6 w-full">
          {/* Header */}
          <Header setSidebarOpen={setSidebarOpen} />

          {/* Main container */}
          <div className="flex flex-col gap-6">
            {/* batch review display */}
            <div className="bg-white rounded-2xl border border-gray-300 p-6">
              {showLoading ? (
                <div className="py-12">
                  <LoadingLogo message="Loading inventory data..." size="lg" />
                </div>
              ) : selectedBatch ? (
                <div className="flex flex-col gap-6">
                  {/* Header with close button */}
                  <div className="flex flex-col gap-4">
                    {/* Batch Number, Status Badge, and Close Button Row */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <h2 className="text-xl font-semibold truncate">{selectedBatch}</h2>
                        {/* Status Badge */}
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap flex-shrink-0 ${
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
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors duration-150 text-sm font-medium flex-shrink-0"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        <span className="hidden sm:inline">Close</span>
                      </button>
                    </div>
                    
                    {/* Date, Status Toggle, and Export Row */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex items-center gap-3">
                        {overviewData?.createdAt && (
                          <p className="text-gray-500 text-sm">
                            {new Date(overviewData.createdAt).toLocaleDateString('en-US', { 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            })}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Export Dropdown for Batch Details */}
                        <div className="relative" ref={exportDropdownRef}>
                          <button
                            onClick={() => setShowExportDropdown(!showExportDropdown)}
                            disabled={isExporting}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150 text-sm font-medium"
                          >
                            <Download className="w-4 h-4" />
                            {isExporting ? 'Exporting...' : 'Export'}
                          </button>
                          
                          {showExportDropdown && (
                            <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-300 rounded-lg shadow-lg z-50">
                              <button
                                onClick={() => {
                                  handleExportBatchDetails('pdf');
                                  setShowExportDropdown(false);
                                }}
                                className="w-full text-left px-4 py-2 hover:bg-gray-50 first:rounded-t-lg"
                              >
                                Export as PDF
                              </button>
                              <button
                                onClick={() => {
                                  handleExportBatchDetails('image');
                                  setShowExportDropdown(false);
                                }}
                                className="w-full text-left px-4 py-2 hover:bg-gray-50 last:rounded-b-lg"
                              >
                                Export as Image
                              </button>
                            </div>
                          )}
                        </div>
                        {/* Status Toggle Button */}
                        <button
                          onClick={handleStatusToggle}
                          disabled={updatingStatus}
                          className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors duration-150 text-sm font-medium ${
                            (overviewData?.status || "active").toLowerCase() === "active"
                              ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                              : "bg-green-100 text-green-700 hover:bg-green-200"
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          {updatingStatus ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              <span>Updating...</span>
                            </>
                          ) : (
                            <>
                              {(overviewData?.status || "active").toLowerCase() === "active"
                                ? "Set Not Active"
                                : "Set Active"}
                            </>
                          )}
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
                    />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-6">
                  {/* Header with refresh and export buttons */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-semibold">Inventory Batches</h2>
                      <p className="text-gray-500 text-sm">
                        {filteredAndSortedBatches.length === batchReviews.length
                          ? `Showing ${batchReviews.length} batch${batchReviews.length !== 1 ? 'es' : ''}`
                          : `Showing ${filteredAndSortedBatches.length} of ${batchReviews.length} batches`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Export Button */}
                      {filteredAndSortedBatches.length > 0 && (
                        <button
                          onClick={() => setShowBatchSelectionModal(true)}
                          disabled={isExporting}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150 text-sm font-medium"
                        >
                          <Download className="w-4 h-4" />
                          {isExporting ? 'Exporting...' : 'Export'}
                          {selectedBatches.length > 0 && (
                            <span className="bg-white text-blue-500 rounded-full w-5 h-5 flex items-center justify-center text-xs font-semibold">
                              {selectedBatches.length}
                            </span>
                          )}
                        </button>
                      )}
                      <button
                        onClick={refreshData}
                        disabled={isRefreshing}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150 text-sm font-medium"
                      >
                        <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                        <span className="hidden sm:inline">{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
                      </button>
                    </div>
                  </div>

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
    </div>
  );
}