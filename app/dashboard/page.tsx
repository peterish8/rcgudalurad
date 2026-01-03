"use client";

import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Layout } from "@/components/Layout";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Calendar, 
  Megaphone, 
  Users, 
  MessageSquare, 
  Loader2, 
  ArrowRight,
  TrendingUp,
  Clock,
  CheckCircle2
} from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";

interface DashboardStats {
  events: { total: number; upcoming: number };
  ads: { total: number; active: number };
  boardMembers: number;
  unreadMessages: number;
}

interface RecentActivity {
  id: string;
  type: 'message' | 'event';
  title: string;
  subtitle: string;
  date: string;
  is_read?: boolean;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    events: { total: 0, upcoming: 0 },
    ads: { total: 0, active: 0 },
    boardMembers: 0,
    unreadMessages: 0,
  });
  
  const [recentMessages, setRecentMessages] = useState<any[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [activeAds, setActiveAds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        // 1. Fetch Counts
        const [
          eventsTotal, 
          eventsUpcoming,
          adsTotal, 
          adsActive, 
          membersTotal, 
          messagesUnread
        ] = await Promise.all([
          supabase.from("events").select("id", { count: "exact", head: true }),
          supabase.from("events").select("id", { count: "exact", head: true }).eq("is_upcoming", true),
          supabase.from("community_ads").select("id", { count: "exact", head: true }),
          supabase.from("community_ads").select("id", { count: "exact", head: true }).eq("is_active", true),
          supabase.from("board_members").select("id", { count: "exact", head: true }),
          supabase.from("contact_submissions").select("id", { count: "exact", head: true }).eq("is_read", false),
        ]);

        // 2. Fetch Recent Content
        const { data: messages } = await supabase
          .from("contact_submissions")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(5);

        const { data: nextEvents } = await supabase
          .from("events")
          .select("*")
          .eq("is_upcoming", true)
          .order("event_date", { ascending: true })
          .limit(3);

        const { data: activeCommunityAds } = await supabase
          .from("community_ads")
          .select("*")
          .eq("is_active", true)
          .order("display_order", { ascending: true })
          .limit(4);

        setStats({
          events: { 
            total: eventsTotal.count ?? 0, 
            upcoming: eventsUpcoming.count ?? 0 
          },
          ads: { 
            total: adsTotal.count ?? 0, 
            active: adsActive.count ?? 0 
          },
          boardMembers: membersTotal.count ?? 0,
          unreadMessages: messagesUnread.count ?? 0,
        });

        setRecentMessages(messages || []);
        setUpcomingEvents(nextEvents || []);
        setActiveAds(activeCommunityAds || []);
        setError(null);
      } catch (err: any) {
        console.error("Error fetching dashboard data:", err);
        setError(err.message || "Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  const statCards = [
    {
      name: "Total Events",
      value: stats.events.total,
      subValue: `${stats.events.upcoming} Upcoming`,
      icon: Calendar,
      href: "/events",
      color: "from-blue-500 to-blue-600",
      iconColor: "text-blue-100",
    },
    {
      name: "Community Ads",
      value: stats.ads.total,
      subValue: `${stats.ads.active} Active`,
      icon: Megaphone,
      href: "/community-ads",
      color: "from-purple-500 to-purple-600",
      iconColor: "text-purple-100",
    },
    {
      name: "Board Members",
      value: stats.boardMembers,
      subValue: "Active Members",
      icon: Users,
      href: "/board-members",
      color: "from-green-500 to-green-600",
      iconColor: "text-green-100",
    },
    {
      name: "Unread Messages",
      value: stats.unreadMessages,
      subValue: "Requires Attention",
      icon: MessageSquare,
      href: "/contact-submissions",
      color: "from-orange-500 to-orange-600",
      iconColor: "text-orange-100",
    },
  ];

  return (
    <ProtectedRoute>
      <Layout>
        <div className="space-y-4 animate-in fade-in duration-500">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Dashboard Overview
            </h1>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg flex items-center">
              <span className="mr-2">⚠️</span> {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Stats Grid */}
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {statCards.map((card) => {
                  const Icon = card.icon;
                  return (
                    <Link
                      key={card.name}
                      href={card.href}
                      className="group relative overflow-hidden bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all duration-300"
                    >
                      <div className={`absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity`}>
                         <Icon className="w-24 h-24 transform rotate-12 -translate-y-4 translate-x-4" />
                      </div>
                      <div className="p-6 relative z-10">
                        <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${card.color} shadow-lg mb-4`}>
                          <Icon className={`h-6 w-6 ${card.iconColor}`} />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                          {card.value}
                        </h3>
                        <p className="text-base font-medium text-gray-600 dark:text-gray-300">
                          {card.name}
                        </p>
                        <p className="text-xs text-gray-400 mt-2 font-medium bg-gray-50 dark:bg-gray-700/50 inline-block px-2 py-1 rounded-md">
                          {card.subValue}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Recent Activity (Messages) & Ads */}
                <div className="lg:col-span-2 space-y-6">
                  {/* 1. Recent Messages */}
                  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                     <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                <MessageSquare className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Recent Messages</h2>
                        </div>
                        <Link href="/contact-submissions" className="text-sm font-medium text-primary hover:text-primary-dark hover:underline flex items-center">
                            View All <ArrowRight className="h-4 w-4 ml-1" />
                        </Link>
                     </div>
                     
                     <div className="space-y-4 h-64 overflow-y-auto pr-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-blue-100 dark:[&::-webkit-scrollbar-thumb]:bg-blue-900/30 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-blue-200 dark:hover:[&::-webkit-scrollbar-thumb]:bg-blue-800/50 transition-colors">
                        {recentMessages.length > 0 ? (
                            recentMessages.map((msg) => (
                                <div key={msg.id} className={`flex items-start gap-4 p-4 rounded-xl transition-colors ${!msg.is_read ? "bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30" : "bg-gray-50 dark:bg-gray-700/30 border border-transparent"}`}>
                                    <div className={`w-2 h-2 mt-2 rounded-full flex-shrink-0 ${!msg.is_read ? "bg-blue-500" : "bg-gray-300"}`} />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <h4 className={`text-sm font-semibold truncate ${!msg.is_read ? "text-gray-900 dark:text-white" : "text-gray-600 dark:text-gray-400"}`}>
                                                {msg.name}
                                            </h4>
                                            <span className="text-xs text-gray-400 whitespace-nowrap ml-2">
                                                {format(new Date(msg.created_at), "MMM d, h:mm a")}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 truncate">
                                            {msg.email} • {msg.phone}
                                        </p>
                                        <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                                            {msg.message}
                                        </p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-gray-500">
                                <MessageSquare className="h-8 w-8 mb-2 opacity-50" />
                                <p>No recent messages</p>
                            </div>
                        )}
                     </div>
                  </div>

                  {/* 2. Active Ads Overview (Sliding) */}
                  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                     <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-sm">
                                <Megaphone className="h-5 w-5 text-white" />
                            </div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Active Ads</h2>
                        </div>
                        <Link href="/community-ads" className="text-sm font-medium text-purple-600 hover:text-purple-700 hover:underline flex items-center">
                            Manage Ads <ArrowRight className="h-4 w-4 ml-1" />
                        </Link>
                     </div>
                     
                     <div className="flex gap-4 overflow-x-auto pb-2 -mx-2 px-2 [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-purple-200 dark:[&::-webkit-scrollbar-thumb]:bg-purple-900/50 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-purple-300 dark:hover:[&::-webkit-scrollbar-thumb]:bg-purple-800/50 transition-colors">
                        {/* Create New Ad Button (Always First) */}
                         <Link href="/community-ads" className="flex-shrink-0 w-40 flex flex-col items-center justify-center p-4 border-2 border-dashed border-purple-200 dark:border-purple-800/30 rounded-xl hover:bg-purple-50 dark:hover:bg-purple-900/10 hover:border-purple-400 dark:hover:border-purple-500/50 transition-all group h-40">
                             <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-full text-purple-600 dark:text-purple-400 mb-2 group-hover:scale-110 transition-transform shadow-sm">
                                 <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                 </svg>
                             </div>
                             <span className="text-sm font-bold text-gray-900 dark:text-white">Create Ad</span>
                             <span className="text-[10px] text-gray-500 text-center mt-1 font-medium">Add to carousel</span>
                        </Link>

                       {/* Ads List */}
                       {activeAds.length > 0 ? (
                           activeAds.map((ad) => (
                               <div key={ad.id} className="flex-shrink-0 w-64 h-40 relative group rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-900 shadow-sm transition-all hover:shadow-md">
                                   <img src={ad.image_url} alt={ad.title} className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-300" />
                                   <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-3 text-white">
                                       <div className="font-semibold text-xs truncate mb-1 shadow-black drop-shadow-md">{ad.title}</div>
                                       <div className="flex items-center justify-between text-[10px] text-gray-200 font-medium">
                                           <span className="bg-white/20 px-1.5 py-0.5 rounded backdrop-blur-sm">#{ad.display_order}</span>
                                           <span>{ad.duration_seconds}s</span>
                                       </div>
                                   </div>
                               </div>
                           ))
                       ) : null}
                     </div>
                  </div>
                </div>

                {/* Right Column: Upcoming Events & Quick Actions */}
                <div className="space-y-6">
                    {/* 3. Upcoming Events Card */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                                    <Clock className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                                </div>
                                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Upcoming Events</h2>
                            </div>
                            <Link href="/events" className="text-xs font-medium text-gray-500 hover:text-primary transition-colors">
                                View Calendar
                            </Link>
                        </div>
                        
                        <div className="space-y-4">
                            {upcomingEvents.length > 0 ? (
                                upcomingEvents.map((event) => (
                                    <div key={event.id} className="group flex gap-4 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors border border-gray-100 dark:border-gray-700/50">
                                        <div className="flex-shrink-0 flex flex-col items-center justify-center w-12 h-12 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg">
                                            <span className="text-xs font-bold uppercase">{format(new Date(event.event_date), "MMM")}</span>
                                            <span className="text-lg font-bold leading-none">{format(new Date(event.event_date), "d")}</span>
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate group-hover:text-primary transition-colors">
                                                {event.title}
                                            </h4>
                                            <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">
                                                {event.description || "No description"}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-6 text-gray-500 text-sm">No upcoming events scheduled</div>
                            )}
                        </div>
                        
                        <Link href="/events" className="mt-4 block w-full py-2 text-center text-sm font-medium text-primary bg-primary/5 rounded-lg hover:bg-primary/10 transition-colors">
                            Manage All Events
                        </Link>
                    </div>

                    {/* 4. Quick Actions */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
                            <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" /> 
                            Quick Actions
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                            <Link href="/events" className="flex flex-col items-center justify-center p-3 bg-gray-50 dark:bg-white/5 hover:bg-blue-50 dark:hover:bg-white/10 rounded-xl transition-colors border border-gray-200 dark:border-gray-700 group">
                                <Calendar className="h-6 w-6 mb-2 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform" />
                                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Add Event</span>
                            </Link>
                            <Link href="/community-ads" className="flex flex-col items-center justify-center p-3 bg-gray-50 dark:bg-white/5 hover:bg-purple-50 dark:hover:bg-white/10 rounded-xl transition-colors border border-gray-200 dark:border-gray-700 group">
                                <Megaphone className="h-6 w-6 mb-2 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform" />
                                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">New Ad</span>
                            </Link>
                            <Link href="/contact-submissions" className="flex flex-col items-center justify-center p-3 bg-gray-50 dark:bg-white/5 hover:bg-orange-50 dark:hover:bg-white/10 rounded-xl transition-colors border border-gray-200 dark:border-gray-700 group">
                                <MessageSquare className="h-6 w-6 mb-2 text-orange-600 dark:text-orange-400 group-hover:scale-110 transition-transform" />
                                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Messages</span>
                            </Link>
                             <Link href="/board-members" className="flex flex-col items-center justify-center p-3 bg-gray-50 dark:bg-white/5 hover:bg-green-50 dark:hover:bg-white/10 rounded-xl transition-colors border border-gray-200 dark:border-gray-700 group">
                                <Users className="h-6 w-6 mb-2 text-green-600 dark:text-green-400 group-hover:scale-110 transition-transform" />
                                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Members</span>
                            </Link>
                        </div>
                    </div>
                </div>
              </div>

            </>
          )}
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
