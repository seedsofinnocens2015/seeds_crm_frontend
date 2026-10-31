"use client";

import React, { useState, useEffect } from "react";
import { Phone, PhoneCall, PhoneOff, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

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
  // Call initiation states
  const [status, setStatus] = useState<"idle" | "calling" | "active" | "error">("idle");
  const [feedback, setFeedback] = useState<string>("");

  // Active call tracking for Hangup
  const [activeRefId, setActiveRefId] = useState<string>("");
  const [hangupStatus, setHangupStatus] = useState<"idle" | "hanging_up" | "disconnect_pending">("idle");

  // Listen for real-time call termination events (e.g. customer disconnects or hangup completed)
  useEffect(() => {
    const handleCallEnded = (e: Event) => {
      const customEvent = e as CustomEvent<{
        refId?: string;
        callId?: string;
        leadId?: string;
        leadUniqueId?: string;
      }>;
      const detail = customEvent.detail;
      if (!detail) return;

      const matchesRef = activeRefId && detail.refId && detail.refId === activeRefId;
      const matchesLead =
        (leadId && detail.leadId && (detail.leadId === leadId || String(detail.leadId).toLowerCase() === String(leadId).toLowerCase())) ||
        (leadId && detail.leadUniqueId && (detail.leadUniqueId === leadId || String(detail.leadUniqueId).toLowerCase() === String(leadId).toLowerCase()));

      if (matchesRef || matchesLead) {
        setStatus("idle");
        setActiveRefId("");
        setHangupStatus("idle");
        setFeedback("Call Ended");
        setTimeout(() => {
          setFeedback("");
        }, 3000);
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("telephony:call_ended", handleCallEnded);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("telephony:call_ended", handleCallEnded);
      }
    };
  }, [activeRefId, leadId]);

  // Handle Initiating Call
  const handleCall = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (status === "calling" || status === "active") return; // prevent double clicks

    setStatus("calling");
    setFeedback("");

    try {
      const res = await fetch("/api/integrations/smartflo/click-to-call", {
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
        if (
          errorText.includes("Extension ID in Profile Settings") ||
          errorText.includes("Agent telephony identifier not configured") ||
          errorText.includes("Caller ID in Profile Settings") ||
          errorText.includes("Extension")
        ) {
          throw new Error(errorText);
        }
        throw new Error(errorText);
      }

      setStatus("active");
      const ref = data.refId || "";
      if (ref) setActiveRefId(ref);

      const msg = data.message || "Call initiated! Ringing your extension first...";
      setFeedback(msg);
      if (onSuccess) onSuccess(msg);
    } catch (err: any) {
      setStatus("error");
      const errMsg = err.message || "Call request failed";
      setFeedback(errMsg);
      if (onError) onError(errMsg);

      setTimeout(() => {
        setStatus("idle");
        setFeedback("");
      }, 5000);
    }
  };

  // Handle Terminating Call (Hang Up)
  const handleHangup = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (hangupStatus === "hanging_up" || hangupStatus === "disconnect_pending") return;

    setHangupStatus("hanging_up");

    try {
      const res = await fetch("/api/integrations/smartflo/hangup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          leadId,
          refId: activeRefId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        // If Smartflo reports call is already disconnected / invalid ref ID, clear active state immediately
        const errorText = data.error || data.message || "";
        if (
          errorText.includes("Invalid Ref ID") ||
          errorText.includes("already ended") ||
          errorText.includes("Call is not active")
        ) {
          setStatus("idle");
          setActiveRefId("");
          setHangupStatus("idle");
          setFeedback("Call Ended");
          setTimeout(() => setFeedback(""), 3000);
          return;
        }
        throw new Error(data.error || "Failed to hang up call");
      }

      // If Smartflo returns success: true with "Call has already ended."
      if (data.message && data.message.includes("already ended")) {
        setStatus("idle");
        setActiveRefId("");
        setHangupStatus("idle");
        setFeedback("Call Ended");
        setTimeout(() => setFeedback(""), 3000);
        return;
      }

      // Requirement: Show pending-disconnect state until webhook confirms final call status
      setHangupStatus("disconnect_pending");
      const msg = data.message || "Hangup request accepted. Disconnecting...";
      setFeedback(msg);
      if (onSuccess) onSuccess(msg);

      // Transition out of active state after brief transition window
      setTimeout(() => {
        setStatus("idle");
        setActiveRefId("");
        setHangupStatus("idle");
        setFeedback("");
      }, 3000);
    } catch (err: any) {
      setHangupStatus("idle");
      const errMsg = err.message || "Failed to hang up call";

      // If error message indicates call was already terminated, reset active state gracefully
      if (
        errMsg.includes("Invalid Ref ID") ||
        errMsg.includes("already ended") ||
        errMsg.includes("Call is not active")
      ) {
        setStatus("idle");
        setActiveRefId("");
        setFeedback("Call Ended");
        setTimeout(() => setFeedback(""), 3000);
        return;
      }

      setFeedback(errMsg);
      if (onError) onError(errMsg);

      setTimeout(() => {
        setFeedback("");
      }, 5000);
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
            title={status === "calling" ? "Initiating Call..." : "Call Lead via Smartflo"}
            disabled={status === "calling" || status === "active"}
            onClick={handleCall}
            className={`p-1 rounded-md transition-all cursor-pointer ${
              status === "calling"
                ? "bg-amber-100 text-amber-700 animate-pulse"
                : status === "active"
                ? "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-400"
                : status === "error"
                ? "bg-rose-100 text-rose-700 ring-1 ring-rose-400"
                : "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 shadow-2xs hover:scale-105"
            }`}
          >
            {status === "calling" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : status === "active" ? (
              <CheckCircle2 className="w-3.5 h-3.5" />
            ) : status === "error" ? (
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
        {/* Main Call Button */}
        <button
          type="button"
          disabled={status === "calling" || status === "active"}
          onClick={handleCall}
          className={`py-1.5 px-3.5 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition-all cursor-pointer ${
            status === "calling"
              ? "bg-amber-50 border border-amber-300 text-amber-800 animate-pulse"
              : status === "active"
              ? "bg-emerald-600 text-white shadow-emerald-200 opacity-90 cursor-default"
              : status === "error"
              ? "bg-rose-50 border border-rose-300 text-rose-700"
              : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20 active:scale-95"
          }`}
          title={feedback || "Call this lead via Smartflo"}
        >
          {status === "calling" ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Connecting...</span>
            </>
          ) : status === "active" ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Call Active</span>
            </>
          ) : status === "error" ? (
            <>
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Failed</span>
            </>
          ) : (
            <>
              <PhoneCall className="w-3.5 h-3.5" />
              <span>Call Lead</span>
            </>
          )}
        </button>

        {/* Dedicated Red Hang Up Button: Shown only when call is active or pending disconnect */}
        {status === "active" && (
          <button
            type="button"
            disabled={hangupStatus === "hanging_up" || hangupStatus === "disconnect_pending"}
            onClick={handleHangup}
            className={`py-1.5 px-3.5 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition-all cursor-pointer animate-in fade-in zoom-in-95 duration-150 ${
              hangupStatus === "hanging_up"
                ? "bg-amber-500 text-white animate-pulse"
                : hangupStatus === "disconnect_pending"
                ? "bg-rose-800 text-white opacity-80"
                : "bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/25 active:scale-95"
            }`}
            title="Disconnect ongoing Smartflo call"
          >
            {hangupStatus === "hanging_up" ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Hanging up...</span>
              </>
            ) : hangupStatus === "disconnect_pending" ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Disconnecting...</span>
              </>
            ) : (
              <>
                <PhoneOff className="w-3.5 h-3.5" />
                <span>Hang Up</span>
              </>
            )}
          </button>
        )}
      </div>
    );
  }

  // 3. Standard Button Variant
  return (
    <div className="inline-flex items-center gap-2">
      <button
        type="button"
        disabled={status === "calling" || status === "active"}
        onClick={handleCall}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
          status === "calling"
            ? "bg-amber-100 text-amber-800"
            : status === "active"
            ? "bg-emerald-600 text-white"
            : status === "error"
            ? "bg-rose-100 text-rose-800"
            : "bg-emerald-600 hover:bg-emerald-700 text-white"
        }`}
      >
        {status === "calling" ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <PhoneCall className="w-3.5 h-3.5" />
        )}
        <span>{status === "calling" ? "Connecting..." : status === "active" ? "In Call" : "Call"}</span>
      </button>

      {status === "active" && (
        <button
          type="button"
          disabled={hangupStatus === "hanging_up" || hangupStatus === "disconnect_pending"}
          onClick={handleHangup}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white transition-all cursor-pointer"
        >
          {hangupStatus === "hanging_up" || hangupStatus === "disconnect_pending" ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <PhoneOff className="w-3.5 h-3.5" />
          )}
          <span>{hangupStatus === "hanging_up" ? "Hanging up..." : "Hang Up"}</span>
        </button>
      )}
    </div>
  );
}
