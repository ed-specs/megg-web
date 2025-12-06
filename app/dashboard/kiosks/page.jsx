//D:\CAPSTONE\megg-web-tech\app\dashboard\kiosks

"use client";

import { useState, useEffect } from "react";
import { Navbar } from "../components/NavBar";
import { Header } from "../components/Header";
import { 
  MonitorDot, 
  MonitorX, 
  Clock, 
  Activity,
  AlertCircle
} from "lucide-react";
import { 
  listenToUserKioskSession,
  isHeartbeatStale,
  formatTimestamp,
  getTimeAgo
} from "../../lib/kiosks/kioskSessions";
import { getUserAccountId } from "../../utils/auth-utils";
import LoadingLogo from "../components/LoadingLogo";
import { useLoadingDelay } from "../components/useLoadingDelay";

export default function KiosksPage() {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const showLoading = useLoadingDelay(loading, 500);
  const [currentUserId, setCurrentUserId] = useState(null);

  // Get current user's account ID from localStorage
  useEffect(() => {
    const accountId = getUserAccountId();
    setCurrentUserId(accountId);
    if (process.env.NODE_ENV !== 'production') {
      console.log("📋 Current user account ID:", accountId);
    }
  }, []);

  // Set up real-time listener for current user's kiosk session
  useEffect(() => {
    if (!currentUserId) {
      setSession(null);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    
    const unsubscribe = listenToUserKioskSession(currentUserId, (userSession) => {
      if (process.env.NODE_ENV !== 'production') {
        console.log("📊 Kiosk session update received:", userSession);
      }
      
      // Only show if session is active
      if (userSession && userSession.status === "active") {
        if (process.env.NODE_ENV !== 'production') {
          console.log("✅ Active session found:", userSession.kioskId);
        }
        setSession(userSession);
      } else {
        if (process.env.NODE_ENV !== 'production') {
          console.log("❌ No active session or session is disconnected");
        }
        setSession(null);
      }
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, [currentUserId]);

  // Check if current session is stale
  const isStale = session ? isHeartbeatStale(session.lastHeartbeat) : false;

  return (
    <div className="min-h-screen container mx-auto text-[#1F2421] relative">
      {/* Backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-opacity lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <div
        className={`fixed z-50 inset-y-0 left-0 w-80 bg-white transform shadow-lg transition-transform duration-300 ease-in-out lg:hidden ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Navbar />
      </div>

      {/* MAIN */}
      <div className="flex gap-4 md:gap-6 p-3 md:p-4 lg:p-6">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block">
          <Navbar />
        </div>

        <div className="flex flex-1 flex-col gap-4 sm:gap-6 w-full min-w-0">
          {/* Header */}
          <Header setSidebarOpen={setSidebarOpen} />

          {/* Main container */}
          <div className="flex flex-col gap-4 sm:gap-6">
            {/* Loading State */}
            {showLoading ? (
              <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-300 p-3 sm:p-4 md:p-6">
                <div className="py-12">
                  <LoadingLogo message="Loading kiosk session..." size="lg" />
                </div>
              </div>
            ) : (
              <>
            {/* Header Card */}
            <div className="bg-white rounded-2xl border border-gray-300 p-4 md:p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                <div className="min-w-0">
                  <h1 className="text-xl md:text-2xl font-bold text-gray-900">
                    Active Kiosk
                  </h1>
                  <p className="text-gray-600 text-sm mt-1">
                    Monitor your kiosk connection status
                  </p>
                </div>
              </div>
            </div>

            {/* Stale Session Warning Banner */}
            {session && isStale && (
              <div className="bg-yellow-50 rounded-xl sm:rounded-2xl border-2 border-yellow-300 p-3 sm:p-4 shadow-sm">
                <div className="flex items-start gap-2 sm:gap-3">
                  <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-yellow-900 mb-1 text-sm sm:text-base">
                      ⚠️ Connection Issue Detected
                    </h3>
                    <p className="text-xs sm:text-sm text-yellow-800">
                      Your kiosk has not sent a heartbeat in over 5 minutes. 
                      The kiosk may be offline, disconnected, or experiencing network issues.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Session Display */}
            {session && (
              <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-300 p-4 sm:p-6 shadow">
                {/* Status Badge */}
                <div className="flex items-center gap-2 mb-4 sm:mb-6">
                  {isStale ? (
                    <>
                      <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-500" />
                      <span className="text-sm sm:text-base text-yellow-600 font-semibold">Connection Stale</span>
                    </>
                  ) : (
                    <>
                      <Activity className="w-5 h-5 sm:w-6 sm:h-6 text-green-500 animate-pulse" />
                      <span className="text-sm sm:text-base text-green-600 font-semibold">Kiosk Connected</span>
                    </>
                  )}
                </div>

                {/* Session Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                  {/* Kiosk ID */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <MonitorDot className="w-4 h-4 text-gray-500" />
                      <span className="text-xs sm:text-sm text-gray-500">Kiosk ID</span>
                    </div>
                    <p className="font-mono text-sm sm:text-base font-semibold text-gray-900 break-all">
                      {session.kioskId}
                    </p>
                  </div>

                  {/* Connected Time */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <span className="text-xs sm:text-sm text-gray-500">Connected</span>
                    </div>
                    <p className="text-sm sm:text-base text-gray-900 font-semibold">
                      {getTimeAgo(session.startTime)}
                    </p>
                    <p className="text-xs text-gray-400">
                      {formatTimestamp(session.startTime)}
                    </p>
                  </div>

                  {/* Last Heartbeat */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-gray-500" />
                      <span className="text-xs sm:text-sm text-gray-500">Last Heartbeat</span>
                    </div>
                    <p className={`text-sm sm:text-base font-semibold ${
                      isStale ? "text-yellow-600" : "text-gray-900"
                    }`}>
                      {getTimeAgo(session.lastHeartbeat)}
                    </p>
                    <p className="text-xs text-gray-400">
                      {formatTimestamp(session.lastHeartbeat)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Empty State */}
            {!showLoading && !session && (
              <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-300 p-8 sm:p-12 shadow">
                <div className="flex flex-col items-center gap-3 sm:gap-4 text-center">
                  <MonitorX className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300" />
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold text-gray-700">
                      No Kiosk Connected
                    </h3>
                    <p className="text-gray-500 mt-1 text-sm sm:text-base">
                      You don&apos;t have an active kiosk session at the moment.
                    </p>
                    <p className="text-gray-400 mt-2 text-xs sm:text-sm">
                      Log in to a kiosk to see your session details here.
                    </p>
                  </div>
                </div>
              </div>
            )}

              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

