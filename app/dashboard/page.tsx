"use client";

import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Layout } from "@/components/Layout";
import { useEffect, useState } from "react";
import { api, convex, errorMessage, getToken } from "@/lib/convex";
import { Loader2, Plus } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";

interface Overview {
  counts: {
    eventsTotal: number;
    eventsUpcoming: number;
    adsTotal: number;
    adsActive: number;
    membersTotal: number;
    messagesUnread: number;
  };
  recentMessages: { id: string; name: string; message: string; created_at: string; is_read: boolean }[];
  nextEvents: { id: string; title: string; event_date: string }[];
}

/** Whole days from today to a YYYY-MM-DD date. */
function daysUntil(date: string) {
  const day = 86_400_000;
  return Math.round((new Date(date).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / day);
}

function whenText(date: string) {
  const n = daysUntil(date);
  return n <= 0 ? "today" : n === 1 ? "tomorrow" : `in ${n} days`;
}

export default function DashboardPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    convex
      .query(api.dashboard.overview, { token: getToken() })
      .then((overview: Overview) => setData(overview))
      .catch((err) => {
        console.error("Error fetching dashboard data:", err);
        setError(errorMessage(err, "Couldn't load the dashboard. Please refresh the page."));
      })
      .finally(() => setLoading(false));
  }, []);

  const c = data?.counts;
  const unread = c?.messagesUnread ?? 0;
  const nextEvent = data?.nextEvents[0];

  // The heading answers "does anything need me?" in words, and changes with the data.
  const headline =
    unread === 0 ? "Nothing needs your attention" : `${unread} new ${unread === 1 ? "message is" : "messages are"} waiting`;

  const counts = [
    { label: "Events", value: c?.eventsTotal ?? 0, note: `${c?.eventsUpcoming ?? 0} upcoming`, href: "/events" },
    { label: "Board members", value: c?.membersTotal ?? 0, note: "on the website", href: "/board-members" },
    { label: "Partner ads", value: c?.adsTotal ?? 0, note: `${c?.adsActive ?? 0} showing`, href: "/community-ads" },
    { label: "Unread messages", value: unread, note: unread ? "waiting for you" : "all read", href: "/contact-submissions" },
  ];

  return (
    <ProtectedRoute>
      <Layout>
        {loading ? (
          <div className="flex items-center justify-center py-20" role="status">
            <Loader2 className="h-8 w-8 animate-spin text-gray-500" aria-hidden />
            <span className="sr-only">Loading…</span>
          </div>
        ) : (
          <div className="space-y-8">
            <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">{headline}</h1>
                <p className="mt-1 text-base text-gray-700 dark:text-gray-300">
                  {nextEvent ? (
                    <>
                      Next on the website: <span className="font-medium">{nextEvent.title}</span>,{" "}
                      {whenText(nextEvent.event_date)} ({format(new Date(nextEvent.event_date), "d MMM")}).
                    </>
                  ) : (
                    "No upcoming events yet. Add one so the homepage has something coming up."
                  )}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                {unread > 0 && (
                  <Link href="/contact-submissions" className="btn-secondary">
                    Read messages
                  </Link>
                )}
                <Link href="/events" className="btn-primary">
                  <Plus className="h-5 w-5" aria-hidden />
                  Add event
                </Link>
              </div>
            </header>

            {error && (
              <div
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200"
              >
                {error}
              </div>
            )}

            <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {counts.map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className="block rounded-xl border border-gray-200 bg-white px-4 py-4 transition-colors duration-150 hover:border-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-500"
                  >
                    <span className="block text-sm text-gray-700 dark:text-gray-300">{item.label}</span>
                    <span className="tabular mt-1 block text-3xl font-semibold text-gray-900 dark:text-white">{item.value}</span>
                    <span className="mt-1 block text-sm text-gray-600 dark:text-gray-400">{item.note}</span>
                  </Link>
                </li>
              ))}
            </ul>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <section
                aria-labelledby="dash-messages"
                className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800"
              >
                <div className="mb-2 flex items-center justify-between">
                  <h2 id="dash-messages" className="text-lg font-semibold text-gray-900 dark:text-white">
                    Newest messages
                  </h2>
                  <Link href="/contact-submissions" className="text-sm font-medium text-primary underline-offset-2 hover:underline">
                    All messages
                  </Link>
                </div>
                {data && data.recentMessages.length > 0 ? (
                  <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                    {data.recentMessages.map((msg) => (
                      <li key={msg.id} className="py-3">
                        <div className="flex items-baseline justify-between gap-3">
                          <p className="truncate text-base font-medium text-gray-900 dark:text-white">
                            {msg.name}
                            {!msg.is_read && (
                              <span className="ml-2 rounded-full bg-sky-100 px-2 py-0.5 align-middle text-xs font-medium text-sky-900 dark:bg-sky-900/40 dark:text-sky-200">
                                Unread
                              </span>
                            )}
                          </p>
                          <span className="tabular shrink-0 text-sm text-gray-600 dark:text-gray-400">
                            {format(new Date(msg.created_at), "d MMM, h:mm a")}
                          </span>
                        </div>
                        <p className="mt-0.5 line-clamp-2 text-sm text-gray-700 dark:text-gray-300">{msg.message}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="py-6 text-base text-gray-600 dark:text-gray-400">
                    No messages yet. They arrive here when someone uses the Contact Us form.
                  </p>
                )}
              </section>

              <section
                aria-labelledby="dash-events"
                className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800"
              >
                <div className="mb-2 flex items-center justify-between">
                  <h2 id="dash-events" className="text-lg font-semibold text-gray-900 dark:text-white">
                    Coming up
                  </h2>
                  <Link href="/events" className="text-sm font-medium text-primary underline-offset-2 hover:underline">
                    All events
                  </Link>
                </div>
                {data && data.nextEvents.length > 0 ? (
                  <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                    {data.nextEvents.map((event) => (
                      <li key={event.id} className="flex items-center gap-4 py-3">
                        <div className="tabular flex w-12 shrink-0 flex-col items-center rounded-lg border border-gray-200 py-1 dark:border-gray-600">
                          <span className="text-xs text-gray-600 dark:text-gray-400">{format(new Date(event.event_date), "MMM")}</span>
                          <span className="text-lg font-semibold leading-none text-gray-900 dark:text-white">
                            {format(new Date(event.event_date), "d")}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-base font-medium text-gray-900 dark:text-white">{event.title}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{whenText(event.event_date)}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="py-6 text-base text-gray-600 dark:text-gray-400">No upcoming events.</p>
                )}
              </section>
            </div>
          </div>
        )}
      </Layout>
    </ProtectedRoute>
  );
}
