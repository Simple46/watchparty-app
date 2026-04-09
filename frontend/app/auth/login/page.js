"use client";

import { useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import Link from "next/link";

export default function LoginPage() {
  const { login } = useAuth();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await login(formData.email, formData.password);

    // If login failed show the error
    // If login succeeded AuthContext handles the redirect
    if (!result.success) {
      setError(result.message);
    }

    setLoading(false);
  };

  return (
    <div
      className="min-h-screen bg-gray-950 flex items-center 
                    justify-center px-4"
    >
      <div
        className="w-full max-w-md bg-gray-900 rounded-2xl 
                      p-8 shadow-2xl"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">🎬 WatchParty</h1>
          <p className="text-gray-400 mt-2 text-sm">
            Sign in to continue watching
          </p>
        </div>

        {/* Error Banner */}
        {error && (
          <div
            className="bg-red-500/10 border border-red-500/50 
                          text-red-400 px-4 py-3 rounded-lg mb-6 text-sm"
          >
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email Field */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your email"
              required
              className="w-full bg-gray-800 text-white placeholder-gray-500
                         border border-gray-700 rounded-lg px-4 py-3 text-sm
                         focus:outline-none focus:border-red-500 
                         focus:ring-1 focus:ring-red-500 transition"
            />
          </div>

          {/* Password Field */}
          <div>
            <label
              className="block text-sm font-medium 
                               text-gray-400 mb-1.5"
            >
              Password
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter your password"
              required
              className="w-full bg-gray-800 text-white placeholder-gray-500
                         border border-gray-700 rounded-lg px-4 py-3 text-sm
                         focus:outline-none focus:border-red-500 
                         focus:ring-1 focus:ring-red-500 transition"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-600 hover:bg-red-700 
                       disabled:bg-red-900 disabled:cursor-not-allowed 
                       text-white font-semibold py-3 rounded-lg 
                       transition text-sm mt-2"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        {/* Link to Register */}
        <p className="text-center text-gray-500 text-sm mt-6">
          Don not have an account?{" "}
          <Link
            href="/auth/register"
            className="text-red-400 hover:text-red-300 
                       hover:underline font-medium"
          >
            Create one for free
          </Link>
        </p>

        {/* Admin test credentials — remove this in production */}
        <div
          className="mt-6 p-4 bg-gray-800/60 rounded-lg border 
                        border-gray-700"
        >
          <p className="text-xs text-gray-500 text-center mb-2 font-medium">
            Test Admin Account
          </p>
          <p className="text-xs text-gray-400 text-center">
            admin@watchparty.com
          </p>
          <p className="text-xs text-gray-400 text-center">admin123</p>
        </div>
      </div>
    </div>
  );
}
