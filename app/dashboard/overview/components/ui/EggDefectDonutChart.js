"use client";

import { useState } from "react";

export function EggDefectDonutChart({ segments = [] }) {
  const [hoveredSegment, setHoveredSegment] = useState(null);

  if (!segments || segments.length === 0) {
    return (
      <div className="flex items-center justify-center w-48 h-48 bg-gray-50 rounded-full">
        <p className="text-gray-400 text-sm">No data</p>
      </div>
    );
  }

  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  const radius = 70;
  const strokeWidth = 20;
  const normalizedRadius = radius - strokeWidth * 0.5;
  const circumference = normalizedRadius * 2 * Math.PI;

  let cumulativePercentage = 0;

  const colors = {
    Cracked: "#EF4444",     // Red
    Dirty: "#F59E0B",       // Yellow
    Broken: "#F97316",      // Orange
    Undersized: "#3B82F6",  // Blue
    Oversized: "#8B5CF6",   // Purple
    Deformed: "#EC4899",    // Pink
  };

  return (
    <div className="relative w-48 h-48">
      <svg
        height={radius * 2}
        width={radius * 2}
        className="transform -rotate-90"
      >
        <circle
          stroke="#E5E7EB"
          fill="transparent"
          strokeWidth={strokeWidth}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        
        {segments.map((segment, index) => {
          const percentage = (segment.value / total) * 100;
          const strokeDasharray = `${percentage * circumference / 100} ${circumference}`;
          const strokeDashoffset = -cumulativePercentage * circumference / 100;
          
          cumulativePercentage += percentage;

          return (
            <circle
              key={segment.label}
              stroke={colors[segment.label] || "#6B7280"}
              fill="transparent"
              strokeWidth={hoveredSegment === index ? strokeWidth + 4 : strokeWidth}
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              r={normalizedRadius}
              cx={radius}
              cy={radius}
              className="cursor-pointer transition-all duration-200"
              onMouseEnter={() => setHoveredSegment(index)}
              onMouseLeave={() => setHoveredSegment(null)}
            />
          );
        })}
      </svg>

      {/* Center text */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">
            {total.toLocaleString()}
          </div>
          <div className="text-sm text-gray-500">Defects</div>
        </div>
      </div>

      {/* Legend */}
      <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 translate-y-full">
        <div className="flex flex-wrap justify-center gap-2 mt-4">
          {segments.map((segment, index) => (
            <div
              key={segment.label}
              className="flex items-center gap-1 text-xs"
            >
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: colors[segment.label] || "#6B7280" }}
              />
              <span className="text-gray-600">
                {segment.label} ({segment.value})
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Hover tooltip */}
      {hoveredSegment !== null && (
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-full bg-black text-white px-2 py-1 rounded text-xs whitespace-nowrap">
          {segments[hoveredSegment].label}: {segments[hoveredSegment].value} ({((segments[hoveredSegment].value / total) * 100).toFixed(1)}%)
        </div>
      )}
    </div>
  );
}
