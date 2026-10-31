"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  PhoneCall,
  PhoneIncoming,
  PhoneOff,
  User,
  ExternalLink,
  Clock,
  ShieldAlert,
  UserCheck,
  X,
} from "lucide-react";
import { useInboundTelephony } from "../hooks/useInboundTelephony";

export default function IncomingCallModal() {
  const router = useRouter();
  const { activeCall, callState, userRole, dismissCall } = useInboundTelephony();
  const [secondsElapsed, setSecondsElapsed] = useState(0);

  // Timer for connected calls
  useEffect(() => {
    let timer: any;
    if (callState === "connected") {
      setSecondsElapsed(0);
      timer = setInterval(() => {
        setSecondsElapsed((prev) => prev + 1);
      }, 1000);
    } else {
      setSecondsElapsed(0);
    }
    return () => clearInterval(timer);
  }, [callState]);

  // Auto-dismiss after 6 seconds when ended or missed
  useEffect(() => {
    if (callState === "ended" || callState === "missed") {
      const timer = setTimeout(() => {
        dismissCall();
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [callState, dismissCall]);

  if (!activeCall || callState === "idle") {
    return null;
  }

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  /**
   * Resolves the proper role-prefixed base route for the current user.
   * - agent -> /agent/leads
   * - admin -> /admin/leads
   * - team_leader -> /team-leader/leads
   * - mis -> /mis/leads
   * - marketing -> /marketing/leads
   */
  const getRolePrefix = () => {
    const role = (userRole || "").toLowerCase().trim();
    if (role === "admin") return "/admin/leads";
    if (role === "team_leader" || role === "team-leader") return "/team-leader/leads";
    if (role === "mis") return "/mis/leads";
    if (role === "marketing") return "/marketing/leads";
    return "/agent/leads";
  };

  const handleOpenLead = () => {
    const basePrefix = getRolePrefix();
    // Prioritize human-friendly uniqueId (e.g. SOI-12) over MongoDB ObjectId
    const leadIdentifier = activeCall.lead?.uniqueId || activeCall.lead?.id;
    if (leadIdentifier) {
      router.push(`${basePrefix}/${encodeURIComponent(leadIdentifier)}`);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 duration-300">
      <div className="w-96 rounded-2xl bg-white border border-slate-200 shadow-2xl p-5 overflow-hidden transition-all duration-300">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2.5">
            <span className="relative flex h-3.5 w-3.5">
              {callState === "ringing" && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              )}
              <span
                className={`relative inline-flex rounded-full h-3.5 w-3.5 ${
                  callState === "connected"
                    ? "bg-emerald-500"
                    : callState === "missed"
                    ? "bg-rose-500"
                    : callState === "ended"
                    ? "bg-slate-400"
                    : "bg-emerald-500"
                }`}
              ></span>
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {callState === "ringing"
                ? "Incoming Call (Ringing)"
                : callState === "connected"
                ? "Call Connected"
                : callState === "missed"
                ? "Call Missed"
                : "Call Ended"}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {callState === "connected" && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                <Clock className="w-3 h-3 mr-1" />
                {formatTimer(secondsElapsed)}
              </span>
            )}
            <button
              onClick={dismissCall}
              className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-100"
              title="Dismiss popup"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Lead Identity Body */}
        <div className="py-4 space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="text-base font-bold text-slate-900 leading-snug">
                {activeCall.lead?.name || "Unknown Caller"}
              </h4>
              <p className="text-sm font-medium text-slate-600 mt-0.5 tracking-tight font-mono">
                {activeCall.callerNumber}
              </p>
            </div>

            {activeCall.leadMatched ? (
              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                <UserCheck className="w-3.5 h-3.5 mr-1" />
                {activeCall.lead?.uniqueId || "CRM Lead"}
              </span>
            ) : (
              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                <ShieldAlert className="w-3.5 h-3.5 mr-1" />
                New Number
              </span>
            )}
          </div>

          {/* Additional Lead Info if Available */}
          {activeCall.lead && (
            <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <div>
                <span className="text-slate-400 block font-medium">Stage:</span>
                <span className="text-slate-700 font-semibold truncate block">
                  {activeCall.lead.stage || "Fresh Lead"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Assigned Owner:</span>
                <span className="text-slate-700 font-semibold truncate block">
                  {activeCall.lead.owner || "Unassigned"}
                </span>
              </div>
            </div>
          )}

          {/* Telephony Context Note */}
          <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1">
            <span>DID: {activeCall.did || "+919228173971"}</span>
            <span>Auto Answer: Active</span>
          </div>
        </div>

        {/* Actions Footer */}
        <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
          {activeCall.leadMatched ? (
            <button
              onClick={handleOpenLead}
              className="flex-1 inline-flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition shadow-sm"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open Lead Details</span>
            </button>
          ) : (
            <button
              onClick={() => router.push(`/leads/new?phone=${encodeURIComponent(activeCall.callerNumber)}`)}
              className="flex-1 inline-flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition shadow-sm"
            >
              <User className="w-3.5 h-3.5" />
              <span>Create Lead</span>
            </button>
          )}

          <button
            onClick={dismissCall}
            className="py-2 px-3 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 transition"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
