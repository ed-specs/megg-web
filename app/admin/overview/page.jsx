"use client";

import { Navbar } from "../components/NavBar";
import { Header } from "../components/Header";
import { useState, useEffect, useMemo } from "react";
import { 
  Users, TrendingUp, AlertTriangle, CheckCircle, RefreshCw, Filter, X, 
  Lightbulb, Award, Clock, Settings, Shield, Building2, Package
} from "lucide-react";
import LoadingLogo from "../../dashboard/components/LoadingLogo";
import { useLoadingDelay } from "../../dashboard/components/useLoadingDelay";
import { collection, getDocs, query } from "firebase/firestore";
import { db } from "../../config/firebaseConfig";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
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

export default function AdminOverviewPage() {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const showLoading = useLoadingDelay(loading, 500);
  const [rawBatchesData, setRawBatchesData] = useState([]);
  const [usersData, setUsersData] = useState([]);
  const [error, setError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Date filter state
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  
  // Insights modal state
  const [showInsightsModal, setShowInsightsModal] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all batches (admin can see all)
      const batchesQuery = query(collection(db, "batches"));
      const batchesSnapshot = await getDocs(batchesQuery);
      console.log('[Admin Overview] Found', batchesSnapshot.size, 'batches');

      // Fetch all users
      const usersQuery = query(collection(db, "users"));
      const usersSnapshot = await getDocs(usersQuery);
      console.log('[Admin Overview] Found', usersSnapshot.size, 'users');

      const batchesArray = [];
      batchesSnapshot.docs.forEach(doc => {
        const batch = doc.data();
        const batchStats = batch.stats || {};
        
        const createdAt = tsToDate(batch.createdAt);
        const updatedAt = tsToDate(batch.updatedAt);
        const processingMinutes = (updatedAt - createdAt) / (1000 * 60);

        const displayName = batch.id ? batch.id.replace('BATCH-679622-', '') : 'Unknown';
        
        batchesArray.push({
          name: displayName,
          batchId: batch.id,
          accountId: batch.accountId || 'Unknown',
          totalEggs: Number(batchStats.totalEggs || 0),
          small: Number(batchStats.smallEggs || 0),
          medium: Number(batchStats.mediumEggs || 0),
          large: Number(batchStats.largeEggs || 0),
          good: Number(batchStats.goodEggs || 0),
          dirty: Number(batchStats.dirtyEggs || 0),
          cracked: Number(batchStats.crackEggs || 0),
          createdAt: createdAt,
          updatedAt: updatedAt,
          processingTime: processingMinutes,
        });
      });

      // Sort by creation date (oldest to newest for chronological order)
      batchesArray.sort((a, b) => a.createdAt - b.createdAt);

      // Process users data
      const usersArray = [];
      usersSnapshot.docs.forEach(doc => {
        const user = doc.data();
        usersArray.push({
          accountId: doc.id,
          username: user.username || 'Unknown',
          email: user.email || '',
          role: user.role || 'user',
          createdAt: tsToDate(user.createdAt),
          lastLogin: tsToDate(user.lastLogin),
          farmName: user.farmName || '',
        });
      });

      console.log('[Admin Overview] Processed batches:', batchesArray.length);
      console.log('[Admin Overview] Processed users:', usersArray.length);
      setRawBatchesData(batchesArray);
      setUsersData(usersArray);
      setLoading(false);

    } catch (err) {
      console.error('[Admin Overview] Error fetching data:', err);
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
      fromDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter(batch => batch.createdAt >= fromDate);
    }
    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(batch => batch.createdAt <= toDate);
    }

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

  const userStats = useMemo(() => {
    // Filter out admin users for counts
    const regularUsersData = usersData.filter(u => u.role !== 'admin');
    const totalUsers = regularUsersData.length;
    const adminUsers = usersData.filter(u => u.role === 'admin').length;
    const regularUsers = regularUsersData.filter(u => u.role === 'user').length;
    const activeUsers = regularUsersData.filter(u => {
      if (!u.lastLogin) return false;
      const daysSinceLogin = (Date.now() - u.lastLogin.getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceLogin <= 30;
    }).length;

    return {
      totalUsers,
      adminUsers,
      regularUsers,
      activeUsers,
    };
  }, [usersData]);

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

  // Prepare chart data
  const chartData = useMemo(() => {
    return batchesData.slice();
  }, [batchesData]);

  // Generate Admin Insights
  const insights = useMemo(() => {
    const results = [];

    // 1. Total users
    if (userStats.totalUsers > 0) {
      results.push({
        type: 'info',
        icon: Users,
        message: `Total of ${userStats.totalUsers} registered users (${userStats.activeUsers} active in last 30 days)`
      });
    }

    // 2. System performance
    if (batchesData.length > 0) {
      const overallQuality = stats.totalEggs > 0 ? (stats.goodEggs / stats.totalEggs) * 100 : 0;
      if (overallQuality >= 90) {
        results.push({
          type: 'success',
          icon: CheckCircle,
          message: `Excellent system quality! ${overallQuality.toFixed(1)}% of eggs are good across all users`
        });
      } else if (overallQuality < 80) {
        results.push({
          type: 'warning',
          icon: AlertTriangle,
          message: `System quality below target (${overallQuality.toFixed(1)}%) - review processing parameters`
        });
      }
    }

    // 3. User activity
    if (userStats.activeUsers < userStats.totalUsers * 0.5) {
      results.push({
        type: 'warning',
        icon: AlertTriangle,
        message: `Low user activity: Only ${((userStats.activeUsers / userStats.totalUsers) * 100).toFixed(0)}% of users active in last 30 days`
      });
    }

    return results;
  }, [batchesData, stats, userStats]);

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
      <div className="flex gap-4 md:gap-6 p-3 md:p-4 lg:p-6">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block">
          <Navbar />
        </div>

        <div className="flex flex-1 flex-col gap-4 md:gap-6 w-full min-w-0">
          {/* Header */}
          <Header setSidebarOpen={setSidebarOpen} />

          {/* Main Content */}
          <div className="flex flex-col gap-4 md:gap-6">
            {/* Loading State */}
            {showLoading ? (
              <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-300 p-3 sm:p-4 md:p-6">
                <div className="py-12">
                  <LoadingLogo message="Loading admin overview..." size="lg" />
                </div>
              </div>
            ) : (
              <>
            {/* Header Card */}
            <div className="bg-white rounded-2xl border border-gray-300 p-4 md:p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h1 className="text-xl md:text-2xl font-bold text-gray-900">
                      Admin Dashboard
                    </h1>
                  </div>
                  <p className="text-gray-600 text-sm mt-1">
                    System-wide analytics and user management overview
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => setShowInsightsModal(true)}
                    className="flex items-center gap-2 px-3 md:px-4 py-2 bg-[#105588] text-white rounded-lg hover:bg-[#0d4470] transition-colors focus:outline-none focus:ring-2 focus:ring-[#105588]"
                  >
                    <Lightbulb className="w-4 md:w-5 h-4 md:h-5" />
                    <span className="text-sm hidden sm:inline">Insights</span>
                    {insights.length > 0 && (
                      <span className="px-1.5 py-0.5 bg-white text-[#105588] text-xs rounded-full font-medium">
                        {insights.length}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`flex items-center gap-2 px-3 md:px-4 py-2 border rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      hasActiveFilters 
                        ? 'bg-blue-50 border-blue-300 text-blue-600' 
                        : 'bg-white border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <Filter className="w-4 md:w-5 h-4 md:h-5" />
                    <span className="text-sm hidden sm:inline">Filter</span>
                    {hasActiveFilters && (
                      <span className="px-1.5 py-0.5 bg-blue-600 text-white text-xs rounded-full">
                        {(dateFrom ? 1 : 0) + (dateTo ? 1 : 0)}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={refreshData}
                    disabled={isRefreshing}
                    className="flex items-center gap-2 px-3 md:px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <RefreshCw className={`w-4 md:w-5 h-4 md:h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                    <span className="text-sm hidden sm:inline">Refresh</span>
                  </button>
                </div>
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

            {error ? (
              <div className="bg-white border border-gray-200 rounded-xl p-6 md:p-12">
                <div className="flex flex-col items-center justify-center gap-4">
                  <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium text-gray-500">No data available</p>
                  <p className="text-sm text-gray-400">{error}</p>
                  <button
                    onClick={fetchData}
                    className="mt-2 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    Retry
                  </button>
                </div>
              </div>
            ) : !hasData ? (
              <div className="bg-white border border-gray-200 rounded-xl p-6 md:p-12">
                <div className="flex flex-col items-center justify-center gap-2">
                  <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium text-gray-500">No data available</p>
                  <p className="text-sm text-gray-400">No batches have been processed yet</p>
                </div>
              </div>
            ) : (
              <>
                {/* System Metrics Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 md:gap-4">
                  {/* Total Users */}
                  <div className="bg-white border border-gray-300 rounded-xl p-4 md:p-6 hover:shadow-lg transition-all">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-xs md:text-sm font-medium text-gray-600 mb-1">Total Users</p>
                        <p className="text-2xl md:text-3xl font-bold text-[#105588]">{userStats.totalUsers}</p>
                        <p className="text-xs text-gray-500 mt-1">{userStats.activeUsers} active</p>
                      </div>
                      <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-[#E8F4FA] flex items-center justify-center flex-shrink-0">
                        <Users className="w-5 h-5 md:w-6 md:h-6 text-[#105588]" />
                      </div>
                    </div>
                  </div>

                  {/* Total Batches */}
                  <div className="bg-white border border-gray-300 rounded-xl p-4 md:p-6 hover:shadow-lg transition-all">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-xs md:text-sm font-medium text-gray-600 mb-1">Total Batches</p>
                        <p className="text-2xl md:text-3xl font-bold text-[#105588]">{performanceMetrics.totalBatches}</p>
                        <p className="text-xs text-gray-500 mt-1">batches processed</p>
                      </div>
                      <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-[#E8F4FA] flex items-center justify-center flex-shrink-0">
                        <Package className="w-5 h-5 md:w-6 md:h-6 text-[#105588]" />
                      </div>
                    </div>
                  </div>

                  {/* Total Eggs Processed */}
                  <div className="bg-white border border-gray-300 rounded-xl p-4 md:p-6 hover:shadow-lg transition-all">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-xs md:text-sm font-medium text-gray-600 mb-1">Total Eggs Processed</p>
                        <p className="text-2xl md:text-3xl font-bold text-[#105588]">{stats.totalEggs.toLocaleString()}</p>
                        <p className="text-xs text-gray-500 mt-1">all eggs</p>
                      </div>
                      <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-[#E8F4FA] flex items-center justify-center flex-shrink-0">
                        <Package className="w-5 h-5 md:w-6 md:h-6 text-[#105588]" />
                      </div>
                    </div>
                  </div>

                  {/* Quality Score */}
                  <div className="bg-white border border-gray-300 rounded-xl p-4 md:p-6 hover:shadow-lg transition-all">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-xs md:text-sm font-medium text-gray-600 mb-1">System Quality Score</p>
                        <p className="text-2xl md:text-3xl font-bold text-[#fb510f]">{qualityScore}%</p>
                        <p className="text-xs text-gray-500 mt-1">{stats.goodEggs.toLocaleString()} good</p>
                      </div>
                      <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-[#FEF3EF] flex items-center justify-center flex-shrink-0">
                        <CheckCircle className="w-5 h-5 md:w-6 md:h-6 text-[#fb510f]" />
                      </div>
                    </div>
                  </div>

                  {/* Processing Speed */}
                  <div className="bg-white border border-gray-300 rounded-xl p-4 md:p-6 hover:shadow-lg transition-all">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-xs md:text-sm font-medium text-gray-600 mb-1">Avg Processing Speed</p>
                        <p className="text-2xl md:text-3xl font-bold text-[#105588]">{Math.round(performanceMetrics.avgEggsPerHour)}</p>
                        <p className="text-xs text-gray-500 mt-1">eggs/hour</p>
                      </div>
                      <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-[#E8F4FA] flex items-center justify-center flex-shrink-0">
                        <TrendingUp className="w-5 h-5 md:w-6 md:h-6 text-[#105588]" />
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
                          { name: 'Small', value: stats.smallEggs, fill: '#105588' },
                          { name: 'Medium', value: stats.mediumEggs, fill: '#fb510f' },
                          { name: 'Large', value: stats.largeEggs, fill: '#ecb662' },
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
                          { name: 'Good', value: stats.goodEggs, fill: '#105588' },
                          { name: 'Dirty', value: stats.dirtyEggs, fill: '#ecb662' },
                          { name: 'Cracked', value: stats.crackEggs, fill: '#fb510f' },
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


                {/* Smart Insights Modal */}
                {showInsightsModal && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
                    {/* Backdrop */}
                    <div 
                      className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                      onClick={() => setShowInsightsModal(false)}
                    />
                    
                    {/* Modal Content */}
                    <div className="relative bg-white rounded-xl sm:rounded-2xl shadow-2xl max-w-3xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden border border-gray-300">
                      {/* Modal Header */}
                      <div className="bg-white border-b border-gray-200 p-4 sm:p-6">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#E8F4FA] rounded-lg flex items-center justify-center flex-shrink-0">
                              <Lightbulb className="w-4 h-4 sm:w-6 sm:h-6 text-[#105588]" />
                            </div>
                            <div className="min-w-0">
                              <h2 className="text-lg sm:text-xl font-bold text-gray-900 truncate">Admin Insights</h2>
                              <p className="text-gray-600 text-xs sm:text-sm hidden sm:block">System-wide recommendations</p>
                            </div>
                          </div>
                          <button
                            onClick={() => setShowInsightsModal(false)}
                            className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                          >
                            <X className="w-5 h-5 text-gray-600" />
                          </button>
                        </div>
                      </div>

                      {/* Modal Body */}
                      <div className="p-3 sm:p-6 overflow-y-auto max-h-[calc(95vh-140px)] sm:max-h-[calc(90vh-120px)]">
                        {insights.length > 0 ? (
                          <div className="grid grid-cols-1 gap-3 sm:gap-4">
                            {insights.map((insight, index) => {
                              const Icon = insight.icon;
                              const bgColors = {
                                success: 'bg-[#E8F4FA] border-[#105588]/30',
                                warning: 'bg-[#FDF8F0] border-[#ecb662]/30',
                                error: 'bg-[#FEF3EF] border-[#fb510f]/30',
                                info: 'bg-[#E8F4FA] border-[#105588]/30'
                              };
                              const iconColors = {
                                success: 'text-[#105588]',
                                warning: 'text-[#ecb662]',
                                error: 'text-[#fb510f]',
                                info: 'text-[#105588]'
                              };
                              
                              return (
                                <div
                                  key={index}
                                  className={`flex items-start gap-3 sm:gap-4 p-3 sm:p-5 rounded-lg border ${bgColors[insight.type]} hover:shadow-md transition-shadow`}
                                >
                                  <div className="flex-shrink-0 mt-0.5 sm:mt-1">
                                    <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${iconColors[insight.type]}`} />
                                  </div>
                                  <p className="text-sm sm:text-base text-gray-800 leading-relaxed">{insight.message}</p>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-center py-8 sm:py-12">
                            <Lightbulb className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 sm:mb-3 text-gray-300" />
                            <p className="text-gray-500 text-sm sm:text-base px-4">No insights available yet. More data will generate recommendations.</p>
                          </div>
                        )}
                      </div>

                      {/* Modal Footer */}
                      <div className="border-t border-gray-200 p-3 sm:p-4 bg-gray-50">
                        <button
                          onClick={() => setShowInsightsModal(false)}
                          className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium text-sm sm:text-base"
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
