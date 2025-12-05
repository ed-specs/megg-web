"use client";

import { Navbar } from "../components/NavBar";
import { Header } from "../components/Header";
import { useState, useEffect, useMemo } from "react";
import { 
  Package, TrendingUp, AlertTriangle, CheckCircle, RefreshCw, Filter, X, 
  Lightbulb, Award, Clock, Settings
} from "lucide-react";
import LoadingLogo from "../components/LoadingLogo";
import { getUserAccountId } from "../../utils/auth-utils";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../config/firebaseConfig";
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  AreaChart,
  Area,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';

// Helper to convert timestamps
const tsToDate = (ts) => {
  try {
    if (!ts) return new Date();
    if (typeof ts?.toDate === 'function') return ts.toDate();
    if (typeof ts?.seconds === 'number') return new Date(ts.seconds * 1000);
    return new Date(ts);
  } catch {
    return new Date();
  }
};

// Helper to format time
const formatTime = (minutes) => {
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return `${hours}h ${mins}m`;
};

export default function OverviewPage() {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [rawBatchesData, setRawBatchesData] = useState([]);
  const [error, setError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Date filter state
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const accountId = getUserAccountId();
      console.log('[Overview] AccountId:', accountId);

      if (!accountId) {
        setError("Please log in to view your data");
        setLoading(false);
        return;
      }

      // Fetch all batches for this account
      const batchesQuery = query(
        collection(db, "batches"),
        where("accountId", "==", accountId)
      );

      const snapshot = await getDocs(batchesQuery);
      console.log('[Overview] Found', snapshot.size, 'batches');

      if (snapshot.empty) {
        console.log('[Overview] No batches found');
        setError("No data available yet. Start processing eggs to see statistics.");
        setLoading(false);
        return;
      }

      const batchesArray = [];

      snapshot.docs.forEach(doc => {
        const batch = doc.data();
        const batchStats = batch.stats || {};
        
        const createdAt = tsToDate(batch.createdAt);
        const updatedAt = tsToDate(batch.updatedAt);
        const processingMinutes = (updatedAt - createdAt) / (1000 * 60);

        const displayName = batch.id ? batch.id.replace('BATCH-679622-', '') : 'Unknown';
        
        batchesArray.push({
          name: displayName,
          batchId: batch.id,
          totalEggs: Number(batchStats.totalEggs || 0),
          small: Number(batchStats.smallEggs || 0),
          medium: Number(batchStats.mediumEggs || 0),
          large: Number(batchStats.largeEggs || 0),
          good: Number(batchStats.goodEggs || 0),
          dirty: Number(batchStats.dirtyEggs || 0),
          cracked: Number(batchStats.crackEggs || 0),
          createdAt: createdAt,  // ✅ Add this!
          updatedAt: updatedAt,  // ✅ Add this!
          processingTime: processingMinutes,
        });
      });

      // Sort by batch name
      batchesArray.sort((a, b) => a.name.localeCompare(b.name));

      console.log('[Overview] Processed batches:', batchesArray.length);
      setRawBatchesData(batchesArray);
      setLoading(false);

    } catch (err) {
      console.error('[Overview] Error fetching data:', err);
      setError(`Failed to load data: ${err.message}`);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const refreshData = async () => {
    setIsRefreshing(true);
    await fetchData();
    setIsRefreshing(false);
  };

  // Apply date filters
  const batchesData = useMemo(() => {
    let filtered = [...rawBatchesData];

    // Date filtering
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      fromDate.setHours(0, 0, 0, 0); // Start of day
      console.log('[Filter] From Date:', fromDate);
      filtered = filtered.filter(batch => {
        console.log('[Filter] Batch:', batch.name, 'createdAt:', batch.createdAt, 'pass:', batch.createdAt >= fromDate);
        return batch.createdAt >= fromDate;
      });
    }
    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999); // End of day
      console.log('[Filter] To Date:', toDate);
      filtered = filtered.filter(batch => {
        console.log('[Filter] Batch:', batch.name, 'createdAt:', batch.createdAt, 'pass:', batch.createdAt <= toDate);
        return batch.createdAt <= toDate;
      });
    }

    console.log('[Filter] Filtered batches:', filtered.length, 'of', rawBatchesData.length);
    return filtered;
  }, [rawBatchesData, dateFrom, dateTo]);

  // Calculate aggregate stats
  const stats = useMemo(() => {
    return batchesData.reduce((acc, batch) => {
      acc.totalEggs += batch.totalEggs;
      acc.smallEggs += batch.small;
      acc.mediumEggs += batch.medium;
      acc.largeEggs += batch.large;
      acc.goodEggs += batch.good;
      acc.dirtyEggs += batch.dirty;
      acc.crackEggs += batch.cracked;
      acc.totalProcessingTime += batch.processingTime;
      return acc;
    }, {
      totalEggs: 0,
      smallEggs: 0,
      mediumEggs: 0,
      largeEggs: 0,
      goodEggs: 0,
      dirtyEggs: 0,
      crackEggs: 0,
      totalProcessingTime: 0,
    });
  }, [batchesData]);

  const performanceMetrics = useMemo(() => {
    const numBatches = batchesData.length;
    const avgProcessingTime = numBatches > 0 ? stats.totalProcessingTime / numBatches : 0;
    const avgEggsPerBatch = numBatches > 0 ? stats.totalEggs / numBatches : 0;
    const avgEggsPerHour = avgProcessingTime > 0 ? (avgEggsPerBatch / avgProcessingTime) * 60 : 0;
    
    return {
      avgEggsPerHour,
      avgProcessingTime,
      totalBatches: numBatches,
      avgEggsPerBatch,
    };
  }, [batchesData, stats]);

  const hasData = batchesData.length > 0;
  const hasActiveFilters = dateFrom || dateTo;

  const clearFilters = () => {
    setDateFrom("");
    setDateTo("");
  };

  // Prepare chart data (chronological order for charts)
  const chartData = useMemo(() => {
    return batchesData.slice().reverse();
  }, [batchesData]);

  // Generate Smart Insights
  const insights = useMemo(() => {
    if (batchesData.length === 0) return [];

    const results = [];

    // 1. Find best batch (highest quality rate)
    const bestBatch = batchesData.reduce((best, batch) => {
      const batchQuality = batch.totalEggs > 0 ? (batch.good / batch.totalEggs) * 100 : 0;
      const bestQuality = best.totalEggs > 0 ? (best.good / best.totalEggs) * 100 : 0;
      return batchQuality > bestQuality ? batch : best;
    }, batchesData[0]);
    
    if (bestBatch) {
      const qualityRate = ((bestBatch.good / bestBatch.totalEggs) * 100).toFixed(1);
      results.push({
        type: 'success',
        icon: Award,
        message: `Your best batch was BATCH-679622-${bestBatch.name} with ${qualityRate}% good eggs`
      });
    }

    // 2. Compare first half vs second half of batches (production trend)
    if (batchesData.length >= 4) {
      const midpoint = Math.floor(batchesData.length / 2);
      const firstHalf = batchesData.slice(0, midpoint);
      const secondHalf = batchesData.slice(midpoint);
      
      const firstHalfTotal = firstHalf.reduce((sum, b) => sum + b.totalEggs, 0);
      const secondHalfTotal = secondHalf.reduce((sum, b) => sum + b.totalEggs, 0);
      
      const avgFirst = firstHalfTotal / firstHalf.length;
      const avgSecond = secondHalfTotal / secondHalf.length;
      const percentChange = ((avgSecond - avgFirst) / avgFirst) * 100;
      
      if (Math.abs(percentChange) > 5) {
        results.push({
          type: percentChange > 0 ? 'success' : 'warning',
          icon: TrendingUp,
          message: `Production is ${percentChange > 0 ? 'up' : 'down'} ${Math.abs(percentChange).toFixed(1)}% in recent batches`
        });
      }
    }

    // 3. Check for quality issues (cracked eggs trend)
    if (batchesData.length >= 4) {
      const midpoint = Math.floor(batchesData.length / 2);
      const recentBatches = batchesData.slice(midpoint);
      const olderBatches = batchesData.slice(0, midpoint);
      
      const recentCrackRate = recentBatches.reduce((sum, b) => {
        return sum + (b.totalEggs > 0 ? (b.cracked / b.totalEggs) * 100 : 0);
      }, 0) / recentBatches.length;
      
      const olderCrackRate = olderBatches.reduce((sum, b) => {
        return sum + (b.totalEggs > 0 ? (b.cracked / b.totalEggs) * 100 : 0);
      }, 0) / olderBatches.length;
      
      const crackChange = recentCrackRate - olderCrackRate;
      
      if (crackChange > 2) {
        results.push({
          type: 'error',
          icon: Settings,
          message: `Cracked eggs increased ${crackChange.toFixed(1)}% - check equipment calibration`
        });
      }
    }

    // 4. Find peak productivity hours
    if (batchesData.length >= 3) {
      const hourlyStats = {};
      
      batchesData.forEach(batch => {
        if (batch.createdAt) {
          const hour = batch.createdAt.getHours();
          if (!hourlyStats[hour]) {
            hourlyStats[hour] = { count: 0, totalEggs: 0 };
          }
          hourlyStats[hour].count++;
          hourlyStats[hour].totalEggs += batch.totalEggs;
        }
      });
      
      const hours = Object.keys(hourlyStats).map(h => parseInt(h));
      if (hours.length > 0) {
        const peakHour = hours.reduce((peak, hour) => {
          return hourlyStats[hour].totalEggs > hourlyStats[peak].totalEggs ? hour : peak;
        }, hours[0]);
        
        const formatHour = (h) => {
          const period = h >= 12 ? 'PM' : 'AM';
          const displayHour = h > 12 ? h - 12 : (h === 0 ? 12 : h);
          return `${displayHour}${period}`;
        };
        
        const peakStart = formatHour(peakHour);
        const peakEnd = formatHour(peakHour + 2);
        
        results.push({
          type: 'info',
          icon: Clock,
          message: `Peak productivity: ${peakStart}-${peakEnd}`
        });
      }
    }

    // 5. Overall quality assessment
    const overallQuality = stats.totalEggs > 0 ? (stats.goodEggs / stats.totalEggs) * 100 : 0;
    if (overallQuality >= 90) {
      results.push({
        type: 'success',
        icon: CheckCircle,
        message: `Excellent quality! ${overallQuality.toFixed(1)}% of eggs are good`
      });
    } else if (overallQuality < 80) {
      results.push({
        type: 'warning',
        icon: AlertTriangle,
        message: `Quality below target (${overallQuality.toFixed(1)}%) - review processing parameters`
      });
    }

    return results;
  }, [batchesData, stats]);
  const defectEggs = stats.dirtyEggs + stats.crackEggs;
  const defectRate = stats.totalEggs > 0 ? ((defectEggs / stats.totalEggs) * 100).toFixed(1) : 0;
  const qualityScore = stats.totalEggs > 0 ? ((stats.goodEggs / stats.totalEggs) * 100).toFixed(1) : 0;

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

          {/* Main Content */}
          <div className="flex flex-col gap-6">
            {/* Title, Filter, and Refresh */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h1 className="text-xl md:text-2xl font-bold text-gray-800">Overview Dashboard</h1>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center gap-2 px-3 md:px-4 py-2 border rounded-lg transition-colors ${
                    hasActiveFilters 
                      ? 'bg-blue-50 border-blue-300 text-blue-600' 
                      : 'bg-white border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <Filter className="w-4 h-4" />
                  <span className="text-xs md:text-sm font-medium">Filter</span>
                  {hasActiveFilters && (
                    <span className="px-1.5 py-0.5 bg-blue-600 text-white text-xs rounded-full">
                      {(dateFrom ? 1 : 0) + (dateTo ? 1 : 0)}
                    </span>
                  )}
                </button>
                <button
                  onClick={refreshData}
                  disabled={isRefreshing}
                  className="flex items-center gap-2 px-3 md:px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span className="text-xs md:text-sm font-medium hidden sm:inline">Refresh</span>
                </button>
              </div>
            </div>

            {/* Date Filter Panel */}
            {showFilters && (
              <div className="bg-white border border-gray-300 rounded-xl p-4 md:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base md:text-lg font-semibold text-gray-800">Date Range Filter</h3>
                  <button
                    onClick={() => setShowFilters(false)}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <X className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                {hasActiveFilters && (
                  <div className="mt-4">
                    <button
                      onClick={clearFilters}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Clear Filters
                    </button>
                  </div>
                )}
              </div>
            )}

            {loading ? (
              <div className="bg-white border border-gray-200 rounded-xl p-12">
                <LoadingLogo message="Loading overview data..." />
              </div>
            ) : error ? (
              <div className="bg-white border border-gray-200 rounded-xl p-12">
                <div className="flex flex-col items-center justify-center gap-4">
                  <div className="text-red-600 text-lg font-medium">⚠️ {error}</div>
                  <button
                    onClick={fetchData}
                    className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    Retry
                  </button>
                </div>
              </div>
            ) : !hasData ? (
              <div className="bg-white border border-gray-200 rounded-xl p-12">
                <div className="flex flex-col items-center justify-center gap-2">
                  <div className="text-gray-400 text-lg font-medium">No data available</div>
                  <div className="text-gray-500 text-sm">Start processing eggs to see statistics</div>
                </div>
              </div>
            ) : (
              <>
                {/* Performance Metrics Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                  {/* Total Eggs */}
                  <div className="bg-gradient-to-br from-purple-50 to-white border border-purple-200 rounded-xl p-4 md:p-6 hover:shadow-lg transition-all">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-xs md:text-sm font-medium text-purple-600 mb-1">Total Eggs Processed</p>
                        <p className="text-2xl md:text-3xl font-bold text-gray-900">{stats.totalEggs.toLocaleString()}</p>
                        <p className="text-xs text-gray-500 mt-1">{performanceMetrics.totalBatches} batches</p>
                      </div>
                      <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                        <Package className="w-5 h-5 md:w-6 md:h-6 text-purple-600" />
                      </div>
                    </div>
                  </div>

                  {/* Quality Score */}
                  <div className="bg-gradient-to-br from-green-50 to-white border border-green-200 rounded-xl p-4 md:p-6 hover:shadow-lg transition-all">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-xs md:text-sm font-medium text-green-600 mb-1">Quality Score</p>
                        <p className="text-2xl md:text-3xl font-bold text-gray-900">{qualityScore}%</p>
                        <p className="text-xs text-gray-500 mt-1">{stats.goodEggs.toLocaleString()} good</p>
                      </div>
                      <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                        <CheckCircle className="w-5 h-5 md:w-6 md:h-6 text-green-600" />
                      </div>
                    </div>
                  </div>

                  {/* Processing Speed */}
                  <div className="bg-gradient-to-br from-blue-50 to-white border border-blue-200 rounded-xl p-4 md:p-6 hover:shadow-lg transition-all">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-xs md:text-sm font-medium text-blue-600 mb-1">Processing Speed</p>
                        <p className="text-2xl md:text-3xl font-bold text-gray-900">{Math.round(performanceMetrics.avgEggsPerHour)}</p>
                        <p className="text-xs text-gray-500 mt-1">eggs/hour</p>
                      </div>
                      <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <TrendingUp className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
                      </div>
                    </div>
                  </div>

                  {/* Avg Batch Time */}
                  <div className="bg-gradient-to-br from-orange-50 to-white border border-orange-200 rounded-xl p-4 md:p-6 hover:shadow-lg transition-all">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-xs md:text-sm font-medium text-orange-600 mb-1">Avg Batch Time</p>
                        <p className="text-2xl md:text-3xl font-bold text-gray-900">{formatTime(performanceMetrics.avgProcessingTime)}</p>
                        <p className="text-xs text-gray-500 mt-1">{Math.round(performanceMetrics.avgEggsPerBatch)} eggs/batch</p>
                      </div>
                      <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
                        <RefreshCw className="w-5 h-5 md:w-6 md:h-6 text-orange-600" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Size & Quality Distribution Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                  {/* Size Distribution */}
                  <div className="bg-white border border-gray-200 rounded-xl p-4 md:p-6">
                    <h2 className="text-base md:text-lg font-semibold text-gray-800 mb-3 md:mb-4">Size Distribution</h2>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart 
                        data={[
                          { name: 'Small', value: stats.smallEggs, fill: '#3B82F6' },
                          { name: 'Medium', value: stats.mediumEggs, fill: '#10B981' },
                          { name: 'Large', value: stats.largeEggs, fill: '#F59E0B' },
                        ]}
                        margin={{ top: 20, right: 20, left: -10, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                        <XAxis 
                          dataKey="name" 
                          tick={{ fill: '#6B7280', fontSize: 13, fontWeight: 500 }}
                          axisLine={{ stroke: '#D1D5DB' }}
                          tickLine={false}
                        />
                        <YAxis 
                          tick={{ fill: '#6B7280', fontSize: 12 }}
                          axisLine={{ stroke: '#D1D5DB' }}
                          tickLine={false}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#fff', 
                            border: '1px solid #E5E7EB',
                            borderRadius: '8px',
                            padding: '10px 14px',
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                          }}
                          cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }}
                        />
                        <Bar dataKey="value" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Quality Distribution */}
                  <div className="bg-white border border-gray-200 rounded-xl p-4 md:p-6">
                    <h2 className="text-base md:text-lg font-semibold text-gray-800 mb-3 md:mb-4">Quality Distribution</h2>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart 
                        data={[
                          { name: 'Good', value: stats.goodEggs, fill: '#10B981' },
                          { name: 'Dirty', value: stats.dirtyEggs, fill: '#F59E0B' },
                          { name: 'Cracked', value: stats.crackEggs, fill: '#EF4444' },
                        ]}
                        margin={{ top: 20, right: 20, left: -10, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                        <XAxis 
                          dataKey="name" 
                          tick={{ fill: '#6B7280', fontSize: 13, fontWeight: 500 }}
                          axisLine={{ stroke: '#D1D5DB' }}
                          tickLine={false}
                        />
                        <YAxis 
                          tick={{ fill: '#6B7280', fontSize: 12 }}
                          axisLine={{ stroke: '#D1D5DB' }}
                          tickLine={false}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#fff', 
                            border: '1px solid #E5E7EB',
                            borderRadius: '8px',
                            padding: '10px 14px',
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                          }}
                          cursor={{ fill: 'rgba(16, 185, 129, 0.1)' }}
                        />
                        <Bar dataKey="value" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Trend Charts */}
                {batchesData.length > 1 && (
                  <>
                    {/* Size Trends - Full Width */}
                    <div className="bg-white border border-gray-200 rounded-xl p-4 md:p-6">
                      <h2 className="text-base md:text-lg font-semibold text-gray-800 mb-3 md:mb-4">Size Trends Across Batches</h2>
                      <div className="w-full overflow-x-auto">
                        <ResponsiveContainer width="100%" height={320} minWidth={300}>
                          <AreaChart data={chartData} margin={{ top: 10, right: 5, left: -20, bottom: 5 }}>
                            <defs>
                              <linearGradient id="colorSmall" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.05}/>
                              </linearGradient>
                              <linearGradient id="colorMedium" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#10B981" stopOpacity={0.05}/>
                              </linearGradient>
                              <linearGradient id="colorLarge" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.05}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                            <XAxis 
                              dataKey="name" 
                              tick={{ fill: '#6B7280', fontSize: 9 }}
                              axisLine={{ stroke: '#D1D5DB' }}
                              tickLine={false}
                              interval="preserveStartEnd"
                            />
                            <YAxis 
                              tick={{ fill: '#6B7280', fontSize: 11 }}
                              axisLine={{ stroke: '#D1D5DB' }}
                              tickLine={false}
                            />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: '#fff', 
                                border: '1px solid #E5E7EB',
                                borderRadius: '8px',
                                padding: '6px 10px',
                                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                                fontSize: '12px'
                              }}
                            />
                            <Legend wrapperStyle={{ paddingTop: '8px', fontSize: '12px' }} />
                            <Area type="monotone" dataKey="small" stroke="#3B82F6" strokeWidth={2} fill="url(#colorSmall)" name="Small" />
                            <Area type="monotone" dataKey="medium" stroke="#10B981" strokeWidth={2} fill="url(#colorMedium)" name="Medium" />
                            <Area type="monotone" dataKey="large" stroke="#F59E0B" strokeWidth={2} fill="url(#colorLarge)" name="Large" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Quality Trends - Full Width */}
                    <div className="bg-white border border-gray-200 rounded-xl p-4 md:p-6">
                      <h2 className="text-base md:text-lg font-semibold text-gray-800 mb-3 md:mb-4">Quality Trends Across Batches</h2>
                      <div className="w-full overflow-x-auto">
                        <ResponsiveContainer width="100%" height={320} minWidth={300}>
                          <LineChart data={chartData} margin={{ top: 10, right: 5, left: -20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                            <XAxis 
                              dataKey="name" 
                              tick={{ fill: '#6B7280', fontSize: 9 }}
                              axisLine={{ stroke: '#D1D5DB' }}
                              tickLine={false}
                              interval="preserveStartEnd"
                            />
                            <YAxis 
                              tick={{ fill: '#6B7280', fontSize: 11 }}
                              axisLine={{ stroke: '#D1D5DB' }}
                              tickLine={false}
                            />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: '#fff', 
                                border: '1px solid #E5E7EB',
                                borderRadius: '8px',
                                padding: '6px 10px',
                                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                                fontSize: '12px'
                              }}
                            />
                            <Legend wrapperStyle={{ paddingTop: '8px', fontSize: '12px' }} />
                            <Line type="monotone" dataKey="good" stroke="#10B981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} name="Good" />
                            <Line type="monotone" dataKey="dirty" stroke="#F59E0B" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} name="Dirty" />
                            <Line type="monotone" dataKey="cracked" stroke="#EF4444" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} name="Cracked" />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Processing Time - Full Width */}
                    <div className="bg-white border border-gray-200 rounded-xl p-4 md:p-6">
                      <h2 className="text-base md:text-lg font-semibold text-gray-800 mb-3 md:mb-4">Processing Time per Batch</h2>
                      <div className="w-full overflow-x-auto">
                        <ResponsiveContainer width="100%" height={320} minWidth={300}>
                          <BarChart data={chartData} margin={{ top: 10, right: 5, left: -20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                            <XAxis 
                              dataKey="name" 
                              tick={{ fill: '#6B7280', fontSize: 9 }}
                              axisLine={{ stroke: '#D1D5DB' }}
                              tickLine={false}
                              interval="preserveStartEnd"
                            />
                            <YAxis 
                              tick={{ fill: '#6B7280', fontSize: 11 }}
                              axisLine={{ stroke: '#D1D5DB' }}
                              tickLine={false}
                            />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: '#fff', 
                                border: '1px solid #E5E7EB',
                                borderRadius: '8px',
                                padding: '6px 10px',
                                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                                fontSize: '12px'
                              }}
                              formatter={(value) => [`${Math.round(value)} min`, 'Time']}
                            />
                            <Bar dataKey="processingTime" fill="#F59E0B" radius={[8, 8, 0, 0]} name="Processing Time" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </>
                )}

                {/* Smart Insights - At Bottom */}
                {insights.length > 0 && (
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-4 md:p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Lightbulb className="w-5 h-5 text-blue-600" />
                      <h2 className="text-base md:text-lg font-semibold text-gray-800">Smart Insights</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {insights.map((insight, index) => {
                        const Icon = insight.icon;
                        const bgColors = {
                          success: 'bg-green-50 border-green-200',
                          warning: 'bg-yellow-50 border-yellow-200',
                          error: 'bg-red-50 border-red-200',
                          info: 'bg-blue-50 border-blue-200'
                        };
                        const iconColors = {
                          success: 'text-green-600',
                          warning: 'text-yellow-600',
                          error: 'text-red-600',
                          info: 'text-blue-600'
                        };
                        
                        return (
                          <div
                            key={index}
                            className={`flex items-start gap-3 p-4 rounded-lg border ${bgColors[insight.type]}`}
                          >
                            <div className="flex-shrink-0 mt-0.5">
                              <Icon className={`w-5 h-5 ${iconColors[insight.type]}`} />
                            </div>
                            <p className="text-sm text-gray-700 leading-relaxed">{insight.message}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
