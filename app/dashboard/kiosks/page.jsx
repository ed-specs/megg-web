//D:\CAPSTONE\megg-web-tech\app\dashboard\kiosks

"use client";

import { useState, useEffect } from "react";
import { Navbar } from "../components/NavBar";
import { Header } from "../components/Header";
import { 
  MonitorDot, 
  MonitorX, 
  User, 
  Clock, 
  Activity,
  AlertCircle,
  Loader2
} from "lucide-react";
import { 
  listenToActiveKioskSessions,
  isHeartbeatStale,
  formatTimestamp,
  getTimeAgo
} from "../../lib/kiosks/kioskSessions";
import { auth, db } from "../../config/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import { getCurrentUser, getStoredUser } from "../../utils/auth-utils";

export default function KiosksPage() {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterMode, setFilterMode] = useState("all"); // "all" or "mine"
  const [currentUserId, setCurrentUserId] = useState(null);

  // Reactive auth state: Listen to Firebase Auth and fetch user data
  // This ensures the component re-renders if the user's account ID changes
  useEffect(() => {
    const fetchUserAccountId = async (userId) => {
      try {
        const docRef = doc(db, "users", userId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          const accountId = data.accountId || null;
          setCurrentUserId(accountId);
          console.log("📋 Current user account ID:", accountId);
        } else {
          setCurrentUserId(null);
        }
      } catch (error) {
        console.error("Error fetching user account ID:", error);
        setCurrentUserId(null);
      }
    };

    // Check for custom auth user immediately
    const checkCustomAuth = () => {
      const useCustomAuth = localStorage.getItem("useCustomAuth");
      if (useCustomAuth === "true") {
        const customAuthUser = localStorage.getItem("customAuthUser");
        if (customAuthUser) {
          try {
            const user = JSON.parse(customAuthUser);
            fetchUserAccountId(user.uid);
          } catch (error) {
            console.error("Error parsing custom auth user:", error);
            setCurrentUserId(null);
          }
        }
      }
    };

    // Check custom auth immediately
    checkCustomAuth();

    // Listen for Firebase Auth state changes (reactive)
    const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
      if (user) {
        await fetchUserAccountId(user.uid);
      } else {
        // Check for custom auth user
        const useCustomAuth = localStorage.getItem("useCustomAuth");
        if (useCustomAuth === "true") {
          const customAuthUser = localStorage.getItem("customAuthUser");
          if (customAuthUser) {
            try {
              const customUser = JSON.parse(customAuthUser);
              await fetchUserAccountId(customUser.uid);
            } catch (error) {
              console.error("Error parsing custom auth user:", error);
              setCurrentUserId(null);
            }
          }
        } else {
          setCurrentUserId(null);
        }
      }
    });

    return () => {
      unsubscribeAuth();
    };
  }, []);

  // Set up real-time listener for active kiosk sessions
  useEffect(() => {
    setLoading(true);
    
    const unsubscribe = listenToActiveKioskSessions((activeSessions) => {
      setSessions(activeSessions);
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Filter sessions based on filter mode
  const filteredSessions = filterMode === "mine" && currentUserId
    ? sessions.filter(session => session.userId === currentUserId)
    : sessions;

  // Count active sessions for current user
  const myActiveSessionCount = currentUserId
    ? sessions.filter(session => session.userId === currentUserId).length
    : 0;

  // Count stale sessions (heartbeat older than 5 minutes)
  const staleSessions = filteredSessions.filter(session => isHeartbeatStale(session.lastHeartbeat));
  const staleSessionCount = staleSessions.length;

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
      <div className="flex gap-6 p-4 md:p-6">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block">
          <Navbar />
        </div>

        <div className="flex flex-1 flex-col gap-6 w-full">
          {/* Header */}
          <Header setSidebarOpen={setSidebarOpen} />

          {/* Main container */}
          <div className="flex flex-col gap-6">
            {/* Page Title and Stats */}
            <div className="bg-white rounded-2xl border border-gray-300 p-6 shadow">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-[#105588] flex items-center gap-2">
                    <MonitorDot className="w-7 h-7" />
                    Active Kiosks
                  </h1>
                  <p className="text-gray-600 mt-1">
                    Monitor real-time kiosk connections and activity
                  </p>
                </div>
                
                {/* Stats Cards */}
                <div className="flex gap-4">
                  <div className="bg-blue-50 rounded-lg px-4 py-3 border border-blue-200">
                    <div className="text-sm text-gray-600">Total Active</div>
                    <div className="text-2xl font-bold text-[#105588]">
                      {sessions.length}
                    </div>
                  </div>
                  
                  {currentUserId && (
                    <div className="bg-green-50 rounded-lg px-4 py-3 border border-green-200">
                      <div className="text-sm text-gray-600">My Sessions</div>
                      <div className="text-2xl font-bold text-green-600">
                        {myActiveSessionCount}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Filter Buttons */}
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => setFilterMode("all")}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    filterMode === "all"
                      ? "bg-[#105588] text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  All Sessions
                </button>
                <button
                  onClick={() => setFilterMode("mine")}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    filterMode === "mine"
                      ? "bg-[#105588] text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  My Sessions
                </button>
              </div>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="bg-white rounded-2xl border border-gray-300 p-12 shadow flex justify-center items-center">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-8 h-8 text-[#105588] animate-spin" />
                  <p className="text-gray-600">Loading kiosk sessions...</p>
                </div>
              </div>
            )}

            {/* Stale Sessions Warning Banner */}
            {!loading && staleSessionCount > 0 && (
              <div className="bg-yellow-50 rounded-2xl border-2 border-yellow-300 p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-yellow-900 mb-1">
                      ⚠️ Stale Sessions Detected
                    </h3>
                    <p className="text-sm text-yellow-800">
                      {staleSessionCount} {staleSessionCount === 1 ? 'session has' : 'sessions have'} not sent a heartbeat in over 5 minutes. 
                      {staleSessionCount === 1 ? ' This kiosk' : ' These kiosks'} may be offline, disconnected, or experiencing network issues.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Sessions Table */}
            {!loading && filteredSessions.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-300 shadow overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                          Status
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                          Kiosk ID
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                          User
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                          Connected
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                          Last Heartbeat
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredSessions.map((session) => {
                        const isStale = isHeartbeatStale(session.lastHeartbeat);
                        const isMySession = currentUserId && session.userId === currentUserId;
                        
                        return (
                          <tr 
                            key={session.id} 
                            className={`hover:bg-gray-50 transition-colors ${
                              isMySession ? "bg-blue-50/50" : ""
                            }`}
                          >
                            {/* Status */}
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                {isStale ? (
                                  <>
                                    <AlertCircle className="w-5 h-5 text-yellow-500" />
                                    <span className="text-sm text-yellow-600 font-medium">
                                      Stale
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <Activity className="w-5 h-5 text-green-500 animate-pulse" />
                                    <span className="text-sm text-green-600 font-medium">
                                      Active
                                    </span>
                                  </>
                                )}
                              </div>
                            </td>

                            {/* Kiosk ID */}
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <MonitorDot className="w-4 h-4 text-gray-500" />
                                <span className="font-mono text-sm font-medium text-gray-900">
                                  {session.kioskId}
                                </span>
                                {isMySession && (
                                  <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
                                    You
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* User */}
                            <td className="px-6 py-4">
                              <div className="flex flex-col">
                                <div className="flex items-center gap-2">
                                  <User className="w-4 h-4 text-gray-500" />
                                  <span className="font-medium text-gray-900">
                                    {session.userName}
                                  </span>
                                </div>
                                <span className="text-sm text-gray-500 ml-6">
                                  {session.userEmail}
                                </span>
                                <span className="text-xs text-gray-400 ml-6 font-mono">
                                  ID: {session.userId}
                                </span>
                              </div>
                            </td>

                            {/* Connected Time */}
                            <td className="px-6 py-4">
                              <div className="flex flex-col">
                                <div className="flex items-center gap-2">
                                  <Clock className="w-4 h-4 text-gray-500" />
                                  <span className="text-sm text-gray-900">
                                    {getTimeAgo(session.startTime)}
                                  </span>
                                </div>
                                <span className="text-xs text-gray-500 ml-6">
                                  {formatTimestamp(session.startTime)}
                                </span>
                              </div>
                            </td>

                            {/* Last Heartbeat */}
                            <td className="px-6 py-4">
                              <div className="flex flex-col">
                                <div className="flex items-center gap-2">
                                  <Activity className="w-4 h-4 text-gray-500" />
                                  <span className={`text-sm ${
                                    isStale ? "text-yellow-600" : "text-gray-900"
                                  }`}>
                                    {getTimeAgo(session.lastHeartbeat)}
                                  </span>
                                </div>
                                <span className="text-xs text-gray-500 ml-6">
                                  {formatTimestamp(session.lastHeartbeat)}
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Empty State */}
            {!loading && filteredSessions.length === 0 && (
              <div className="bg-white rounded-2xl border border-gray-300 p-12 shadow">
                <div className="flex flex-col items-center gap-4 text-center">
                  <MonitorX className="w-16 h-16 text-gray-300" />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-700">
                      {filterMode === "mine" ? "No Active Sessions" : "No Kiosks Connected"}
                    </h3>
                    <p className="text-gray-500 mt-1">
                      {filterMode === "mine"
                        ? "You don't have any active kiosk sessions at the moment."
                        : "There are no active kiosk connections right now."}
                    </p>
                  </div>
                  {filterMode === "mine" && sessions.length > 0 && (
                    <button
                      onClick={() => setFilterMode("all")}
                      className="mt-2 px-4 py-2 bg-[#105588] text-white rounded-lg hover:bg-[#0d4570] transition-colors"
                    >
                      View All Sessions
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Info Card */}
            <div className="bg-blue-50 rounded-2xl border border-blue-200 p-6">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900">
                  <p className="font-semibold mb-1">About Kiosk Sessions</p>
                  <ul className="list-disc list-inside space-y-1 text-blue-800">
                    <li>Sessions update automatically in real-time</li>
                    <li>Heartbeat updates every 60 seconds while kiosk is active</li>
                    <li>Sessions marked as "Stale" if no heartbeat for 5+ minutes</li>
                    <li>Sessions end automatically when user logs out or closes browser</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

