"use client";

import { useState, useEffect } from "react";
import { BarChart3, TrendingUp, Package, Clock } from "lucide-react";
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
        totalEggs: 15420,
        avgPerDay: 1285,
        bestDay: 1450,
        worstDay: 980,
        efficiency: 98.2,
        sizeDistribution: {
          Small: 3200,
          Medium: 8100,
          Large: 3800,
          Defect: 320
        }
      });
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  if (showLoading) {
    return (
      <div className="p-6">
        <LoadingLogo message="Loading statistics..." />
      </div>
    );
  }

  const getSizeColor = (size) => {
    switch (size) {
      case "Small": return "text-blue-500";
      case "Medium": return "text-green-500";
      case "Large": return "text-yellow-500";
      case "Defect": return "text-red-500";
      default: return "text-gray-500";
    }
  };

  const getSizeBgColor = (size) => {
    switch (size) {
      case "Small": return "bg-blue-100";
      case "Medium": return "bg-green-100";
      case "Large": return "bg-yellow-100";
      case "Defect": return "bg-red-100";
      default: return "bg-gray-100";
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Sort Statistics
        </h2>
        <p className="text-gray-600">Overall sorting performance metrics</p>
      </div>

      {stats ? (
        <div className="space-y-6">
          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Package className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Eggs</p>
                  <p className="text-xl font-semibold text-gray-900">{stats.totalEggs.toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Clock className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Avg/Day</p>
                  <p className="text-xl font-semibold text-gray-900">{stats.avgPerDay.toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Best Day</p>
                  <p className="text-xl font-semibold text-gray-900">{stats.bestDay.toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-orange-600 transform rotate-180" />
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
                  <BarChart3 className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Efficiency</p>
                  <p className="text-xl font-semibold text-gray-900">{stats.efficiency}%</p>
                </div>
              </div>
            </div>
          </div>

          {/* Size Distribution */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Size Distribution</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(stats.sizeDistribution).map(([size, count]) => {
                const percentage = ((count / stats.totalEggs) * 100).toFixed(1);
                return (
                  <div key={size} className="text-center">
                    <div className={`w-16 h-16 mx-auto mb-2 rounded-full flex items-center justify-center ${getSizeBgColor(size)}`}>
                      <Package className={`w-8 h-8 ${getSizeColor(size)}`} />
                    </div>
                    <div className={`text-2xl font-bold ${getSizeColor(size)}`}>
                      {count.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-500">{size}</div>
                    <div className="text-xs text-gray-400">{percentage}%</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <BarChart3 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-medium text-gray-500">No statistics available</p>
          <p className="text-sm text-gray-400">Data will appear when sorting operations are performed</p>
        </div>
      )}
    </div>
  );
}
