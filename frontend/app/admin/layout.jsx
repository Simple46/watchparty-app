"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../context/AuthContext";
import {
  LayoutDashboard,
  Upload,
  Film,
  Users,
  LogOut,
  Menu,
  X,
  Tv,
  Search,
} from "lucide-react";

// Navigation items for the sidebar
// Each item has a label, href and icon
const navItems = [
  {
    label: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    label: "Upload Movie",
    href: "/admin/upload",
    icon: Upload,
  },
  {
    label: "Movies",
    href: "/admin/movies",
    icon: Film,
  },
  { href: "/admin/browse", label: "Browse Movies", icon: Search },
  {
    label: "Watch Rooms",
    href: "/admin/rooms",
    icon: Users,
  },
];

export default function AdminLayout({ children }) {
  const { user, loading, logout, isAdmin } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Controls whether the mobile sidebar is open or closed
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Protect the entire admin section
  // If not logged in or not admin, redirect immediately
  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push("/auth/login");
      return;
    }
    if (!isAdmin) {
      router.push("/");
    }
  }, [user, loading, isAdmin, router]);

  // Show nothing while auth is being checked
  if (loading || !user || !isAdmin) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-8 h-8 border-2 border-red-600
                          border-t-transparent rounded-full animate-spin"
          />
          <p className="text-gray-400 text-sm">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex">
      {/* ─── MOBILE OVERLAY ─── */}
      {/* Dark overlay behind sidebar on mobile when open */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ─── SIDEBAR ─── */}
      <aside
        className={`
          fixed top-0 left-0 h-[100vh] w-64 bg-gray-900 border-r border-gray-800
          flex flex-col z-30 transition-transform duration-300
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0 lg:static lg:z-auto
        `}
      >
        {/* Sidebar Header — Logo */}
        <div
          className="flex items-center justify-between p-6
                        border-b border-gray-800"
        >
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 bg-red-600 rounded-lg flex
                            items-center justify-center"
            >
              <Tv className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-sm">WatchParty</p>
              <p className="text-gray-500 text-xs">Admin Panel</p>
            </div>
          </div>
          {/* Close button — mobile only */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;

            // Check if this nav item is the current page
            // For /admin exactly we check exact match
            // For others we check if pathname starts with the href
            const isActive =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-lg
                  text-sm font-medium transition-all duration-200
                  ${
                    isActive
                      ? "bg-red-600/15 text-red-400 border border-red-600/30"
                      : "text-gray-400 hover:bg-gray-800 hover:text-white"
                  }
                `}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer — Admin info + Logout */}
        <div className="p-4 border-t border-gray-800">
          {/* Admin user info */}
          <div className="flex items-center gap-3 px-4 py-3 mb-2">
            <div
              className="w-8 h-8 bg-red-600 rounded-full flex
                            items-center justify-center flex-shrink-0"
            >
              <span className="text-white text-xs font-bold">
                {user.name?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="overflow-hidden">
              <p className="text-white text-sm font-medium truncate">
                {user.name}
              </p>
              <p className="text-gray-500 text-xs truncate">{user.email}</p>
            </div>
          </div>

          {/* Logout button */}
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3
                       rounded-lg text-sm font-medium text-gray-400
                       hover:bg-red-600/10 hover:text-red-400 transition"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* ─── MAIN CONTENT AREA ─── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header
          className="bg-gray-900 border-b border-gray-800
                           px-6 py-4 flex items-center justify-between
                           sticky top-0 z-10"
        >
          {/* Mobile menu toggle button */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-gray-400 hover:text-white"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Page breadcrumb */}
          <div className="hidden lg:block">
            <p className="text-gray-400 text-sm">
              Admin /{" "}
              <span className="text-white">
                {navItems.find((item) =>
                  item.href === "/admin"
                    ? pathname === "/admin"
                    : pathname.startsWith(item.href),
                )?.label || "Dashboard"}
              </span>
            </p>
          </div>

          {/* Admin badge on the right */}
          <div className="flex items-center gap-2 ml-auto">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            <span className="text-gray-400 text-sm">Logged in as Admin</span>
          </div>
        </header>

        {/* Page Content */}
        {/* children is whatever page is currently active */}
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
