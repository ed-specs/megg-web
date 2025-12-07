//D:\CAPSTONE\megg-web-tech\app\admin\components\NavBar.js

"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  LayoutDashboard,
  CircleUserRound,
  Settings,
  DoorOpen,
  Shield,
  User,
  LogOut,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  KeyRound,
  Bell,
  Sliders,
} from "lucide-react";
import { auth, db } from "../../config/firebaseConfig.js";
import { doc, getDoc } from "firebase/firestore";
import { signOutUser, debugAuthState, getUserAccountId } from "../../utils/auth-utils";
import NotificationMobile from "../../components/ui/NotificationMobile.js";
import { saveInAppNotification } from "../../utils/notification-utils";

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [manageAccountDropdown, setManageAccountDropdown] = useState(false);

  const [userData, setUserData] = useState({
    username: "",
    email: "",
    profileImageUrl: "",
    accountId: "",
  });
  const profileRef = useRef(null);

  useEffect(() => {
    // NOTE: This effect handles both Firebase Auth and custom localStorage auth.
    // Consider refactoring to use a centralized auth service/hook for better maintainability.
    
    // Function to fetch user data
    const fetchUserData = async (userId) => {
      try {
        const accountId = getUserAccountId();
        const docId = accountId || userId;
        const docRef = doc(db, "users", docId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setUserData({
            username: data.username || "User",
            email: data.email || "",
            profileImageUrl: data.profileImageUrl || "/default.png",
            accountId: data.accountId || accountId || "",
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
    { name: "Dashboard", href: "/admin/overview", icon: LayoutDashboard },
    { name: "Users", href: "/admin/users", icon: User },
    { name: "Support", href: "/admin/support", icon: HelpCircle },
    { name: "Configuration", href: "/admin/settings/configuration", icon: Sliders },
  ];

  const manageAccountLinks = useMemo(() => [
    {
      name: "Edit profile",
      href: "/admin/settings/edit-profile",
      icon: User,
    },
    {
      name: "Change password",
      href: "/admin/settings/change-password",
      icon: KeyRound,
    },
    {
      name: "Preferences",
      href: "/admin/settings/preferences",
      icon: Bell,
    },
  ], []);

  // Keep dropdowns open if current path matches their links
  useEffect(() => {
    // Keep settings dropdown open if current path is a settings page
    const isSettingsPage = manageAccountLinks.some(link => pathname === link.href);
    if (isSettingsPage) {
      setManageAccountDropdown(true);
    }
  }, [pathname, manageAccountLinks]);

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
              Admin Dashboard
            </span>
          </div>
        </div>

        {/* Menus */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <span className="text-sm font-bold text-gray-500">Menus</span>
            {menus.map(({ name, href, icon: Icon }) => (
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
              </Link>
            ))}
          </div>

          {/* Management */}
          <div className="flex flex-col gap-2">
            <span className="text-sm font-bold text-gray-500">Management</span>
            <Link
              href="/admin/profile"
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors duration-150 ${
                isActive("/admin/profile")
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
