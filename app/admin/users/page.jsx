"use client";

import { Navbar } from "../components/NavBar";
import { Header } from "../components/Header";
import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { 
  Users, Search, RefreshCw, Filter, X, Mail, Calendar, Shield, User as UserIcon, Building2
} from "lucide-react";
import LoadingLogo from "../../dashboard/components/LoadingLogo";
import { useLoadingDelay } from "../../dashboard/components/useLoadingDelay";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../../config/firebaseConfig";

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

export default function AdminUsersPage() {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const showLoading = useLoadingDelay(loading, 500);
  const [rawUsersData, setRawUsersData] = useState([]);
  const [error, setError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("All Roles");
  const [showFilters, setShowFilters] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all users
      const usersQuery = query(collection(db, "users"), orderBy("createdAt", "desc"));
      const usersSnapshot = await getDocs(usersQuery);
      console.log('[Admin Users] Found', usersSnapshot.size, 'users');

      const usersArray = [];
      usersSnapshot.docs.forEach(doc => {
        const user = doc.data();
        // Exclude admin users from the list
        if (user.role === 'admin') {
          return;
        }
        usersArray.push({
          accountId: doc.id,
          username: user.username || 'Unknown',
          email: user.email || '',
          role: user.role || 'user',
          createdAt: tsToDate(user.createdAt),
          lastLogin: tsToDate(user.lastLogin),
          farmName: user.farmName || '',
          profileImageUrl: user.profileImageUrl || '/default.png',
        });
      });

      console.log('[Admin Users] Processed users:', usersArray.length);
      setRawUsersData(usersArray);
      setLoading(false);

    } catch (err) {
      console.error('[Admin Users] Error fetching data:', err);
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

  // Apply filters
  const usersData = useMemo(() => {
    let filtered = [...rawUsersData];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(user => 
        user.username?.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query) ||
        user.accountId?.toLowerCase().includes(query) ||
        user.farmName?.toLowerCase().includes(query)
      );
    }

    // Role filter
    if (roleFilter !== "All Roles") {
      filtered = filtered.filter(user => user.role === roleFilter.toLowerCase());
    }

    return filtered;
  }, [rawUsersData, searchQuery, roleFilter]);

  const hasActiveFilters = roleFilter !== "All Roles";

  const clearFilters = () => {
    setRoleFilter("All Roles");
    setSearchQuery("");
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'user':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const formatDate = (date) => {
    if (!date || isNaN(date.getTime())) return 'Never';
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatDateTime = (date) => {
    if (!date || isNaN(date.getTime())) return 'Never';
    return date.toLocaleString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

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
            {/* Header Card */}
            <div className="bg-white rounded-2xl border border-gray-300 p-4 md:p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="w-5 h-5 md:w-6 md:h-6 text-[#105588]" />
                    <h1 className="text-xl md:text-2xl font-bold text-gray-900">
                      Users Management
                    </h1>
                  </div>
                  <p className="text-gray-600 text-sm mt-1">
                    View and manage all registered users
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
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
                        1
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

            {/* Search and Filter Panel */}
            <div className="bg-white border border-gray-300 rounded-xl p-4 md:p-6">
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                {/* Search */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search by username, email, or account ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Filter Panel */}
              {showFilters && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base md:text-lg font-semibold text-gray-800">Filters</h3>
                    <button
                      onClick={() => setShowFilters(false)}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      <X className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                      <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="All Roles">All Roles</option>
                        <option value="user">User</option>
                      </select>
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
            </div>

            {/* Results Summary */}
            <div className="flex justify-between items-center">
              <p className="text-xs sm:text-sm text-gray-600">
                Showing {usersData.length} of {rawUsersData.length} users
              </p>
            </div>

            {/* Loading State */}
            {showLoading ? (
              <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-300 p-3 sm:p-4 md:p-6">
                <div className="py-12">
                  <LoadingLogo message="Loading users..." size="lg" />
                </div>
              </div>
            ) : error ? (
              <div className="bg-white border border-gray-200 rounded-xl p-6 md:p-12">
                <div className="flex flex-col items-center justify-center gap-4">
                  <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium text-gray-500">Error loading users</p>
                  <p className="text-sm text-gray-400">{error}</p>
                  <button
                    onClick={fetchData}
                    className="mt-2 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    Retry
                  </button>
                </div>
              </div>
            ) : usersData.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-xl p-6 md:p-12">
                <div className="flex flex-col items-center justify-center gap-2">
                  <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium text-gray-500">No users found</p>
                  <p className="text-sm text-gray-400">
                    {rawUsersData.length === 0 
                      ? "No users have been registered yet"
                      : "Try adjusting your search or filter criteria."
                    }
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {usersData.map((user) => (
                  <div 
                    key={user.accountId} 
                    className="bg-white border border-gray-300 rounded-xl p-4 md:p-6 hover:shadow-lg transition-all"
                  >
                    <div className="space-y-4">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0 relative">
                            {user.profileImageUrl && user.profileImageUrl !== '/default.png' ? (
                              <Image 
                                src={user.profileImageUrl} 
                                alt={user.username}
                                fill
                                className="object-cover rounded-full"
                                unoptimized
                              />
                            ) : (
                              <UserIcon className="w-6 h-6 text-gray-400" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-base md:text-lg font-semibold text-gray-900 truncate">
                              {user.username}
                            </h3>
                            <p className="text-xs text-gray-500 truncate">{user.accountId}</p>
                          </div>
                        </div>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getRoleBadgeColor(user.role)}`}>
                          {user.role.toUpperCase()}
                        </span>
                      </div>

                      {/* Details */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <span className="text-gray-600 truncate">{user.email || 'No email'}</span>
                        </div>
                        {user.farmName && (
                          <div className="flex items-center gap-2 text-sm">
                            <Building2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <span className="text-gray-600 truncate">{user.farmName}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <span className="text-gray-600">
                            Joined: {formatDate(user.createdAt)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <span className="text-gray-600">
                            Last login: {formatDate(user.lastLogin)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
