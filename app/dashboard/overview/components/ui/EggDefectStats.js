"use client";

import { useState, useEffect } from "react";
import { Bug, AlertTriangle, Clock, Target } from "lucide-react";
import LoadingLogo from "../../../components/LoadingLogo";
import { useLoadingDelay } from "../../../components/useLoadingDelay";
import { EggDefectDonutChart } from "./EggDefectDonutChart";
import { StatItem } from "./StatItem";

// Mock functions - replace with actual implementations
const getMachineLinkedEggDefectStats = async (timeFrame) => {
  return {
    totalDefects: 0,
    totalEggs: 0,
    avgDefectsPerHour: 0,
    mostCommonDefect: "None",
  };
};

const getMachineLinkedEggDefectDistribution = async (timeFrame) => {
  return [];
};

export function EggDefectStats({ timeFrame = "daily" }) {
  const [stats, setStats] = useState({
    totalDefects: 0,
    totalEggs: 0,
    avgDefectsPerHour: 0,
    mostCommonDefect: "None",
  });
  const [segments, setSegments] = useState([]);
  const [loading, setLoading] = useState(true);
  const showLoading = useLoadingDelay(loading, 500);
  const [error, setError] = useState(null);
  const [hasData, setHasData] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [statsData, segmentsData] = await Promise.all([
          getMachineLinkedEggDefectStats(timeFrame),
          getMachineLinkedEggDefectDistribution(timeFrame),
        ]);

        setStats(statsData);
        setSegments(segmentsData);
        setHasData(statsData.totalDefects > 0 || segmentsData.length > 0);
      } catch (err) {
        console.error("Error fetching egg defect stats:", err);
        setError("Failed to load egg defect statistics");
        setHasData(false);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [timeFrame]);

  if (showLoading) {
    return (
      <div className="py-8">
        <LoadingLogo message="Loading defect statistics..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <p className="text-red-600 font-medium">{error}</p>
          <p className="text-red-500 text-sm mt-1">Please try refreshing the page</p>
        </div>
      </div>
    );
  }

  if (!hasData) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <Bug className="w-12 h-12 mx-auto mb-2 text-gray-300" />
          <p className="text-gray-500 font-medium">No defect data available</p>
          <p className="text-gray-400 text-sm mt-1">Data will appear when defects are detected</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Stats Grid */}
      <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatItem
          icon={Bug}
          label="Total Defects"
          value={stats.totalDefects.toLocaleString()}
          color="red"
        />
        <StatItem
          icon={AlertTriangle}
          label="Total Eggs"
          value={stats.totalEggs.toLocaleString()}
          color="blue"
        />
        <StatItem
          icon={Clock}
          label="Defects/Hour"
          value={(stats.avgDefectsPerHour || 0).toFixed(1)}
          color="orange"
        />
        <StatItem
          icon={Target}
          label="Common Defect"
          value={stats.mostCommonDefect}
          color="purple"
        />
      </div>

      {/* Donut Chart */}
      <div className="flex items-center justify-center">
        <EggDefectDonutChart segments={segments} />
      </div>
    </div>
  );
}
