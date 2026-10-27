"use client";

import React from "react";

export type LeadDetailTab =
  | "activity_history"
  | "audit_trail"
  | "lead_details";

interface LeadSquaredTabsHeaderProps {
  activeTab: LeadDetailTab;
  onTabChange: (tab: LeadDetailTab) => void;
}

export default function LeadSquaredTabsHeader({
  activeTab,
  onTabChange,
}: LeadSquaredTabsHeaderProps) {
  const tabs: { id: LeadDetailTab; label: string }[] = [
    { id: "activity_history", label: "Activity History" },
    { id: "audit_trail", label: "Audit Trail" },
    { id: "lead_details", label: "Lead Details" },
  ];

  return (
    <div className="bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/80 flex items-center shadow-xs">
      {/* Tab Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? "bg-white text-sky-600 shadow-sm border border-slate-200/60 font-bold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
