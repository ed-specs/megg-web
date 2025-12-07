"use client";

import { Navbar } from "../components/NavBar";
import { Header } from "../components/Header";
import { useState, useEffect } from "react";
import { 
  HelpCircle, Send, MessageSquare, AlertCircle, Mail, User, Calendar
} from "lucide-react";
import LoadingLogo from "../components/LoadingLogo";
import { useLoadingDelay } from "../components/useLoadingDelay";
import ResultModal from "../components/ResultModal";
import { collection, addDoc, query, where, getDocs, orderBy, Timestamp, setDoc, doc } from "firebase/firestore";
import { db } from "../../config/firebaseConfig";
import { getUserAccountId, getStoredUser } from "../../utils/auth-utils";
import { saveInAppNotification, saveInAppNotificationForUser } from "../../utils/notification-utils";
import { createNotification } from "../../lib/notifications/NotificationsService";

// Generate random 4-character alphanumeric string
const generateRandomId = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export default function SupportPage() {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const showLoading = useLoadingDelay(loading, 500);
  const [submitting, setSubmitting] = useState(false);
  const [globalMessage, setGlobalMessage] = useState("");
  const [error, setError] = useState(null);
  
  const [formData, setFormData] = useState({
    subject: "",
    category: "general",
    message: "",
  });

  const [myTickets, setMyTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(true);

  const categories = [
    { value: "general", label: "General Question" },
    { value: "technical", label: "Technical Issue" },
    { value: "account", label: "Account Issue" },
    { value: "feature", label: "Feature Request" },
    { value: "other", label: "Other" },
  ];

  const getCategoryLabel = (category) => {
    const cat = categories.find(c => c.value === category);
    return cat ? cat.label : category;
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchMyTickets();
      setLoading(false);
    };
    loadData();
  }, []);

  const fetchMyTickets = async () => {
    try {
      setLoadingTickets(true);
      const accountId = getUserAccountId();
      if (!accountId) {
        setLoadingTickets(false);
        return;
      }

      const ticketsQuery = query(
        collection(db, "support_tickets"),
        where("accountId", "==", accountId),
        orderBy("createdAt", "desc")
      );
      const snapshot = await getDocs(ticketsQuery);
      
      const tickets = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        tickets.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
        });
      });
      
      setMyTickets(tickets);
    } catch (err) {
      console.error("Error fetching tickets:", err);
    } finally {
      setLoadingTickets(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.subject.trim() || !formData.message.trim()) {
      setError("Please fill in all required fields.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const accountId = getUserAccountId();
      const storedUser = getStoredUser();
      
      if (!accountId) {
        setError("Unable to identify your account. Please log in again.");
        setSubmitting(false);
        return;
      }

      // Generate custom ticket ID: SUPPORT-{accountId}-{random4chars}
      const randomId = generateRandomId();
      const ticketId = `SUPPORT-${accountId}-${randomId}`;

      const ticketData = {
        accountId,
        username: storedUser?.username || "Unknown",
        email: storedUser?.email || "",
        subject: formData.subject.trim(),
        category: formData.category,
        message: formData.message.trim(),
        status: "open",
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      // Use setDoc with custom ID instead of addDoc
      const ticketRef = doc(db, "support_tickets", ticketId);
      await setDoc(ticketRef, ticketData);
      
      // Send notifications to the user who submitted
      try {
        // In-app notification to user
        await saveInAppNotification(
          `Your support request "${formData.subject.trim()}" has been submitted successfully. We'll get back to you soon!`,
          "support_request_submitted"
        );

        // Email notification to user
        try {
          await fetch('/api/notifications/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              accountId: accountId,
              subject: `✅ Support Request Submitted - ${formData.subject.trim()}`,
              message: `
                <h2 style="color: #105588; font-size: 24px; margin-bottom: 16px;">Support Request Received</h2>
                <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 16px;">
                  Thank you for contacting us! We have received your support request and will get back to you as soon as possible.
                </p>
                <div style="background: #f3f4f6; border-left: 4px solid #105588; padding: 16px; margin: 20px 0; border-radius: 8px;">
                  <p style="margin: 0 0 8px 0; font-weight: 600; color: #1f2937;">Request Details:</p>
                  <p style="margin: 4px 0; color: #4b5563;"><strong>Subject:</strong> ${formData.subject.trim()}</p>
                  <p style="margin: 4px 0; color: #4b5563;"><strong>Category:</strong> ${getCategoryLabel(formData.category)}</p>
                    <p style="margin: 4px 0; color: #4b5563;"><strong>Ticket ID:</strong> ${ticketId}</p>
                </div>
                <p style="color: #374151; font-size: 14px; line-height: 1.6; margin-top: 20px;">
                  You can track the status of your request in the Support section of your dashboard.
                </p>
              `
            })
          });
        } catch (emailError) {
          console.error("Error sending email to user:", emailError);
          // Don't block the submission if email fails
        }
      } catch (notifError) {
        console.error("Error creating user notification:", notifError);
        // Don't block the submission if notification fails
      }

      // Send notifications to all admin users
      try {
        // Get all admin users
        const adminUsersQuery = query(
          collection(db, "users"),
          where("role", "==", "admin")
        );
        const adminSnapshot = await getDocs(adminUsersQuery);
        
        const adminNotifications = [];
        adminSnapshot.forEach((doc) => {
          const adminData = doc.data();
          const adminAccountId = adminData.accountId || doc.id;
          adminNotifications.push({
            accountId: adminAccountId,
            email: adminData.email,
          });
        });

        // Send in-app notifications to all admins
        const adminNotifPromises = adminNotifications.map(admin =>
          createNotification(
            admin.accountId,
            `New support request from ${storedUser?.username || 'User'}: "${formData.subject.trim()}"`,
            "support_request_received"
          ).catch(err => {
            console.error(`Error creating notification for admin ${admin.accountId}:`, err);
            return null;
          })
        );
        await Promise.all(adminNotifPromises);

        // Send email notifications to all admins
        const adminEmailPromises = adminNotifications
          .filter(admin => admin.email)
          .map(async (admin) => {
            try {
              const response = await fetch('/api/notifications/send-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  accountId: admin.accountId,
                  subject: `🔔 New Support Request - ${formData.subject.trim()}`,
                  message: `
                    <h2 style="color: #105588; font-size: 24px; margin-bottom: 16px;">New Support Request</h2>
                    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 16px;">
                      A new support request has been submitted and requires your attention.
                    </p>
                    <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0; border-radius: 8px;">
                      <p style="margin: 0 0 8px 0; font-weight: 600; color: #92400e;">Request Details:</p>
                      <p style="margin: 4px 0; color: #78350f;"><strong>User:</strong> ${storedUser?.username || 'Unknown'} (${storedUser?.email || 'No email'})</p>
                      <p style="margin: 4px 0; color: #78350f;"><strong>Account ID:</strong> ${accountId}</p>
                      <p style="margin: 4px 0; color: #78350f;"><strong>Subject:</strong> ${formData.subject.trim()}</p>
                      <p style="margin: 4px 0; color: #78350f;"><strong>Category:</strong> ${getCategoryLabel(formData.category)}</p>
                      <p style="margin: 4px 0; color: #78350f;"><strong>Ticket ID:</strong> ${ticketId}</p>
                    </div>
                    <div style="background: #f3f4f6; border-left: 4px solid #6b7280; padding: 16px; margin: 20px 0; border-radius: 8px;">
                      <p style="margin: 0 0 8px 0; font-weight: 600; color: #1f2937;">Message:</p>
                      <p style="margin: 0; color: #4b5563; white-space: pre-wrap;">${formData.message.trim()}</p>
                    </div>
                    <p style="color: #374151; font-size: 14px; line-height: 1.6; margin-top: 20px;">
                      Please review and respond to this request in the Admin Support Management section.
                    </p>
                  `
                })
              });
              
              if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error(`Error sending email to admin ${admin.accountId}:`, errorData);
              } else {
                console.log(`Email sent successfully to admin ${admin.accountId}`);
              }
            } catch (err) {
              console.error(`Error sending email to admin ${admin.accountId}:`, err);
            }
          });
        await Promise.all(adminEmailPromises);
      } catch (adminNotifError) {
        console.error("Error sending notifications to admins:", adminNotifError);
        // Don't block the submission if admin notifications fail
      }
      
      setGlobalMessage("Your support request has been submitted successfully! We'll get back to you soon.");
      setFormData({
        subject: "",
        category: "general",
        message: "",
      });
      
      // Refresh tickets list
      await fetchMyTickets();
    } catch (err) {
      console.error("Error submitting support ticket:", err);
      setError("Failed to submit your request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "open":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "in_progress":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "resolved":
        return "bg-green-100 text-green-700 border-green-200";
      case "closed":
        return "bg-gray-100 text-gray-700 border-gray-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

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

        <div className="flex flex-1 flex-col gap-4 md:gap-6 w-full min-w-0">
          {/* Header */}
          <Header setSidebarOpen={setSidebarOpen} />

          {/* Main Content */}
          <div className="flex flex-col gap-4 md:gap-6">
            {/* Loading State */}
            {showLoading ? (
              <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-300 p-3 sm:p-4 md:p-6">
                <div className="py-12">
                  <LoadingLogo message="Loading support..." size="lg" />
                </div>
              </div>
            ) : (
              <>
            {/* Header Card */}
            <div className="bg-white rounded-2xl border border-gray-300 p-4 md:p-6">
              <div className="flex items-center gap-2 mb-1">
                <HelpCircle className="w-5 h-5 md:w-6 md:h-6 text-[#105588]" />
                <h1 className="text-xl md:text-2xl font-bold text-gray-900">
                  Support & Help
                </h1>
              </div>
              <p className="text-gray-600 text-sm mt-1">
                Ask questions or report issues. We&apos;re here to help!
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
              {/* Support Form */}
              <div className="bg-white rounded-2xl border border-gray-300 p-4 md:p-6">
                <h2 className="text-lg md:text-xl font-semibold text-gray-900 mb-4">
                  Submit a Request
                </h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category
                    </label>
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      {categories.map((cat) => (
                        <option key={cat.value} value={cat.value}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Subject <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="subject"
                      value={formData.subject}
                      onChange={handleInputChange}
                      placeholder="Brief description of your question or issue"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Message <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      name="message"
                      value={formData.message}
                      onChange={handleInputChange}
                      placeholder="Please provide details about your question or issue..."
                      rows={6}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-[#105588] text-white py-3 px-4 rounded-lg hover:bg-[#0d4470] transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Submit Request
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* My Tickets */}
              <div className="bg-white rounded-2xl border border-gray-300 p-4 md:p-6">
                <h2 className="text-lg md:text-xl font-semibold text-gray-900 mb-4">
                  My Support Tickets
                </h2>
                
                {loadingTickets ? (
                  <div className="py-8">
                    <LoadingLogo message="Loading tickets..." size="sm" />
                  </div>
                ) : myTickets.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-gray-500 text-sm">No support tickets yet</p>
                    <p className="text-gray-400 text-xs mt-1">Submit a request to get started</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[500px] overflow-y-auto">
                    {myTickets.map((ticket) => (
                      <div
                        key={ticket.id}
                        className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 truncate">
                              {ticket.subject}
                            </h3>
                            <p className="text-xs text-gray-500 mt-1">
                              {getCategoryLabel(ticket.category)}
                            </p>
                          </div>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full border ml-2 flex-shrink-0 ${getStatusBadge(ticket.status)}`}>
                            {ticket.status.replace("_", " ").toUpperCase()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                          {ticket.message}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {ticket.createdAt.toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Result Modal */}
      <ResultModal
        message={globalMessage}
        onClose={() => setGlobalMessage("")}
      />
    </div>
  );
}
