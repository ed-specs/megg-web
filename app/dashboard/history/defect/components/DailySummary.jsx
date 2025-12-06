"use client";

import { useState, useEffect } from "react";
import { Calendar, Bug, TrendingUp, Clock } from "lucide-react";
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
};

export default function DailySummary() {
  const [loading, setLoading] = useState(true);
  const showLoading = useLoadingDelay(loading, 500);
  const [summaryData, setSummaryData] = useState([]);

  useEffect(() => {
    const fetchDailySummary = async () => {
      try {
        setLoading(true);
        
        const accountId = getUserAccountId();
        if (!accountId) {
          setLoading(false);
          return;
        }

        // Get today's date in YYYY-MM-DD format
        const today = new Date();
        const todayKey = today.toISOString().split('T')[0];

        // Fetch all eggs for this account
        const eggsRef = collection(db, "eggs");
        const q = query(eggsRef, where("accountId", "==", accountId));
        const querySnapshot = await getDocs(q);

        // Initialize today's data
        const todayData = {
          date: todayKey,
          totalDefects: 0,
          cracked: 0,
          dirty: 0
        };
        
        querySnapshot.forEach((doc) => {
          const egg = doc.data();
          // Only include cracked and dirty eggs for defect daily summary
          if (!egg.quality || (egg.quality !== 'cracked' && egg.quality !== 'dirty')) {
            return;
          }
          
          if (!egg.createdAt) return;
          
          const date = new Date(egg.createdAt);
          const dateKey = date.toISOString().split('T')[0];
          
          // Only process defects from today
          if (dateKey === todayKey) {
            todayData.totalDefects++;
            
            // Count by defect type
            if (egg.quality === 'cracked') todayData.cracked++;
            else if (egg.quality === 'dirty') todayData.dirty++;
          }
        });

        // Only include today's data if there are defects
        const summary = todayData.totalDefects > 0 
          ? [todayData]
          : [];

        setSummaryData(summary);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching daily defect summary:", error);
        setLoading(false);
      }
    };

    fetchDailySummary();
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
          Daily Summary
        </h2>
        <p className="text-gray-600">Daily defect detection overview</p>
      </div>

      {summaryData.length > 0 ? (
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
                <div className="flex items-center gap-2" style={{ color: COLORS.brightOrange }}>
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-sm font-medium">{day.totalDefects} Defects</span>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold" style={{ color: COLORS.brightOrange }}>{day.totalDefects.toLocaleString()}</div>
                  <div className="text-sm text-gray-500">Total Defects</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold" style={{ color: COLORS.brightOrange }}>{day.cracked.toLocaleString()}</div>
                  <div className="text-sm text-gray-500">Cracked</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold" style={{ color: COLORS.tan }}>{day.dirty.toLocaleString()}</div>
                  <div className="text-sm text-gray-500">Dirty</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-medium text-gray-500">No summary for today</p>
          <p className="text-sm text-gray-400">Data will appear when defects are detected today</p>
        </div>
      )}
    </div>
  );
}
