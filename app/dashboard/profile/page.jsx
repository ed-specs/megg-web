"use client";

import { Navbar } from "../components/NavBar";
import { Header } from "../components/Header";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "../../config/firebaseConfig";
import { EmailAuthProvider, reauthenticateWithCredential, deleteUser } from "firebase/auth";
import { doc, getDoc, deleteDoc, collection, query, where, getDocs } from "firebase/firestore";
import { getCurrentUser, getStoredUser, getUserAccountId } from "../../utils/auth-utils";

// Import our new components
import ProfileCard from "./components/ProfileCard";
import ProfileActions from "./components/ProfileActions";
import DeleteAccountModal from "./components/DeleteAccountModal";
import ResultModal from "../components/ResultModal";
import LoadingLogo from "../components/LoadingLogo";
import { useLoadingDelay } from "../components/useLoadingDelay";

export default function ProfilePage() {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const showLoading = useLoadingDelay(loading, 500);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [password, setPassword] = useState("");
  const [globalMessage, setGlobalMessage] = useState("");

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // Debug: Check all available authentication data
        console.log("=== PROFILE PAGE DEBUG ===");
        console.log("localStorage 'user':", localStorage.getItem("user"));
        console.log("localStorage 'customAuthUser':", localStorage.getItem("customAuthUser"));
        console.log("localStorage 'useCustomAuth':", localStorage.getItem("useCustomAuth"));
        console.log("Firebase auth.currentUser:", auth.currentUser);
        console.log("==============================");

        // Check for authenticated user (RouteGuard should have already verified this)
        const user = getCurrentUser();
        const storedUser = getStoredUser();
        const accountId = getUserAccountId();

        console.log("🔍 Profile: User from getCurrentUser():", user);
        console.log("🔍 Profile: Stored user from getStoredUser():", storedUser);
        console.log("🔍 Profile: Account ID from getUserAccountId():", accountId);

        // If RouteGuard passed but we still don't have user data, use stored data
        if (!user && !storedUser) {
          console.log("❌ Profile: No user data available after route guard check");
          setGlobalMessage("Session expired. Please log in again.");
          setTimeout(() => router.push("/login"), 2000);
          return;
        }

        // Use accountId from stored user data if available, otherwise use user.uid
        const docId = accountId || user?.uid;
        
        if (!docId) {
          console.error("No user ID or account ID found");
          router.push("/login");
          return;
        }

        console.log("=== PROFILE DEBUG INFO ===");
        console.log("Fetching user data with ID:", docId);
        console.log("Account ID from getUserAccountId():", accountId);
        console.log("Stored user data:", storedUser);
        console.log("Current user:", user);
        console.log("User UID:", user?.uid);
        console.log("========================");
        
        const userDocRef = doc(db, "users", docId);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const userData = userDoc.data();
          console.log("✅ User data fetched from Firestore:", userData);
          
          // Normalize field names for compatibility
          const normalizedUserData = {
            ...userData,
            fullName: userData.fullName || userData.fullname || userData.username || "User",
            phone: userData.phone || "Not provided"
          };
          
          setUserData(normalizedUserData);
        } else {
          console.log(`⚠️ User document not found for ID: ${docId} - trying fallbacks...`);
          console.log("Attempting alternative lookups...");
          
          // Try with Firebase UID if accountId lookup failed
          if (user?.uid && user.uid !== docId) {
            console.log("Trying with Firebase UID:", user.uid);
            const altUserDocRef = doc(db, "users", user.uid);
            const altUserDoc = await getDoc(altUserDocRef);
            
            if (altUserDoc.exists()) {
              const altUserData = altUserDoc.data();
              console.log("✅ User data found with Firebase UID:", altUserData);
              
              // Normalize field names for compatibility
              const normalizedAltUserData = {
                ...altUserData,
                fullName: altUserData.fullName || altUserData.fullname || altUserData.username || "User",
                phone: altUserData.phone || "Not provided"
              };
              
              setUserData(normalizedAltUserData);
              return;
            } else {
              console.log("❌ No document found with Firebase UID either");
            }
          }
          
          // Try searching by email if we have it
          if (storedUser?.email || user?.email) {
            const email = storedUser?.email || user?.email;
            console.log("Trying to find user by email:", email);
            
            try {
              const usersRef = collection(db, "users");
              const emailQuery = query(usersRef, where("email", "==", email));
              const emailSnapshot = await getDocs(emailQuery);
              
              if (!emailSnapshot.empty) {
                const emailUserDoc = emailSnapshot.docs[0];
                const emailUserData = emailUserDoc.data();
                console.log("✅ User data found by email search:", emailUserData);
                console.log("📄 Document ID found:", emailUserDoc.id);
                
                // Normalize field names for compatibility
                const normalizedEmailUserData = {
                  ...emailUserData,
                  fullName: emailUserData.fullName || emailUserData.fullname || emailUserData.username || "User",
                  phone: emailUserData.phone || "Not provided"
                };
                
                setUserData(normalizedEmailUserData);
                return;
              } else {
                console.log("❌ No document found with email search");
              }
            } catch (emailError) {
              console.error("❌ Error searching by email:", emailError);
            }
          }
          
          // Debug: List all documents in users collection
          console.log("🔍 Listing all documents in users collection for debugging...");
          try {
            const usersRef = collection(db, "users");
            const allUsersSnapshot = await getDocs(usersRef);
            console.log(`📊 Found ${allUsersSnapshot.size} total documents in users collection:`);
            
            allUsersSnapshot.forEach((doc) => {
              const data = doc.data();
              console.log(`📄 Document ID: ${doc.id}`);
              console.log(`   - Email: ${data.email || 'N/A'}`);
              console.log(`   - Username: ${data.username || 'N/A'}`);
              console.log(`   - Account ID: ${data.accountId || 'N/A'}`);
              console.log(`   - Full Name: ${data.fullName || 'N/A'}`);
            });
          } catch (debugError) {
            console.error("❌ Error listing users for debug:", debugError);
          }
          
          // Final fallback to stored user data
          if (storedUser) {
            console.log("✅ Using stored user data as final fallback");
            
            // Normalize field names for compatibility
            const normalizedStoredUserData = {
              ...storedUser,
              fullName: storedUser.fullName || storedUser.fullname || storedUser.username || "User",
              phone: storedUser.phone || "Not provided",
              accountId: storedUser.accountId || accountId || user?.uid || "Unknown"
            };
            
            setUserData(normalizedStoredUserData);
          } else {
            console.log("❌ No user data available from any source");
            
            // Create minimal user data from available information
            const minimalUserData = {
              fullName: user?.displayName || user?.email?.split('@')[0] || "User",
              username: user?.email?.split('@')[0] || "user",
              email: user?.email || "No email",
              phone: "Not provided",
              accountId: accountId || user?.uid || "Unknown"
            };
            
            console.log("🔧 Created minimal user data:", minimalUserData);
            setUserData(minimalUserData);
          }
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [router]);

  const handleDeleteAccount = async () => {
    if (!password.trim()) {
      setDeleteError("Please enter your password");
      return;
    }

    setDeleteLoading(true);
    setDeleteError("");

    try {
      const user = auth.currentUser;
      if (!user) {
        setDeleteError("No user is currently signed in");
        return;
      }

      // Re-authenticate the user
      const credential = EmailAuthProvider.credential(user.email, password);
      await reauthenticateWithCredential(user, credential);

      // Delete user document from Firestore
      const userDocRef = doc(db, "users", user.uid);
      await deleteDoc(userDocRef);

      // Delete the user account
      await deleteUser(user);

      // Redirect to login page
      router.push("/login");
    } catch (error) {
      console.error("Error deleting account:", error);
      if (error.code === "auth/wrong-password") {
        setDeleteError("Incorrect password. Please try again.");
      } else if (error.code === "auth/too-many-requests") {
        setDeleteError("Too many failed attempts. Please try again later.");
      } else {
        setDeleteError("Failed to delete account. Please try again.");
      }
    } finally {
      setDeleteLoading(false);
    }
  };

  if (showLoading) {
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

            {/* Loading Logo */}
            <div className="bg-white rounded-2xl border border-gray-300 p-12">
              <LoadingLogo message="Loading profile..." size="lg" />
            </div>
          </div>
        </div>
      </div>
    );
  }

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
            {/* Profile Card */}
            <ProfileCard userData={userData} />

            {/* Profile Actions */}
            <ProfileActions setShowDeleteModal={setShowDeleteModal} />
          </div>
        </div>
      </div>

      {/* Delete Account Modal */}
      <DeleteAccountModal 
        showDeleteModal={showDeleteModal}
        setShowDeleteModal={setShowDeleteModal}
        handleDeleteAccount={handleDeleteAccount}
        deleteLoading={deleteLoading}
        deleteError={deleteError}
        password={password}
        setPassword={setPassword}
      />

      {/* Global Message Modal */}
      <ResultModal
        message={globalMessage}
        onClose={() => setGlobalMessage("")}
      />
    </div>
  );
}
