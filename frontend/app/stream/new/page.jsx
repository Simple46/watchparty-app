"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../../../components/Navbar";
import ProtectedRoute from "../../../components/ProtectedRoute";
import { useAuth } from "../../../context/AuthContext";
import api from "../../../lib/api";
import { Wifi, Shield, Users, ArrowRight, Loader } from "lucide-react";

function NewStreamContent() {
  const router = useRouter();
  const { user } = useAuth();
  const [creating, setCreating] = useState(false);

  const createP2PRoom = async () => {
    setCreating(true);
    try {
      // Reuse the existing room creation API
      // We create a "room" with a placeholder movie
      // The actual video comes from the host's device via WebRTC
      const res = await api.post("/api/rooms/create-p2p");
      router.push(`/room/${res.data.roomCode}?mode=p2p`);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to create stream room");
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-16">
        <div className="text-center mb-10">
          <div
            className="w-16 h-16 bg-red-600/20 border
                          border-red-600/30 rounded-2xl flex
                          items-center justify-center mx-auto mb-5"
          >
            <Wifi className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-white text-2xl font-bold mb-2">
            Stream from Your Device
          </h1>
          <p className="text-gray-400 text-sm leading-relaxed">
            Pick any movie file on your phone or computer. Friends join your
            room and watch a live stream directly from your device — nothing
            gets uploaded.
          </p>
        </div>

        <div className="space-y-3 mb-8">
          {[
            {
              icon: Shield,
              title: "Your file stays private",
              desc: "The movie never leaves your device. Only a live stream is shared.",
            },
            {
              icon: Users,
              title: "Friends join instantly",
              desc: "Share the room code and friends can watch without downloading anything.",
            },
            {
              icon: Wifi,
              title: "Peer-to-peer connection",
              desc: "Video goes directly from your browser to your friends' browsers.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="flex items-start gap-4 bg-gray-900
                         border border-gray-800 rounded-xl p-4"
            >
              <div
                className="w-9 h-9 bg-gray-800 rounded-lg
                              flex items-center justify-center
                              flex-shrink-0"
              >
                <item.icon className="w-4 h-4 text-gray-400" />
              </div>
              <div>
                <p className="text-white text-sm font-medium">{item.title}</p>
                <p className="text-gray-500 text-xs mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={createP2PRoom}
          disabled={creating}
          className="w-full flex items-center justify-center gap-3
                     bg-red-600 hover:bg-red-700 disabled:opacity-60
                     text-white font-semibold py-4 rounded-xl
                     transition text-sm"
        >
          {creating ? (
            <Loader className="w-4 h-4 animate-spin" />
          ) : (
            <>
              Create Stream Room
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default function NewStreamPage() {
  return (
    <ProtectedRoute>
      <NewStreamContent />
    </ProtectedRoute>
  );
}
