"use client";

import { useState, useEffect } from "react";
import Navbar from "../../components/Navbar";
import ProtectedRoute from "../../components/ProtectedRoute";
import { useAuth } from "../../context/AuthContext";
import {
  User,
  Mail,
  Shield,
  Search,
  UserPlus,
  UserCheck,
  UserX,
  Clock,
  Users,
  Check,
  X,
  ArrowLeft,
} from "lucide-react";
import api from "../../lib/api";
import Link from "next/link";

function ProfileContent() {
  const { user } = useAuth();

  // Friends state
  const [friends, setFriends] = useState([]);
  const [pendingIncoming, setPendingIncoming] = useState([]);
  const [pendingOutgoing, setPendingOutgoing] = useState([]);
  const [friendsLoading, setFriendsLoading] = useState(true);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  // Active tab
  const [activeTab, setActiveTab] = useState("friends");
  // "friends" | "requests" | "search"

  // Fetch friends on load
  const fetchFriends = async () => {
    try {
      setFriendsLoading(true);
      const response = await api.get("/api/friends");
      setFriends(response.data.friends);
      setPendingIncoming(response.data.pendingIncoming);
      setPendingOutgoing(response.data.pendingOutgoing);
    } catch (err) {
      console.error("Fetch friends error:", err);
    } finally {
      setFriendsLoading(false);
    }
  };

  useEffect(() => {
    fetchFriends();
  }, []);

  // Search users
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchError("Enter at least 2 characters");
      return;
    }

    try {
      setSearching(true);
      setSearchError("");
      const response = await api.get(
        `/api/friends/search?q=${encodeURIComponent(searchQuery)}`,
      );
      setSearchResults(response.data.users);
      if (response.data.users.length === 0) {
        setSearchError("No users found");
      }
    } catch (err) {
      setSearchError("Search failed. Try again.");
    } finally {
      setSearching(false);
    }
  };

  // Send friend request
  const sendRequest = async (userId) => {
    try {
      await api.post(`/api/friends/request/${userId}`);
      // Refresh friends list
      await fetchFriends();
      // Update search results to reflect sent request
      setSearchResults((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, requestSent: true } : u)),
      );
    } catch (err) {
      alert(err.response?.data?.message || "Failed to send request");
    }
  };

  // Accept friend request
  const acceptRequest = async (requestId) => {
    try {
      await api.post(`/api/friends/accept/${requestId}`);
      await fetchFriends();
    } catch (err) {
      alert("Failed to accept request");
    }
  };

  // Remove friend or decline request
  const removeFriend = async (requestId) => {
    const confirmed = window.confirm(
      "Are you sure you want to remove this friend?"
    );
    if (!confirmed) return;

    try {
      await api.delete(`/api/friends/${requestId}`);
      await fetchFriends();
    } catch (err) {
      alert("Failed to remove");
    }
  };

  // Check if already friends or request sent
  const getFriendshipStatus = (userId) => {
    if (friends.find((f) => f.user.id === userId)) return "friends";
    if (pendingOutgoing.find((f) => f.user.id === userId))
      return "pending_sent";
    if (pendingIncoming.find((f) => f.user.id === userId))
      return "pending_received";
    return "none";
  };

  // Avatar component
  const Avatar = ({ name, size = "md" }) => {
    const sizes = {
      sm: "w-8 h-8 text-xs",
      md: "w-10 h-10 text-sm",
      lg: "w-16 h-16 text-xl",
    };
    return (
      <div
        className={`${sizes[size]} bg-red-600 rounded-full
                    flex items-center justify-center text-white
                    font-bold flex-shrink-0`}
      >
        {name?.charAt(0).toUpperCase()}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar />

      <div
        className="max-w-3xl mx-auto px-4 sm:px-6 py-8
                      space-y-6"
      >
        <Link href="/">
          <button
            className="flex items-center gap-2 bg-red-600
                                     hover:bg-red-700 text-white text-sm
                                     px-4 py-2 rounded-lg transition mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Movies
          </button>
        </Link>
        {/* ─── PROFILE CARD ─── */}
        <div
          className="bg-gray-900 border border-gray-800
                        rounded-2xl overflow-hidden mt-4"
        >
          {/* Banner */}
          <div
            className="h-20 bg-gradient-to-r from-red-900/40
                          to-gray-900"
          />

          <div className="px-6 pb-6">
            <div
              className="-mt-8 mb-4 flex items-end
                            justify-between gap-4"
            >
              <Avatar name={user?.name} size="lg" />
              <div className="flex items-center gap-2 mb-2">
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
            </div>

            <h2 className="text-white text-xl font-bold">{user?.name}</h2>

            <div
              className="mt-4 grid grid-cols-1 sm:grid-cols-2
                            gap-3"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 bg-gray-800 rounded-lg
                                flex items-center justify-center"
                >
                  <Mail className="w-3.5 h-3.5 text-gray-400" />
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Email</p>
                  <p className="text-white text-sm truncate">{user?.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 bg-gray-800 rounded-lg
                                flex items-center justify-center"
                >
                  <Users className="w-3.5 h-3.5 text-gray-400" />
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Friends</p>
                  <p className="text-white text-sm">
                    {friends.length} friend
                    {friends.length !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ─── FRIENDS SECTION ─── */}
        <div
          className="bg-gray-900 border border-gray-800
                        rounded-2xl overflow-hidden"
        >
          {/* Tabs */}
          <div className="flex border-b border-gray-800">
            {[
              {
                id: "friends",
                label: "Friends",
                count: friends.length,
                icon: UserCheck,
              },
              {
                id: "requests",
                label: "Requests",
                count: pendingIncoming.length,
                icon: Clock,
              },
              {
                id: "search",
                label: "Add Friends",
                count: null,
                icon: UserPlus,
              },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex-1 flex items-center justify-center gap-2
                  py-3.5 text-sm font-medium transition
                  ${
                    activeTab === tab.id
                      ? "text-white border-b-2 border-red-500"
                      : "text-gray-500 hover:text-gray-400"
                  }
                `}
              >
                <tab.icon className="w-4 h-4" />
                <span className="hidden sm:block">{tab.label}</span>
                {tab.count !== null && tab.count > 0 && (
                  <span
                    className={`
                      text-xs px-1.5 py-0.5 rounded-full
                      ${
                        tab.id === "requests"
                          ? "bg-red-600 text-white"
                          : "bg-gray-700 text-gray-300"
                      }
                    `}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="p-4">
            {/* ─── FRIENDS TAB ─── */}
            {activeTab === "friends" && (
              <div>
                {friendsLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="h-14 bg-gray-800 rounded-xl
                                   animate-pulse"
                      />
                    ))}
                  </div>
                ) : friends.length === 0 ? (
                  <div className="text-center py-12">
                    <Users
                      className="w-10 h-10 text-gray-700
                                      mx-auto mb-3"
                    />
                    <p className="text-white font-medium text-sm">
                      No friends yet
                    </p>
                    <p className="text-gray-500 text-xs mt-1">
                      Search for friends to add them
                    </p>
                    <button
                      onClick={() => setActiveTab("search")}
                      className="mt-4 bg-red-600 hover:bg-red-700
                                 text-white text-xs px-4 py-2
                                 rounded-lg transition"
                    >
                      Find Friends
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {friends.map((f) => (
                      <div
                        key={f.id}
                        className="flex items-center gap-3
                                   bg-gray-800/50 rounded-xl p-3"
                      >
                        <Avatar name={f.user.name} size="sm" />
                        <div className="flex-1 min-w-0">
                          <p
                            className="text-white text-sm
                                        font-medium truncate"
                          >
                            {f.user.name}
                          </p>
                          <p
                            className="text-gray-500 text-xs
                                        truncate"
                          >
                            {f.user.email}
                          </p>
                        </div>
                        <button
                          onClick={() => removeFriend(f.id)}
                          className="text-gray-500 hover:text-red-400
                                     text-xs transition flex items-center
                                     gap-1 flex-shrink-0"
                          title="Remove friend"
                        >
                          <UserX className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ─── REQUESTS TAB ─── */}
            {activeTab === "requests" && (
              <div className="space-y-4">
                {/* Incoming requests */}
                {pendingIncoming.length > 0 && (
                  <div>
                    <p
                      className="text-gray-500 text-xs font-medium
                                  uppercase tracking-wider mb-3"
                    >
                      Incoming Requests
                    </p>
                    <div className="space-y-2">
                      {pendingIncoming.map((req) => (
                        <div
                          key={req.id}
                          className="flex items-center gap-3
                                     bg-gray-800/50 rounded-xl p-3"
                        >
                          <Avatar name={req.user.name} size="sm" />
                          <div className="flex-1 min-w-0">
                            <p
                              className="text-white text-sm
                                          font-medium truncate"
                            >
                              {req.user.name}
                            </p>
                            <p className="text-gray-500 text-xs">
                              Wants to be friends
                            </p>
                          </div>
                          <div className="flex gap-2 flex-shrink-0">
                            <button
                              onClick={() => acceptRequest(req.id)}
                              className="w-8 h-8 bg-green-600
                                         hover:bg-green-700 text-white
                                         rounded-lg flex items-center
                                         justify-center transition"
                              title="Accept"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => removeFriend(req.id)}
                              className="w-8 h-8 bg-gray-700
                                         hover:bg-red-600/30 text-gray-400
                                         hover:text-red-400 rounded-lg
                                         flex items-center justify-center
                                         transition"
                              title="Decline"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Outgoing requests */}
                {pendingOutgoing.length > 0 && (
                  <div>
                    <p
                      className="text-gray-500 text-xs font-medium
                                  uppercase tracking-wider mb-3"
                    >
                      Sent Requests
                    </p>
                    <div className="space-y-2">
                      {pendingOutgoing.map((req) => (
                        <div
                          key={req.id}
                          className="flex items-center gap-3
                                     bg-gray-800/50 rounded-xl p-3"
                        >
                          <Avatar name={req.user.name} size="sm" />
                          <div className="flex-1 min-w-0">
                            <p
                              className="text-white text-sm
                                          font-medium truncate"
                            >
                              {req.user.name}
                            </p>
                            <p className="text-gray-500 text-xs">
                              Pending their response
                            </p>
                          </div>
                          <button
                            onClick={() => removeFriend(req.id)}
                            className="text-gray-500 hover:text-red-400
                                       text-xs transition flex-shrink-0"
                            title="Cancel request"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Empty state */}
                {pendingIncoming.length === 0 &&
                  pendingOutgoing.length === 0 && (
                    <div className="text-center py-12">
                      <Clock
                        className="w-10 h-10 text-gray-700
                                        mx-auto mb-3"
                      />
                      <p className="text-white font-medium text-sm">
                        No pending requests
                      </p>
                      <p className="text-gray-500 text-xs mt-1">
                        Friend requests will appear here
                      </p>
                    </div>
                  )}
              </div>
            )}

            {/* ─── SEARCH TAB ─── */}
            {activeTab === "search" && (
              <div className="space-y-4">
                {/* Search form */}
                <form onSubmit={handleSearch} className="flex gap-2">
                  <div className="relative flex-1">
                    <Search
                      className="absolute left-3 top-1/2
                                       -translate-y-1/2 w-4 h-4
                                       text-gray-500"
                    />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setSearchError("");
                        if (!e.target.value.trim()) {
                          setSearchResults([]);
                        }
                      }}
                      placeholder="Search by name or email..."
                      className="w-full bg-gray-800 text-white
                                 placeholder-gray-500 border
                                 border-gray-700 rounded-lg pl-10
                                 pr-4 py-2.5 text-sm
                                 focus:outline-none
                                 focus:border-red-500 transition"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={searching}
                    className="bg-red-600 hover:bg-red-700
                               disabled:bg-gray-700 text-white
                               text-sm px-4 py-2.5 rounded-lg
                               transition flex-shrink-0"
                  >
                    {searching ? "..." : "Search"}
                  </button>
                </form>

                {/* Search error */}
                {searchError && (
                  <p className="text-gray-500 text-xs text-center">
                    {searchError}
                  </p>
                )}

                {/* Search results */}
                {searchResults.length > 0 && (
                  <div className="space-y-2">
                    {searchResults.map((result) => {
                      const status = getFriendshipStatus(result.id);
                      const requestSent = result.requestSent;

                      return (
                        <div
                          key={result.id}
                          className="flex items-center gap-3
                                     bg-gray-800/50 rounded-xl p-3"
                        >
                          <Avatar name={result.name} size="sm" />
                          <div className="flex-1 min-w-0">
                            <p
                              className="text-white text-sm
                                          font-medium truncate"
                            >
                              {result.name}
                            </p>
                            <p
                              className="text-gray-500 text-xs
                                          truncate"
                            >
                              {result.email}
                            </p>
                          </div>

                          {/* Action button based on status */}
                          {status === "friends" ? (
                            <span
                              className="text-green-400
                                             text-xs flex items-center
                                             gap-1 flex-shrink-0"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              Friends
                            </span>
                          ) : status === "pending_sent" || requestSent ? (
                            <span
                              className="text-gray-500
                                             text-xs flex-shrink-0"
                            >
                              Pending
                            </span>
                          ) : status === "pending_received" ? (
                            <button
                              onClick={() => {
                                const req = pendingIncoming.find(
                                  (r) => r.user.id === result.id,
                                );
                                if (req) acceptRequest(req.id);
                              }}
                              className="bg-green-600
                                         hover:bg-green-700 text-white
                                         text-xs px-3 py-1.5 rounded-lg
                                         transition flex-shrink-0"
                            >
                              Accept
                            </button>
                          ) : (
                            <button
                              onClick={() => sendRequest(result.id)}
                              className="flex items-center gap-1.5
                                         bg-red-600 hover:bg-red-700
                                         text-white text-xs px-3 py-1.5
                                         rounded-lg transition
                                         flex-shrink-0"
                            >
                              <UserPlus className="w-3.5 h-3.5" />
                              Add
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
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
