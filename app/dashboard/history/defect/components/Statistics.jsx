"use client";

import { useState, useEffect } from "react";
import { BarChart3, TrendingDown, Bug, AlertTriangle } from "lucide-react";
import LoadingLogo from "../../../components/LoadingLogo";
import { useLoadingDelay } from "../../../components/useLoadingDelay";

export default function Statistics() {
  const [loading, setLoading] = useState(true);
  const showLoading = useLoadingDelay(loading, 500);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    // Mock data loading
    const timer = setTimeout(() => {
      setStats({
        totalDefects: 342,
        avgPerDay: 28.5,
        worstDay: 45,
        bestDay: 12,
        defectRate: 2.2,
        defectDistribution: {
          Cracked: 145,
          Dirty: 98,
          Broken: 56,
          Deformed: 28,
          Undersized: 15
        }
      });
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
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
      case "Cracked": return "text-red-500";
      case "Dirty": return "text-yellow-500";
      case "Broken": return "text-orange-500";
      case "Deformed": return "text-pink-500";
      case "Undersized": return "text-blue-500";
      default: return "text-gray-500";
    }
  };

  const getDefectBgColor = (defect) => {
    switch (defect) {
      case "Cracked": return "bg-red-100";
      case "Dirty": return "bg-yellow-100";
      case "Broken": return "bg-orange-100";
      case "Deformed": return "bg-pink-100";
      case "Undersized": return "bg-blue-100";
      default: return "bg-gray-100";
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Defect Statistics
        </h2>
        <p className="text-gray-600">Overall defect detection metrics</p>
      </div>

      {stats ? (
        <div className="space-y-6">
          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <Bug className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Defects</p>
                  <p className="text-xl font-semibold text-gray-900">{stats.totalDefects.toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Avg/Day</p>
                  <p className="text-xl font-semibold text-gray-900">{stats.avgPerDay.toFixed(1)}</p>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <TrendingDown className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Worst Day</p>
                  <p className="text-xl font-semibold text-gray-900">{stats.worstDay.toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <TrendingDown className="w-5 h-5 text-green-600 transform rotate-180" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Best Day</p>
                  <p className="text-xl font-semibold text-gray-900">{stats.bestDay.toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <BarChart3 className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Defect Rate</p>
                  <p className="text-xl font-semibold text-gray-900">{stats.defectRate}%</p>
                </div>
              </div>
            </div>
          </div>

          {/* Defect Distribution */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Defect Type Distribution</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {Object.entries(stats.defectDistribution).map(([defect, count]) => {
                const percentage = ((count / stats.totalDefects) * 100).toFixed(1);
                return (
                  <div key={defect} className="text-center">
                    <div className={`w-16 h-16 mx-auto mb-2 rounded-full flex items-center justify-center ${getDefectBgColor(defect)}`}>
                      <Bug className={`w-8 h-8 ${getDefectColor(defect)}`} />
                    </div>
                    <div className={`text-2xl font-bold ${getDefectColor(defect)}`}>
                      {count.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-500">{defect}</div>
                    <div className="text-xs text-gray-400">{percentage}%</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <Bug className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-medium text-gray-500">No defect statistics available</p>
          <p className="text-sm text-gray-400">Data will appear when defects are detected</p>
        </div>
      )}
    </div>
  );
}
