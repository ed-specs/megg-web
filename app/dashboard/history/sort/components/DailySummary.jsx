"use client";

import { useState, useEffect } from "react";
import { Calendar, Package, TrendingUp, Clock } from "lucide-react";
import LoadingLogo from "../../../components/LoadingLogo";
import { useLoadingDelay } from "../../../components/useLoadingDelay";

export default function DailySummary() {
  const [loading, setLoading] = useState(true);
  const showLoading = useLoadingDelay(loading, 500);
  const [summaryData, setSummaryData] = useState([]);

  useEffect(() => {
    // Mock data loading
    const timer = setTimeout(() => {
      setSummaryData([
        {
          date: "2024-01-15",
          totalEggs: 1250,
          smallEggs: 300,
          mediumEggs: 650,
          largeEggs: 280,
          defects: 20,
          efficiency: 98.4
        },
        {
          date: "2024-01-14",
          totalEggs: 1180,
          smallEggs: 280,
          mediumEggs: 620,
          largeEggs: 260,
          defects: 20,
          efficiency: 98.3
        }
      ]);
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  if (showLoading) {
    return (
      <div className="p-6">
        <LoadingLogo message="Loading daily summary..." />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Daily Summary
        </h2>
        <p className="text-gray-600">Daily sorting performance overview</p>
      </div>

      <div className="space-y-4">
        {summaryData.map((day, index) => (
          <div key={index} className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {new Date(day.date).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </h3>
              <div className="flex items-center gap-2 text-green-600">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm font-medium">{day.efficiency}% Efficiency</span>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{day.totalEggs.toLocaleString()}</div>
                <div className="text-sm text-gray-500">Total Eggs</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-500">{day.smallEggs.toLocaleString()}</div>
                <div className="text-sm text-gray-500">Small</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-500">{day.mediumEggs.toLocaleString()}</div>
                <div className="text-sm text-gray-500">Medium</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-500">{day.largeEggs.toLocaleString()}</div>
                <div className="text-sm text-gray-500">Large</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-500">{day.defects.toLocaleString()}</div>
                <div className="text-sm text-gray-500">Defects</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-500">{day.efficiency}%</div>
                <div className="text-sm text-gray-500">Efficiency</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {summaryData.length === 0 && (
        <div className="text-center py-12">
          <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-medium text-gray-500">No daily summary data available</p>
          <p className="text-sm text-gray-400">Data will appear when sorting operations are performed</p>
        </div>
      )}
    </div>
  );
}
