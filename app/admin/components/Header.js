"use client";
import { Bell, Menu, Trash2, X, LogIn, Building2, User, Mail, Phone, MapPin, Calendar, Image as ImageIcon, Lock, Settings, Download, Check, AlertTriangle, RefreshCw, Filter, Shield, MonitorDot, Wifi } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import { auth, db } from "../../config/firebaseConfig.js";
import { doc, getDoc, collection, query, where, getDocs, updateDoc, deleteDoc, onSnapshot } from "firebase/firestore";
import { getUserAccountId, getStoredUser } from "../../utils/auth-utils";

export function Header({ setSidebarOpen }) {
  const pathname = usePathname();
  const [userData, setUserData] = useState({
    username: "",
    email: "",
    profileImageUrl: "",
    fullName: "",
  });
  const router = useRouter();

  const viewProfile = () => {
    router.push("/admin/profile");
  };

  const [showNotificationDropdown, setShowNotificationDropdown] = useState(
    false
  );
  const [notifications, setNotifications] = useState([]);
  const [userId, setUserId] = useState(null);
  const notificationDropdownRef = useRef(null);

  // Close notification dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        notificationDropdownRef.current &&
        !notificationDropdownRef.current.contains(event.target) &&
        showNotificationDropdown
      ) {
        setShowNotificationDropdown(false);
      }
    };

    if (showNotificationDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showNotificationDropdown]);

  useEffect(() => {
    // Function to fetch user data
    const fetchUserData = async (userId) => {
      try {
        // Get accountId from stored user data, fallback to userId
        // The document ID is the accountId (e.g., "MEGG-679622")
        const accountId = getUserAccountId();
        const docId = accountId || userId;
        
        // Real-time user data listener - use accountId as document ID
        const userDocRef = doc(db, "users", docId);
        const unsubscribeUser = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setUserData({
              username: data.username || "User",
              email: data.email || "",
              profileImageUrl: data.profileImageUrl || "/default.png",
              fullName: data.fullName || data.fullname || data.username || "User",
            });
          } else {
            // Handle case where user document doesn't exist
            setUserData({
              username: "User",
              email: "",
              profileImageUrl: "/default.png",
              fullName: "User",
            });
          }
        });

        // Real-time notifications listener - use accountId for notifications query
        const notificationsRef = collection(db, "notifications");
        if (accountId) {
          const notificationsQuery = query(notificationsRef, where("accountId", "==", accountId));
          const unsubscribeNotif = onSnapshot(notificationsQuery, (querySnapshot) => {
            const fetchedNotifications = [];
            querySnapshot.forEach((doc) => {
              fetchedNotifications.push({ id: doc.id, ...doc.data() });
            });
            // Sort by createdAt (newest first)
            fetchedNotifications.sort((a, b) => {
              const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : (a.createdAt ? new Date(a.createdAt) : new Date(0));
              const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : (b.createdAt ? new Date(b.createdAt) : new Date(0));
              return dateB - dateA;
            });
            setNotifications(fetchedNotifications);
          });
          return { unsubscribeUser, unsubscribeNotif };
        } else {
          // No accountId available, return empty notifications
          setNotifications([]);
          return { unsubscribeUser, unsubscribeNotif: null };
        }

        // Return cleanup functions
        return { unsubscribeUser, unsubscribeNotif };
      } catch (error) {
        console.error("Error setting up real-time listeners:", error);
        return { unsubscribeUser: null, unsubscribeNotif: null };
      }
    };

    // Function to check for custom auth user
    const checkCustomAuth = async () => {
      const accountId = getUserAccountId();
      const storedUser = getStoredUser();
      
      if (accountId || storedUser) {
        const userId = storedUser?.uid || auth.currentUser?.uid;
        if (userId) {
          setUserId(userId);
          return await fetchUserData(userId);
        }
      }
      
      const useCustomAuth = localStorage.getItem("useCustomAuth");
      if (useCustomAuth === "true") {
        const customAuthUser = localStorage.getItem("customAuthUser");
        if (customAuthUser) {
          try {
            const user = JSON.parse(customAuthUser);
            setUserId(user.uid);
            return await fetchUserData(user.uid);
          } catch (error) {
            console.error("Error parsing custom auth user:", error);
            // Clear invalid custom auth data
            localStorage.removeItem("customAuthUser");
            localStorage.removeItem("useCustomAuth");
          }
        }
      }
      return { unsubscribeUser: null, unsubscribeNotif: null };
    };

    let unsubscribeNotif = null;
    let unsubscribeUser = null;

    // Listen for Firebase Auth state changes
    const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
      // Clean up previous listeners
      if (unsubscribeNotif) unsubscribeNotif();
      if (unsubscribeUser) unsubscribeUser();

      if (user) {
        setUserId(user.uid);
        const cleanup = await fetchUserData(user.uid);
        unsubscribeUser = cleanup.unsubscribeUser;
        unsubscribeNotif = cleanup.unsubscribeNotif;
      } else {
        // Check for custom auth user
        const cleanup = await checkCustomAuth();
        unsubscribeUser = cleanup.unsubscribeUser;
        unsubscribeNotif = cleanup.unsubscribeNotif;
      }
    });

    // Initial check for custom auth
    checkCustomAuth().then((cleanup) => {
      if (!auth.currentUser) {
        unsubscribeUser = cleanup.unsubscribeUser;
        unsubscribeNotif = cleanup.unsubscribeNotif;
      }
    });

    // Clean up listeners on unmount
    return () => {
      if (unsubscribeNotif) unsubscribeNotif();
      if (unsubscribeUser) unsubscribeUser();
      unsubscribeAuth();
    };
  }, []);

  // Mark all as read function
  const markAllAsRead = async () => {
    if (!userId || notifications.length === 0) return;
    const unread = notifications.filter((n) => !n.read);
    try {
      await Promise.all(
        unread.map((notif) =>
          updateDoc(doc(db, "notifications", notif.id), { read: true })
        )
      );
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read: true }))
      );
    } catch (err) {
      console.error("Error marking all as read:", err);
    }
  };

  // Delete notification function
  const deleteNotification = async (id) => {
    try {
      await deleteDoc(doc(db, "notifications", id));
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      console.error("Error deleting notification:", err);
    }
  };

  // Unread count for badge
  const unreadCount = notifications.filter((n) => !n.read).length;

  const pageName =
    {
      "/admin/overview": "Admin Dashboard",
      "/admin/users": "Users Management",
      "/admin/support": "Support Management",
      "/admin/settings/configuration": "Global Configuration",
    }[pathname] || "Admin Page";
  return (
    <div className="">
      {/* Header */}
      <div className="relative flex items-center justify-between bg-white p-4 md:p-6 rounded-2xl border border-gray-300 shadow">
        {/* left */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg transition-colors duration-150 hover:bg-gray-100"
          >
            <Menu className="w-6 h-6" />
          </button>
          <span className="text-xl  font-bold">{pageName}</span>
        </div>

        {/* right */}
        <div className=" flex items-center gap-2 md:gap-">

          {/* profile */}
          <button
            onClick={viewProfile}
            className="flex items-center gap-2 cursor-pointer rounded-lg"
          >
            {/* image */}
            <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
              {userData?.profileImageUrl ? (
                <Image
                  src={userData.profileImageUrl}
                  alt="Profile"
                  width={32}
                  height={32}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Image
                  src="/default.png"
                  alt="Profile"
                  width={32}
                  height={32}
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            <div className="hidden md:flex flex-col text-start">
              <h1 className="font-medium text-sm">
                {userData.fullName ? userData.fullName.split(' ')[0] : (userData.username ? userData.username.split(' ')[0] : "User")}
              </h1>
              <span className="text-sm text-gray-500">
                {userData.email}
              </span>
            </div>
          </button>

                    {/* notification */}
                    <div className="relative" ref={notificationDropdownRef}>
            <button
              onClick={() => setShowNotificationDropdown((prev) => !prev)}
              className={`p-2 rounded-full transition-all duration-200 cursor-pointer ${
                showNotificationDropdown
                  ? "bg-[#105588] text-white hover:bg-[#0d4470]"
                  : "hover:bg-gray-100"
              }`}
            >
              <Bell className="w-6 h-6" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5 z-10">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>

            {/* notification */}
            {showNotificationDropdown && (
              <>
                {/* Backdrop for mobile modal effect with fade-in animation */}
                <div 
                  className="fixed inset-0 bg-black bg-opacity-20 z-30 sm:hidden animate-fadeIn"
                  onClick={() => setShowNotificationDropdown(false)}
                ></div>
                <div
                  className="
                    fixed top-0 left-0 w-screen h-screen z-40 flex items-start justify-center pt-6
                    sm:absolute sm:top-auto sm:left-auto sm:w-96 sm:h-auto sm:pt-0 sm:right-0 sm:translate-x-0
                    animate-slideDown sm:animate-scaleIn
                  "
                >
                  <div className="rounded-2xl bg-white border border-gray-300 flex flex-col overflow-hidden shadow-2xl w-[95vw] max-w-md sm:w-96">
                    {/* header */}
                    <div className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-300">
                      <div className="flex items-center gap-2">
                        <span className="font-bold">Notifications</span>
                        {unreadCount > 0 && (
                          <div className="bg-red-500 rounded-full text-xs text-white px-2.5 py-1 flex items-center justify-center">
                            {unreadCount > 99 ? "99+" : unreadCount}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          className="text-gray-500 transition-colors duration-150 hover:text-[#105588] cursor-pointer text-sm"
                          onClick={markAllAsRead}
                        >
                          Mark all as read
                        </button>
                        {/* Mobile close button */}
                        <button
                          className="sm:hidden p-1 text-gray-500 transition-colors duration-150 hover:text-gray-700 cursor-pointer"
                          onClick={() => setShowNotificationDropdown(false)}
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                    {/* content */}
                    <div className="flex flex-col max-h-[60vh] overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-4 text-gray-500 text-center">No notifications</div>
                      ) : (
                        notifications.map((notif) => (
                          <div
                            key={notif.id}
                            className="p-3 sm:p-4 flex items-center gap-3 sm:gap-4 cursor-pointer transition-colors duration-150 hover:bg-gray-100 border-b border-gray-300"
                            role="button"
                            tabIndex={0}
                          >
                            {/* image or icon */}
                            <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                              {/* Export notifications - Download icon */}
                              {(notif.icon === "download" || 
                                notif.type === "batch_list_exported" || 
                                notif.type === "batch_details_exported") ? (
                                <div className="w-12 h-12 bg-green-500 flex items-center justify-center rounded-full">
                                  <Download className="w-5 h-5 text-white" strokeWidth={2.5} />
                                </div>
                              /* Error/Alert notifications - Alert icon */
                              ) : (notif.icon === "alert" || 
                                     notif.type === "batch_export_failed" ||
                                     notif.type === "batch_status_update_failed" ||
                                     notif.type === "inventory_refresh_failed" ||
                                     notif.type === "inventory_load_failed") ? (
                                <div className="w-12 h-12 bg-red-500 flex items-center justify-center rounded-full">
                                  <AlertTriangle className="w-5 h-5 text-white" strokeWidth={2.5} />
                                </div>
                              /* Status update - Check icon */
                              ) : (notif.icon === "check" || notif.type === "batch_status_updated") ? (
                                <div className="w-12 h-12 bg-emerald-500 flex items-center justify-center rounded-full">
                                  <Check className="w-5 h-5 text-white" strokeWidth={2.5} />
                                </div>
                              /* Batch deleted - Trash icon */
                              ) : notif.type === "batch_deleted" ? (
                                <div className="w-12 h-12 bg-red-600 flex items-center justify-center rounded-full">
                                  <Trash2 className="w-5 h-5 text-white" strokeWidth={2.5} />
                                </div>
                              ) : notif.icon === "login" ? (
                                <div className="w-12 h-12 bg-[#105588] flex items-center justify-center rounded-full">
                                  <LogIn className="w-5 h-5 text-white" strokeWidth={2.5} />
                                </div>
                              ) : notif.icon === "farm" ? (
                                <div className="w-12 h-12 bg-green-500 flex items-center justify-center rounded-full">
                                  <Building2 className="w-5 h-5 text-white" strokeWidth={2.5} />
                                </div>
                              ) : notif.icon === "user" ? (
                                <div className="w-12 h-12 bg-blue-500 flex items-center justify-center rounded-full">
                                  <User className="w-5 h-5 text-white" strokeWidth={2.5} />
                                </div>
                              ) : notif.icon === "mail" ? (
                                <div className="w-12 h-12 bg-purple-500 flex items-center justify-center rounded-full">
                                  <Mail className="w-5 h-5 text-white" strokeWidth={2.5} />
                                </div>
                              ) : notif.icon === "phone" ? (
                                <div className="w-12 h-12 bg-teal-500 flex items-center justify-center rounded-full">
                                  <Phone className="w-5 h-5 text-white" strokeWidth={2.5} />
                                </div>
                              ) : notif.icon === "map" ? (
                                <div className="w-12 h-12 bg-orange-500 flex items-center justify-center rounded-full">
                                  <MapPin className="w-5 h-5 text-white" strokeWidth={2.5} />
                                </div>
                              ) : notif.icon === "calendar" ? (
                                <div className="w-12 h-12 bg-pink-500 flex items-center justify-center rounded-full">
                                  <Calendar className="w-5 h-5 text-white" strokeWidth={2.5} />
                                </div>
                              ) : notif.icon === "image" ? (
                                <div className="w-12 h-12 bg-indigo-500 flex items-center justify-center rounded-full">
                                  <ImageIcon className="w-5 h-5 text-white" strokeWidth={2.5} />
                                </div>
                              ) : notif.icon === "lock" ? (
                                <div className="w-12 h-12 bg-red-500 flex items-center justify-center rounded-full">
                                  <Lock className="w-5 h-5 text-white" strokeWidth={2.5} />
                                </div>
                              ) : notif.icon === "settings" ? (
                                <div className="w-12 h-12 bg-gray-500 flex items-center justify-center rounded-full">
                                  <Settings className="w-5 h-5 text-white" strokeWidth={2.5} />
                                </div>
                              ) : notif.icon === "refresh" ? (
                                <div className="w-12 h-12 bg-blue-500 flex items-center justify-center rounded-full">
                                  <RefreshCw className="w-5 h-5 text-white" strokeWidth={2.5} />
                                </div>
                              ) : notif.icon === "filter" ? (
                                <div className="w-12 h-12 bg-yellow-500 flex items-center justify-center rounded-full">
                                  <Filter className="w-5 h-5 text-white" strokeWidth={2.5} />
                                </div>
                              ) : (notif.icon === "building" || notif.type === "farm_primary_changed") ? (
                                <div className="w-12 h-12 bg-green-600 flex items-center justify-center rounded-full">
                                  <Building2 className="w-5 h-5 text-white" strokeWidth={2.5} />
                                </div>
                              ) : (notif.icon === "shield" || notif.type === "security_session_revoked") ? (
                                <div className="w-12 h-12 bg-red-600 flex items-center justify-center rounded-full">
                                  <Shield className="w-5 h-5 text-white" strokeWidth={2.5} />
                                </div>
                              ) : (notif.icon === "monitor" && notif.type === "kiosk_connected") ? (
                                <div className="w-12 h-12 bg-blue-600 flex items-center justify-center rounded-full">
                                  <MonitorDot className="w-5 h-5 text-white" strokeWidth={2.5} />
                                </div>
                              ) : (notif.icon === "monitor" && notif.type === "kiosk_disconnected") ? (
                                <div className="w-12 h-12 bg-gray-600 flex items-center justify-center rounded-full">
                                  <MonitorDot className="w-5 h-5 text-white" strokeWidth={2.5} />
                                </div>
                              ) : notif.icon === "wifi" ? (
                                <div className="w-12 h-12 bg-green-600 flex items-center justify-center rounded-full">
                                  <Wifi className="w-5 h-5 text-white" strokeWidth={2.5} />
                                </div>
                              ) : notif.profileImage ? (
                                <Image
                                  src={notif.profileImage}
                                  alt="Profile"
                                  width={48}
                                  height={48}
                                  className="rounded-full object-cover w-12 h-12"
                                />
                              ) : (
                                <div className="w-12 h-12 bg-gray-400 flex items-center justify-center rounded-full">
                                  <Bell className="w-5 h-5 text-white" strokeWidth={2.5} />
                                </div>
                              )}
                            </div>
                            {/* description */}
                            <div className="flex flex-col text-start">
                              <span className="font-bold">
                                {notif.message}
                              </span>
                              <span className="text-xs text-gray-400 mt-1">
                                {notif.createdAt && notif.createdAt.seconds
                                  ? new Date(notif.createdAt.seconds * 1000).toLocaleString()
                                  : notif.createdAt || ""}
                              </span>
                            </div>
                            <button
                              className="ml-auto p-2 text-gray-400 hover:text-red-600"
                              title="Delete notification"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteNotification(notif.id);
                              }}
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                    {/* see all button */}
                    <div className="flex items-center justify-center p-3 sm:p-4 border-t border-gray-200 sticky bottom-0 bg-white">
                      <button 
                        onClick={() => {
                          setShowNotificationDropdown(false);
                          router.push("/dashboard/notifications");
                        }}
                        className="text-center cursor-pointer text-gray-500 transition-colors duration-150 hover:text-[#105588]"
                      >
                        See all notifications
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
