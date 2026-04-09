"use client";
// "use client" tells Next.js this file runs in the browser
// not on the server — needed because we use localStorage
// and browser-only React hooks like useState and useEffect

import { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { flushSync } from "react-dom";
import api from "../lib/api";

// ─── STEP 1 — Create the context ───
// This is like creating an empty container
// We will fill it with values in the Provider below
const AuthContext = createContext(null);

// ─── STEP 2 — Create the Provider ───
// This is the component that wraps your entire app
// and makes auth state available everywhere
export function AuthProvider({ children }) {
  // user — stores the logged in user object, null if not logged in
  const [user, setUser] = useState(null);

  // loading — true while we are checking if a saved session exists
  // prevents the page from flashing "not logged in" for a split second
  const [loading, setLoading] = useState(true);

  const router = useRouter();

  // ─── ON APP LOAD ───
  // When the app first opens, check if there is a saved user
  // in localStorage from a previous session
  // This is what keeps users logged in after page refresh
  useEffect(() => {
    const savedUser = localStorage.getItem("watchparty_user");
    const savedToken = localStorage.getItem("watchparty_token");

    if (savedUser && savedToken) {
      // Both exist — restore the user session
      flushSync(() => {
        setUser(JSON.parse(savedUser));
      });
    }

    // Whether or not a saved session was found, loading is done
    flushSync(() => {
      setLoading(false);
    });
  }, []);
  // The empty [] means this runs only once — when the component mounts

  // ─── REGISTER ───
  const register = async (name, email, password) => {
    try {
      const response = await api.post("/api/auth/register", {
        name,
        email,
        password,
      });

      const { token, user } = response.data;

      // Save to localStorage so the session persists on refresh
      localStorage.setItem("watchparty_token", token);
      localStorage.setItem("watchparty_user", JSON.stringify(user));

      // Update state
      setUser(user);

      // Redirect to homepage after successful registration
      router.push("/");

      return { success: true };
    } catch (error) {
      // Return the error message from the backend
      // or a fallback if there is no message
      return {
        success: false,
        message:
          error.response?.data?.message ||
          "Registration failed. Please try again.",
      };
    }
  };

  // ─── LOGIN ───
  const login = async (email, password) => {
    try {
      const response = await api.post("/api/auth/login", {
        email,
        password,
      });

      const { token, user } = response.data;

      localStorage.setItem("watchparty_token", token);
      localStorage.setItem("watchparty_user", JSON.stringify(user));

      setUser(user);

      // Redirect based on role
      // Admins go straight to the admin dashboard
      // Regular users go to the movie browsing homepage
      if (user.role === "admin") {
        router.push("/admin");
      } else {
        router.push("/");
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message || "Login failed. Please try again.",
      };
    }
  };

  // ─── LOGOUT ───
  const logout = () => {
    // Clear everything from localStorage
    localStorage.removeItem("watchparty_token");
    localStorage.removeItem("watchparty_user");

    // Clear the user from state
    setUser(null);

    // Send them to the login page
    router.push("/auth/login");
  };

  // ─── IS ADMIN ───
  // A simple computed boolean for convenience
  // Instead of checking user?.role === "admin" everywhere
  // you can just check isAdmin
  const isAdmin = user?.role === "admin";

  // ─── PROVIDE VALUES ───
  // Everything inside the value object is accessible
  // to any component that calls useAuth()
  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        isAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ─── STEP 3 — Custom hook for easy access ───
// Instead of importing AuthContext and calling useContext(AuthContext)
// in every component, you just call useAuth()
// Much cleaner and easier to read
export function useAuth() {
  const context = useContext(AuthContext);

  // This error helps you catch cases where you forgot to
  // wrap a component with AuthProvider
  if (!context) {
    throw new Error("useAuth must be used inside an AuthProvider");
  }

  return context;
}
