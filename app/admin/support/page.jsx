"use client";

import { Navbar } from "../components/NavBar";
import { Header } from "../components/Header";
import { useState, useEffect, useMemo } from "react";
import { 
  HelpCircle, Search, RefreshCw, Filter, X, Mail, Calendar, MessageSquare, 
  User as UserIcon, Eye, MoreVertical
} from "lucide-react";
import LoadingLogo from "../../dashboard/components/LoadingLogo";
import { useLoadingDelay } from "../../dashboard/components/useLoadingDelay";
import { collection, getDocs, query, orderBy, updateDoc, doc, Timestamp, where } from "firebase/firestore";
import { db } from "../../config/firebaseConfig";
import { createNotification } from "../../lib/notifications/NotificationsService";

// Helper to convert timestamps
const tsToDate = (ts) => {
  try {
    if (!ts) return new Date();
    if (typeof ts?.toDate === 'function') return ts.toDate();
    if (typeof ts?.seconds === 'number') return new Date(ts.seconds * 1000);
    return new Date(ts);
  } catch {
    return new Date();
  }
};

export default function AdminSupportPage() {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const showLoading = useLoadingDelay(loading, 500);
  const [rawTicketsData, setRawTicketsData] = useState([]);
  const [error, setError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  
  // Drag and drop state
  const [draggedTicket, setDraggedTicket] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All Categories");
  const [showFilters, setShowFilters] = useState(false);

  const categories = [
    { value: "general", label: "General Question" },
    { value: "technical", label: "Technical Issue" },
    { value: "account", label: "Account Issue" },
    { value: "feature", label: "Feature Request" },
    { value: "other", label: "Other" },
  ];

  const statusColumns = [
    { id: "open", title: "Open", color: "blue" },
    { id: "in_progress", title: "In Progress", color: "yellow" },
    { id: "resolved", title: "Resolved", color: "green" },
    { id: "closed", title: "Closed", color: "gray" },
  ];

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all support tickets
      const ticketsQuery = query(collection(db, "support_tickets"), orderBy("createdAt", "desc"));
      const ticketsSnapshot = await getDocs(ticketsQuery);
      console.log('[Admin Support] Found', ticketsSnapshot.size, 'tickets');

      const ticketsArray = [];
      ticketsSnapshot.docs.forEach(doc => {
        const ticket = doc.data();
        ticketsArray.push({
          id: doc.id,
          accountId: ticket.accountId || 'Unknown',
          username: ticket.username || 'Unknown',
          email: ticket.email || '',
          subject: ticket.subject || '',
          category: ticket.category || 'general',
          message: ticket.message || '',
          status: ticket.status || 'open',
          createdAt: tsToDate(ticket.createdAt),
          updatedAt: tsToDate(ticket.updatedAt),
        });
      });

      console.log('[Admin Support] Processed tickets:', ticketsArray.length);
      setRawTicketsData(ticketsArray);
      setLoading(false);

    } catch (err) {
      console.error('[Admin Support] Error fetching data:', err);
      setError(`Failed to load data: ${err.message}`);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const refreshData = async () => {
    setIsRefreshing(true);
    await fetchData();
    setIsRefreshing(false);
  };

  // Apply filters
  const ticketsData = useMemo(() => {
    let filtered = [...rawTicketsData];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(ticket => 
        ticket.subject?.toLowerCase().includes(query) ||
        ticket.message?.toLowerCase().includes(query) ||
        ticket.username?.toLowerCase().includes(query) ||
        ticket.email?.toLowerCase().includes(query) ||
        ticket.accountId?.toLowerCase().includes(query)
      );
    }

    // Category filter
    if (categoryFilter !== "All Categories") {
      filtered = filtered.filter(ticket => ticket.category === categoryFilter.toLowerCase());
    }

    return filtered;
  }, [rawTicketsData, searchQuery, categoryFilter]);

  // Group tickets by status for kanban
  const ticketsByStatus = useMemo(() => {
    const grouped = {
      open: [],
      in_progress: [],
      resolved: [],
      closed: [],
    };

    ticketsData.forEach(ticket => {
      const status = ticket.status || 'open';
      if (grouped[status]) {
        grouped[status].push(ticket);
      } else {
        grouped.open.push(ticket); // Default to open if status is unknown
      }
    });

    return grouped;
  }, [ticketsData]);

  const hasActiveFilters = categoryFilter !== "All Categories";

  const clearFilters = () => {
    setCategoryFilter("All Categories");
    setSearchQuery("");
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case "open":
        return "Open";
      case "in_progress":
        return "In Progress";
      case "resolved":
        return "Resolved";
      case "closed":
        return "Closed";
      default:
        return status;
    }
  };

  const handleStatusChange = async (ticketId, newStatus) => {
    try {
      // Get the ticket data before updating
      const ticket = rawTicketsData.find(t => t.id === ticketId);
      if (!ticket) {
        console.error("Ticket not found:", ticketId);
        return;
      }

      const previousStatus = ticket.status;
      
      // Update in database
      await updateDoc(doc(db, "support_tickets", ticketId), {
        status: newStatus,
        updatedAt: Timestamp.now(),
      });
      
      // Update local state
      setRawTicketsData(prev => 
        prev.map(t => 
          t.id === ticketId 
            ? { ...t, status: newStatus, updatedAt: new Date() }
            : t
        )
      );
      
      // Update selected ticket if it's the one being changed
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket(prev => ({ ...prev, status: newStatus, updatedAt: new Date() }));
      }

      // Send notifications to the user who submitted the ticket
      try {
        // In-app notification to user
        await createNotification(
          ticket.accountId,
          `Your support request "${ticket.subject}" status has been updated to ${getStatusLabel(newStatus)}.`,
          "support_request_received"
        ).catch(err => {
          console.error(`Error creating notification for user ${ticket.accountId}:`, err);
        });

        // Email notification to user
        try {
          const userResponse = await fetch('/api/notifications/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              accountId: ticket.accountId,
              subject: `📋 Support Request Updated - ${ticket.subject}`,
              message: `
                <h2 style="color: #105588; font-size: 24px; margin-bottom: 16px;">Support Request Status Updated</h2>
                <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 16px;">
                  The status of your support request has been updated.
                </p>
                <div style="background: #f3f4f6; border-left: 4px solid #105588; padding: 16px; margin: 20px 0; border-radius: 8px;">
                  <p style="margin: 0 0 8px 0; font-weight: 600; color: #1f2937;">Request Details:</p>
                  <p style="margin: 4px 0; color: #4b5563;"><strong>Subject:</strong> ${ticket.subject}</p>
                  <p style="margin: 4px 0; color: #4b5563;"><strong>Ticket ID:</strong> ${ticketId}</p>
                  <p style="margin: 4px 0; color: #4b5563;"><strong>Previous Status:</strong> ${getStatusLabel(previousStatus)}</p>
                  <p style="margin: 4px 0; color: #4b5563;"><strong>New Status:</strong> <span style="color: #105588; font-weight: 600;">${getStatusLabel(newStatus)}</span></p>
                </div>
                <p style="color: #374151; font-size: 14px; line-height: 1.6; margin-top: 20px;">
                  You can view the full details of your request in the Support section of your dashboard.
                </p>
              `
            })
          });
          
          if (!userResponse.ok) {
            const errorData = await userResponse.json().catch(() => ({}));
            console.error(`Error sending email to user ${ticket.accountId}:`, errorData);
          }
        } catch (emailError) {
          console.error("Error sending email to user:", emailError);
        }
      } catch (notifError) {
        console.error("Error creating user notification:", notifError);
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
            `Support request "${ticket.subject}" (${ticketId}) status changed from ${getStatusLabel(previousStatus)} to ${getStatusLabel(newStatus)}.`,
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
                  subject: `📋 Support Request Status Updated - ${ticket.subject}`,
                  message: `
                    <h2 style="color: #105588; font-size: 24px; margin-bottom: 16px;">Support Request Status Updated</h2>
                    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 16px;">
                      A support request status has been updated.
                    </p>
                    <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0; border-radius: 8px;">
                      <p style="margin: 0 0 8px 0; font-weight: 600; color: #92400e;">Request Details:</p>
                      <p style="margin: 4px 0; color: #78350f;"><strong>User:</strong> ${ticket.username || 'Unknown'} (${ticket.email || 'No email'})</p>
                      <p style="margin: 4px 0; color: #78350f;"><strong>Account ID:</strong> ${ticket.accountId}</p>
                      <p style="margin: 4px 0; color: #78350f;"><strong>Subject:</strong> ${ticket.subject}</p>
                      <p style="margin: 4px 0; color: #78350f;"><strong>Ticket ID:</strong> ${ticketId}</p>
                      <p style="margin: 4px 0; color: #78350f;"><strong>Previous Status:</strong> ${getStatusLabel(previousStatus)}</p>
                      <p style="margin: 4px 0; color: #78350f;"><strong>New Status:</strong> <span style="color: #105588; font-weight: 600;">${getStatusLabel(newStatus)}</span></p>
                    </div>
                    <p style="color: #374151; font-size: 14px; line-height: 1.6; margin-top: 20px;">
                      You can view and manage this request in the Admin Support Management section.
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
      }
    } catch (err) {
      console.error("Error updating ticket status:", err);
      throw err; // Re-throw to allow drag-drop to handle error
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e, ticket) => {
    setDraggedTicket(ticket);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', ticket.id);
    // Add visual feedback
    e.currentTarget.style.opacity = '0.5';
  };

  const handleDragEnd = (e) => {
    e.currentTarget.style.opacity = '1';
    setDraggedTicket(null);
    setDragOverColumn(null);
  };

  const handleDragOver = (e, columnId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(columnId);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = async (e, targetColumnId) => {
    e.preventDefault();
    setDragOverColumn(null);

    if (!draggedTicket || draggedTicket.status === targetColumnId) {
      setDraggedTicket(null);
      return;
    }

    // Optimistically update UI
    const previousStatus = draggedTicket.status;
    setRawTicketsData(prev => 
      prev.map(ticket => 
        ticket.id === draggedTicket.id 
          ? { ...ticket, status: targetColumnId, updatedAt: new Date() }
          : ticket
      )
    );

    // Update in database
    try {
      await handleStatusChange(draggedTicket.id, targetColumnId);
    } catch (err) {
      console.error("Error updating ticket status via drag:", err);
      // Revert on error
      setRawTicketsData(prev => 
        prev.map(ticket => 
          ticket.id === draggedTicket.id 
            ? { ...ticket, status: previousStatus }
            : ticket
        )
      );
    }

    setDraggedTicket(null);
  };

  const getStatusBadgeColor = (status) => {
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

  const getCategoryLabel = (category) => {
    const cat = categories.find(c => c.value === category);
    return cat ? cat.label : category;
  };

  const formatDate = (date) => {
    if (!date || isNaN(date.getTime())) return 'Unknown';
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getColumnHeaderColor = (color) => {
    switch (color) {
      case "blue":
        return "bg-blue-50 border-blue-200 text-blue-700";
      case "yellow":
        return "bg-yellow-50 border-yellow-200 text-yellow-700";
      case "green":
        return "bg-green-50 border-green-200 text-green-700";
      case "gray":
        return "bg-gray-50 border-gray-200 text-gray-700";
      default:
        return "bg-gray-50 border-gray-200 text-gray-700";
    }
  };

  const openTickets = rawTicketsData.filter(t => t.status === 'open').length;
  const inProgressTickets = rawTicketsData.filter(t => t.status === 'in_progress').length;
  const resolvedTickets = rawTicketsData.filter(t => t.status === 'resolved').length;
  const closedTickets = rawTicketsData.filter(t => t.status === 'closed').length;

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
            {/* Header Card */}
            <div className="bg-white rounded-2xl border border-gray-300 p-4 md:p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <HelpCircle className="w-5 h-5 md:w-6 md:h-6 text-[#105588]" />
                    <h1 className="text-xl md:text-2xl font-bold text-gray-900">
                      Support Management
                    </h1>
                  </div>
                  <p className="text-gray-600 text-sm mt-1">
                    View and manage all support tickets
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`flex items-center gap-2 px-3 md:px-4 py-2 border rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      hasActiveFilters 
                        ? 'bg-blue-50 border-blue-300 text-blue-600' 
                        : 'bg-white border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <Filter className="w-4 md:w-5 h-4 md:h-5" />
                    <span className="text-sm hidden sm:inline">Filter</span>
                  </button>
                  <button
                    onClick={refreshData}
                    disabled={isRefreshing}
                    className="flex items-center gap-2 px-3 md:px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <RefreshCw className={`w-4 md:w-5 h-4 md:h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                    <span className="text-sm hidden sm:inline">Refresh</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Search and Filter Panel */}
            <div className="bg-white border border-gray-300 rounded-xl p-4 md:p-6">
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                {/* Search */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search tickets..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Filter Panel */}
              {showFilters && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base md:text-lg font-semibold text-gray-800">Filters</h3>
                    <button
                      onClick={() => setShowFilters(false)}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      <X className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                      <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="All Categories">All Categories</option>
                        {categories.map((cat) => (
                          <option key={cat.value} value={cat.value}>
                            {cat.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {hasActiveFilters && (
                    <div className="mt-4">
                      <button
                        onClick={clearFilters}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Clear Filters
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Stats Card */}
            <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-300 p-4 md:p-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="text-2xl sm:text-3xl font-bold text-blue-600">{openTickets}</div>
                  <div className="text-xs sm:text-sm text-blue-700 font-medium mt-1">Open</div>
                </div>
                <div className="text-center p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="text-2xl sm:text-3xl font-bold text-yellow-600">{inProgressTickets}</div>
                  <div className="text-xs sm:text-sm text-yellow-700 font-medium mt-1">In Progress</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="text-2xl sm:text-3xl font-bold text-green-600">{resolvedTickets}</div>
                  <div className="text-xs sm:text-sm text-green-700 font-medium mt-1">Resolved</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="text-2xl sm:text-3xl font-bold text-gray-600">{closedTickets}</div>
                  <div className="text-xs sm:text-sm text-gray-700 font-medium mt-1">Closed</div>
                </div>
              </div>
            </div>

            {/* Results Summary */}
            <div className="flex justify-between items-center">
              <p className="text-xs sm:text-sm text-gray-600">
                Showing {ticketsData.length} of {rawTicketsData.length} tickets
              </p>
            </div>

            {/* Loading State */}
            {showLoading ? (
              <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-300 p-3 sm:p-4 md:p-6">
                <div className="py-12">
                  <LoadingLogo message="Loading tickets..." size="lg" />
                </div>
              </div>
            ) : error ? (
              <div className="bg-white border border-gray-200 rounded-xl p-6 md:p-12">
                <div className="flex flex-col items-center justify-center gap-4">
                  <HelpCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium text-gray-500">Error loading tickets</p>
                  <p className="text-sm text-gray-400">{error}</p>
                  <button
                    onClick={fetchData}
                    className="mt-2 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    Retry
                  </button>
                </div>
              </div>
            ) : ticketsData.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-xl p-6 md:p-12">
                <div className="flex flex-col items-center justify-center gap-2">
                  <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium text-gray-500">No tickets found</p>
                  <p className="text-sm text-gray-400">
                    {rawTicketsData.length === 0 
                      ? "No support tickets have been submitted yet"
                      : "Try adjusting your search or filter criteria."
                    }
                  </p>
                </div>
              </div>
            ) : (
              /* Kanban Board */
              <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-300 p-3 sm:p-4 md:p-6">
                {/* Desktop: Horizontal Kanban */}
                <div className="hidden lg:block">
                  <div className="flex gap-3 pb-4">
                    {statusColumns.map((column) => {
                      const columnTickets = ticketsByStatus[column.id] || [];
                      const isDragOver = dragOverColumn === column.id;
                      return (
                        <div 
                          key={column.id} 
                          className="flex-1 min-w-0"
                          onDragOver={(e) => handleDragOver(e, column.id)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, column.id)}
                        >
                          {/* Column Header */}
                          <div className={`mb-3 p-2.5 rounded-lg border ${getColumnHeaderColor(column.color)}`}>
                            <div className="flex items-center justify-between">
                              <h3 className="font-semibold text-sm">
                                {column.title}
                              </h3>
                              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-white/80">
                                {columnTickets.length}
                              </span>
                            </div>
                          </div>

                          {/* Tickets in Column */}
                          <div 
                            className={`space-y-2 min-h-[200px] max-h-[calc(100vh-450px)] overflow-y-auto transition-colors ${
                              isDragOver ? 'bg-blue-50/50 rounded-lg p-2' : ''
                            }`}
                          >
                            {columnTickets.length === 0 ? (
                              <div className={`text-center py-8 text-gray-400 text-xs ${isDragOver ? 'border-2 border-dashed border-blue-300 rounded-lg' : ''}`}>
                                {isDragOver ? 'Drop here' : 'No tickets'}
                              </div>
                            ) : (
                              columnTickets.map((ticket) => (
                                <div
                                  key={ticket.id}
                                  draggable
                                  onDragStart={(e) => handleDragStart(e, ticket)}
                                  onDragEnd={handleDragEnd}
                                  onClick={() => setSelectedTicket(ticket)}
                                  className="bg-white border border-gray-300 rounded-lg p-3 hover:shadow-md transition-all cursor-move active:cursor-grabbing"
                                >
                                  <div className="space-y-2">
                                    {/* Subject */}
                                    <h4 className="font-semibold text-sm text-gray-900 line-clamp-2">
                                      {ticket.subject}
                                    </h4>

                                    {/* Date */}
                                    <div className="flex items-center gap-1 text-xs text-gray-500">
                                      <Calendar className="w-3 h-3 flex-shrink-0" />
                                      <span className="truncate">{formatDate(ticket.createdAt)}</span>
                                    </div>
                                  </div>
                                </div>
                              ))
                            )}
                            {/* Drop zone when column has tickets */}
                            {columnTickets.length > 0 && isDragOver && (
                              <div className="border-2 border-dashed border-blue-300 rounded-lg p-4 text-center text-xs text-blue-600 bg-blue-50/50">
                                Drop here
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Mobile: Vertical Stack */}
                <div className="lg:hidden space-y-4">
                  {statusColumns.map((column) => {
                    const columnTickets = ticketsByStatus[column.id] || [];
                    const isDragOver = dragOverColumn === column.id;
                    return (
                      <div 
                        key={column.id}
                        onDragOver={(e) => handleDragOver(e, column.id)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, column.id)}
                      >
                        {/* Column Header */}
                        <div className={`mb-3 p-2.5 rounded-lg border ${getColumnHeaderColor(column.color)}`}>
                          <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-sm">
                              {column.title}
                            </h3>
                            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-white/80">
                              {columnTickets.length}
                            </span>
                          </div>
                        </div>

                        {/* Tickets Grid */}
                        <div 
                          className={`grid grid-cols-1 sm:grid-cols-2 gap-2 transition-colors ${
                            isDragOver ? 'bg-blue-50/50 rounded-lg p-2' : ''
                          }`}
                        >
                          {columnTickets.length === 0 ? (
                            <div className={`col-span-full text-center py-6 text-gray-400 text-xs ${isDragOver ? 'border-2 border-dashed border-blue-300 rounded-lg' : ''}`}>
                              {isDragOver ? 'Drop here' : 'No tickets'}
                            </div>
                          ) : (
                            <>
                              {columnTickets.map((ticket) => (
                                <div
                                  key={ticket.id}
                                  draggable
                                  onDragStart={(e) => handleDragStart(e, ticket)}
                                  onDragEnd={handleDragEnd}
                                  onClick={() => setSelectedTicket(ticket)}
                                  className="bg-white border border-gray-300 rounded-lg p-3 hover:shadow-md transition-all cursor-move active:cursor-grabbing"
                                >
                                  <div className="space-y-2">
                                    {/* Subject */}
                                    <h4 className="font-semibold text-sm text-gray-900 line-clamp-2">
                                      {ticket.subject}
                                    </h4>

                                    {/* Date */}
                                    <div className="flex items-center gap-1 text-xs text-gray-500">
                                      <Calendar className="w-3 h-3 flex-shrink-0" />
                                      <span className="truncate">{formatDate(ticket.createdAt)}</span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                              {/* Drop zone when column has tickets */}
                              {isDragOver && (
                                <div className="col-span-full border-2 border-dashed border-blue-300 rounded-lg p-4 text-center text-xs text-blue-600 bg-blue-50/50">
                                  Drop here
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Ticket Detail Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/50">
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-gray-300">
            {/* Modal Header */}
            <div className="bg-white border-b border-gray-200 p-4 sm:p-6">
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900 truncate">
                    {selectedTicket.subject}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {getCategoryLabel(selectedTicket.category)}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedTicket(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              <div className="space-y-4">
                {/* User Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-gray-200">
                  <div>
                    <label className="text-xs text-gray-500">User</label>
                    <p className="text-sm font-medium text-gray-900">{selectedTicket.username}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Email</label>
                    <p className="text-sm font-medium text-gray-900">{selectedTicket.email || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Account ID</label>
                    <p className="text-sm font-medium text-gray-900">{selectedTicket.accountId}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Created</label>
                    <p className="text-sm font-medium text-gray-900">{formatDate(selectedTicket.createdAt)}</p>
                  </div>
                </div>

                {/* Message */}
                <div>
                  <label className="text-xs text-gray-500 mb-2 block">Message</label>
                  <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 whitespace-pre-wrap">
                    {selectedTicket.message}
                  </div>
                </div>

                {/* Status Update */}
                <div>
                  <label className="text-xs text-gray-500 mb-2 block">Update Status</label>
                  <div className="flex flex-wrap gap-2">
                    {statusColumns.map((column) => (
                      <button
                        key={column.id}
                        onClick={() => handleStatusChange(selectedTicket.id, column.id)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                          selectedTicket.status === column.id
                            ? getStatusBadgeColor(column.id)
                            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {column.title}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-gray-200 p-4 sm:p-6 bg-gray-50">
              <button
                onClick={() => setSelectedTicket(null)}
                className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium text-sm sm:text-base"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
