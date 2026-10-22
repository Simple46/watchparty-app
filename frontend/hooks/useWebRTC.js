/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { getSocket } from "../lib/socket";
import api from "../lib/api";

export default function useWebRTC({ roomCode, isHost }) {
  // Host: local file stream going out
  // Viewer: incoming remote stream
  const [stream, setStream] = useState(null);
  const [connectionState, setConnectionState] = useState("idle");
  // idle | connecting | connected | failed
  const [viewerCount, setViewerCount] = useState(0);
  const [error, setError] = useState(null);

  // Map of viewerSocketId → RTCPeerConnection (host only)
  const peerConnections = useRef({});

  // The local media stream from the host's file (host only)
  const localStream = useRef(null);

  // ICE server config fetched from backend
  const iceConfig = useRef(null);
  const iceConfigPromise = useRef(null);

  const loadIceConfig = useCallback(() => {
    if (!iceConfigPromise.current) {
      iceConfigPromise.current = api
        .get("/api/rooms/ice-config")
        .then((res) => {
          iceConfig.current = { iceServers: res.data.iceServers };
          console.log("✅ ICE config loaded");
        })
        .catch((err) => {
          console.error("Failed to fetch ICE config:", err);
          iceConfig.current = {
            iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
          };
        });
    }

    return iceConfigPromise.current.then(() => iceConfig.current);
  }, []);

  useEffect(() => {
    loadIceConfig();
  }, [loadIceConfig]);

  // ─── Create a peer connection to a specific viewer ───
  const createPeerConnection = useCallback(
    async (viewerSocketId) => {
      const socket = getSocket();
      const pc = new RTCPeerConnection(await loadIceConfig());

      // When host gets ICE candidates, relay to specific viewer
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("p2p:ice_candidate", {
            targetSocketId: viewerSocketId,
            candidate: event.candidate,
          });
        }
      };

      pc.onconnectionstatechange = () => {
        console.log(
          `Connection state (${viewerSocketId}):`,
          pc.connectionState,
        );
        if (pc.connectionState === "connected") {
          setViewerCount((prev) => prev + 1);
          setConnectionState("connected");
        }
        if (
          pc.connectionState === "disconnected" ||
          pc.connectionState === "failed" ||
          pc.connectionState === "closed"
        ) {
          setViewerCount((prev) => Math.max(0, prev - 1));
          delete peerConnections.current[viewerSocketId];
        }
      };

      // Add all local tracks to this peer connection
      if (localStream.current) {
        localStream.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStream.current);
        });
      }

      peerConnections.current[viewerSocketId] = pc;
      return pc;
    },
    [loadIceConfig],
  );

  // ─── HOST: Start streaming from a local file ───
  const startHostStream = useCallback(
    async (file) => {
      const socket = getSocket();
      setConnectionState("connecting");
      setError(null);

      try {
        // Create a hidden video element to play the file
        // then capture its stream — this is the key trick
        const videoEl = document.createElement("video");
        videoEl.src = URL.createObjectURL(file);
        videoEl.muted = true; // muted so it doesn't play audio twice
        videoEl.playsInline = true;

        await new Promise((resolve, reject) => {
          videoEl.onloadedmetadata = resolve;
          videoEl.onerror = reject;
          setTimeout(resolve, 3000); // fallback
        });

        // captureStream() gets a live MediaStream from the video element
        const capturedStream = videoEl.captureStream
          ? videoEl.captureStream()
          : videoEl.mozCaptureStream(); // Firefox

        localStream.current = capturedStream;
        setStream(capturedStream);

        // Signal to all viewers that host is ready
        socket.emit("p2p:host_ready", { roomCode });
        setConnectionState("connected");

        return videoEl; // caller controls play/pause
      } catch (err) {
        console.error("Failed to start host stream:", err);
        setError(
          "Failed to capture video stream from file. " +
            "Try a different browser (Chrome works best).",
        );
        setConnectionState("failed");
      }
    },
    [roomCode],
  );

  // ─── HOST: Make offer to a new viewer that just joined ───
  const makeOffer = useCallback(
    async (viewerSocketId) => {
      const socket = getSocket();
      const pc = await createPeerConnection(viewerSocketId);

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit("p2p:offer", {
        viewerSocketId,
        offer: pc.localDescription,
      });
    },
    [createPeerConnection],
  );

  // ─── VIEWER: Join and receive stream from host ───
  const joinAsViewer = useCallback(() => {
    const socket = getSocket();
    setConnectionState("connecting");

    socket.emit("p2p:viewer_join", { roomCode });
  }, [roomCode]);

  // ─── SOCKET EVENT LISTENERS ───
  useEffect(() => {
    if (!roomCode) return;
    const socket = getSocket();

    if (isHost) {
      // Host listens for new viewers joining
      const onViewerJoined = ({ viewerSocketId }) => {
        console.log(`New viewer: ${viewerSocketId}`);
        makeOffer(viewerSocketId);
      };

      // Host receives answer from a viewer
      const onAnswer = async ({ answer, viewerSocketId }) => {
        const pc = peerConnections.current[viewerSocketId];
        if (pc) {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
        }
      };

      // ICE candidate from a viewer
      const onIceCandidate = async ({ candidate, fromSocketId }) => {
        const pc = peerConnections.current[fromSocketId];
        if (pc && candidate) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (err) {
            console.warn("ICE candidate error:", err);
          }
        }
      };

      socket.on("p2p:viewer_joined", onViewerJoined);
      socket.on("p2p:answer", onAnswer);
      socket.on("p2p:ice_candidate", onIceCandidate);

      return () => {
        socket.off("p2p:viewer_joined", onViewerJoined);
        socket.off("p2p:answer", onAnswer);
        socket.off("p2p:ice_candidate", onIceCandidate);
      };
    } else {
      // Viewer listens for offer from host
      const onHostReady = () => {
        setConnectionState("connecting");
        // The viewer may have joined before the host started its stream.
        joinAsViewer();
      };

      const onOffer = async ({ offer, hostSocketId }) => {
        const socket = getSocket();
        const pc = new RTCPeerConnection(await loadIceConfig());

        // When viewer gets ICE candidates, relay to host
        pc.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit("p2p:ice_candidate", {
              targetSocketId: hostSocketId,
              candidate: event.candidate,
            });
          }
        };

        // When viewer receives tracks from host — this is the stream
        pc.ontrack = (event) => {
          console.log("✅ Receiving stream from host");
          setStream(event.streams[0]);
          setConnectionState("connected");
        };

        pc.onconnectionstatechange = () => {
          console.log("Viewer connection state:", pc.connectionState);
          if (
            pc.connectionState === "failed" ||
            pc.connectionState === "disconnected"
          ) {
            setConnectionState("failed");
            setError(
              "Connection to host lost. " +
                "The host may have ended the stream.",
            );
          }
        };

        await pc.setRemoteDescription(new RTCSessionDescription(offer));

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit("p2p:answer", {
          hostSocketId,
          answer: pc.localDescription,
        });

        // Store for ICE candidate handling
        peerConnections.current[hostSocketId] = pc;
      };

      // ICE candidate from host
      const onIceCandidate = async ({ candidate, fromSocketId }) => {
        const pc = peerConnections.current[fromSocketId];
        if (pc && candidate) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (err) {
            console.warn("ICE candidate error:", err);
          }
        }
      };

      socket.on("p2p:host_ready", onHostReady);
      socket.on("p2p:offer", onOffer);
      socket.on("p2p:ice_candidate", onIceCandidate);

      // Tell server we are here as a viewer
      joinAsViewer();

      return () => {
        socket.off("p2p:host_ready", onHostReady);
        socket.off("p2p:offer", onOffer);
        socket.off("p2p:ice_candidate", onIceCandidate);
      };
    }
  }, [roomCode, isHost, makeOffer, joinAsViewer, loadIceConfig]);

  // ─── CLEANUP on unmount ───
  useEffect(() => {
    return () => {
      // Close all peer connections
      Object.values(peerConnections.current).forEach((pc) => {
        pc.close();
      });
      peerConnections.current = {};

      // Stop local stream tracks
      if (localStream.current) {
        localStream.current.getTracks().forEach((t) => t.stop());
        localStream.current = null;
      }
    };
  }, []);

  return {
    stream,
    connectionState,
    viewerCount,
    error,
    startHostStream,
    joinAsViewer,
  };
}
