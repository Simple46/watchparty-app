"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "../context/AuthContext";

import {
  Radio,
  Tv,
  User,
  LogOut,
  Settings,
  ChevronDown,
  Wifi,
} from "lucide-react";

export default function Navbar() {
  const { user, logout, isAdmin } = useAuth();

  const [profileOpen, setProfileOpen] = useState(false);

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

          {/* ─── PRIMARY LINKS (desktop) ─── */}
          <div className="hidden lg:flex items-center gap-1">
            <Link
              href="/stream/new"
              className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-600/10 px-3 py-2 text-sm font-medium text-red-200 transition hover:border-red-500/50 hover:bg-red-600/20 hover:text-white"
            >
              <Wifi className="w-4 h-4" />
              Stream
            </Link>
            <Link
              href="/football"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-400 transition hover:bg-gray-900 hover:text-white"
            >
              <Radio className="w-4 h-4 text-red-400" />
              Live Football
            </Link>
          </div>

          {/* ─── RIGHT SIDE ─── */}
          <div className="flex items-center gap-3">
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

        {/* ─── PRIMARY LINKS (mobile and tablet) ─── */}
        <div className="flex items-center gap-2 pb-3 lg:hidden">
          <Link
            href="/stream/new"
            className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-red-500/30 bg-red-600/10 px-3 py-2 text-sm font-medium text-red-200 transition hover:bg-red-600/20 hover:text-white"
          >
            <Wifi className="w-4 h-4" />
            Stream from device
          </Link>
          <Link
            href="/football"
            className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-800 bg-gray-900 px-3 py-2 text-sm font-medium text-gray-300 transition hover:border-gray-700 hover:text-white"
          >
            <Radio className="w-4 h-4 text-red-400" />
            Live Football
          </Link>
        </div>

      </div>
    </nav>
  );
}
