import Link from "next/link";
import { Tv } from "lucide-react";

export default function NotFound() {
  return (
    <div
      className="min-h-screen bg-gray-950 flex items-center
                    justify-center px-4"
    >
      <div className="text-center max-w-md">
        <div
          className="w-20 h-20 bg-gray-900 border
                        border-gray-800 rounded-2xl flex
                        items-center justify-center mx-auto mb-5"
        >
          <Tv className="w-10 h-10 text-gray-700" />
        </div>
        <h1 className="text-white text-6xl font-black mb-3">404</h1>
        <p className="text-white text-xl font-semibold mb-2">Page not found</p>
        <p className="text-gray-400 text-sm mb-6">
          The page you are looking for does not exist or has been moved.
        </p>
        <Link href="/">
          <button
            className="bg-red-600 hover:bg-red-700
                             text-white text-sm font-medium
                             px-6 py-3 rounded-xl transition"
          >
            Back to Movies
          </button>
        </Link>
      </div>
    </div>
  );
}
