"use client";

import { useState, useEffect } from "react";
import Navbar from "../../components/Navbar";
import ProtectedRoute from "../../components/ProtectedRoute";
import { useAuth } from "../../context/AuthContext";
import { User, Mail, Shield, Calendar, Film, Users } from "lucide-react";
import api from "../../lib/api";

function ProfileContent() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch how many rooms this user has been in
        // We will build this endpoint simply from existing data
        setLoading(false);
      } catch (err) {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return "Unknown";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
        {/* Page title */}
        <h1 className="text-white text-2xl font-bold mb-8">My Profile</h1>

        {/* Profile card */}
        <div
          className="bg-gray-900 border border-gray-800
                        rounded-2xl overflow-hidden"
        >
          {/* Header banner */}
          <div
            className="h-24 bg-gradient-to-r from-red-900/40
                          to-gray-900"
          />

          {/* Avatar and name */}
          <div className="px-6 pb-6">
            <div className="-mt-10 mb-4">
              <div
                className="w-20 h-20 bg-red-600 rounded-2xl border-4
                              border-gray-900 flex items-center
                              justify-center shadow-xl"
              >
                <span className="text-white text-3xl font-bold">
                  {user?.name?.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>

            <h2 className="text-white text-xl font-bold">{user?.name}</h2>

            {/* Role badge */}
            <div className="mt-1">
              <span
                className={`
                  text-xs font-medium px-2.5 py-1 rounded-full
                  ${
                    user?.role === "admin"
                      ? "bg-red-600/20 text-red-400 border border-red-600/30"
                      : "bg-blue-600/20 text-blue-400 border border-blue-600/30"
                  }
                `}
              >
                {user?.role === "admin" ? "Administrator" : "Member"}
              </span>
            </div>

            {/* User details */}
            <div className="mt-6 space-y-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 bg-gray-800 rounded-lg flex
                                items-center justify-center flex-shrink-0"
                >
                  <Mail className="w-4 h-4 text-gray-400" />
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Email</p>
                  <p className="text-white text-sm">{user?.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 bg-gray-800 rounded-lg flex
                                items-center justify-center flex-shrink-0"
                >
                  <Shield className="w-4 h-4 text-gray-400" />
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Account Type</p>
                  <p className="text-white text-sm capitalize">{user?.role}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 bg-gray-800 rounded-lg flex
                                items-center justify-center flex-shrink-0"
                >
                  <User className="w-4 h-4 text-gray-400" />
                </div>
                <div>
                  <p className="text-gray-500 text-xs">User ID</p>
                  <p className="text-white text-sm font-mono text-xs">
                    {user?.id}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Info box */}
        <div
          className="mt-6 bg-blue-600/10 border border-blue-600/20
                        rounded-xl p-4"
        >
          <p className="text-blue-400 text-xs leading-relaxed">
            ℹ️ More profile features like watch history and friends list are
            coming soon. For now, head to the homepage to browse movies and
            start a watch party.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <ProfileContent />
    </ProtectedRoute>
  );
}
