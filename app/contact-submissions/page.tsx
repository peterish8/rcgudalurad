"use client";

import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Layout } from "@/components/Layout";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import {
  MessageSquare,
  Search,
  Loader2,
  Trash2,
  Mail,
  MailOpen,
  Phone,
  Copy,
  ExternalLink,
  Check,
  ChevronDown,
  ChevronUp,
  Download,
  CheckCheck,
  X,
} from "lucide-react";
import { formatDistanceToNow, isThisWeek } from "date-fns";
import { Modal } from "@/components/Modal";

interface ContactSubmission {
  id: string;
  name: string;
  phone: string;
  message: string;
  created_at: string;
  is_read: boolean;
}

type FilterType = "all" | "unread" | "read";

export default function ContactSubmissionsPage() {
  const [submissions, setSubmissions] = useState<ContactSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchSubmissions();
  }, []);

  async function fetchSubmissions() {
    try {
      setFetchError(null);
      const { data, error } = await supabase
        .from("contact_submissions")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setSubmissions(data || []);
    } catch (err: any) {
      console.error("Error fetching contact submissions:", err);
      setFetchError(
        err.message || err.code || "Failed to fetch contact submissions from Supabase"
      );
      setSubmissions([]);
    } finally {
      setLoading(false);
    }
  }

  // Stats calculations
  const stats = useMemo(() => {
    const total = submissions.length;
    const unread = submissions.filter((s) => !s.is_read).length;
    const thisWeek = submissions.filter((s) =>
      isThisWeek(new Date(s.created_at), { weekStartsOn: 1 })
    ).length;
    return { total, unread, thisWeek };
  }, [submissions]);

  // Filtered submissions
  const filteredSubmissions = useMemo(() => {
    return submissions.filter((submission) => {
      // Filter by read status
      if (filter === "unread" && submission.is_read) return false;
      if (filter === "read" && !submission.is_read) return false;

      // Filter by search term
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        return (
          submission.name.toLowerCase().includes(search) ||
          submission.phone.toLowerCase().includes(search)
        );
      }

      return true;
    });
  }, [submissions, filter, searchTerm]);

  const handleToggleReadStatus = async (submission: ContactSubmission) => {
    setActionLoading(submission.id);
    try {
      const { error } = await supabase
        .from("contact_submissions")
        .update({ is_read: !submission.is_read })
        .eq("id", submission.id);

      if (error) throw error;

      setSubmissions((prev) =>
        prev.map((s) =>
          s.id === submission.id ? { ...s, is_read: !s.is_read } : s
        )
      );
    } catch (err: any) {
      console.error("Error updating read status:", err);
      setError(err.message || "Failed to update read status");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = (id: string) => {
    setDeleteTarget(id);
    setDeletePassword("");
    setDeleteError(null);
    setIsDeleteDialogOpen(true);
  };

  const closeDeleteDialog = () => {
    setIsDeleteDialogOpen(false);
    setDeleteTarget(null);
    setDeletePassword("");
    setDeleteError(null);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    // Check password
    if (deletePassword !== "confirm123") {
      setDeleteError("Incorrect password. Please enter 'confirm123' to delete.");
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);

    try {
      const { error, count } = await supabase
        .from("contact_submissions")
        .delete()
        .eq("id", deleteTarget)
        .select();

      if (error) {
        console.error("Supabase delete error:", error);
        throw error;
      }

      // Refresh from database to ensure sync
      await fetchSubmissions();
      closeDeleteDialog();
    } catch (err: any) {
      console.error("Error deleting submission:", err);
      setDeleteError(err.message || "Failed to delete submission. Check RLS policies.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCopyPhone = async (phone: string) => {
    try {
      await navigator.clipboard.writeText(phone);
      setCopiedPhone(phone);
      setTimeout(() => setCopiedPhone(null), 2000);
    } catch (err) {
      console.error("Failed to copy phone:", err);
    }
  };

  const handleOpenWhatsApp = (phone: string) => {
    // Remove any non-numeric characters except +
    const cleanPhone = phone.replace(/[^\d+]/g, "");
    window.open(`https://wa.me/${cleanPhone}`, "_blank");
  };

  const handleMarkAllAsRead = async () => {
    const unreadIds = submissions.filter((s) => !s.is_read).map((s) => s.id);
    if (unreadIds.length === 0) return;

    setActionLoading("bulk");
    try {
      const { error } = await supabase
        .from("contact_submissions")
        .update({ is_read: true })
        .in("id", unreadIds);

      if (error) throw error;

      setSubmissions((prev) =>
        prev.map((s) => ({ ...s, is_read: true }))
      );
    } catch (err: any) {
      console.error("Error marking all as read:", err);
      setError(err.message || "Failed to mark all as read");
    } finally {
      setActionLoading(null);
    }
  };

  const handleExportCSV = () => {
    const headers = ["Name", "Phone", "Message", "Date", "Read Status"];
    const rows = submissions.map((s) => [
      s.name,
      s.phone,
      `"${s.message.replace(/"/g, '""')}"`,
      new Date(s.created_at).toLocaleString(),
      s.is_read ? "Read" : "Unread",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `contact_submissions_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

  const formatRelativeTime = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  };

  return (
    <ProtectedRoute>
      <Layout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Contact Submissions
              </h1>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                View and manage contact form submissions
              </p>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <div className="bg-blue-500 p-3 rounded-lg">
                  <MessageSquare className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Total Messages
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {loading ? "-" : stats.total}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <div className="bg-red-500 p-3 rounded-lg relative">
                  <Mail className="h-6 w-6 text-white" />
                  {stats.unread > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center ring-2 ring-white dark:ring-gray-800">
                      {stats.unread > 9 ? "9+" : stats.unread}
                    </span>
                  )}
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Unread
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {loading ? "-" : stats.unread}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <div className="bg-green-500 p-3 rounded-lg">
                  <MessageSquare className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    This Week
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {loading ? "-" : stats.thisWeek}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Filters and Search */}
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Filter Toggles */}
            <div className="flex rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600">
              {(["all", "unread", "read"] as FilterType[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${
                    filter === f
                      ? "bg-primary text-white"
                      : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Bulk Actions */}
            <div className="flex gap-2">
              <button
                onClick={handleMarkAllAsRead}
                disabled={stats.unread === 0 || actionLoading === "bulk"}
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {actionLoading === "bulk" ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCheck className="h-4 w-4 mr-2" />
                )}
                Mark All Read
              </button>
              <button
                onClick={handleExportCSV}
                disabled={submissions.length === 0}
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </button>
            </div>
          </div>

          {/* Error messages */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded">
              <strong>Error:</strong> {error}
              <button
                onClick={() => setError(null)}
                className="float-right text-red-700 dark:text-red-400 hover:text-red-900"
              >
                ×
              </button>
            </div>
          )}

          {fetchError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded">
              <strong>Error fetching data from Supabase:</strong> {fetchError}
            </div>
          )}

          {/* Message List */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : fetchError ? (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <MessageSquare className="mx-auto h-12 w-12 text-red-400" />
              <h3 className="mt-2 text-sm font-medium text-red-600 dark:text-red-400">
                Unable to load submissions
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Please check your Supabase connection and try again.
              </p>
            </div>
          ) : filteredSubmissions.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="mx-auto w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                <MessageSquare className="h-12 w-12 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {submissions.length === 0
                  ? "No messages yet"
                  : "No messages match your filters"}
              </h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                {submissions.length === 0
                  ? "When visitors submit the contact form, their messages will appear here."
                  : "Try adjusting your search or filter settings."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredSubmissions.map((submission) => (
                <div
                  key={submission.id}
                  className={`bg-white dark:bg-gray-800 rounded-lg shadow border transition-all ${
                    !submission.is_read
                      ? "border-l-4 border-l-blue-500 border-gray-200 dark:border-gray-700"
                      : "border-gray-200 dark:border-gray-700"
                  }`}
                >
                  {/* Card Header - Clickable to expand */}
                  <button
                    onClick={() =>
                      setExpandedId(
                        expandedId === submission.id ? null : submission.id
                      )
                    }
                    className="w-full text-left p-4 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset rounded-lg"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                            {submission.name}
                          </h3>
                          {!submission.is_read && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                              NEW
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-2">
                          <span className="flex items-center">
                            <Phone className="h-4 w-4 mr-1" />
                            {submission.phone}
                          </span>
                          <span>{formatRelativeTime(submission.created_at)}</span>
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 line-clamp-2">
                          {submission.message}
                        </p>
                      </div>
                      <div className="ml-4 flex-shrink-0">
                        {expandedId === submission.id ? (
                          <ChevronUp className="h-5 w-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-gray-400" />
                        )}
                      </div>
                    </div>
                  </button>

                  {/* Expanded Content */}
                  {expandedId === submission.id && (
                    <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-700">
                      <div className="pt-4">
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Full Message:
                        </h4>
                        <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
                          {submission.message}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleReadStatus(submission);
                          }}
                          disabled={actionLoading === submission.id}
                          className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors"
                        >
                          {actionLoading === submission.id ? (
                            <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                          ) : submission.is_read ? (
                            <Mail className="h-4 w-4 mr-1.5" />
                          ) : (
                            <MailOpen className="h-4 w-4 mr-1.5" />
                          )}
                          {submission.is_read ? "Mark Unread" : "Mark Read"}
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyPhone(submission.phone);
                          }}
                          className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                        >
                          {copiedPhone === submission.phone ? (
                            <>
                              <Check className="h-4 w-4 mr-1.5 text-green-500" />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="h-4 w-4 mr-1.5" />
                              Copy Phone
                            </>
                          )}
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenWhatsApp(submission.phone);
                          }}
                          className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md border border-green-500 text-green-600 dark:text-green-400 bg-white dark:bg-gray-700 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                        >
                          <ExternalLink className="h-4 w-4 mr-1.5" />
                          WhatsApp
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(submission.id);
                          }}
                          className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 bg-white dark:bg-gray-700 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                          <Trash2 className="h-4 w-4 mr-1.5" />
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Delete Confirmation Dialog with Password */}
          <Modal
            isOpen={isDeleteDialogOpen}
            onClose={closeDeleteDialog}
            title="Delete Submission"
          >
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Are you sure you want to delete this contact submission? This action cannot be undone.
              </p>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Enter password to confirm deletion:
                </label>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="Enter confirmation password"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      confirmDelete();
                    }
                  }}
                />
              </div>

              {deleteError && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-3 py-2 rounded text-sm">
                  {deleteError}
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  onClick={closeDeleteDialog}
                  disabled={isDeleting}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={isDeleting || !deletePassword}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="h-4 w-4 inline animate-spin mr-2" />
                      Deleting...
                    </>
                  ) : (
                    "Delete"
                  )}
                </button>
              </div>
            </div>
          </Modal>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
