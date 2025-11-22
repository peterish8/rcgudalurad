"use client";

import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Layout } from "@/components/Layout";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Calendar, Image as ImageIcon, Users, Loader2 } from "lucide-react";

export default function DashboardPage() {
  const [stats, setStats] = useState<{
    events: number | null;
    gallery: number | null;
    boardMembers: number | null;
  }>({
    events: null,
    gallery: null,
    boardMembers: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [eventsRes, galleryRes, membersRes] = await Promise.all([
          supabase.from("events").select("id", { count: "exact", head: true }),
          supabase.from("gallery").select("id", { count: "exact", head: true }),
          supabase
            .from("board_members")
            .select("id", { count: "exact", head: true }),
        ]);

        if (eventsRes.error) throw eventsRes.error;
        if (galleryRes.error) throw galleryRes.error;
        if (membersRes.error) throw membersRes.error;

        setStats({
          events: eventsRes.count ?? 0,
          gallery: galleryRes.count ?? 0,
          boardMembers: membersRes.count ?? 0,
        });
        setError(null);
      } catch (err: any) {
        console.error("Error fetching stats:", err);
        setError(
          err.message || err.code || "Failed to fetch statistics from Supabase"
        );
        setStats({
          events: null,
          gallery: null,
          boardMembers: null,
        });
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  const statCards = [
    {
      name: "Events",
      value: stats.events,
      icon: Calendar,
      href: "/events",
      color: "bg-blue-500",
    },
    {
      name: "Gallery Images",
      value: stats.gallery,
      icon: ImageIcon,
      href: "/gallery",
      color: "bg-purple-500",
    },
    {
      name: "Board Members",
      value: stats.boardMembers,
      icon: Users,
      href: "/board-members",
      color: "bg-green-500",
    },
  ].filter((card) => card.value !== null);

  return (
    <ProtectedRoute>
      <Layout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Dashboard
            </h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Welcome to the admin dashboard. Manage your content here.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded">
              <strong>Error fetching data from Supabase:</strong> {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="text-red-600 dark:text-red-400">
                Unable to load statistics. Please check your Supabase
                connection.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {statCards.map((card) => {
                const Icon = card.icon;
                return (
                  <a
                    key={card.name}
                    href={card.href}
                    className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex items-center">
                      <div className={`${card.color} p-3 rounded-lg`}>
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          {card.name}
                        </p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                          {card.value !== null ? card.value : "-"}
                        </p>
                      </div>
                    </div>
                  </a>
                );
              })}
            </div>
          )}

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Quick Actions
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <a
                href="/events"
                className="flex items-center justify-center px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <Calendar className="h-5 w-5 mr-2" />
                Manage Events
              </a>
              <a
                href="/gallery"
                className="flex items-center justify-center px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <ImageIcon className="h-5 w-5 mr-2" />
                Manage Gallery
              </a>
              <a
                href="/board-members"
                className="flex items-center justify-center px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <Users className="h-5 w-5 mr-2" />
                Manage Board Members
              </a>
            </div>
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
