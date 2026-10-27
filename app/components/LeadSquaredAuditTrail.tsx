"use client";

import React, { useState, useMemo } from "react";
import {
  History,
  User,
  Clock,
  ArrowRight,
  Filter,
  ChevronDown,
  Calendar,
  CheckCircle2,
} from "lucide-react";
import { AuditLogItem, ChangeItem } from "./LeadSquaredActivityHistory";

interface LeadSquaredAuditTrailProps {
  auditLogs?: AuditLogItem[];
  leadUniqueId?: string;
}

function formatExactDate(dateStr: string) {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return dateStr;
  }
}

export default function LeadSquaredAuditTrail({
  auditLogs = [],
  leadUniqueId,
}: LeadSquaredAuditTrailProps) {
  const [fieldFilter, setFieldFilter] = useState<string>("All");

  // Flatten changes into structured rows per audit log
  const flattenedRows = useMemo(() => {
    const rows: {
      id: string;
      performedBy: string;
      performedByRole: string;
      timestamp: string;
      field: string;
      fieldLabel: string;
      newValue: string;
      oldValue: string;
      isFirstInGroup: boolean;
      groupRowCount: number;
    }[] = [];

    (auditLogs || []).forEach((log, logIdx) => {
      const changes = log.changes || [];
      const relevantChanges =
        fieldFilter === "All"
          ? changes
          : changes.filter((c) => (c.fieldLabel || c.field).toLowerCase().includes(fieldFilter.toLowerCase()));

      relevantChanges.forEach((ch, chIdx) => {
        rows.push({
          id: `${logIdx}-${chIdx}`,
          performedBy: log.performedBy || "Agent",
          performedByRole: log.performedByRole || "agent",
          timestamp: log.timestamp,
          field: ch.field,
          fieldLabel: ch.fieldLabel || ch.field,
          newValue: ch.newValue || "-",
          oldValue: ch.oldValue || "-",
          isFirstInGroup: chIdx === 0,
          groupRowCount: relevantChanges.length,
        });
      });
    });

    return rows;
  }, [auditLogs, fieldFilter]);

  return (
    <div className="space-y-4">
      {/* Top Filter Buttons: Fields & Time */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative inline-block">
          <select
            value={fieldFilter}
            onChange={(e) => setFieldFilter(e.target.value)}
            className="pl-3 pr-8 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-[#cc2727] cursor-pointer"
          >
            <option value="All">Fields (All)</option>
            <option value="Stage">Lead Stage</option>
            <option value="Status">Sub Status</option>
            <option value="Follow">Follow Up</option>
            <option value="Location">Location</option>
            <option value="Owner">Lead Owner</option>
          </select>
        </div>

        <button
          type="button"
          className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:border-slate-300 cursor-pointer"
        >
          <span>Time</span>
          <ChevronDown className="w-3 h-3 text-slate-400" />
        </button>
      </div>

      {/* Audit Trail Table (Exact LeadSquared Layout from Screenshot 2) */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4 w-1/4">Type</th>
                <th className="py-3 px-4 w-1/4">Field</th>
                <th className="py-3 px-4 w-1/4">New Value</th>
                <th className="py-3 px-4 w-1/4">Old Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {flattenedRows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-400">
                    <History className="w-6 h-6 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-600">No field changes logged yet</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Updates made to this lead will be tracked with exact Old & New values.
                    </p>
                  </td>
                </tr>
              ) : (
                flattenedRows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Type / Performed by */}
                    <td className="py-3 px-4 align-top">
                      <div className="font-bold text-slate-900">Lead Updated</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        By: <span className="font-semibold text-slate-700">{row.performedBy}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {formatExactDate(row.timestamp)}
                      </div>
                    </td>

                    {/* Field Name */}
                    <td className="py-3 px-4 align-top font-semibold text-slate-800">
                      {row.fieldLabel}
                    </td>

                    {/* New Value */}
                    <td className="py-3 px-4 align-top">
                      <span className="font-medium text-slate-900 bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded text-[11px] border border-emerald-100">
                        {row.newValue}
                      </span>
                    </td>

                    {/* Old Value */}
                    <td className="py-3 px-4 align-top">
                      <span className="text-slate-500 font-medium line-through">
                        {row.oldValue}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
