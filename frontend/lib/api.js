import axios from "axios";

// Create one axios instance with your backend base URL pre-set
// All requests made through this instance automatically go to your backend
const api = axios.create({
  baseURL:
    process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// ─── REQUEST INTERCEPTOR ───
// This function runs automatically BEFORE every single request
// you make through this axios instance
// It reads the token from localStorage and attaches it to the header
// This means you never have to manually add the token anywhere
api.interceptors.request.use(
  (config) => {
    // Only runs in the browser — not during server-side rendering
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("watchparty_token");

      if (token) {
        // Attach the token to every outgoing request
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// ─── RESPONSE INTERCEPTOR ───
// This function runs automatically AFTER every response comes back
// If the server returns 401 (Unauthorized) it means the token expired
// In that case, we clear the stored auth data and redirect to login
api.interceptors.response.use(
  // If the response is successful just return it as normal
  (response) => response,

  // If the response is an error
  (error) => {
    const requestUrl = error.config?.url || "";
    const isAuthAttempt = /\/api\/auth\/(login|register)(?:[/?]|$)/i.test(
      requestUrl,
    );

    if (error.response?.status === 401 && !isAuthAttempt) {
      // Token expired or invalid — clean up and force re-login
      if (typeof window !== "undefined") {
        localStorage.removeItem("watchparty_token");
        localStorage.removeItem("watchparty_user");
        window.location.href = "/auth/login";
      }
    }

    return Promise.reject(error);
  },
);

export default api;
