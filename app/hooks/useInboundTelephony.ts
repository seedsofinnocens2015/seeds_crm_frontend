"use client";

import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

export interface InboundCallEvent {
  callId: string;
  uuid?: string;
  did: string;
  callerNumber: string;
  normalizedPhone: string;
  status: "ringing" | "answered" | "missed" | "ended";
  timestamp: string;
  agentExtension?: string;
  agentName?: string;
  leadMatched: boolean;
  lead?: {
    id: string;
    uniqueId: string;
    name: string;
    stage?: string;
    owner?: string;
    primaryMobileNumber?: string;
    gender?: string;
  } | null;
}

export interface OutboundCallEndedEvent {
  callId?: string;
  refId?: string;
  leadId?: string;
  leadUniqueId?: string;
  customerNumber?: string;
  status: "answered" | "missed" | "ended" | "failed" | "completed";
  durationSeconds?: number;
  timestamp: string;
}

// Shared singleton socket instance to prevent duplicate connections across re-renders
let sharedSocket: Socket | null = null;
let listenerCount = 0;
let cachedAuthToken: string | null = null;
let cachedUserRole: string | null = null;

/**
 * Helper to fetch current authenticated session, JWT token, and user role.
 * Uses existing /api/auth/me which returns { user, token }.
 */
async function fetchSessionData(): Promise<{ token: string | null; role: string | null }> {
  if (cachedAuthToken && cachedUserRole) {
    return { token: cachedAuthToken, role: cachedUserRole };
  }
  try {
    const res = await fetch("/api/auth/me");
    if (!res.ok) return { token: null, role: null };
    const data = await res.json();
    if (data?.token) {
      cachedAuthToken = data.token;
      cachedUserRole = data.user?.role || "agent";
      return { token: cachedAuthToken, role: cachedUserRole };
    }
  } catch {
    // ignore
  }
  return { token: null, role: null };
}

export function useInboundTelephony() {
  const [activeCall, setActiveCall] = useState<InboundCallEvent | null>(null);
  const [callState, setCallState] = useState<"idle" | "ringing" | "connected" | "ended" | "missed">("idle");
  const [userRole, setUserRole] = useState<string>("agent");

  useEffect(() => {
    let isMounted = true;

    // Determine socket target URL
    const socketBaseUrl =
      process.env.NEXT_PUBLIC_SOCKET_URL ||
      (typeof window !== "undefined" ? window.location.origin : "");

    async function initOrReuseSocket() {
      // 1. Ensure user is authenticated and get valid JWT
      const session = await fetchSessionData();
      const token = session.token;
      if (session.role) {
        setUserRole(session.role);
      }
      if (!token || !isMounted) {
        // User not logged in, do not connect socket
        return;
      }

      if (!sharedSocket || !sharedSocket.connected) {
        if (!sharedSocket) {
          sharedSocket = io(socketBaseUrl, {
            path: "/socket.io",
            withCredentials: true,
            transports: ["websocket", "polling"],
            auth: {
              token,
            },
            query: {
              token,
            },
            reconnectionAttempts: 10,
            reconnectionDelay: 2000,
            autoConnect: true,
          });

          // Handle token refresh or reconnection updates
          sharedSocket.on("connect_error", async (err: any) => {
            if (err?.message?.includes("token") || err?.message?.includes("Authentication")) {
              cachedAuthToken = null;
              cachedUserRole = null;
              const refreshedSession = await fetchSessionData();
              const refreshedToken = refreshedSession.token;
              if (refreshedSession.role) {
                setUserRole(refreshedSession.role);
              }
              if (refreshedToken && sharedSocket) {
                sharedSocket.auth = { token: refreshedToken };
                (sharedSocket.io.opts as any).query = { token: refreshedToken };
                sharedSocket.connect();
              }
            }
          });
        }
      }

      listenerCount++;
      const socket = sharedSocket;

      const handleRinging = (data: InboundCallEvent) => {
        console.info(`[InboundTelephony Socket] Received inbound:ringing at ${new Date().toISOString()}:`, data);
        if (isMounted) {
          setActiveCall(data);
          setCallState("ringing");
        }
      };

      const handleAnswered = (data: InboundCallEvent) => {
        console.info(`[InboundTelephony Socket] Received inbound:answered at ${new Date().toISOString()}:`, data);
        if (isMounted) {
          setActiveCall((prev) => (prev ? { ...prev, ...data, status: "answered" } : data));
          setCallState("connected");
        }
      };

      const handleMissed = (data: InboundCallEvent) => {
        console.info(`[InboundTelephony Socket] Received inbound:missed at ${new Date().toISOString()}:`, data);
        if (isMounted) {
          setActiveCall((prev) => (prev ? { ...prev, ...data, status: "missed" } : data));
          setCallState("missed");
        }
      };

      const handleEnded = (data: InboundCallEvent) => {
        console.info(`[InboundTelephony Socket] Received inbound:ended at ${new Date().toISOString()}:`, data);
        if (isMounted) {
          setActiveCall((prev) => (prev ? { ...prev, ...data, status: "ended" } : data));
          setCallState("ended");
        }
      };

      const handleOutboundEnded = (data: OutboundCallEndedEvent) => {
        console.info(`[InboundTelephony Socket] Received outbound:ended / call:ended at ${new Date().toISOString()}:`, data);
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("telephony:call_ended", { detail: data }));
        }
      };

      socket.on("inbound:ringing", handleRinging);
      socket.on("inbound:answered", handleAnswered);
      socket.on("inbound:missed", handleMissed);
      socket.on("inbound:ended", handleEnded);
      socket.on("outbound:ended", handleOutboundEnded);
      socket.on("call:ended", handleOutboundEnded);

      return () => {
        socket.off("inbound:ringing", handleRinging);
        socket.off("inbound:answered", handleAnswered);
        socket.off("inbound:missed", handleMissed);
        socket.off("inbound:ended", handleEnded);
        socket.off("outbound:ended", handleOutboundEnded);
        socket.off("call:ended", handleOutboundEnded);

        listenerCount--;
        if (listenerCount <= 0) {
          listenerCount = 0;
          socket.disconnect();
          sharedSocket = null;
        }
      };
    }

    let cleanupPromise = initOrReuseSocket();

    return () => {
      isMounted = false;
      cleanupPromise.then((cleanup) => {
        if (typeof cleanup === "function") cleanup();
      });
    };
  }, []);

  const dismissCall = () => {
    setActiveCall(null);
    setCallState("idle");
  };

  return {
    activeCall,
    callState,
    userRole,
    dismissCall,
  };
}
