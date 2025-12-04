"use client";

import { useState, useEffect } from "react";
import { Navbar } from "../components/NavBar";
import { Header } from "../components/Header";
import { getUserNotifications, markNotificationAsRead, deleteNotification, markAllNotificationsAsRead } from "../../lib/notifications/NotificationsService";
import { getUserAccountId } from "../../utils/auth-utils";
import { Bell, BellOff, Check, Trash, CheckCheck, LogIn, Building2, User, Mail, Phone, MapPin, Calendar, Image as ImageIcon, Lock, Settings, Download, AlertTriangle, RefreshCw, Filter, Shield } from "lucide-react";
import Image from "next/image";
import LoadingLogo from "../components/LoadingLogo";
import { useLoadingDelay } from "../components/useLoadingDelay";

export default function NotificationPage() {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const showLoading = useLoadingDelay(loading, 500);

  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const accountId = getUserAccountId();
        if (accountId) {
          const userNotifications = await getUserNotifications(accountId, 100); // Get up to 100 notifications
          setNotifications(userNotifications);
        }
      } catch (error) {
        console.error("Error loading notifications:", error);
      } finally {
        setLoading(false);
      }
    };

    loadNotifications();

    // Set up a refresh interval
    const intervalId = setInterval(loadNotifications, 30000); // Refresh every 30 seconds

    return () => clearInterval(intervalId);
  }, []);

  const handleMarkAsRead = async (notificationId) => {
    try {
      await markNotificationAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((notif) =>
          notif.id === notificationId ? { ...notif, read: true } : notif
        )
      );
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const handleDelete = async (notificationId) => {
    try {
      await deleteNotification(notificationId);
      setNotifications((prev) => prev.filter((notif) => notif.id !== notificationId));
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const accountId = getUserAccountId();
      if (accountId) {
        await markAllNotificationsAsRead(accountId);
        setNotifications((prev) => prev.map((notif) => ({ ...notif, read: true })));
      }
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;

    return date.toLocaleDateString();
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

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
          <div className="bg-white border border-gray-300 rounded-2xl shadow p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Bell className="w-6 h-6 text-[#105588]" />
                <h1 className="text-2xl font-bold text-[#1F2421]">Notifications</h1>
                {unreadCount > 0 && (
                  <span className="px-3 py-1 bg-[#105588] text-white text-sm font-semibold rounded-full">
                    {unreadCount} new
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors duration-200 text-sm font-semibold"
                >
                  <CheckCheck className="w-4 h-4" />
                  Mark all as read
                </button>
              )}
            </div>

            {/* Loading State */}
            {showLoading ? (
              <div className="py-12">
                <LoadingLogo message="Loading notifications..." />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <BellOff className="w-16 h-16 text-gray-300 mb-4" />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">No notifications</h3>
                <p className="text-gray-500 text-sm">You don&apos;t have any notifications at the moment</p>
              </div>
            ) : (
              <div className="space-y-2">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 rounded-xl border transition-colors duration-200 ${
                      notification.read
                        ? "bg-white border-gray-200"
                        : "bg-blue-50 border-blue-200"
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      {/* Icon Display */}
                      <div className="relative flex-shrink-0">
                        {/* Export notifications - Download icon */}
                        {(notification.icon === "download" || 
                          notification.type === "batch_list_exported" || 
                          notification.type === "batch_details_exported") ? (
                          <div className="w-12 h-12 bg-green-500 flex items-center justify-center rounded-full">
                            <Download className="w-5 h-5 text-white" strokeWidth={2.5} />
                          </div>
                        /* Error/Alert notifications - Alert icon */
                        ) : (notification.icon === "alert" || 
                               notification.type === "batch_export_failed" ||
                               notification.type === "batch_status_update_failed" ||
                               notification.type === "inventory_refresh_failed" ||
                               notification.type === "inventory_load_failed") ? (
                          <div className="w-12 h-12 bg-red-500 flex items-center justify-center rounded-full">
                            <AlertTriangle className="w-5 h-5 text-white" strokeWidth={2.5} />
                          </div>
                        /* Status update - Check icon */
                        ) : (notification.icon === "check" || notification.type === "batch_status_updated") ? (
                          <div className="w-12 h-12 bg-emerald-500 flex items-center justify-center rounded-full">
                            <Check className="w-5 h-5 text-white" strokeWidth={2.5} />
                          </div>
                        ) : notification.icon === "login" ? (
                          <div className="w-12 h-12 bg-[#105588] flex items-center justify-center rounded-full">
                            <LogIn className="w-5 h-5 text-white" strokeWidth={2.5} />
                          </div>
                        ) : notification.icon === "farm" ? (
                          <div className="w-12 h-12 bg-green-500 flex items-center justify-center rounded-full">
                            <Building2 className="w-5 h-5 text-white" strokeWidth={2.5} />
                          </div>
                        ) : notification.icon === "user" ? (
                          <div className="w-12 h-12 bg-blue-500 flex items-center justify-center rounded-full">
                            <User className="w-5 h-5 text-white" strokeWidth={2.5} />
                          </div>
                        ) : notification.icon === "mail" ? (
                          <div className="w-12 h-12 bg-purple-500 flex items-center justify-center rounded-full">
                            <Mail className="w-5 h-5 text-white" strokeWidth={2.5} />
                          </div>
                        ) : notification.icon === "phone" ? (
                          <div className="w-12 h-12 bg-teal-500 flex items-center justify-center rounded-full">
                            <Phone className="w-5 h-5 text-white" strokeWidth={2.5} />
                          </div>
                        ) : notification.icon === "map" ? (
                          <div className="w-12 h-12 bg-orange-500 flex items-center justify-center rounded-full">
                            <MapPin className="w-5 h-5 text-white" strokeWidth={2.5} />
                          </div>
                        ) : notification.icon === "calendar" ? (
                          <div className="w-12 h-12 bg-pink-500 flex items-center justify-center rounded-full">
                            <Calendar className="w-5 h-5 text-white" strokeWidth={2.5} />
                          </div>
                        ) : notification.icon === "image" ? (
                          <div className="w-12 h-12 bg-indigo-500 flex items-center justify-center rounded-full">
                            <ImageIcon className="w-5 h-5 text-white" strokeWidth={2.5} />
                          </div>
                        ) : notification.icon === "lock" ? (
                          <div className="w-12 h-12 bg-red-500 flex items-center justify-center rounded-full">
                            <Lock className="w-5 h-5 text-white" strokeWidth={2.5} />
                          </div>
                        ) : notification.icon === "settings" ? (
                          <div className="w-12 h-12 bg-gray-500 flex items-center justify-center rounded-full">
                            <Settings className="w-5 h-5 text-white" strokeWidth={2.5} />
                          </div>
                        ) : notification.icon === "refresh" ? (
                          <div className="w-12 h-12 bg-blue-500 flex items-center justify-center rounded-full">
                            <RefreshCw className="w-5 h-5 text-white" strokeWidth={2.5} />
                          </div>
                        ) : notification.icon === "filter" ? (
                          <div className="w-12 h-12 bg-yellow-500 flex items-center justify-center rounded-full">
                            <Filter className="w-5 h-5 text-white" strokeWidth={2.5} />
                          </div>
                        ) : (notification.icon === "building" || notification.type === "farm_primary_changed") ? (
                          <div className="w-12 h-12 bg-green-600 flex items-center justify-center rounded-full">
                            <Building2 className="w-5 h-5 text-white" strokeWidth={2.5} />
                          </div>
                        ) : (notification.icon === "shield" || notification.type === "security_session_revoked") ? (
                          <div className="w-12 h-12 bg-red-600 flex items-center justify-center rounded-full">
                            <Shield className="w-5 h-5 text-white" strokeWidth={2.5} />
                          </div>
                        ) : notification.profileImage ? (
                          <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-gray-200">
                            <Image
                              src={notification.profileImage}
                              alt="Profile"
                              fill
                              className="object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-12 h-12 bg-gray-400 flex items-center justify-center rounded-full">
                            <Bell className="w-5 h-5 text-white" strokeWidth={2.5} />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-800 mb-1">{notification.message}</p>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span>{formatDate(notification.createdAt)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {!notification.read && (
                          <button
                            onClick={() => handleMarkAsRead(notification.id)}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Mark as read"
                          >
                            <Check className="w-4 h-4 text-gray-600" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(notification.id)}
                          className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
