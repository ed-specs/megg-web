"use client";

import { useState } from "react";
import { TotalEggDefectChart } from "./ui/TotalEggDefectChart";
import { TotalEggsChart } from "./ui/TotalEggsChart";
import { Egg, Bug } from "lucide-react";
import { EggSizeStats } from "./ui/EggSizeStats";
import { EggDefectStats } from "./ui/EggDefectStats";

export default function EggCharts() {
  const [timeFrame, setTimeFrame] = useState("daily");
  const [activeTab, setActiveTab] = useState("sizing"); // "sizing" or "defects"

  return (
    <div className="flex flex-col flex-1 gap-6">
      {/* Toggle Buttons */}
      <div className="flex items-center justify-center gap-4">
        <button
          className={`rounded-2xl border md:px-8 md:py-4 p-4 flex items-center gap-2 transition-colors duration-150 ${
            activeTab === "sizing"
              ? "bg-blue-500 text-white hover:bg-blue-600"
              : "bg-white hover:bg-gray-200"
          }`}
          onClick={() => setActiveTab("sizing")}
        >
          <Egg className="w-5 h-5" />
          Egg Sizing
        </button>

        <button
          className={`rounded-2xl border md:px-8 md:py-4 p-4 flex items-center gap-2 transition-colors duration-150 ${
            activeTab === "defects"
              ? "bg-blue-500 text-white hover:bg-blue-600"
              : "bg-white hover:bg-gray-200"
          }`}
          onClick={() => setActiveTab("defects")}
        >
          <Bug className="w-5 h-5" />
          Egg Defects
        </button>
      </div>

      {/* Overview Card */}
      <div className="flex flex-1 flex-col gap-6 bg-white p-6 rounded-2xl border shadow">
        {/* Header */}
        <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
          {/* Dynamic Title */}
          <h3 className="text-xl font-medium">
            {activeTab === "sizing"
              ? "Egg Size Overview"
              : "Egg Defect Overview"}
          </h3>

          {/* Time Frame Selector */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Time Frame:</label>
            <select
              value={timeFrame}
              onChange={(e) => setTimeFrame(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
        </div>

        {/* Content based on active tab */}
        {activeTab === "sizing" ? (
          <div className="flex flex-col gap-6">
            {/* Stats */}
            <EggSizeStats timeFrame={timeFrame} />
            
            {/* Chart */}
            <TotalEggsChart timeFrame={timeFrame} />
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {/* Stats */}
            <EggDefectStats timeFrame={timeFrame} />
            
            {/* Chart */}
            <TotalEggDefectChart timeFrame={timeFrame} />
          </div>
        )}
      </div>
    </div>
  );
}
