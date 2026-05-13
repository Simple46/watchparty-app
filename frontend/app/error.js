"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function Error({ error, reset }) {
  useEffect(() => {
    console.error("App error:", error);
  }, [error]);

  return (
    <div
      className="min-h-screen bg-gray-950 flex items-center
                    justify-center px-4"
    >
      <div className="text-center max-w-md">
        <div
          className="w-16 h-16 bg-red-600/20 border
                        border-red-600/30 rounded-2xl flex
                        items-center justify-center mx-auto mb-5"
        >
          <AlertTriangle className="w-8 h-8 text-red-400" />
        </div>
        <h2 className="text-white text-xl font-bold mb-2">
          Something went wrong
        </h2>
        <p className="text-gray-400 text-sm mb-6">
          An unexpected error occurred. Try refreshing the page.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="flex items-center gap-2 bg-red-600
                       hover:bg-red-700 text-white text-sm
                       font-medium px-5 py-2.5 rounded-xl
                       transition"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
          <Link href="/">
            <button
              className="bg-gray-800 hover:bg-gray-700
                               text-white text-sm font-medium
                               px-5 py-2.5 rounded-xl transition"
            >
              Go Home
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
