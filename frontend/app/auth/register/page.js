"use client";

import { useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import Link from "next/link";

export default function RegisterPage() {
  // Pull the register function from our AuthContext
  const { register } = useAuth();

  // Form state — tracks what the user is typing
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });

  // Error message to show below the form if something goes wrong
  const [error, setError] = useState("");

  // Loading state — disables the button while the request is in progress
  // prevents double submissions
  const [loading, setLoading] = useState(false);

  // Called every time the user types in any input field
  // e.target.name matches the "name" attribute on each input
  // e.target.value is what they typed
  const handleChange = (e) => {
    setFormData({
      ...formData, // keep all existing field values
      [e.target.name]: e.target.value, // update only the field being typed in
    });
  };

  const handleSubmit = async (e) => {
    // Prevent the browser from refreshing the page on form submit
    // Without this, the page would reload and lose all state
    e.preventDefault();

    // Clear any previous error
    setError("");
    setLoading(true);

    // Call the register function from AuthContext
    const result = await register(
      formData.name,
      formData.email,
      formData.password,
    );

    // If registration failed, show the error message
    if (!result.success) {
      setError(result.message);
    }

    // If registration succeeded, AuthContext already redirected to homepage

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
          <h1 className="text-3xl font-bold text-white"> WatchParty</h1>
          <p className="text-gray-400 mt-2 text-sm">
            Create your account to get started
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
          {/* Name Field */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">
              Full Name
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter your full name"
              required
              className="w-full bg-gray-800 text-white placeholder-gray-500
                         border border-gray-700 rounded-lg px-4 py-3 text-sm
                         focus:outline-none focus:border-red-500 
                         focus:ring-1 focus:ring-red-500 transition"
            />
          </div>

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
            <label className="block text-sm font-medium text-gray-400 mb-1.5">
              Password
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="At least 6 characters"
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
            {loading ? "Creating your account..." : "Create Account"}
          </button>
        </form>

        {/* Link to Login */}
        <p className="text-center text-gray-500 text-sm mt-6">
          Already have an account?{" "}
          <Link
            href="/auth/login"
            className="text-red-400 hover:text-red-300 
                       hover:underline font-medium"
          >
            Sign in here
          </Link>
        </p>
      </div>
    </div>
  );
}
