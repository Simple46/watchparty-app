"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";


import {
  Radio,
  Tv,
  Search,
  User,
  LogOut,
  Settings,
  Menu,
  X,
  ChevronDown,
  Wifi,
} from "lucide-react";

export default function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Handle search submit
  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    router.push(`/?search=${encodeURIComponent(searchQuery.trim())}`);
    setMenuOpen(false);
  };

  return (
    <nav
      className="bg-gray-950 border-b border-gray-800 sticky
                    top-0 z-50"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* ─── LOGO ─── */}
          <Link
            href="/"
            className="flex items-center gap-2.5
                                    flex-shrink-0"
          >
            <div
              className="w-8 h-8 bg-red-600 rounded-lg flex
                            items-center justify-center"
            >
              <Tv className="w-4 h-4 text-white" />
            </div>
            <span
              className="text-white font-bold text-lg
                             hidden sm:block"
            >
              WatchParty
            </span>
          </Link>

          {/* ─── SEARCH BAR (desktop) ─── */}
          <form
            onSubmit={handleSearch}
            className="hidden md:flex flex-1 max-w-md"
          >
            <div className="relative w-full">
              <Search
                className="absolute left-3 top-1/2
                                 -translate-y-1/2 w-4 h-4 text-gray-500"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search movies..."
                className="w-full bg-gray-900 text-white
                           placeholder-gray-500 border border-gray-800
                           rounded-lg pl-10 pr-4 py-2.5 text-sm
                           focus:outline-none focus:border-red-500
                           transition"
              />
            </div>
          </form>

          {/* ─── RIGHT SIDE ─── */}
          <div className="flex items-center gap-3">
            {/* Mobile search icon */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden text-gray-400 hover:text-white"
            >
              <Search className="w-5 h-5" />
            </button>

            {user ? (
              // ─── Logged in user menu ───
              <div className="relative">
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-2 bg-gray-900
                             hover:bg-gray-800 border border-gray-800
                             rounded-lg px-3 py-2 transition"
                >
                  {/* Avatar circle with first letter of name */}
                  <div
                    className="w-6 h-6 bg-red-600 rounded-full
                                  flex items-center justify-center
                                  flex-shrink-0"
                  >
                    <span className="text-white text-xs font-bold">
                      {user.name?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span
                    className="text-white text-sm font-medium
                                   hidden sm:block max-w-24 truncate"
                  >
                    {user.name}
                  </span>
                  <ChevronDown
                    className="w-3.5 h-3.5 text-gray-400
                                          hidden sm:block"
                  />
                </button>

                {/* Dropdown menu */}
                {profileOpen && (
                  <>
                    {/* Click outside to close */}
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setProfileOpen(false)}
                    />
                    <div
                      className="absolute right-0 top-full mt-2
                                    w-52 bg-gray-900 border border-gray-800
                                    rounded-xl shadow-2xl z-20 overflow-hidden"
                    >
                      {/* User info header */}
                      <div className="px-4 py-3 border-b border-gray-800">
                        <p
                          className="text-white text-sm font-medium
                                      truncate"
                        >
                          {user.name}
                        </p>
                        <p className="text-gray-500 text-xs truncate">
                          {user.email}
                        </p>
                      </div>

                      {/* Menu items */}
                      <div className="p-2">
                        <Link
                          href="/profile"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-3 px-3 py-2.5
                                     text-gray-400 hover:text-white
                                     hover:bg-gray-800 rounded-lg text-sm
                                     transition"
                        >
                          <User className="w-4 h-4" />
                          My Profile
                        </Link>

                        <Link href="/stream/new">
                          <button
                            className="flex items-center gap-2 text-gray-400
                     hover:text-white transition text-sm"
                          >
                            <Wifi className="w-4 h-4" />
                            <span className="hidden sm:block">Stream</span>
                          </button>
                        </Link>

                        <Link href="/football">
                          <button
                            className="flex items-center gap-2 text-gray-400
                     hover:text-white transition text-sm p-2"
                          >
                            <Radio className="w-4 h-4" />
                            <span className="block">Live Football</span>
                          </button>
                        </Link>

                        {/* Admin link — only shown to admins */}
                        {isAdmin && (
                          <Link
                            href="/admin"
                            onClick={() => setProfileOpen(false)}
                            className="flex items-center gap-3 px-3 py-2.5
                                       text-gray-400 hover:text-white
                                       hover:bg-gray-800 rounded-lg text-sm
                                       transition"
                          >
                            <Settings className="w-4 h-4" />
                            Admin Panel
                          </Link>
                        )}

                        <div className="border-t border-gray-800 mt-2 pt-2">
                          <button
                            onClick={() => {
                              setProfileOpen(false);
                              logout();
                            }}
                            className="w-full flex items-center gap-3
                                       px-3 py-2.5 text-gray-400
                                       hover:text-red-400 hover:bg-red-600/10
                                       rounded-lg text-sm transition"
                          >
                            <LogOut className="w-4 h-4" />
                            Sign Out
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              // ─── Not logged in ───
              <div className="flex items-center gap-2">
                <Link href="/auth/login">
                  <button
                    className="text-gray-400 hover:text-white
                                     text-sm transition px-3 py-2"
                  >
                    Sign In
                  </button>
                </Link>
                <Link href="/auth/register">
                  <button
                    className="bg-red-600 hover:bg-red-700
                                     text-white text-sm font-medium
                                     px-4 py-2 rounded-lg transition"
                  >
                    Sign Up
                  </button>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Search Bar */}
        {menuOpen && (
          <div className="md:hidden pb-4">
            <form onSubmit={handleSearch}>
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2
                                   -translate-y-1/2 w-4 h-4
                                   text-gray-500"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search movies..."
                  autoFocus
                  className="w-full bg-gray-900 text-white
                             placeholder-gray-500 border border-gray-800
                             rounded-lg pl-10 pr-4 py-2.5 text-sm
                             focus:outline-none focus:border-red-500"
                />
              </div>
            </form>
          </div>
        )}
      </div>
    </nav>
  );
}
