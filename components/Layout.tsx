"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Calendar,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  MessageSquare,
  Moon,
  Sun,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/components/ThemeProvider";
import { SITE_URL } from "@/lib/site";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Events", href: "/events", icon: Calendar },
  { name: "Board members", href: "/board-members", icon: Users },
  { name: "Partner ads", href: "/community-ads", icon: Megaphone },
  { name: "Messages", href: "/contact-submissions", icon: MessageSquare },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <ul className="space-y-1">
      {navigation.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href;
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-[44px] items-center gap-3 rounded-lg px-3 text-base font-medium transition-colors duration-150 ${
                active
                  ? "bg-primary text-on-primary"
                  : "text-gray-800 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" aria-hidden />
              {item.name}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function SidebarFooter() {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  return (
    <div className="space-y-1 border-t border-gray-200 p-3 dark:border-gray-800">
      <a
        href={SITE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="flex min-h-[44px] items-center gap-3 rounded-lg px-3 text-base font-medium text-gray-800 transition-colors duration-150 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
      >
        <ExternalLink className="h-5 w-5" aria-hidden />
        View website
        <span className="sr-only">(opens in a new tab)</span>
      </a>
      <button
        type="button"
        onClick={toggleTheme}
        className="flex min-h-[44px] w-full items-center gap-3 rounded-lg px-3 text-base font-medium text-gray-800 transition-colors duration-150 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
      >
        {theme === "dark" ? <Sun className="h-5 w-5" aria-hidden /> : <Moon className="h-5 w-5" aria-hidden />}
        {theme === "dark" ? "Light mode" : "Dark mode"}
      </button>
      <button
        type="button"
        onClick={signOut}
        className="flex min-h-[44px] w-full items-center gap-3 rounded-lg px-3 text-base font-medium text-red-700 transition-colors duration-150 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-900/30"
      >
        <LogOut className="h-5 w-5" aria-hidden />
        Sign out
      </button>
      {user?.email && (
        <p className="truncate px-3 pt-2 text-sm text-gray-600 dark:text-gray-400" title={user.email}>
          Signed in as {user.email}
        </p>
      )}
    </div>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);

  // Esc closes the mobile menu.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const brand = (
    <Link href="/dashboard" className="block rounded-md">
      <span className="block text-base font-semibold text-gray-900 dark:text-white">Rotary Club of Gudalur</span>
      <span className="block text-sm text-gray-600 dark:text-gray-400">Website editor</span>
    </Link>
  );

  return (
    <div className="min-h-screen">
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-gray-900 focus:shadow-lg"
      >
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950 lg:flex">
        <div className="px-6 py-5">{brand}</div>
        <nav aria-label="Main" className="flex-1 overflow-y-auto px-3">
          <NavLinks />
        </nav>
        <SidebarFooter />
      </aside>

      {/* Mobile top bar */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-950 lg:hidden">
        {brand}
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          className="btn-secondary"
        >
          <Menu className="h-5 w-5" aria-hidden />
          Menu
        </button>
      </div>

      {/* Mobile menu drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" id="mobile-menu">
          <div className="animate-scrim-in absolute inset-0 bg-gray-900/50" onClick={() => setMenuOpen(false)} aria-hidden />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className="animate-dialog-in absolute inset-y-0 left-0 flex w-72 max-w-[85%] flex-col bg-white dark:bg-gray-950"
          >
            <div className="flex items-center justify-between px-4 py-3">
              {brand}
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label="Close menu"
                className="btn h-11 w-11 px-0 text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
                autoFocus
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
            <nav aria-label="Main" className="flex-1 overflow-y-auto px-3">
              <NavLinks onNavigate={() => setMenuOpen(false)} />
            </nav>
            <SidebarFooter />
          </div>
        </div>
      )}

      <main id="content" tabIndex={-1} className="outline-none lg:pl-64">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</div>
      </main>
    </div>
  );
}
