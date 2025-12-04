//D:\CAPSTONE\megg-web-tech\app\dashboard\components\NavBar.js

"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  LayoutDashboard,
  CircleUserRound,
  Settings,
  DoorOpen,
  Package,
  FolderClock,
  ChevronDown,
  ChevronUp,
  ArrowUpNarrowWide,
  Bug,
  Bell,
  UserPen,
  KeyRound,
  MonitorCog,
  Shield,
  User,
  LogOut,
  MonitorDot,
} from "lucide-react";
import { auth, db } from "../../config/firebaseConfig.js";
import { doc, getDoc } from "firebase/firestore";
import { signOutUser, debugAuthState } from "../../utils/auth-utils";
import NotificationMobile from "../../components/ui/NotificationMobile.js";
import { saveInAppNotification } from "../../utils/notification-utils";
import { listenToUserKioskSession } from "../../lib/kiosks/kioskSessions.js";

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [historyDropdown, setHistoryDropdown] = useState(false);
  const [manageAccountDropdown, setManageAccountDropdown] = useState(false);

  const [userData, setUserData] = useState({
    username: "",
    email: "",
    profileImageUrl: "",
    accountId: "",
  });
  const [kioskSession, setKioskSession] = useState(null);
  const profileRef = useRef(null);

  useEffect(() => {
    // NOTE: This effect handles both Firebase Auth and custom localStorage auth.
    // Consider refactoring to use a centralized auth service/hook for better maintainability.
    
    // Function to fetch user data
    const fetchUserData = async (userId) => {
      try {
        const docRef = doc(db, "users", userId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setUserData({
            username: data.username || "User",
            email: data.email || "",
            profileImageUrl: data.profileImageUrl || "/default.png",
            accountId: data.accountId || "",
          });
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    // Immediate check for custom auth user on component mount
    const checkCustomAuth = () => {
      const useCustomAuth = localStorage.getItem("useCustomAuth");
      if (useCustomAuth === "true") {
        const customAuthUser = localStorage.getItem("customAuthUser");
        if (customAuthUser) {
          try {
            const user = JSON.parse(customAuthUser);
            fetchUserData(user.uid);
          } catch (error) {
            console.error("Error parsing custom auth user:", error);
            // Clear invalid custom auth data
            localStorage.removeItem("customAuthUser");
            localStorage.removeItem("useCustomAuth");
          }
        }
      }
    };

    // Check for custom auth immediately
    checkCustomAuth();

    // Debug auth state
    debugAuthState();

    // Listen for Firebase Auth state changes
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        await fetchUserData(user.uid);
      } else {
        // Check for custom auth user
        const useCustomAuth = localStorage.getItem("useCustomAuth");
        if (useCustomAuth === "true") {
          const customAuthUser = localStorage.getItem("customAuthUser");
          if (customAuthUser) {
            try {
              const user = JSON.parse(customAuthUser);
              await fetchUserData(user.uid);
            } catch (error) {
              console.error("Error parsing custom auth user:", error);
              // Clear invalid custom auth data
              localStorage.removeItem("customAuthUser");
              localStorage.removeItem("useCustomAuth");
              setUserData({
                username: "",
                email: "",
                profileImageUrl: "",
                accountId: "",
              });
            }
          }
        } else {
          // No user authenticated
          setUserData({
            username: "",
            email: "",
            profileImageUrl: "",
            accountId: "",
          });
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Listen to kiosk session for current user
  useEffect(() => {
    if (!userData.accountId) {
      setKioskSession(null);
      return;
    }

    // Set up real-time listener for user's kiosk session
    const unsubscribe = listenToUserKioskSession(userData.accountId, (session) => {
      if (session && session.status === "active") {
        setKioskSession(session);
      } else {
        setKioskSession(null);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [userData.accountId]);

  const toggleProfileMenu = () => {
    setProfileOpen((prev) => !prev);
  };

  const handleSignOut = async () => {
    try {
      // Create logout notification before signing out
      await saveInAppNotification(
        "You have successfully signed out of your account.",
        "logout"
      );
      
      await signOutUser();
      router.push("/login"); // Redirect to login page after sign out
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const isActive = (href) => pathname === href;

  const menus = [
    { name: "Dashboard", href: "/dashboard/overview", icon: LayoutDashboard },
    { name: "Inventory", href: "/dashboard/inventory", icon: Package },
    { name: "Kiosk", href: "/dashboard/kiosks", icon: MonitorDot, badge: kioskSession ? "Connected" : null },
  ];

  const historyLinks = [
    {
      name: "Sort history",
      href: "/dashboard/history/sort",
      icon: ArrowUpNarrowWide,
    },
    {
      name: "Defect history",
      href: "/dashboard/history/defect",
      icon: Bug,
    },
  ];

  const manageAccountLinks = [
    {
      name: "Edit profile",
      href: "/dashboard/settings/edit-profile",
      icon: UserPen,
    },
    {
      name: "Change password",
      href: "/dashboard/settings/change-password",
      icon: KeyRound,
    },
    {
      name: "Security",
      href: "/dashboard/settings/security",
      icon: Shield,
    },
    {
      name: "Preferences",
      href: "/dashboard/settings/preferences",
      icon: MonitorCog,
    },
  ];

  return (
    <div className="w-full max-w-xs text-[#1F2421]">
      <div className="flex flex-col lg:border border-gray-300 lg:shadow p-6 rounded-2xl gap-6 bg-white">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <Image
            src="/logo.png"
            alt="MEGG Logo"
            width={50}
            height={50}
          />
          <div className="flex flex-col">
            <h1 className="text-2xl font-bold text-[#105588]">MEGG</h1>
            <span className="text-gray-500 text-xs">
              Smart Egg Defect Detection and Sorting
            </span>
          </div>
        </div>

        {/* Menus */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <span className="text-sm font-bold text-gray-500">Menus</span>
            {menus.map(({ name, href, icon: Icon, badge }) => (
              <Link
                key={name}
                href={href}
                className={`flex items-center justify-between gap-2 px-4 py-2 rounded-lg transition-colors duration-150 ${
                  isActive(href)
                    ? "bg-[#105588] text-white"
                    : "hover:bg-gray-100"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon className="w-5 h-5" />
                  {name}
                </div>
                {badge && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    isActive(href)
                      ? "bg-white/20 text-white"
                      : "bg-green-100 text-green-700"
                  }`}>
                    {badge}
                  </span>
                )}
              </Link>
            ))}

            {/* History Dropdown */}
            <button
              onClick={() => setHistoryDropdown((prev) => !prev)}
              className="flex items-center justify-between px-4 py-2 rounded-lg transition-colors duration-150 cursor-pointer hover:bg-gray-100"
            >
              <div className="flex items-center gap-2">
                <FolderClock className="w-5 h-5" />
                History
              </div>
              {historyDropdown ? (
                <ChevronUp className="w-5 h-5" />
              ) : (
                <ChevronDown className="w-5 h-5" />
              )}
            </button>

            {historyDropdown && (
              <div className="flex flex-col gap-2 border-l-4 border-gray-500 ms-4">
                {historyLinks.map(({ name, href, icon: Icon }) => (
                  <Link
                    key={name}
                    href={href}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors duration-150 ${
                      isActive(href)
                        ? "text-[#105588]"
                        : "text-gray-600 hover:text-[#105588]"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {name}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Management */}
          <div className="flex flex-col gap-2">
            <span className="text-sm font-bold text-gray-500">Management</span>
            <Link
              href="/dashboard/profile"
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors duration-150 ${
                isActive("/dashboard/profile")
                  ? "bg-[#105588] text-white"
                  : "hover:bg-gray-100"
              }`}
            >
              <CircleUserRound className="w-5 h-5" />
              Profile
            </Link>

            {/* Settings Dropdown */}
            <button
              onClick={() => setManageAccountDropdown((prev) => !prev)}
              className="flex items-center justify-between px-4 py-2 rounded-lg transition-colors duration-150 cursor-pointer hover:bg-gray-100"
            >
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Settings
              </div>
              {manageAccountDropdown ? (
                <ChevronUp className="w-5 h-5" />
              ) : (
                <ChevronDown className="w-5 h-5" />
              )}
            </button>

            {manageAccountDropdown && (
              <div className="flex flex-col gap-2 border-l-4 border-gray-500 ms-4">
                {manageAccountLinks.map(({ name, href, icon: Icon }) => (
                  <Link
                    key={name}
                    href={href}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors duration-150 ${
                      isActive(href)
                        ? "text-[#105588]"
                        : "text-gray-600 hover:text-[#105588]"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {name}
                  </Link>
                ))}
              </div>
            )}
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-red-500 hover:bg-red-200 transition-colors duration-150 cursor-pointer"
            >
              <DoorOpen className="w-5 h-5" />
              Sign out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

