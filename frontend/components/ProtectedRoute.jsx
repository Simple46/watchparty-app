"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";

// adminOnly — pass true on pages only admins should see
// default is false — meaning any logged in user can see the page
export default function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Wait until AuthContext has finished checking localStorage
    // before making any redirect decisions
    if (loading) return;

    // No user is logged in — send to login page
    if (!user) {
      router.push("/auth/login");
      return;
    }

    // Page requires admin but user is not an admin
    if (adminOnly && user.role !== "admin") {
      // Send them to the homepage — they are logged in but not authorized
      router.push("/");
    }
  }, [user, loading, adminOnly, router]);

  // While auth state is loading show a full screen spinner
  // This prevents a flash where the page briefly shows
  // before the redirect kicks in
  if (loading) {
    return (
      <div
        className="min-h-screen bg-gray-950 flex items-center 
                      justify-center"
      >
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-8 h-8 border-2 border-red-600 
                          border-t-transparent rounded-full animate-spin"
          />
          <p className="text-gray-400 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  // No user — render nothing while redirect happens
  if (!user) return null;

  // Admin page but not admin — render nothing while redirect happens
  if (adminOnly && user.role !== "admin") return null;

  // All checks passed — render the actual page content
  return children;
}
