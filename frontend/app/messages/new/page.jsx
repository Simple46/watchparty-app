"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../../../components/Navbar";
import ProtectedRoute from "../../../components/ProtectedRoute";
import api from "../../../lib/api";
import { ArrowLeft, Check, Loader, Users } from "lucide-react";

function NewConversationContent() {
  const router = useRouter();
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(new Set());
  const [groupName, setGroupName] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const fetchFriends = async () => {
      try {
        const res = await api.get("/api/friends");
        setFriends(res.data.friends || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchFriends();
  }, []);

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const startDirect = async (friendId) => {
    setCreating(true);
    try {
      const res = await api.post("/api/chat/conversations/direct", {
        friendId,
      });
      router.push(`/messages/${res.data.conversationId}`);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to start conversation");
      setCreating(false);
    }
  };

  const createGroup = async () => {
    if (!groupName.trim() || selected.size < 2) return;
    setCreating(true);
    try {
      const res = await api.post("/api/chat/conversations/group", {
        name: groupName.trim(),
        memberIds: Array.from(selected),
      });
      router.push(`/messages/${res.data.conversationId}`);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to create group");
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.push("/messages")}
            className="text-gray-400 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-white text-xl font-bold">New Message</h1>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader className="w-6 h-6 text-gray-600 animate-spin" />
          </div>
        ) : friends.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400 text-sm mb-2">No friends yet</p>
            <p className="text-gray-600 text-xs">
              Add friends from your profile to start chatting
            </p>
          </div>
        ) : (
          <>
            <p className="text-gray-500 text-xs mb-3">
              Select one friend to message directly, or select multiple for a
              group
            </p>

            <div className="space-y-1 mb-6">
              {friends.map((f) => {
                const isSelected = selected.has(f.user.id);
                return (
                  <button
                    key={f.id}
                    onClick={() => toggleSelect(f.user.id)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-900 transition text-left"
                  >
                    <div className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                      {f.user.name?.charAt(0).toUpperCase()}
                    </div>
                    <p className="flex-1 text-white text-sm font-medium truncate">
                      {f.user.name}
                    </p>
                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 transition ${
                        isSelected
                          ? "bg-red-600 border-red-600"
                          : "border-gray-700"
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </div>
                  </button>
                );
              })}
            </div>

            {selected.size === 1 && (
              <button
                onClick={() => startDirect(Array.from(selected)[0])}
                disabled={creating}
                className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-sm font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2"
              >
                {creating && <Loader className="w-4 h-4 animate-spin" />}
                Message{" "}
                {
                  friends.find((f) => f.user.id === Array.from(selected)[0])
                    ?.user.name
                }
              </button>
            )}

            {selected.size >= 2 && (
              <div className="space-y-3">
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Group name"
                  className="w-full bg-gray-900 text-white placeholder-gray-600 border border-gray-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-gray-600 transition"
                />
                <button
                  onClick={createGroup}
                  disabled={creating || !groupName.trim()}
                  className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-sm font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2"
                >
                  {creating && <Loader className="w-4 h-4 animate-spin" />}
                  <Users className="w-4 h-4" />
                  Create Group ({selected.size + 1} members)
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function NewConversationPage() {
  return (
    <ProtectedRoute>
      <NewConversationContent />
    </ProtectedRoute>
  );
}
