"use client";

import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Layout } from "@/components/Layout";
import { PageHeader } from "@/components/PageHeader";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useToast } from "@/components/Toast";
import { useEffect, useState, useMemo } from "react";
import { api, convex, errorMessage, getToken } from "@/lib/convex";
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
  const toast = useToast();
  const [submissions, setSubmissions] = useState<ContactSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
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
      const data = await convex.query(api.contact.list, { token: getToken() });

      setSubmissions(data || []);
    } catch (err: any) {
      console.error("Error fetching contact submissions:", err);
      setFetchError(
        errorMessage(err, "Failed to fetch contact submissions")
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
      await convex.mutation(api.contact.setRead, {
        token: getToken(),
        id: submission.id,
        is_read: !submission.is_read,
      });

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
    setDeleteError(null);
    setIsDeleteDialogOpen(true);
  };

  const closeDeleteDialog = () => {
    setIsDeleteDialogOpen(false);
    setDeleteTarget(null);
    setDeleteError(null);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      await convex.mutation(api.contact.remove, { token: getToken(), id: deleteTarget });

      // Refresh from database to ensure sync
      await fetchSubmissions();
      closeDeleteDialog();
      toast.success("Message deleted.");
    } catch (err: any) {
      console.error("Error deleting submission:", err);
      toast.error(errorMessage(err, "Couldn't delete the message. Please try again."));
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
      await convex.mutation(api.contact.markAllRead, { token: getToken() });

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
          <PageHeader
            title="Messages"
            description="What people sent through the Contact Us form on the website. Opening a message marks it as read."
            actions={
              <button type="button" onClick={handleExportCSV} disabled={submissions.length === 0} className="btn-secondary">
                <Download className="h-4 w-4" aria-hidden />
                Download as spreadsheet
              </button>
            }
          />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div role="group" aria-label="Show" className="inline-flex rounded-lg border border-gray-300 p-1 dark:border-gray-600">
              {([
                ["all", "All", stats.total],
                ["unread", "Unread", stats.unread],
                ["read", "Read", stats.total - stats.unread],
              ] as [FilterType, string, number][]).map(([f, label, n]) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  aria-pressed={filter === f}
                  className={`tabular min-h-[36px] rounded-md px-3 text-sm font-medium transition-colors duration-150 ${
                    filter === f
                      ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                      : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                  }`}
                >
                  {label} {loading ? "" : n}
                </button>
              ))}
            </div>

            <div className="relative flex-1">
              <label htmlFor="messages-search" className="sr-only">Search messages</label>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500" aria-hidden />
              <input
                id="messages-search"
                type="search"
                placeholder="Search by name or phone"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="field pl-10"
              />
            </div>

            <button
              type="button"
              onClick={handleMarkAllAsRead}
              disabled={stats.unread === 0 || actionLoading === "bulk"}
              className="btn-secondary"
            >
              {actionLoading === "bulk" ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <CheckCheck className="h-4 w-4" aria-hidden />
              )}
              Mark all as read
            </button>
          </div>

          {/* Error messages */}
          {error && (
            <div role="alert" className="flex items-start justify-between gap-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
              <span>{error}</span>
              <button type="button" onClick={() => setError(null)} className="btn -my-2 -mr-2 h-10 px-3 hover:bg-red-100 dark:hover:bg-red-900/40">
                Dismiss
              </button>
            </div>
          )}

          {fetchError && (
            <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
              <strong>Error fetching data:</strong> {fetchError}
            </div>
          )}

          {/* Message List */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
            </div>
          ) : fetchError ? (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <MessageSquare className="mx-auto h-12 w-12 text-red-400" aria-hidden />
              <h3 className="mt-2 text-sm font-medium text-red-600 dark:text-red-400">
                Unable to load submissions
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Please check your connection and try again.
              </p>
            </div>
          ) : filteredSubmissions.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="mx-auto w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                <MessageSquare className="h-12 w-12 text-gray-400" aria-hidden />
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
                  className={`rounded-xl border bg-white transition-colors duration-150 dark:bg-gray-800 ${
                    !submission.is_read
                      ? "border-gray-300 dark:border-gray-600"
                      : "border-gray-200 dark:border-gray-700"
                  }`}
                >
                  {/* Card Header - Clickable to expand */}
                  <button
                    type="button"
                    aria-expanded={expandedId === submission.id}
                    onClick={() => {
                      const opening = expandedId !== submission.id;
                      setExpandedId(opening ? submission.id : null);
                      if (opening && !submission.is_read) handleToggleReadStatus(submission);
                    }}
                    className="w-full rounded-lg p-4 text-left"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                            {submission.name}
                          </h3>
                          {!submission.is_read && (
                            <span className="inline-flex items-center rounded-full bg-sky-100 px-2 py-0.5 text-sm font-medium text-sky-900 dark:bg-sky-900/40 dark:text-sky-200">
                              Unread
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-2">
                          <span className="flex items-center">
                            <Phone className="h-4 w-4 mr-1" aria-hidden />
                            {submission.phone}
                          </span>
                          <span>{formatRelativeTime(submission.created_at)}</span>
                        </div>
                        <p className="line-clamp-2 text-base text-gray-700 dark:text-gray-300">
                          {submission.message}
                        </p>
                      </div>
                      <div className="ml-4 flex-shrink-0">
                        {expandedId === submission.id ? (
                          <ChevronUp className="h-5 w-5 text-gray-400" aria-hidden />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-gray-400" aria-hidden />
                        )}
                      </div>
                    </div>
                  </button>

                  {/* Expanded Content */}
                  {expandedId === submission.id && (
                    <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-700">
                      <div className="pt-4">
                        <p className="whitespace-pre-wrap text-base text-gray-800 dark:text-gray-200">
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
                          className="btn-secondary"
                        >
                          {actionLoading === submission.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                          ) : submission.is_read ? (
                            <Mail className="h-4 w-4" aria-hidden />
                          ) : (
                            <MailOpen className="h-4 w-4" aria-hidden />
                          )}
                          {submission.is_read ? "Mark as unread" : "Mark as read"}
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyPhone(submission.phone);
                          }}
                          className="btn-secondary"
                        >
                          {copiedPhone === submission.phone ? (
                            <>
                              <Check className="h-4 w-4" aria-hidden />
                              Copied
                            </>
                          ) : (
                            <>
                              <Copy className="h-4 w-4" aria-hidden />
                              Copy number
                            </>
                          )}
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenWhatsApp(submission.phone);
                          }}
                          className="btn-secondary"
                        >
                          <ExternalLink className="h-4 w-4" aria-hidden />
                          WhatsApp
                          <span className="sr-only">(opens in a new tab)</span>
                        </button>
                        <a href={`tel:${submission.phone.replace(/[^\d+]/g, "")}`} className="btn-secondary">
                          <Phone className="h-4 w-4" aria-hidden />
                          Call
                        </a>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(submission.id);
                          }}
                          className="btn border border-red-300 bg-white text-red-700 hover:bg-red-50 dark:border-red-800 dark:bg-gray-800 dark:text-red-300 dark:hover:bg-red-900/30 sm:ml-auto"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden />
                          Delete<span className="sr-only"> message from {submission.name}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <ConfirmDialog
            isOpen={isDeleteDialogOpen}
            onClose={closeDeleteDialog}
            onConfirm={confirmDelete}
            title="Delete this message?"
            message="You won't be able to get it back. Download a spreadsheet first if you need a copy."
            confirmText="Delete message"
            danger
          />
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
