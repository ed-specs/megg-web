"use client";

import { useState, useEffect } from "react";
import { Blend, Egg, Clock, Target } from "lucide-react";
import LoadingLogo from "../../../components/LoadingLogo";
import { useLoadingDelay } from "../../../components/useLoadingDelay";
import { EggSizeDonutChart } from "./EggSizeDonutChart";
import { StatItem } from "./StatItem";
import {
  getMachineLinkedEggSizeStats,
  getMachineLinkedEggSizeDistribution,
} from "../../../../lib/overview/sizing/EggSizeStats";

export function EggSizeStats({ timeFrame = "daily" }) {
  const [stats, setStats] = useState({
    totalEggs: 0,
    totalAllEggs: 0,
    avgEggsPerHour: 0,
    totalDefects: 0,
    mostCommonSize: "None",
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
          getMachineLinkedEggSizeStats(timeFrame),
          getMachineLinkedEggSizeDistribution(timeFrame),
        ]);

        setStats(statsData);
        setSegments(segmentsData);
        setHasData(statsData.totalEggs > 0 || segmentsData.length > 0);
      } catch (err) {
        console.error("Error fetching egg size stats:", err);
        setError("Failed to load egg size statistics");
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
        <LoadingLogo message="Loading egg size statistics..." />
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
          <Egg className="w-12 h-12 mx-auto mb-2 text-gray-300" />
          <p className="text-gray-500 font-medium">No egg size data available</p>
          <p className="text-gray-400 text-sm mt-1">Data will appear when eggs are processed</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Stats Grid */}
      <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatItem
          icon={Egg}
          label="Total Eggs"
          value={stats.totalEggs.toLocaleString()}
          color="blue"
        />
        <StatItem
          icon={Blend}
          label="All Eggs"
          value={stats.totalAllEggs.toLocaleString()}
          color="green"
        />
        <StatItem
          icon={Clock}
          label="Avg/Hour"
          value={(stats.avgEggsPerHour || 0).toFixed(1)}
          color="purple"
        />
        <StatItem
          icon={Target}
          label="Common Size"
          value={stats.mostCommonSize}
          color="orange"
        />
      </div>

      {/* Donut Chart */}
      <div className="flex items-center justify-center">
        <EggSizeDonutChart segments={segments} />
      </div>
    </div>
  );
}
