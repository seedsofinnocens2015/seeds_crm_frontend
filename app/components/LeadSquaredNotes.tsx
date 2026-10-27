"use client";

import React, { useState, useMemo } from "react";
import {
  FileText,
  Clock,
  ShieldCheck,
  UserCog,
  Headphones,
  User,
  Plus,
  Calendar,
  ChevronDown,
  Layers,
  ArrowRight,
  Filter,
} from "lucide-react";

export interface NoteHistoryItem {
  _id?: string;
  performedBy: string;
  performedByRole: string; // "admin" | "team_leader" | "agent"
  performedByEmail?: string;
  timestamp: string;
  oldNotes?: string;
  newNotes: string;
}

interface LeadSquaredNotesProps {
  notesHistory?: NoteHistoryItem[];
  currentNotes?: string;
  onAddNoteClick?: () => void;
  leadUniqueId?: string;
}

function formatGroupDate(dateStr: string) {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "Recent";
    const now = new Date();

    const isToday =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday =
      d.getDate() === yesterday.getDate() &&
      d.getMonth() === yesterday.getMonth() &&
      d.getFullYear() === yesterday.getFullYear();

    const monthNames = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];

    if (isToday) {
      return `Today, ${d.getDate()} ${monthNames[d.getMonth()]}, ${d.getFullYear()}`;
    }
    if (isYesterday) {
      return `Yesterday, ${d.getDate()} ${monthNames[d.getMonth()]}, ${d.getFullYear()}`;
    }

    if (d.getFullYear() === now.getFullYear()) {
      return `${d.getDate()} ${monthNames[d.getMonth()]}, ${d.getFullYear()}`;
    }
    return `${monthNames[d.getMonth()]}, ${d.getFullYear()}`;
  } catch {
    return "Recent";
  }
}

function formatRelativeOrExact(dateStr: string) {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays === 1) return "1 day ago";
    if (diffDays < 30) return `${diffDays} days ago`;

    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function formatTime(dateStr: string) {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return "";
  }
}

export default function LeadSquaredNotes({
  notesHistory = [],
  currentNotes = "",
  onAddNoteClick,
  leadUniqueId,
}: LeadSquaredNotesProps) {
  const [sortOrder, setSortOrder] = useState<"created_desc" | "created_asc">("created_desc");

  // Group notes by date header (e.g. Today, Yesterday, Nov, 2024)
  const groupedNotes = useMemo(() => {
    const sorted = [...notesHistory].sort((a, b) => {
      const timeA = new Date(a.timestamp || 0).getTime();
      const timeB = new Date(b.timestamp || 0).getTime();
      return sortOrder === "created_desc" ? timeB - timeA : timeA - timeB;
    });

    const groups: { header: string; items: NoteHistoryItem[] }[] = [];
    let currentHeader = "";
    let currentItems: NoteHistoryItem[] = [];

    sorted.forEach((note) => {
      const header = formatGroupDate(note.timestamp);
      if (header !== currentHeader) {
        if (currentItems.length > 0) {
          groups.push({ header: currentHeader, items: currentItems });
        }
        currentHeader = header;
        currentItems = [note];
      } else {
        currentItems.push(note);
      }
    });

    if (currentItems.length > 0) {
      groups.push({ header: currentHeader, items: currentItems });
    }

    return groups;
  }, [notesHistory, sortOrder]);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden flex flex-col h-full text-slate-800">
      {/* Top Header */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
        <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <span>Notes</span>
          {notesHistory.length > 0 && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
              {notesHistory.length}
            </span>
          )}
        </h3>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onAddNoteClick}
            className="flex items-center gap-1 px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded-lg text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Add</span>
          </button>
        </div>
      </div>

      {/* Filter / Sort bar */}
      <div className="px-4 py-2 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between text-xs">
        <div className="relative inline-block">
          <button
            type="button"
            onClick={() => setSortOrder(prev => prev === "created_desc" ? "created_asc" : "created_desc")}
            className="flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200 rounded-md text-[11px] font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <span>Created On {sortOrder === "created_desc" ? "↓" : "↑"}</span>
            <ChevronDown className="w-3 h-3 text-slate-400 ml-0.5" />
          </button>
        </div>
        <span className="text-[10px] text-slate-400">Total: {notesHistory.length}</span>
      </div>

      {/* Notes Stream / Content */}
      <div className="p-4 overflow-y-auto space-y-5 flex-1 max-h-[850px] divide-y divide-slate-100">
        {groupedNotes.length === 0 ? (
          <div className="py-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
              <FileText className="w-6 h-6" />
            </div>
            <p className="text-xs font-bold text-slate-700">No notes recorded yet</p>
            <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto">
              Add observations, phone conversations, or clinic updates using the Add button.
            </p>
          </div>
        ) : (
          groupedNotes.map((group, gIdx) => (
            <div key={group.header + gIdx} className={gIdx > 0 ? "pt-4" : ""}>
              <div className="text-[11px] font-bold text-slate-500 mb-2.5">
                {group.header}
              </div>

              <div className="space-y-3">
                {group.items.map((item, idx) => (
                  <div
                    key={item._id || item.timestamp + idx}
                    className="p-3.5 rounded-xl border border-slate-200/80 bg-white hover:border-slate-300 transition-all shadow-xs space-y-2.5"
                  >
                    {/* Note Text */}
                    <div className="text-xs text-slate-800 font-medium whitespace-pre-wrap leading-relaxed">
                      {item.newNotes}
                    </div>

                    {/* Author & Timestamp Footer */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-700">By {item.performedBy || "Agent"}</span>
                        {item.timestamp && (
                          <span className="text-slate-400 text-[10px]">
                            {formatTime(item.timestamp)}
                          </span>
                        )}
                      </div>

                      <div className="text-[10px] font-semibold text-slate-400">
                        {formatRelativeOrExact(item.timestamp)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
