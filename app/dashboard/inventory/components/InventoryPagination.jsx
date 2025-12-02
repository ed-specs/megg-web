import { useRef, useEffect } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

export default function InventoryPagination({
  loading,
  batchReviews,
  currentPage,
  totalPages,
  rowsPerPage,
  showRowsDropdown,
  setCurrentPage,
  setRowsPerPage,
  setShowRowsDropdown,
  goToFirstPage,
  goToPreviousPage,
  goToNextPage,
  goToLastPage,
}) {
  const rowsDropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (rowsDropdownRef.current && !rowsDropdownRef.current.contains(event.target)) {
        setShowRowsDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [setShowRowsDropdown]);

  // Don't show pagination if loading or no data
  if (loading || batchReviews.length === 0) {
    return null;
  }

  return (
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
  );
}
