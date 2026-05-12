"use client";

import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";

export default function ChatPanel({ messages, onSendMessage, currentUserId }) {
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef(null);

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    onSendMessage(inputValue.trim());
    setInputValue("");
  };

  // Format timestamp
  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-800 flex-shrink-0">
        <h3 className="text-white font-semibold text-sm">Live Chat</h3>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* Empty state */}
        {messages.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-600 text-xs">No messages yet. Say hello!</p>
          </div>
        )}

        {messages.map((msg, index) => {
          // System messages (user joined/left etc)
          if (msg.isSystem) {
            return (
              <div key={msg.id || index} className="text-center">
                <span
                  className="text-gray-600 text-xs
                                 bg-gray-800/50 px-3 py-1
                                 rounded-full"
                >
                  {msg.message}
                </span>
              </div>
            );
          }

          // Find this line and update it
          const isMine = msg.isMine || msg.userId === currentUserId;
          return (
            <div
              key={index}
              className={`flex gap-2 ${isMine ? "flex-row-reverse" : ""}`}
            >
              {/* Avatar */}
              {!isMine && (
                <div
                  className="w-6 h-6 bg-red-600 rounded-full
                                flex items-center justify-center
                                text-white text-xs font-bold
                                flex-shrink-0 mt-1"
                >
                  {msg.name?.charAt(0).toUpperCase()}
                </div>
              )}

              {/* Message bubble */}
              <div
                className={`
                  max-w-[75%] space-y-0.5
                  ${isMine ? "items-end" : "items-start"}
                  flex flex-col
                `}
              >
                {/* Name and time */}
                {!isMine && (
                  <p className="text-gray-500 text-xs px-1">{msg.name}</p>
                )}

                <div
                  className={`
                    px-3 py-2 rounded-2xl text-sm leading-relaxed
                    ${
                      isMine
                        ? "bg-red-600 text-white rounded-tr-sm"
                        : "bg-gray-800 text-white rounded-tl-sm"
                    }
                  `}
                >
                  {msg.message}
                </div>

                <p className="text-gray-600 text-xs px-1">
                  {formatTime(msg.timestamp)}
                </p>
              </div>
            </div>
          );
        })}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-gray-800 flex-shrink-0">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Say something..."
            maxLength={500}
            className="flex-1 bg-gray-800 text-white
                       placeholder-gray-600 border border-gray-700
                       rounded-lg px-3 py-2.5 text-sm
                       focus:outline-none focus:border-red-500
                       transition"
          />
          <button
            type="submit"
            disabled={!inputValue.trim()}
            className="w-9 h-9 bg-red-600 hover:bg-red-700
                       disabled:bg-gray-700
                       disabled:cursor-not-allowed text-white
                       rounded-lg flex items-center justify-center
                       transition flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
