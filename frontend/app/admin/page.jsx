"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Film, Users, Tv, Upload, ArrowRight, RefreshCw } from "lucide-react";
import StatCard from "../../components/admin/StatCard";
import StorageBar from "../../components/admin/StorageBar";
import api from "../../lib/api";

export default function AdminDashboard() {
  // State for the stats data fetched from your backend
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Fetch dashboard stats when the page loads
  const fetchStats = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/api/admin/dashboard");
      setStats(response.data);
    } catch (err) {
      setError("Failed to load dashboard stats. Please try again.");
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  // useEffect with empty [] runs once when component mounts
  useEffect(() => {
    fetchStats();
  }, []);

  // Loading state — show skeleton placeholders
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-800 rounded-lg w-48 animate-pulse" />
        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3
                        gap-4"
        >
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-32 bg-gray-800 rounded-xl animate-pulse"
            />
          ))}
        </div>
        <div className="h-28 bg-gray-800 rounded-xl animate-pulse" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div
        className="flex flex-col items-center justify-center
                      min-h-64 gap-4"
      >
        <p className="text-red-400 text-sm">{error}</p>
        <button
          onClick={fetchStats}
          className="flex items-center gap-2 px-4 py-2 bg-red-600
                     hover:bg-red-700 text-white text-sm rounded-lg
                     transition"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Page header */}
      <div>
        <h1 className="text-white text-2xl font-bold">Dashboard</h1>
        <p className="text-gray-400 text-sm mt-1">
          Overview of your WatchParty platform
        </p>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="Total Movies"
          value={stats?.totalMovies ?? 0}
          icon={Film}
          color="red"
          subtitle="Videos in your library"
        />
        <StatCard
          title="Registered Users"
          value={stats?.totalUsers ?? 0}
          icon={Users}
          color="blue"
          subtitle="Accounts created"
        />
        <StatCard
          title="Active Rooms"
          value={stats?.activeRooms ?? 0}
          icon={Tv}
          color="green"
          subtitle="Watch parties right now"
        />
      </div>

      {/* Storage Bar */}
      <StorageBar
        usedGB={stats?.storage?.usedGB ?? "0.00"}
        limitGB={stats?.storage?.limitGB ?? 25}
        percentage={stats?.storage?.percentage ?? 0}
      />

      {/* Quick Actions */}
      <div>
        <h2 className="text-white font-semibold text-base mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Upload a new movie */}
          <Link href="/admin/upload">
            <div
              className="group bg-gray-900 border border-gray-800
                            hover:border-red-600/50 rounded-xl p-5
                            transition cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div
                    className="w-10 h-10 bg-red-600/20 rounded-lg
                                  flex items-center justify-center"
                  >
                    <Upload className="w-5 h-5 text-red-400" />
                  </div>
                  <div>
                    <p className="text-white font-medium text-sm">
                      Upload New Movie
                    </p>
                    <p className="text-gray-500 text-xs mt-0.5">
                      Add a video to your library
                    </p>
                  </div>
                </div>
                <ArrowRight
                  className="w-4 h-4 text-gray-600
                             group-hover:text-red-400 transition"
                />
              </div>
            </div>
          </Link>

          {/* View all movies */}
          <Link href="/admin/movies">
            <div
              className="group bg-gray-900 border border-gray-800
                            hover:border-blue-600/50 rounded-xl p-5
                            transition cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div
                    className="w-10 h-10 bg-blue-600/20 rounded-lg
                                  flex items-center justify-center"
                  >
                    <Film className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-white font-medium text-sm">
                      Manage Movies
                    </p>
                    <p className="text-gray-500 text-xs mt-0.5">
                      Edit or delete uploaded movies
                    </p>
                  </div>
                </div>
                <ArrowRight
                  className="w-4 h-4 text-gray-600
                             group-hover:text-blue-400 transition"
                />
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* Refresh button */}
      <div className="flex justify-end">
        <button
          onClick={fetchStats}
          className="flex items-center gap-2 text-gray-500
                     hover:text-white text-sm transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh stats
        </button>
      </div>
    </div>
  );
}
