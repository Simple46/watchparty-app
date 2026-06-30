/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import { getSocket } from "../lib/socket";
import { useAuth } from "./AuthContext";
import api from "../lib/api";

const ChatContext = createContext(null);

export function ChatProvider({ children }) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [onlineUserIds, setOnlineUserIds] = useState(new Set());

  // Tracks which conversation the user is currently viewing
  // so we don't bump the badge for messages they're already reading
  const activeConversationRef = useRef(null);

  const refreshUnreadCount = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.get("/api/chat/unread-count");
      setUnreadCount(res.data.unreadCount || 0);
    } catch {
      // silent fail — badge just won't update this cycle
    }
  }, [user]);

  const setActiveConversation = useCallback((id) => {
    activeConversationRef.current = id;
  }, []);

  useEffect(() => {
    if (!user) return;
    refreshUnreadCount();

    const socket = getSocket();

    const onNewMessage = (message) => {
      if (
        message.conversationId !== activeConversationRef.current &&
        message.senderId !== user.id
      ) {
        setUnreadCount((prev) => prev + 1);
      }
    };

    const onFriendOnline = ({ userId }) => {
      setOnlineUserIds((prev) => new Set(prev).add(userId));
    };

    const onFriendOffline = ({ userId }) => {
      setOnlineUserIds((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    };

    socket.on("new_message", onNewMessage);
    socket.on("friend_online", onFriendOnline);
    socket.on("friend_offline", onFriendOffline);

    return () => {
      socket.off("new_message", onNewMessage);
      socket.off("friend_online", onFriendOnline);
      socket.off("friend_offline", onFriendOffline);
    };
  }, [user, refreshUnreadCount]);

  return (
    <ChatContext.Provider
      value={{
        unreadCount,
        refreshUnreadCount,
        onlineUserIds,
        setActiveConversation,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export const useChat = () => useContext(ChatContext);
