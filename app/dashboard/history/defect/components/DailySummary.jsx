"use client";

import { useState, useEffect } from "react";
import { Calendar, Bug, TrendingDown, AlertTriangle } from "lucide-react";
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
          totalDefects: 25,
          cracked: 12,
          dirty: 8,
          broken: 3,
          deformed: 2,
          defectRate: 2.1
        },
        {
          date: "2024-01-14",
          totalDefects: 18,
          cracked: 9,
          dirty: 6,
          broken: 2,
          deformed: 1,
          defectRate: 1.8
        }
      ]);
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  if (showLoading) {
    return (
      <div className="p-6">
        <LoadingLogo message="Loading daily defect summary..." />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Daily Defect Summary
        </h2>
        <p className="text-gray-600">Daily defect detection overview</p>
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
              <div className="flex items-center gap-2 text-red-600">
                <TrendingDown className="w-4 h-4" />
                <span className="text-sm font-medium">{day.defectRate}% Defect Rate</span>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{day.totalDefects.toLocaleString()}</div>
                <div className="text-sm text-gray-500">Total Defects</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-500">{day.cracked.toLocaleString()}</div>
                <div className="text-sm text-gray-500">Cracked</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-500">{day.dirty.toLocaleString()}</div>
                <div className="text-sm text-gray-500">Dirty</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-500">{day.broken.toLocaleString()}</div>
                <div className="text-sm text-gray-500">Broken</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-pink-500">{day.deformed.toLocaleString()}</div>
                <div className="text-sm text-gray-500">Deformed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{day.defectRate}%</div>
                <div className="text-sm text-gray-500">Defect Rate</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {summaryData.length === 0 && (
        <div className="text-center py-12">
          <Bug className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-medium text-gray-500">No daily defect summary available</p>
          <p className="text-sm text-gray-400">Data will appear when defects are detected</p>
        </div>
      )}
    </div>
  );
}
