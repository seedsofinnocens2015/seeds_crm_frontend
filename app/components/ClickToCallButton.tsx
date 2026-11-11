"use client";

import { apiFetch } from "@/lib/api";
import React, { useState, useEffect, useRef } from "react";
import { Phone, PhoneCall, PhoneOff, Loader2, AlertCircle, Clock } from "lucide-react";

export type CallLifecycleState = "IDLE" | "INITIATING" | "RINGING" | "CONNECTED" | "ENDING" | "ERROR";

interface ClickToCallButtonProps {
  leadId: string; // uniqueId or _id
  phoneDisplay?: string;
  variant?: "table-icon" | "button" | "header-action";
  onSuccess?: (msg: string) => void;
  onError?: (err: string) => void;
}

export default function ClickToCallButton({
  leadId,
  phoneDisplay,
  variant = "button",
  onSuccess,
  onError,
}: ClickToCallButtonProps) {
  // Call-state-aware lifecycle states
  const [callState, setCallState] = useState<CallLifecycleState>("IDLE");
  const [feedback, setFeedback] = useState<string>("");

  // Active call identifiers
  const [activeRefId, setActiveRefId] = useState<string>("");
  const [activeCallId, setActiveCallId] = useState<string>("");

  // Connected call duration timer (seconds)
  const [secondsElapsed, setSecondsElapsed] = useState<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Safety initiation/ringing timeout and polling refs
  const initiationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSocketEventTimeRef = useRef<number>(0);

  // Authenticated user ID for agent-specific correlation
  const [currentUserId, setCurrentUserId] = useState<string>("");

  // Fetch current user on mount for private routing checks
  useEffect(() => {
    let isMounted = true;
    async function loadMe() {
      try {
        const res = await apiFetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data?.user?.id) {
            setCurrentUserId(String(data.user.id));
          }
        }
      } catch {
        // ignore
      }
    }
    loadMe();
    return () => {
      isMounted = false;
    };
  }, []);

  // Clear active safety timers and intervals helper
  const clearSafetyTimers = () => {
    if (initiationTimeoutRef.current) {
      clearTimeout(initiationTimeoutRef.current);
      initiationTimeoutRef.current = null;
    }
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

  // Timer effect for connected calls & safety timers cleanup
  useEffect(() => {
    if (callState === "CONNECTED") {
      clearSafetyTimers();
      setSecondsElapsed(0);
      timerRef.current = setInterval(() => {
        setSecondsElapsed((prev) => prev + 1);
      }, 1000);
    } else if (callState === "IDLE" || callState === "ERROR" || callState === "ENDING") {
      clearSafetyTimers();
      if (timerRef.current) clearInterval(timerRef.current);
      setSecondsElapsed(0);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callState]);

  // Safety Timeout & Short Polling Fallback during INITIATING and RINGING
  useEffect(() => {
    if (callState !== "INITIATING" && callState !== "RINGING") {
      clearSafetyTimers();
      return;
    }

    // 1. Safety Timeout: Reconcile with backend after 45 seconds to prevent indefinite stuck UI
    const timeoutDurationMs = 45000;
    initiationTimeoutRef.current = setTimeout(async () => {
      // Before blindly resetting, check if call is actually connected in backend
      try {
        if (leadId) {
          const res = await apiFetch(`/api/integrations/smartflo/calls/${encodeURIComponent(leadId)}`);
          if (res.ok) {
            const data = await res.json();
            const calls = data?.calls || [];
            const active = calls.find((c: any) => {
              const matchesCall =
                (activeRefId && c.refId === activeRefId) ||
                (activeCallId && c.callId === activeCallId) ||
                c.status === "connected" ||
                c.status === "in_progress" ||
                c.status === "ringing";
              return matchesCall;
            });

            if (active && active.status === "connected") {
              // Call actually connected; transition to connected instead of timing out
              setCallState("CONNECTED");
              if (active.refId) setActiveRefId(active.refId);
              if (active.callId) setActiveCallId(active.callId);
              if (active.answeredDurationSeconds > 0) {
                setSecondsElapsed(active.answeredDurationSeconds);
              }
              setFeedback("Call Connected");
              return;
            }
          }
        }
      } catch {
        // ignore check error
      }

      // If Smartflo did not connect, reset state safely with feedback
      setCallState("IDLE");
      setActiveRefId("");
      setActiveCallId("");
      const timeoutMsg = "Agent extension did not answer / Call timed out";
      setFeedback(timeoutMsg);
      if (onError) onError(timeoutMsg);
      setTimeout(() => setFeedback(""), 4000);
    }, timeoutDurationMs);

    // 2. Short REST Polling Fallback (every 4 seconds) to guard against dropped Socket.IO events
    pollIntervalRef.current = setInterval(async () => {
      // Do not overwrite if a fresher real-time socket event arrived within the last 2 seconds
      if (Date.now() - lastSocketEventTimeRef.current < 2000) {
        return;
      }

      if (!leadId) return;

      try {
        const res = await apiFetch(`/api/integrations/smartflo/calls/${encodeURIComponent(leadId)}`);
        if (!res.ok) return;
        const data = await res.json();
        const calls = data?.calls || [];
        if (!Array.isArray(calls) || calls.length === 0) return;

        // Correlate with active call
        const relevantCall = calls.find((c: any) => {
          if (activeRefId && c.refId && c.refId === activeRefId) return true;
          if (activeCallId && c.callId && c.callId === activeCallId) return true;
          return c.status === "in_progress" || c.status === "ringing" || c.status === "connected";
        });

        if (!relevantCall) return;

        // Check if status transitioned to terminal or answered
        const terminalStatuses = ["answered", "missed", "completed", "ended", "failed", "busy", "no_answer"];
        if (relevantCall.status === "connected" || (relevantCall.status === "answered" && !relevantCall.hangupCause && relevantCall.durationSeconds === 0)) {
          // Genuine live answer detected via polling
          setCallState("CONNECTED");
          if (relevantCall.refId) setActiveRefId(relevantCall.refId);
          if (relevantCall.callId) setActiveCallId(relevantCall.callId);
          if (relevantCall.answeredDurationSeconds > 0) {
            setSecondsElapsed(relevantCall.answeredDurationSeconds);
          }
          setFeedback("Call Connected");
        } else if (terminalStatuses.includes(relevantCall.status)) {
          // Terminal state reached: clear active state
          setCallState("IDLE");
          setActiveRefId("");
          setActiveCallId("");
          setFeedback(relevantCall.status === "answered" ? "Call Ended" : `Call ${relevantCall.status.replace("_", " ")}`);
          setTimeout(() => setFeedback(""), 3000);
        } else if (relevantCall.status === "ringing" || relevantCall.status === "in_progress") {
          // Confirm active ringing
          if (relevantCall.refId && !activeRefId) setActiveRefId(relevantCall.refId);
          if (relevantCall.callId && !activeCallId) setActiveCallId(relevantCall.callId);
        }
      } catch {
        // ignore polling errors
      }
    }, 4000);

    return () => {
      clearSafetyTimers();
    };
  }, [callState, leadId, activeRefId, activeCallId]);

  // Check active call on initial mount / page refresh
  useEffect(() => {
    let isMounted = true;
    async function checkActiveCall() {
      if (!leadId) return;
      try {
        const res = await apiFetch(`/api/integrations/smartflo/calls/${encodeURIComponent(leadId)}`);
        if (!res.ok) return;
        const data = await res.json();
        const calls = data?.calls || [];
        if (!Array.isArray(calls) || calls.length === 0) return;

        // Find most recent active call for this lead
        const active = calls.find((c: any) => {
          const isOngoing = c.status === "in_progress" || c.status === "ringing" || c.status === "connected";
          // If agentUserId is known, match current user
          if (c.agentUserId && currentUserId && c.agentUserId !== currentUserId) {
            return false;
          }
          return isOngoing;
        });

        if (active && isMounted) {
          if (active.status === "connected") {
            setCallState("CONNECTED");
            setActiveRefId(active.refId || "");
            setActiveCallId(active.callId || "");
            if (active.answeredDurationSeconds > 0) {
              setSecondsElapsed(active.answeredDurationSeconds);
            }
          } else if (active.status === "in_progress" || active.status === "ringing") {
            setCallState("RINGING");
            setActiveRefId(active.refId || "");
            setActiveCallId(active.callId || "");
          }
        }
      } catch {
        // ignore network error on active check
      }
    }

    checkActiveCall();
    return () => {
      isMounted = false;
    };
  }, [leadId, currentUserId]);

  // Event matching helper: matches by refId, callId, or leadId/uniqueId
  const matchesCurrentCall = (detail: any) => {
    if (!detail) return false;
    const matchesRef = activeRefId && detail.refId && detail.refId === activeRefId;
    const matchesCall = activeCallId && detail.callId && detail.callId === activeCallId;
    const matchesLead =
      (leadId && detail.leadId && (detail.leadId === leadId || String(detail.leadId).toLowerCase() === String(leadId).toLowerCase())) ||
      (leadId && detail.leadUniqueId && (detail.leadUniqueId === leadId || String(detail.leadUniqueId).toLowerCase() === String(leadId).toLowerCase()));

    return Boolean(matchesRef || matchesCall || matchesLead);
  };

  // Real-time synchronization listeners via window CustomEvents dispatched by useInboundTelephony
  useEffect(() => {
    // 1. Ringing / Dialed on agent
    const handleOutboundRinging = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!matchesCurrentCall(detail)) return;

      lastSocketEventTimeRef.current = Date.now();
      setCallState("RINGING");
      if (detail.refId) setActiveRefId(detail.refId);
      if (detail.callId) setActiveCallId(detail.callId);
      setFeedback("Ringing Smartflo Agent...");
    };

    // 2. Answered / Connected
    const handleOutboundAnswered = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!matchesCurrentCall(detail)) return;

      lastSocketEventTimeRef.current = Date.now();
      setCallState("CONNECTED");
      if (detail.refId) setActiveRefId(detail.refId);
      if (detail.callId) setActiveCallId(detail.callId);
      setFeedback("Call Connected");
    };

    // 3. Call Ended / Terminal
    const handleCallEnded = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!matchesCurrentCall(detail)) return;

      lastSocketEventTimeRef.current = Date.now();
      clearSafetyTimers();
      setCallState("IDLE");
      setActiveRefId("");
      setActiveCallId("");
      setFeedback("Call Ended");
      setTimeout(() => {
        setFeedback("");
      }, 3000);
    };

    if (typeof window !== "undefined") {
      window.addEventListener("telephony:outbound_ringing", handleOutboundRinging);
      window.addEventListener("telephony:outbound_answered", handleOutboundAnswered);
      window.addEventListener("telephony:call_ended", handleCallEnded);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("telephony:outbound_ringing", handleOutboundRinging);
        window.removeEventListener("telephony:outbound_answered", handleOutboundAnswered);
        window.removeEventListener("telephony:call_ended", handleCallEnded);
      }
    };
  }, [activeRefId, activeCallId, leadId]);

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Handle Initiating Call
  const handleCall = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (callState !== "IDLE" && callState !== "ERROR") return; // prevent repeated clicks

    setCallState("INITIATING");
    setFeedback("");

    try {
      const res = await apiFetch("/api/integrations/smartflo/click-to-call", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          leadId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        const errorText = data.error || data.message || "Failed to initiate call";
        throw new Error(errorText);
      }

      // Initiation succeeded: remain in INITIATING / RINGING state until agent actually answers
      setCallState("RINGING");
      const ref = data.refId || "";
      if (ref) setActiveRefId(ref);
      const callIdentifier = data.callId || "";
      if (callIdentifier) setActiveCallId(callIdentifier);

      const msg = data.message || "Calling... Waiting for agent to answer";
      setFeedback(msg);
      if (onSuccess) onSuccess(msg);
    } catch (err: any) {
      setCallState("IDLE");
      const errMsg = err.message || "Call request failed";
      setFeedback(errMsg);
      if (onError) onError(errMsg);

      setTimeout(() => {
        setFeedback("");
      }, 4000);
    }
  };

  // Handle Terminating Call (Hang Up)
  const handleHangup = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (callState === "ENDING") return; // prevent repeated clicks

    setCallState("ENDING");

    try {
      const res = await apiFetch("/api/integrations/smartflo/hangup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          leadId,
          refId: activeRefId || undefined,
          callId: activeCallId || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        const errorText = data.error || data.message || "";
        if (
          errorText.includes("Invalid Ref ID") ||
          errorText.includes("already ended") ||
          errorText.includes("Call is not active") ||
          errorText.includes("not active")
        ) {
          setCallState("IDLE");
          setActiveRefId("");
          setActiveCallId("");
          setFeedback("Call Ended");
          setTimeout(() => setFeedback(""), 3000);
          return;
        }
        throw new Error(data.error || "Failed to hang up call");
      }

      // If Smartflo confirms call was already terminated
      if (data.message && data.message.includes("already ended")) {
        setCallState("IDLE");
        setActiveRefId("");
        setActiveCallId("");
        setFeedback("Call Ended");
        setTimeout(() => setFeedback(""), 3000);
        return;
      }

      // Normal acceptance: state remains ENDING until confirmed by webhook / socket
      const msg = data.message || "Disconnecting call...";
      setFeedback(msg);
      if (onSuccess) onSuccess(msg);

      // Graceful timeout fallback in case socket event is delayed
      setTimeout(() => {
        setCallState((prev) => (prev === "ENDING" ? "IDLE" : prev));
        setActiveRefId("");
        setActiveCallId("");
        setFeedback("");
      }, 3500);
    } catch (err: any) {
      const errMsg = err.message || "Failed to hang up call";
      if (
        errMsg.includes("Invalid Ref ID") ||
        errMsg.includes("already ended") ||
        errMsg.includes("Call is not active") ||
        errMsg.includes("not active")
      ) {
        setCallState("IDLE");
        setActiveRefId("");
        setActiveCallId("");
        setFeedback("Call Ended");
        setTimeout(() => setFeedback(""), 3000);
        return;
      }

      setCallState("CONNECTED"); // restore connected state if hangup request rejected
      setFeedback(errMsg);
      if (onError) onError(errMsg);
      setTimeout(() => setFeedback(""), 5000);
    }
  };

  // 1. Table Icon Variant (Beside phone number in lead tables)
  if (variant === "table-icon") {
    return (
      <div className="inline-flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
        <span className="font-mono">{phoneDisplay || "-"}</span>
        {phoneDisplay && phoneDisplay.trim() !== "-" && phoneDisplay.trim() !== "" && (
          <button
            type="button"
            title={
              callState === "INITIATING" || callState === "RINGING"
                ? "Calling... Waiting for Agent"
                : callState === "CONNECTED"
                ? "Call Connected"
                : callState === "ENDING"
                ? "Ending Call..."
                : "Call Lead via Smartflo"
            }
            disabled={callState !== "IDLE" && callState !== "ERROR"}
            onClick={handleCall}
            className={`p-1 rounded-md transition-all cursor-pointer ${
              callState === "INITIATING" || callState === "RINGING"
                ? "bg-amber-100 text-amber-700 animate-pulse cursor-not-allowed"
                : callState === "CONNECTED"
                ? "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-400"
                : callState === "ENDING"
                ? "bg-rose-100 text-rose-700 animate-pulse cursor-not-allowed"
                : callState === "ERROR"
                ? "bg-rose-100 text-rose-700 ring-1 ring-rose-400"
                : "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 shadow-2xs hover:scale-105"
            }`}
          >
            {callState === "INITIATING" || callState === "RINGING" || callState === "ENDING" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : callState === "CONNECTED" ? (
              <PhoneCall className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
            ) : callState === "ERROR" ? (
              <AlertCircle className="w-3.5 h-3.5" />
            ) : (
              <PhoneCall className="w-3.5 h-3.5" />
            )}
          </button>
        )}
      </div>
    );
  }

  // 2. Header Action Variant (Top bar of Lead Detail page)
  if (variant === "header-action") {
    return (
      <div className="flex items-center gap-2">
        {/* State 1: IDLE / ERROR */}
        {(callState === "IDLE" || callState === "ERROR") && (
          <button
            type="button"
            onClick={handleCall}
            className={`py-1.5 px-3.5 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition-all cursor-pointer ${
              callState === "ERROR"
                ? "bg-rose-50 border border-rose-300 text-rose-700"
                : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20 active:scale-95"
            }`}
            title={feedback || "Call this lead via Smartflo"}
          >
            {callState === "ERROR" ? (
              <>
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Call Failed</span>
              </>
            ) : (
              <>
                <PhoneCall className="w-3.5 h-3.5" />
                <span>Call Lead</span>
              </>
            )}
          </button>
        )}

        {/* State 2: INITIATING / RINGING (With Cancel / Abort Action) */}
        {(callState === "INITIATING" || callState === "RINGING") && (
          <div className="flex items-center gap-1.5 animate-in fade-in duration-150">
            <button
              type="button"
              disabled
              className="py-1.5 px-3 text-xs font-bold rounded-xl flex items-center gap-1.5 bg-amber-50 border border-amber-300 text-amber-800 shadow-xs cursor-wait"
              title="Waiting for Smartflo agent extension to answer"
            >
              <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-700" />
              <span>{callState === "INITIATING" ? "Calling..." : "Waiting for Agent..."}</span>
            </button>
            <button
              type="button"
              onClick={handleHangup}
              className="py-1.5 px-2.5 text-xs font-semibold rounded-xl flex items-center gap-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 transition-all cursor-pointer shadow-xs active:scale-95"
              title="Cancel call initiation"
            >
              <PhoneOff className="w-3 h-3 text-rose-600" />
              <span>Cancel</span>
            </button>
          </div>
        )}

        {/* State 3: CONNECTED (Replaced with Hangup + Duration) */}
        {callState === "CONNECTED" && (
          <div className="flex items-center gap-2 animate-in fade-in zoom-in-95 duration-150">
            {/* Duration Pill */}
            <span className="inline-flex items-center px-2.5 py-1 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Clock className="w-3 h-3 mr-1" />
              {formatTimer(secondsElapsed)}
            </span>

            {/* Hangup Button */}
            <button
              type="button"
              onClick={handleHangup}
              className="py-1.5 px-3.5 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition-all cursor-pointer bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/25 active:scale-95"
              title="Hangup active Smartflo call"
            >
              <PhoneOff className="w-3.5 h-3.5" />
              <span>Hangup</span>
            </button>
          </div>
        )}

        {/* State 4: ENDING (Disabled, Disconnecting indicator) */}
        {callState === "ENDING" && (
          <button
            type="button"
            disabled
            className="py-1.5 px-3.5 text-xs font-bold rounded-xl flex items-center gap-1.5 bg-rose-50 border border-rose-300 text-rose-700 animate-pulse cursor-not-allowed shadow-xs"
            title="Disconnecting call from Smartflo..."
          >
            <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-600" />
            <span>Ending...</span>
          </button>
        )}
      </div>
    );
  }

  // 3. Standard Button Variant
  return (
    <div className="inline-flex items-center gap-2">
      {(callState === "IDLE" || callState === "ERROR") && (
        <button
          type="button"
          onClick={handleCall}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-all cursor-pointer"
        >
          <PhoneCall className="w-3.5 h-3.5" />
          <span>Call Lead</span>
        </button>
      )}

      {(callState === "INITIATING" || callState === "RINGING") && (
        <div className="inline-flex items-center gap-1.5 animate-in fade-in duration-150">
          <button
            type="button"
            disabled
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-100 text-amber-800 cursor-wait"
          >
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>{callState === "INITIATING" ? "Calling..." : "Waiting for Agent..."}</span>
          </button>
          <button
            type="button"
            onClick={handleHangup}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 transition-all cursor-pointer"
            title="Cancel call initiation"
          >
            <PhoneOff className="w-3 h-3 text-rose-600" />
            <span>Cancel</span>
          </button>
        </div>
      )}

      {callState === "CONNECTED" && (
        <div className="inline-flex items-center gap-1.5">
          <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded">
            {formatTimer(secondsElapsed)}
          </span>
          <button
            type="button"
            onClick={handleHangup}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white transition-all cursor-pointer"
          >
            <PhoneOff className="w-3.5 h-3.5" />
            <span>Hangup</span>
          </button>
        </div>
      )}

      {callState === "ENDING" && (
        <button
          type="button"
          disabled
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-100 text-rose-800 cursor-not-allowed"
        >
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>Ending...</span>
        </button>
      )}
    </div>
  );
}
