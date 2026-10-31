"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  Activity,
  History,
  Calendar,
  Clock,
  User,
  ArrowRight,
  Filter,
  CheckCircle2,
  ChevronDown,
  Layers,
  PhoneCall,
  Volume2,
  Play,
  Pause,
} from "lucide-react";

export interface ChangeItem {
  field: string;
  fieldLabel: string;
  oldValue: string;
  newValue: string;
}

export interface AuditLogItem {
  _id?: string;
  performedBy: string;
  performedByRole: string;
  performedByEmail?: string;
  timestamp: string;
  changes: ChangeItem[];
}

export interface ActivityHistoryItem {
  id: string;
  type: "stage_change" | "audit" | "call";
  title: string;
  subtitle?: string;
  performedBy: string;
  timestamp: string;
  recordingUrl?: string | null;
  playbackUrl?: string | null;
  duration?: number;
  callStatus?: string;
  direction?: string;
}

export interface CallLogItem {
  id: string;
  callId: string;
  direction: string;
  status: string;
  customerNumber: string;
  agentName: string;
  durationSeconds: number;
  answeredDurationSeconds: number;
  startTime: string;
  disposition?: string;
  recordingAvailable: boolean;
  playbackUrl?: string | null;
}

interface LeadSquaredActivityHistoryProps {
  auditLogs?: AuditLogItem[];
  leadData?: any;
}

function formatGroupDate(dateStr: string) {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "Recent";
    const now = new Date();

    const getIstKey = (date: Date) =>
      new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(date);

    const dateKey = getIstKey(d);
    const todayKey = getIstKey(now);
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const yesterdayKey = getIstKey(yesterday);

    const formatter = new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "numeric",
      month: "short",
      year: "numeric",
    });

    if (dateKey === todayKey) {
      return `Today, ${formatter.format(d)}`;
    }
    if (dateKey === yesterdayKey) {
      return `Yesterday, ${formatter.format(d)}`;
    }

    return formatter.format(d);
  } catch {
    return "Recent";
  }
}

function formatRelativeTime(dateStr: string) {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    if (diffMs < 0 && diffMs > -60000) return "Just now"; // Small clock drift guard
    const diffMins = Math.floor(Math.max(0, diffMs) / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays === 1) return "1 day ago";
    if (diffDays < 30) return `${diffDays} days ago`;

    return d.toLocaleDateString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function formatExactTime(dateStr: string) {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleTimeString("en-US", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return "";
  }
}

/**
 * Safely resolves 'performedBy' / 'addedBy' value to a readable string.
 * Never outputs [object Object] or unparsed JSON representations.
 */
function resolvePerformedBy(val: any, fallback = "Agent"): string {
  if (val === null || val === undefined) return fallback;

  // If already an object (e.g. populated Mongoose user or object)
  if (typeof val === "object") {
    const candidate = val.name || val.fullName || val.displayName || val.email || val.username;
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
    return fallback;
  }

  const str = String(val).trim();
  if (!str || str === "[object Object]") {
    return fallback;
  }

  // If stringified JSON e.g. '{"name":"Amit Kumar"}'
  if (str.startsWith("{") && str.endsWith("}")) {
    try {
      const parsed = JSON.parse(str);
      if (parsed && typeof parsed === "object") {
        const candidate = parsed.name || parsed.fullName || parsed.displayName || parsed.email;
        if (typeof candidate === "string" && candidate.trim()) {
          return candidate.trim();
        }
      }
    } catch {
      // ignore JSON parse error
    }
  }

  return str;
}

export default function LeadSquaredActivityHistory({
  auditLogs = [],
  leadData = {},
}: LeadSquaredActivityHistoryProps) {
  const [selectedActivityType, setSelectedActivityType] = useState<string>("All");
  const [calls, setCalls] = useState<CallLogItem[]>([]);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);

  // Fetch Smartflo call records for this lead
  useEffect(() => {
    const leadId = leadData?.uniqueId || leadData?._id;
    if (!leadId) return;

    fetch(`/api/integrations/smartflo/calls/${encodeURIComponent(leadId)}`)
      .then((res) => {
        if (!res.ok) return { calls: [] };
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data?.calls)) {
          setCalls(data.calls);
        }
      })
      .catch(() => {
        // Soft fail if offline or not yet configured
      });
  }, [leadData?.uniqueId, leadData?._id]);

  // Authentic activities from auditLogs + Smartflo call records
  const activities = useMemo(() => {
    const list: ActivityHistoryItem[] = [];

    // 1. Process auditLogs
    (auditLogs || []).forEach((log, logIdx) => {
      // Stage changes
      const stageChange = (log.changes || []).find(
        (c) => c.field === "leadStage" || c.field === "dispositions"
      );
      if (stageChange) {
        list.push({
          id: `stage-${logIdx}`,
          type: "stage_change",
          title: `Stage changed from ${stageChange.oldValue || "Fresh Lead"} to ${stageChange.newValue}`,
          performedBy: resolvePerformedBy(log.performedBy, "Agent"),
          timestamp: log.timestamp,
        });
      }

      // Other field changes (excluding notes and stage)
      const otherChanges = (log.changes || []).filter(
        (c) => c.field !== "leadStage" && c.field !== "dispositions" && c.field !== "notes" && c.field !== "smartflo_call"
      );
      if (otherChanges.length > 0) {
        const changeDesc = otherChanges
          .map((c) => `${c.fieldLabel || c.field}: ${c.newValue}`)
          .join(", ");
        list.push({
          id: `audit-${logIdx}`,
          type: "audit",
          title: `Lead Updated: ${changeDesc.slice(0, 120)}${changeDesc.length > 120 ? "..." : ""}`,
          performedBy: resolvePerformedBy(log.performedBy, "Agent"),
          timestamp: log.timestamp,
        });
      }
    });

    // 2. Add Smartflo Call activities
    const leadDisplayName =
      (leadData?.wifeName || leadData?.husbandName || leadData?.patientName || "").trim() ||
      "Unknown Caller";

    calls.forEach((c) => {
      const dur = c.answeredDurationSeconds > 0
        ? `${Math.floor(c.answeredDurationSeconds / 60)}m ${c.answeredDurationSeconds % 60}s (Answered)`
        : `${c.durationSeconds}s`;

      const safeDirection =
        c.direction && c.direction.toLowerCase() !== "unknown"
          ? c.direction
          : "Outbound";
      const directionText = safeDirection.toUpperCase();
      const statusText = (c.status || "Completed").toUpperCase();

      const subtitleParts: string[] = [];
      if (leadDisplayName) subtitleParts.push(`Lead: ${leadDisplayName}`);
      if (c.customerNumber) subtitleParts.push(`Phone: ${c.customerNumber}`);
      if (c.disposition) subtitleParts.push(`Disposition: ${c.disposition}`);

      list.push({
        id: `call-${c.callId || c.id}`,
        type: "call",
        title: `${directionText} Call - ${statusText} (${dur})`,
        subtitle: subtitleParts.length > 0 ? subtitleParts.join(" • ") : undefined,
        performedBy: resolvePerformedBy(c.agentName, "Smartflo Agent"),
        timestamp: c.startTime || new Date().toISOString(),
        recordingUrl: c.recordingAvailable ? c.playbackUrl : null,
        playbackUrl: c.playbackUrl,
        duration: c.answeredDurationSeconds || c.durationSeconds,
        callStatus: c.status,
        direction: safeDirection,
      });
    });

    // Sort descending by timestamp
    return list.sort((a, b) => {
      const timeA = new Date(a.timestamp || 0).getTime();
      const timeB = new Date(b.timestamp || 0).getTime();
      return timeB - timeA;
    });
  }, [auditLogs, calls]);

  // Group by Date Heading (Today, Yesterday, etc.)
  const groupedActivities = useMemo(() => {
    const filtered = activities.filter((act) => {
      if (selectedActivityType === "Stage") {
        return act.type === "stage_change";
      }
      if (selectedActivityType === "Updates") {
        return act.type === "audit";
      }
      if (selectedActivityType === "Calls") {
        return act.type === "call";
      }
      return true;
    });

    const groups: { header: string; items: ActivityHistoryItem[] }[] = [];
    let currentHeader = "";
    let currentItems: ActivityHistoryItem[] = [];

    filtered.forEach((act) => {
      const header = formatGroupDate(act.timestamp);
      if (header !== currentHeader) {
        if (currentItems.length > 0) {
          groups.push({ header: currentHeader, items: currentItems });
        }
        currentHeader = header;
        currentItems = [act];
      } else {
        currentItems.push(act);
      }
    });

    if (currentItems.length > 0) {
      groups.push({ header: currentHeader, items: currentItems });
    }

    return groups;
  }, [activities, selectedActivityType]);

  return (
    <div className="space-y-4">
      {/* Top Filter Buttons: Activity Type & Date */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative inline-block">
          <select
            value={selectedActivityType}
            onChange={(e) => setSelectedActivityType(e.target.value)}
            className="pl-3 pr-8 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-[#cc2727] cursor-pointer"
          >
            <option value="All">Activity Type (All)</option>
            <option value="Calls">Calls & Recordings</option>
            <option value="Stage">Stage Changes Only</option>
            <option value="Updates">Field Updates Only</option>
          </select>
        </div>

        <button
          type="button"
          className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:border-slate-300 cursor-pointer"
        >
          <span>Date</span>
          <ChevronDown className="w-3 h-3 text-slate-400" />
        </button>
      </div>

      {/* Activities Timeline Groups */}
      {groupedActivities.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-xs">
          <Activity className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-xs font-bold text-slate-700">No activity history recorded yet</p>
          <p className="text-[11px] text-slate-400 mt-1">
            Real field updates and stage changes made to this lead will be tracked here.
          </p>
        </div>
      ) : (
        groupedActivities.map((group, gIdx) => (
          <div key={group.header + gIdx} className="space-y-3">
            {/* Date Group Heading */}
            <div className="text-xs font-bold text-slate-600 pt-2">
              {group.header}
            </div>

            {/* Event Items */}
            <div className="space-y-3">
              {group.items.map((act) => (
                <div
                  key={act.id}
                  className="bg-white border border-slate-200/90 hover:border-slate-300 rounded-2xl p-4 shadow-xs transition-all flex items-start gap-3.5"
                >
                  {/* Left Icon Badge */}
                  <div className="shrink-0 mt-0.5">
                    {act.type === "stage_change" ? (
                      <div className="w-9 h-9 rounded-xl bg-sky-50 border border-sky-200 text-sky-600 flex items-center justify-center">
                        <Activity className="w-4 h-4" />
                      </div>
                    ) : act.type === "call" ? (
                      <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center">
                        <PhoneCall className="w-4 h-4" />
                      </div>
                    ) : (
                      <div className="w-9 h-9 rounded-xl bg-violet-50 border border-violet-200 text-violet-600 flex items-center justify-center">
                        <History className="w-4 h-4" />
                      </div>
                    )}
                  </div>

                  {/* Right Content */}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="text-xs text-slate-800 font-semibold leading-snug">
                      {act.title}
                    </div>

                    {act.subtitle && (
                      <div className="text-[11px] text-slate-400 italic">
                        {act.subtitle}
                      </div>
                    )}

                    {/* Audio Player Action for Call Recordings */}
                    {act.type === "call" && act.recordingUrl && (
                      <div className="pt-2">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl">
                          <button
                            type="button"
                            onClick={() => {
                              if (currentlyPlaying === act.id) {
                                setCurrentlyPlaying(null);
                              } else {
                                setCurrentlyPlaying(act.id);
                              }
                            }}
                            className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 transition-colors cursor-pointer"
                          >
                            {currentlyPlaying === act.id ? (
                              <>
                                <Pause className="w-3.5 h-3.5 fill-current" />
                                <span>Stop Recording</span>
                              </>
                            ) : (
                              <>
                                <Play className="w-3.5 h-3.5 fill-current" />
                                <span>Play Recording</span>
                              </>
                            )}
                          </button>

                          <a
                            href={act.recordingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-slate-400 hover:text-slate-600 underline font-medium ml-2"
                          >
                            Open Player
                          </a>
                        </div>

                        {currentlyPlaying === act.id && (
                          <div className="mt-2 p-2 bg-emerald-50/60 border border-emerald-200/80 rounded-xl">
                            <audio
                              controls
                              autoPlay
                              src={act.recordingUrl}
                              className="w-full h-8"
                              onEnded={() => setCurrentlyPlaying(null)}
                            >
                              Your browser does not support audio playback.
                            </audio>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Footer Info: Added by User | Time | Relative */}
                    <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-slate-400 pt-1">
                      <span>Added by <strong className="font-semibold text-slate-600">{resolvePerformedBy(act.performedBy, "Agent")}</strong></span>
                      <span>|</span>
                      <span>{formatExactTime(act.timestamp)}</span>
                      <span>|</span>
                      <span>{formatRelativeTime(act.timestamp)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
