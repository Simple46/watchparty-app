"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "../../components/Navbar";
import ProtectedRoute from "../../components/ProtectedRoute";
import { useChat } from "../../context/ChatContext";
import api from "../../lib/api";
import { Plus, Loader, MessageCircle, Users } from "lucide-react";

function MessagesContent() {
  const router = useRouter();
  const { onlineUserIds, setActiveConversation } = useChat();

  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setActiveConversation(null); // not inside any thread on this page

    const fetchConversations = async () => {
      try {
        const res = await api.get("/api/chat/conversations");
        setConversations(res.data.conversations || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchConversations();
  }, [setActiveConversation]);

  const isDirectOnline = (conv) => {
    if (conv.type !== "direct") return false;
    const other = conv.members[0];
    return other ? onlineUserIds.has(other.id) || other.isOnline : false;
  };

  const formatLastSeen = (lastSeenAt) => {
    if (!lastSeenAt) return "Offline";
    const mins = Math.floor((Date.now() - new Date(lastSeenAt)) / 60000);
    if (mins < 1) return "Active just now";
    if (mins < 60) return `Active ${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `Active ${hours}h ago`;
    return `Active ${Math.floor(hours / 24)}d ago`;
  };

  const formatTime = (timestamp) => {
    const d = new Date(timestamp);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) {
      return d.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-white text-xl font-bold">Messages</h1>
          <Link href="/messages/new">
            <button className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-3 py-2 rounded-lg transition">
              <Plus className="w-4 h-4" />
              New
            </button>
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader className="w-6 h-6 text-gray-600 animate-spin" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-12 h-12 bg-gray-900 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <MessageCircle className="w-5 h-5 text-gray-600" />
            </div>
            <p className="text-gray-400 text-sm mb-4">No conversations yet</p>
            <Link href="/messages/new">
              <button className="bg-red-600 hover:bg-red-700 text-white text-sm px-4 py-2 rounded-lg transition">
                Start a conversation
              </button>
            </Link>
          </div>
        ) : (
          <div className="space-y-1">
            {conversations.map((conv) => {
              const online = isDirectOnline(conv);
              return (
                <button
                  key={conv.id}
                  onClick={() => router.push(`/messages/${conv.id}`)}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-900 transition text-left"
                >
                  <div className="relative flex-shrink-0">
                    <div className="w-11 h-11 bg-gray-800 rounded-full flex items-center justify-center text-white text-sm font-semibold overflow-hidden">
                      {conv.avatar ? (
                        <img
                          src={conv.avatar}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : conv.type === "group" ? (
                        <Users className="w-4 h-4 text-gray-400" />
                      ) : (
                        conv.name?.charAt(0).toUpperCase()
                      )}
                    </div>
                    {conv.type === "direct" && online && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-950" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-white text-sm font-medium truncate">
                        {conv.name}
                      </p>
                      {conv.lastMessage && (
                        <span className="text-gray-600 text-xs flex-shrink-0">
                          {formatTime(conv.lastMessage.createdAt)}
                        </span>
                      )}
                    </div>
                    <p className="text-gray-500 text-xs truncate mt-0.5">
                      {conv.lastMessage
                        ? conv.lastMessage.content
                        : conv.type === "direct"
                          ? online
                            ? "Active now"
                            : formatLastSeen(conv.members[0]?.lastSeenAt)
                          : "No messages yet"}
                    </p>
                  </div>

                  {conv.unreadCount > 0 && (
                    <span className="bg-red-600 text-white text-xs font-medium w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0">
                      {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function MessagesPage() {
  return (
    <ProtectedRoute>
      <MessagesContent />
    </ProtectedRoute>
  );
}
