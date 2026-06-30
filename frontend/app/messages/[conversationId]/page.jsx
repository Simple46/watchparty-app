"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import ProtectedRoute from "../../../components/ProtectedRoute";
import { useAuth } from "../../../context/AuthContext";
import { useChat } from "../../../context/ChatContext";
import { getSocket } from "../../../lib/socket";
import api from "../../../lib/api";
import { ArrowLeft, Send, Loader, Users } from "lucide-react";

function ConversationContent() {
  const { conversationId } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { onlineUserIds, refreshUnreadCount, setActiveConversation } =
    useChat();

  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [typingUsers, setTypingUsers] = useState(new Set());

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);

  useEffect(() => {
    setActiveConversation(conversationId);
    return () => setActiveConversation(null);
  }, [conversationId, setActiveConversation]);

  useEffect(() => {
    const socket = getSocket();
    socket.emit("join_conversation", { conversationId });

    const fetchData = async () => {
      try {
        const [convRes, msgRes] = await Promise.all([
          api.get(`/api/chat/conversations/${conversationId}`),
          api.get(`/api/chat/conversations/${conversationId}/messages`),
        ]);
        setConversation(convRes.data.conversation);
        setMessages(msgRes.data.messages || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();

    socket.emit("mark_read", { conversationId });
    refreshUnreadCount();

    const onNewMessage = (message) => {
      if (message.conversationId !== conversationId) return;
      setMessages((prev) => [...prev, message]);
      if (message.senderId !== user?.id) {
        socket.emit("mark_read", { conversationId });
      }
    };

    const onUserTyping = ({ userId, conversationId: cid }) => {
      if (cid !== conversationId) return;
      setTypingUsers((prev) => new Set(prev).add(userId));
    };

    const onUserStopTyping = ({ userId, conversationId: cid }) => {
      if (cid !== conversationId) return;
      setTypingUsers((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    };

    socket.on("new_message", onNewMessage);
    socket.on("user_typing", onUserTyping);
    socket.on("user_stop_typing", onUserStopTyping);

    return () => {
      socket.off("new_message", onNewMessage);
      socket.off("user_typing", onUserTyping);
      socket.off("user_stop_typing", onUserStopTyping);
    };
  }, [conversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleInputChange = (value) => {
    setInput(value);
    const socket = getSocket();

    if (!isTypingRef.current) {
      isTypingRef.current = true;
      socket.emit("typing_start", { conversationId });
    }

    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      socket.emit("typing_stop", { conversationId });
    }, 2000);
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const socket = getSocket();
    socket.emit("send_message", {
      conversationId,
      content: input.trim(),
    });

    setInput("");
    clearTimeout(typingTimeoutRef.current);
    isTypingRef.current = false;
    socket.emit("typing_stop", { conversationId });
  };

  const formatTime = (timestamp) =>
    new Date(timestamp).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });

  const otherMember = conversation?.members?.[0];
  const otherOnline =
    conversation?.type === "direct" &&
    otherMember &&
    (onlineUserIds.has(otherMember.id) || otherMember.isOnline);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader className="w-6 h-6 text-gray-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 bg-gray-950/95 backdrop-blur-sm border-b border-gray-800 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => router.push("/messages")}
          className="text-gray-400 hover:text-white"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="w-9 h-9 bg-gray-800 rounded-full flex items-center justify-center text-white text-sm font-semibold overflow-hidden flex-shrink-0">
          {conversation?.avatar ? (
            <img
              src={conversation.avatar}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : conversation?.type === "group" ? (
            <Users className="w-4 h-4 text-gray-400" />
          ) : (
            conversation?.name?.charAt(0).toUpperCase()
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-semibold truncate">
            {conversation?.name}
          </p>
          {conversation?.type === "direct" && (
            <p className="text-gray-500 text-xs">
              {otherOnline ? (
                <span className="text-green-400">Active now</span>
              ) : otherMember?.lastSeenAt ? (
                `Last seen ${formatTime(otherMember.lastSeenAt)}`
              ) : (
                "Offline"
              )}
            </p>
          )}
          {conversation?.type === "group" && (
            <p className="text-gray-500 text-xs">
              {conversation.members.length + 1} members
            </p>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 max-w-2xl mx-auto w-full">
        {messages.map((msg) => {
          const isMine = msg.senderId === user?.id;
          return (
            <div
              key={msg.id}
              className={`flex ${isMine ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[75%] flex flex-col gap-1 ${isMine ? "items-end" : "items-start"}`}
              >
                {!isMine && conversation?.type === "group" && (
                  <p className="text-gray-500 text-xs px-1">
                    {msg.sender?.name}
                  </p>
                )}
                <div
                  className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                    isMine
                      ? "bg-red-600 text-white rounded-tr-sm"
                      : "bg-gray-800 text-white rounded-tl-sm"
                  }`}
                >
                  {msg.content}
                </div>
                <p className="text-gray-600 text-xs px-1">
                  {formatTime(msg.createdAt)}
                </p>
              </div>
            </div>
          );
        })}

        {typingUsers.size > 0 && (
          <p className="text-gray-500 text-xs px-1">
            {conversation?.type === "group"
              ? "Someone is typing..."
              : `${conversation?.name} is typing...`}
          </p>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-800 p-3 max-w-2xl mx-auto w-full">
        <form onSubmit={handleSend} className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder="Message..."
            className="flex-1 bg-gray-900 text-white placeholder-gray-600 border border-gray-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-gray-600 transition"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="w-10 h-10 bg-red-600 hover:bg-red-700 disabled:bg-gray-800 disabled:cursor-not-allowed text-white rounded-xl flex items-center justify-center transition flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ConversationPage() {
  return (
    <ProtectedRoute>
      <ConversationContent />
    </ProtectedRoute>
  );
}
