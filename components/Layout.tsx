"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/components/ThemeProvider";
import { useRouter, usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
  Image as ImageIcon,
  Users,
  MessageSquare,
  LogOut,
  Moon,
  Sun,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Megaphone,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(256); // Default 64 * 4 = 256px (w-64)
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Reset sidebar width when collapsing/expanding manually
  useEffect(() => {
    if (sidebarCollapsed) {
      setSidebarWidth(256); // Reset to default for next expand
    }
  }, [sidebarCollapsed]);

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Events", href: "/events", icon: Calendar },
    { name: "Board Members", href: "/board-members", icon: Users },
    { name: "Community Ads", href: "/community-ads", icon: Megaphone },
    { name: "Contact Submissions", href: "/contact-submissions", icon: MessageSquare },
  ];

  const handleLogout = async () => {
    await signOut();
  };

  // Resize handlers
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const newWidth = e.clientX;
      const maxWidth = window.innerWidth * 0.33; // 1/3 of screen
      const collapseThreshold = 180; // Auto-collapse below this width (higher threshold)
      const minWidth = 80; // Minimum width

      if (newWidth < collapseThreshold) {
        // Auto-collapse when resized too small
        setSidebarCollapsed(true);
        setSidebarWidth(256); // Reset to default for next expand
      } else if (newWidth >= collapseThreshold && newWidth <= maxWidth) {
        // Resize normally - expand if collapsed, or resize if already expanded
        setSidebarWidth(newWidth);
        setSidebarCollapsed(false); // Auto-expand when resizing
      } else if (newWidth > maxWidth) {
        // Cap at max width
        setSidebarWidth(maxWidth);
        setSidebarCollapsed(false);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing && typeof window !== "undefined") {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      if (typeof window !== "undefined") {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
    };
  }, [isResizing]);

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-gray-600 bg-opacity-75 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        ref={sidebarRef}
        className={`fixed inset-y-0 left-0 z-30 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transform lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } ${sidebarCollapsed ? "lg:w-20" : ""} w-64 ${
          !isResizing ? "transition-all duration-300 ease-in-out" : ""
        }`}
        style={{
          width: sidebarCollapsed ? undefined : `${sidebarWidth}px`,
        }}
      >
        <div className="flex flex-col h-full overflow-hidden">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200 dark:border-gray-700">
            {!sidebarCollapsed && (
              <h1 className="text-xl font-bold text-gray-900 dark:text-white truncate">
                RCGudalur Admin
              </h1>
            )}
            {sidebarCollapsed && (
              <div className="w-full flex justify-center">
                <button
                  onClick={() => setSidebarCollapsed(false)}
                  className="w-10 h-10 aspect-square bg-primary rounded-full flex items-center justify-center shadow-lg hover:bg-primary-dark transition-colors"
                >
                  <span className="text-white font-bold text-sm">RC</span>
                </button>
              </div>
            )}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="hidden lg:block text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              >
                {sidebarCollapsed ? (
                  <ChevronRight className="h-5 w-5" />
                ) : (
                  <ChevronLeft className="h-5 w-5" />
                )}
              </button>
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden text-gray-500 dark:text-gray-400"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <button
                  key={item.name}
                  onClick={() => {
                    router.push(item.href);
                    setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors group ${
                    isActive
                      ? "bg-primary text-white"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  } ${sidebarCollapsed ? "justify-center" : ""}`}
                  title={sidebarCollapsed ? item.name : ""}
                >
                  {sidebarCollapsed ? (
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        isActive
                          ? "bg-primary text-white shadow-lg"
                          : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                  ) : (
                    <>
                      <Icon className="h-5 w-5 mr-3" />
                      {item.name}
                    </>
                  )}
                </button>
              );
            })}
          </nav>

          {/* User info and actions */}
          <div className="border-t border-gray-200 dark:border-gray-700 p-4">
            {!sidebarCollapsed && (
              <div className="mb-4 px-4 py-2 text-sm text-gray-600 dark:text-gray-400">
                <p className="font-medium text-gray-900 dark:text-white">
                  {user?.email}
                </p>
              </div>
            )}
            <div className="space-y-2">
              <button
                onClick={toggleTheme}
                className={`w-full flex items-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors min-w-0 ${
                  sidebarCollapsed ? "justify-center" : ""
                }`}
                title={
                  sidebarCollapsed
                    ? theme === "dark"
                      ? "Light Mode"
                      : "Dark Mode"
                    : ""
                }
              >
                {theme === "dark" ? (
                  <Sun
                    className={`h-5 w-5 ${sidebarCollapsed ? "" : "mr-3"}`}
                  />
                ) : (
                  <Moon
                    className={`h-5 w-5 ${sidebarCollapsed ? "" : "mr-3"}`}
                  />
                )}
                {!sidebarCollapsed && (
                  <span className="truncate">
                    {theme === "dark" ? "Light Mode" : "Dark Mode"}
                  </span>
                )}
              </button>
              <button
                onClick={handleLogout}
                className={`w-full flex items-center px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors min-w-0 ${
                  sidebarCollapsed ? "justify-center" : ""
                }`}
                title={sidebarCollapsed ? "Logout" : ""}
              >
                <LogOut
                  className={`h-5 w-5 ${sidebarCollapsed ? "" : "mr-3"}`}
                />
                {!sidebarCollapsed && <span className="truncate">Logout</span>}
              </button>
            </div>
          </div>
        </div>

        {/* Invisible resize area on right edge - always available */}
        <div
          onMouseDown={handleResizeStart}
          className="hidden lg:block absolute top-0 right-0 w-1 h-full cursor-col-resize"
        />
      </div>

      {/* Main content */}
      <div
        className={`${!isResizing ? "transition-all duration-300" : ""} ${
          sidebarCollapsed ? "lg:pl-20" : ""
        }`}
        style={{
          paddingLeft: sidebarCollapsed ? undefined : `${sidebarWidth}px`,
        }}
      >
        {/* Mobile menu button - floating */}
        <button
          onClick={() => setSidebarOpen(true)}
          className="lg:hidden fixed top-4 left-4 z-20 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
        >
          <Menu className="h-6 w-6" />
        </button>

        {/* Page content */}
        <main className="p-4 sm:p-6 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
