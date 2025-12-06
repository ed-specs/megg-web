"use client";

import { useState, useRef, useEffect } from "react";
import { BarChart2, Calendar, Layers, List, ChevronDown } from "lucide-react";
import {
  ArrowUpWideNarrow,
  ChartNoAxesCombined,
  CalendarRange,
  Package,
} from "lucide-react";
import { Navbar } from "../../components/NavBar";
import { Header } from "../../components/Header";
import LoadingLogo from "../../components/LoadingLogo";
import { useLoadingDelay } from "../../components/useLoadingDelay";

import BatchReview from "./components/BatchReview";
import DailySummary from "./components/DailySummary";
import SortLog from "./components/SortLog";
import Statistics from "./components/Statistics";

export default function Sort() {
  const [selectedTab, setSelectedTab] = useState("sortLog");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef(null);
  
  const showLoading = useLoadingDelay(loading, 500);

  // Initial page load
  useEffect(() => {
    // Simulate initial page load
    const timer = setTimeout(() => {
      setLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  // Tab options for the dropdown
  const tabOptions = [
    { name: "Sort Log", value: "sortLog", icon: ArrowUpWideNarrow },
    { name: "Statistics", value: "statistics", icon: ChartNoAxesCombined },
    { name: "Daily Summary", value: "dailySummary", icon: CalendarRange },
    { name: "Batch Review", value: "batchReview", icon: Package },
  ];

  // Get the currently selected tab
  const selectedOption = tabOptions.find(
    (option) => option.value === selectedTab
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }

    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownOpen]);

  if (showLoading) {
    return (
      <div className="min-h-screen container mx-auto text-[#1F2421] relative">
        <div className="flex gap-6 p-4 md:p-6">
          <div className="hidden lg:block">
            <Navbar />
          </div>
          <div className="flex flex-1 flex-col gap-6 w-full">
            <Header setSidebarOpen={() => {}} />
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <LoadingLogo message="Loading sort history..." size="lg" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
            {/* Tab Selector */}
            <div className="bg-white rounded-2xl border border-gray-300 p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Sort History
                  </h1>
                  <p className="text-gray-600 mt-1">
                    Track and analyze egg sorting data over time
                  </p>
                </div>

                {/* Tab Dropdown */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center gap-3 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[200px]"
                  >
                    <selectedOption.icon className="w-5 h-5 text-gray-500" />
                    <span className="flex-1 text-left">{selectedOption.name}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${
                        dropdownOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {dropdownOpen && (
                    <div className="absolute right-0 mt-2 w-full bg-white border border-gray-300 rounded-lg shadow-lg z-50">
                      {tabOptions.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => {
                            setSelectedTab(option.value);
                            setDropdownOpen(false);
                          }}
                          className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg ${
                            selectedTab === option.value
                              ? "bg-blue-50 text-blue-700"
                              : "text-gray-700"
                          }`}
                        >
                          <option.icon className="w-5 h-5" />
                          {option.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Tab Content */}
            <div className="bg-white rounded-2xl border border-gray-300 overflow-hidden">
              {selectedTab === "sortLog" && <SortLog />}
              {selectedTab === "statistics" && <Statistics />}
              {selectedTab === "dailySummary" && <DailySummary />}
              {selectedTab === "batchReview" && <BatchReview />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
