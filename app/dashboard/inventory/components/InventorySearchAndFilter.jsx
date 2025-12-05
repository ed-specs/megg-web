"use client";

import { useState, useRef, useEffect } from "react";
import { Search, SlidersHorizontal, X, ChevronDown, ArrowUpDown } from "lucide-react";

export default function InventorySearchAndFilter({
  searchQuery,
  setSearchQuery,
  showFilters,
  setShowFilters,
  sortBy,
  setSortBy,
  sortDirection,
  setSortDirection,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  statusFilter,
  setStatusFilter,
  defectRateThreshold,
  setDefectRateThreshold,
  sizeFilters,
  setSizeFilters,
  onClearFilters,
}) {
  const filtersDropdownRef = useRef(null);
  const sortDropdownRef = useRef(null);
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filtersDropdownRef.current && !filtersDropdownRef.current.contains(event.target)) {
        // Filters panel stays open based on showFilters state
      }
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target)) {
        setShowSortDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const sortOptions = [
    { value: "date", label: "Date Created" },
    { value: "totalEggs", label: "Total Eggs" },
    { value: "defectRate", label: "Defect Rate" },
    { value: "batchNumber", label: "Batch Number" },
  ];

  const sizeOptions = ["Small", "Medium", "Large", "Defect"];

  const getSortLabel = () => {
    const option = sortOptions.find((opt) => opt.value === sortBy);
    return option ? option.label : "Sort by...";
  };

  const toggleSizeFilter = (size) => {
    setSizeFilters((prev) =>
      prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]
    );
  };

  const hasActiveFilters = () => {
    return (
      searchQuery ||
      dateFrom ||
      dateTo ||
      statusFilter !== "all" ||
      defectRateThreshold > 0 ||
      sizeFilters.length > 0
    );
  };

  return (
    <div className="flex flex-col gap-3 sm:gap-4 mb-4 sm:mb-6">
      {/* Search and Action Bar */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
        {/* Search Bar - Left side */}
        <div className="relative flex-1 order-2 sm:order-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <input
            type="text"
            placeholder="Search by batch number, date..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 sm:pl-10 pr-9 sm:pr-10 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div
          ref={filtersDropdownRef}
          className="bg-gray-50 rounded-lg p-3 sm:p-4 border border-gray-200"
        >
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h3 className="text-sm sm:text-base font-medium text-gray-900">Filters</h3>
            {hasActiveFilters() && (
              <button
                onClick={onClearFilters}
                className="text-xs sm:text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Clear all
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Status Filter - First on mobile */}
            <div className="order-3 sm:order-1">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full p-1.5 sm:p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            {/* Defect Threshold - Second on mobile */}
            <div className="order-4 sm:order-2">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Min Defect Rate (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={defectRateThreshold}
                onChange={(e) => setDefectRateThreshold(Number(e.target.value))}
                className="w-full p-1.5 sm:p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                placeholder="0"
              />
            </div>

            {/* Date Range - From (Right side on mobile) */}
            <div className="order-1 sm:order-3">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Date From
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full p-1.5 sm:p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>

            {/* Date Range - To (Right side on mobile) */}
            <div className="order-2 sm:order-4">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Date To
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                min={dateFrom || undefined}
                className="w-full p-1.5 sm:p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>

            {/* Size Breakdown Filters */}
            <div className="sm:col-span-2 lg:col-span-4">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                Filter by Size
              </label>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {sizeOptions.map((size) => {
                  const isSelected = sizeFilters.includes(size);
                  const sizeColors = {
                    Small: "bg-blue-100 text-blue-700 border-blue-300",
                    Medium: "bg-green-100 text-green-700 border-green-300",
                    Large: "bg-yellow-100 text-yellow-700 border-yellow-300",
                    Defect: "bg-red-100 text-red-700 border-red-300",
                  };

                  return (
                    <button
                      key={size}
                      onClick={() => toggleSizeFilter(size)}
                      className={`px-2 sm:px-3 py-1 rounded-lg border text-xs sm:text-sm font-medium transition-colors duration-150 ${
                        isSelected
                          ? sizeColors[size] || "bg-gray-100 text-gray-700 border-gray-300"
                          : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      {size}
                      {isSelected && (
                        <X className="w-2.5 h-2.5 sm:w-3 sm:h-3 inline-block ml-1" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

