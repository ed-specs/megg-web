"use client";

import { useState, useEffect } from "react";
import { BarChart3, TrendingDown, Bug, Clock, TrendingUp } from "lucide-react";
import LoadingLogo from "../../../components/LoadingLogo";
import { useLoadingDelay } from "../../../components/useLoadingDelay";
import { db } from "../../../../config/firebaseConfig";
import { collection, query, where, getDocs } from "firebase/firestore";
import { getUserAccountId } from "../../../../utils/auth-utils";

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

export default function Statistics() {
  const [loading, setLoading] = useState(true);
  const showLoading = useLoadingDelay(loading, 500);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const fetchStatistics = async () => {
      try {
        setLoading(true);
        
        const accountId = getUserAccountId();
        if (!accountId) {
          setLoading(false);
          return;
        }

        // Fetch all eggs for this account
        const eggsRef = collection(db, "eggs");
        const q = query(eggsRef, where("accountId", "==", accountId));
        const querySnapshot = await getDocs(q);

        const eggs = [];
        querySnapshot.forEach((doc) => {
          eggs.push(doc.data());
        });

        if (eggs.length === 0) {
          setLoading(false);
          return;
        }

        // Filter defects (only cracked and dirty)
        const defects = eggs.filter(egg => egg.quality && (egg.quality === 'cracked' || egg.quality === 'dirty'));
        const totalDefects = defects.length;
        const totalEggs = eggs.length;
        
        // Defect distribution
        const defectDistribution = {};
        
        // Daily defect counts
        const dailyDefectCounts = {};
        
        defects.forEach(egg => {
          // Count by defect type (capitalize first letter)
          const defectType = egg.quality ? egg.quality.charAt(0).toUpperCase() + egg.quality.slice(1) : 'Unknown';
          defectDistribution[defectType] = (defectDistribution[defectType] || 0) + 1;
          
          // Count by day
          if (egg.createdAt) {
            const date = new Date(egg.createdAt);
            const dateKey = date.toISOString().split('T')[0];
            dailyDefectCounts[dateKey] = (dailyDefectCounts[dateKey] || 0) + 1;
          }
        });

        // Calculate daily stats
        const dailyValues = Object.values(dailyDefectCounts);
        const avgPerDay = dailyValues.length > 0 
          ? Math.round(dailyValues.reduce((sum, count) => sum + count, 0) / dailyValues.length)
          : 0;
        const worstDay = dailyValues.length > 0 ? Math.max(...dailyValues) : 0;
        const bestDay = dailyValues.length > 0 ? Math.min(...dailyValues) : 0;

        setStats({
          totalDefects,
          avgPerDay,
          worstDay,
          bestDay,
          defectDistribution
        });
        
        setLoading(false);
      } catch (error) {
        console.error("Error fetching defect statistics:", error);
        setLoading(false);
      }
    };

    fetchStatistics();
  }, []);

  if (showLoading) {
    return (
      <div className="p-6">
        <LoadingLogo message="Loading defect statistics..." />
      </div>
    );
  }

  const getDefectColor = (defect) => {
    switch (defect) {
      case "Cracked": return { color: COLORS.brightOrange };
      case "Dirty": return { color: COLORS.tan };
      default: return { color: '#6B7280' };
    }
  };

  const getDefectBgColor = (defect) => {
    switch (defect) {
      case "Cracked": return { backgroundColor: COLORS.orangeLight };
      case "Dirty": return { backgroundColor: COLORS.tanLight };
      default: return { backgroundColor: '#F9FAFB' };
    }
  };

  return (
    <div className="p-4 sm:p-6">
        <div className="mb-6 sm:mb-8">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3 mb-2">
          <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" style={{ color: COLORS.brightOrange }} />
          <span>Defect Statistics</span>
        </h2>
        <p className="text-sm sm:text-base text-gray-600 ml-0 sm:ml-9">Overall defect detection metrics</p>
      </div>

      {stats ? (
        <div className="space-y-6 sm:space-y-8">
          {/* Overview Stats - Main Metrics */}
          <div className="grid grid-cols-1 gap-4 sm:gap-6">
            {/* Total Defects - Featured Card */}
            <div className="bg-white border-2 rounded-xl p-4 sm:p-6 shadow-sm" style={{ borderColor: COLORS.orangeLight }}>
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="p-2 sm:p-3 rounded-xl flex-shrink-0" style={{ backgroundColor: COLORS.orangeLight }}>
                  <Bug className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: COLORS.brightOrange }} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Total Defects Detected</p>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900 break-words">{stats.totalDefects.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Daily Performance Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="p-2 sm:p-3 rounded-lg flex-shrink-0" style={{ backgroundColor: COLORS.tanLight }}>
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: COLORS.tan }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Average per Day</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900 break-words">{stats.avgPerDay.toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="p-2 sm:p-3 rounded-lg flex-shrink-0" style={{ backgroundColor: COLORS.orangeLight }}>
                  <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: COLORS.brightOrange }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Worst Day</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900 break-words">{stats.worstDay.toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow sm:col-span-2 lg:col-span-1">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="p-2 sm:p-3 rounded-lg flex-shrink-0" style={{ backgroundColor: COLORS.coralLight }}>
                  <TrendingDown className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: COLORS.lightCoral }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Best Day</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900 break-words">{stats.bestDay.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Defect Type Distribution */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 lg:p-8 shadow-sm">
            <div className="mb-4 sm:mb-6">
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-1 sm:mb-2">Defect Type Distribution</h3>
              <p className="text-xs sm:text-sm text-gray-600">Breakdown of defects by type</p>
            </div>
            {/* Mobile: Stacked cards, Desktop: Grid */}
            <div className="space-y-2.5 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-6 lg:gap-8">
              {Object.entries(stats.defectDistribution).map(([defect, count]) => {
                const percentage = ((count / stats.totalDefects) * 100).toFixed(1);
                return (
                  <div 
                    key={defect} 
                    className="bg-gradient-to-br from-gray-50 to-gray-100/50 sm:bg-transparent rounded-xl sm:rounded-none p-4 sm:p-0 border border-gray-200/60 sm:border-0 shadow-sm sm:shadow-none"
                  >
                    {/* Mobile: Icon and content side by side, Desktop: Centered vertical */}
                    <div className="flex items-center sm:flex-col sm:items-center gap-4 sm:gap-0">
                      {/* Icon */}
                      <div 
                        className="w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 sm:mx-auto mb-0 sm:mb-4 rounded-full flex items-center justify-center shadow-md"
                        style={getDefectBgColor(defect)}
                      >
                        <Bug className="w-8 h-8 sm:w-10 sm:h-10" style={getDefectColor(defect)} />
                      </div>
                      {/* Content */}
                      <div className="flex-1 sm:flex-none text-left sm:text-center min-w-0 sm:w-full">
                        <div className="text-2xl sm:text-2xl lg:text-3xl font-bold mb-1" style={getDefectColor(defect)}>
                          {count.toLocaleString()}
                        </div>
                        <div className="text-base sm:text-base font-semibold text-gray-800 mb-0.5 sm:mb-1">{defect}</div>
                        <div className="text-xs sm:text-sm font-medium text-gray-600">{percentage}% of total</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 sm:py-16">
          <div className="mb-4">
            <Bug className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4" style={{ color: COLORS.lightBlue }} />
          </div>
          <p className="text-lg sm:text-xl font-semibold text-gray-700 mb-2">No statistics available</p>
          <p className="text-xs sm:text-sm text-gray-500 px-4">Data will appear when defects are detected</p>
        </div>
      )}
    </div>
  );
}
