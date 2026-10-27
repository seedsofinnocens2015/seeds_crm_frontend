"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Plus,
  Search,
  Pin,
  Settings,
  ChevronDown,
  X,
  RotateCcw,
  Sliders,
  Check,
  Calendar,
  MapPin,
  Tent,
  User,
  Activity,
  FileText,
  Tag,
  Clock,
  Award,
  BadgePercent,
  CheckCircle,
  Megaphone,
  Layers,
  Sparkles,
} from "lucide-react";
import { LeadFilters } from "@/types/leadFilters";
import {
  CENTRE_LOCATIONS,
  CAMP_LOCATIONS,
  SUB_DISPOSITIONS,
  DISPOSITIONS,
  VALID_STATUS_LIST,
  LEAD_SOURCES,
  CAMPAIGN_NAMES,
  SOURCE_NAMES,
  WHEN_START_TREATMENT_OPTIONS,
} from "@/lib/leadOptions";

export interface FilterFieldMeta {
  key: keyof LeadFilters | "leadEntryDate" | "followUpDate" | "appointmentDate" | "centreVisitedDate" | "campVisitedDate" | "leadScoreRange";
  label: string;
  type: "select" | "dateRange" | "numberRange";
  options?: string[];
  fromKey?: keyof LeadFilters;
  toKey?: keyof LeadFilters;
  category: "Date & Visits" | "Centres & Camps" | "Disposition & Stage" | "Marketing & Attribution" | "Ownership & Profile";
}

export const ALL_AVAILABLE_FILTER_FIELDS: FilterFieldMeta[] = [
  // 1. Centres & Camps
  {
    key: "centreLocation",
    label: "Centre Location",
    type: "select",
    options: [...CENTRE_LOCATIONS],
    category: "Centres & Camps",
  },
  {
    key: "campLocation",
    label: "Camp Location",
    type: "select",
    options: [...CAMP_LOCATIONS],
    category: "Centres & Camps",
  },

  // 2. Disposition & Stage
  {
    key: "subStatus",
    label: "Sub Status",
    type: "select",
    options: [...SUB_DISPOSITIONS],
    category: "Disposition & Stage",
  },
  {
    key: "leadStage",
    label: "Lead Stage",
    type: "select",
    options: [...DISPOSITIONS],
    category: "Disposition & Stage",
  },
  {
    key: "leadValidStatus",
    label: "Valid Status",
    type: "select",
    options: [...VALID_STATUS_LIST],
    category: "Disposition & Stage",
  },

  // 3. Marketing & Attribution
  {
    key: "campaignName",
    label: "Campaign Name",
    type: "select",
    options: [...CAMPAIGN_NAMES],
    category: "Marketing & Attribution",
  },
  {
    key: "sourceName",
    label: "Source Name",
    type: "select",
    options: [...SOURCE_NAMES],
    category: "Marketing & Attribution",
  },
  {
    key: "source",
    label: "Source Channel",
    type: "select",
    options: ["Meta", "Google", "General", "Aisensy", "WhatsApp Direct", "Website"],
    category: "Marketing & Attribution",
  },
  {
    key: "leadSource",
    label: "Lead Source / UTM",
    type: "select",
    options: [...LEAD_SOURCES],
    category: "Marketing & Attribution",
  },

  // 4. Ownership & Quality / Profile
  {
    key: "leadOwner",
    label: "Lead Owner / Caller",
    type: "select",
    category: "Ownership & Profile",
  },
  {
    key: "registrationStatus",
    label: "Registration Status",
    type: "select",
    options: ["Yes", "No"],
    category: "Ownership & Profile",
  },
  {
    key: "leadScoreRange",
    label: "Lead Score (Min - Max)",
    type: "numberRange",
    fromKey: "leadScoreMin",
    toKey: "leadScoreMax",
    category: "Ownership & Profile",
  },
  {
    key: "whenPlanningToStartTreatment",
    label: "Treatment Plan Timeline",
    type: "select",
    options: [...WHEN_START_TREATMENT_OPTIONS],
    category: "Ownership & Profile",
  },
  {
    key: "preMedicalConditions",
    label: "Medical Condition (Yes/No)",
    type: "select",
    options: ["Yes", "No"],
    category: "Ownership & Profile",
  },

  // 5. Date & Visits
  {
    key: "leadEntryDate",
    label: "Lead Entry Date / Created On",
    type: "dateRange",
    fromKey: "leadEntryDateFrom",
    toKey: "leadEntryDateTo",
    category: "Date & Visits",
  },
  {
    key: "followUpDate",
    label: "Follow Up Date",
    type: "dateRange",
    fromKey: "followUpDateFrom",
    toKey: "followUpDateTo",
    category: "Date & Visits",
  },
  {
    key: "appointmentDate",
    label: "Appointment Date",
    type: "dateRange",
    fromKey: "appointmentDateFrom",
    toKey: "appointmentDateTo",
    category: "Date & Visits",
  },
  {
    key: "centreVisitedDate",
    label: "Centre Visited Date",
    type: "dateRange",
    fromKey: "centreVisitedDateFrom",
    toKey: "centreVisitedDateTo",
    category: "Date & Visits",
  },
  {
    key: "campVisitedDate",
    label: "Camp Visited Date",
    type: "dateRange",
    fromKey: "campVisitedDateFrom",
    toKey: "campVisitedDateTo",
    category: "Date & Visits",
  },
];

const DEFAULT_PINNED_FIELD_KEYS: string[] = [
  "centreLocation",
  "subStatus",
  "leadOwner",
  "campaignName",
];

interface LeadSquaredFilterProps {
  filters: LeadFilters;
  updateFilter: (key: keyof LeadFilters, value: string) => void;
  handleResetFilters: () => void;
  activeFilterCount: number;
  distinctLocations?: string[];
  distinctCallers?: string[];
  distinctLeadSources?: string[];
  distinctCampaignNames?: string[];
  distinctSourceNames?: string[];
  distinctSources?: string[];
  distinctCampLocations?: string[];
  distinctSubDispositions?: string[];
  storageKeyPrefix?: string;
}

export default function LeadSquaredFilter({
  filters,
  updateFilter,
  handleResetFilters,
  activeFilterCount,
  distinctLocations = [],
  distinctCallers = [],
  distinctLeadSources = [],
  distinctCampaignNames = [],
  distinctSourceNames = [],
  distinctSources = [],
  distinctCampLocations = [],
  distinctSubDispositions = [],
  storageKeyPrefix = "admin",
}: LeadSquaredFilterProps) {
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [isConfigureModalOpen, setIsConfigureModalOpen] = useState(false);
  const [isAdvancedModalOpen, setIsAdvancedModalOpen] = useState(false);
  const [dropdownSearch, setDropdownSearch] = useState("");
  const [configureSearch, setConfigureSearch] = useState("");
  const [openInstantField, setOpenInstantField] = useState<string | null>(null);

  // Pinned filter fields with persistence
  const [pinnedFieldKeys, setPinnedFieldKeys] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(`crm_pinned_filters_${storageKeyPrefix}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch (e) {}
    }
    return DEFAULT_PINNED_FIELD_KEYS;
  });

  const [tempConfiguredKeys, setTempConfiguredKeys] = useState<string[]>(pinnedFieldKeys);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsFilterDropdownOpen(false);
      }
    }
    if (isFilterDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isFilterDropdownOpen]);

  const savePinnedFilters = (newKeys: string[]) => {
    setPinnedFieldKeys(newKeys);
    try {
      localStorage.setItem(`crm_pinned_filters_${storageKeyPrefix}`, JSON.stringify(newKeys));
    } catch (e) {}
  };

  const togglePinField = (key: string) => {
    const updated = pinnedFieldKeys.includes(key)
      ? pinnedFieldKeys.filter((k) => k !== key)
      : [...pinnedFieldKeys, key];
    savePinnedFilters(updated);
  };

  // Populate dynamic options merged with presets
  const filterFieldsWithDynamicOptions = useMemo(() => {
    return ALL_AVAILABLE_FILTER_FIELDS.map((field) => {
      if (field.key === "centreLocation") {
        const merged = Array.from(new Set([...CENTRE_LOCATIONS, ...distinctLocations])).filter(Boolean).sort();
        return { ...field, options: merged };
      }
      if (field.key === "campLocation") {
        const merged = Array.from(new Set([...CAMP_LOCATIONS, ...distinctCampLocations])).filter(Boolean).sort();
        return { ...field, options: merged };
      }
      if (field.key === "leadOwner") {
        return { ...field, options: distinctCallers.filter(Boolean) };
      }
      if (field.key === "campaignName") {
        const merged = Array.from(new Set([...CAMPAIGN_NAMES, ...distinctCampaignNames])).filter(Boolean).sort();
        return { ...field, options: merged };
      }
      if (field.key === "sourceName") {
        const merged = Array.from(new Set([...SOURCE_NAMES, ...distinctSourceNames])).filter(Boolean).sort();
        return { ...field, options: merged };
      }
      if (field.key === "source") {
        const merged = Array.from(new Set(["Meta", "Google", "General", "Aisensy", "WhatsApp Direct", "Website", ...distinctSources])).filter(Boolean);
        return { ...field, options: merged };
      }
      if (field.key === "leadSource") {
        const merged = Array.from(new Set([...LEAD_SOURCES, ...distinctLeadSources])).filter(Boolean).sort();
        return { ...field, options: merged };
      }
      if (field.key === "subStatus") {
        const merged = Array.from(new Set([...SUB_DISPOSITIONS, ...distinctSubDispositions])).filter(Boolean).sort();
        return { ...field, options: merged };
      }
      return field;
    });
  }, [
    distinctLocations,
    distinctCallers,
    distinctLeadSources,
    distinctCampaignNames,
    distinctSourceNames,
    distinctSources,
    distinctCampLocations,
    distinctSubDispositions,
  ]);

  // Pinned filter objects
  const pinnedFields = useMemo(() => {
    return filterFieldsWithDynamicOptions.filter((f) => pinnedFieldKeys.includes(f.key));
  }, [filterFieldsWithDynamicOptions, pinnedFieldKeys]);

  // Unpinned other filter objects
  const otherFields = useMemo(() => {
    return filterFieldsWithDynamicOptions.filter((f) => !pinnedFieldKeys.includes(f.key));
  }, [filterFieldsWithDynamicOptions, pinnedFieldKeys]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* 1. LeadSquared "+ Filter" Button with Dropdown */}
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsFilterDropdownOpen((prev) => !prev)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer ${
            activeFilterCount > 0
              ? "bg-[#cc2727] text-white hover:bg-[#b02121] shadow-[#cc2727]/25"
              : "bg-[#cc2727] text-white hover:bg-[#b02121] shadow-[#cc2727]/20"
          }`}
        >
          <Plus className="w-3.5 h-3.5 stroke-[3]" />
          <span>Filter</span>
          {activeFilterCount > 0 && (
            <span className="w-5 h-5 rounded-full bg-white text-[#cc2727] text-[10px] font-extrabold flex items-center justify-center ml-1">
              {activeFilterCount}
            </span>
          )}
        </button>

        {/* LeadSquared Filter Dropdown Menu */}
        {isFilterDropdownOpen && (
          <div className="absolute left-0 top-full mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 text-xs">
            {/* Search input in dropdown */}
            <div className="p-2.5 border-b border-slate-100 relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search filters (e.g. Centre, Source, Score)..."
                value={dropdownSearch}
                onChange={(e) => setDropdownSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#cc2727]"
              />
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
              {/* Pinned filters summary banner */}
              <div className="p-3 bg-slate-50/50">
                <div className="text-[11px] font-semibold text-slate-500 mb-1 flex items-center justify-between">
                  <span>Pinned filters</span>
                  <span className="font-bold text-[#cc2727]">{pinnedFieldKeys.length}/20</span>
                </div>
                <div className="p-2 rounded-lg bg-sky-50/70 border border-sky-100 text-[11px] text-slate-600 flex items-start gap-2">
                  <Pin className="w-3.5 h-3.5 text-sky-600 shrink-0 mt-0.5" />
                  <span>Pin your most frequent filters to keep quick-access pills visible.</span>
                </div>
              </div>

              {/* Pinned list items */}
              {pinnedFields.length > 0 && (
                <div className="py-1">
                  <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Pinned Filters
                  </div>
                  {pinnedFields
                    .filter((f) => f.label.toLowerCase().includes(dropdownSearch.toLowerCase()))
                    .map((f) => (
                      <div
                        key={f.key}
                        className="px-3 py-1.5 flex items-center justify-between hover:bg-slate-50 cursor-pointer"
                        onClick={() => {
                          setOpenInstantField(f.key);
                          setIsFilterDropdownOpen(false);
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-slate-700 font-medium">{f.label}</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                            {f.category}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            togglePinField(f.key);
                          }}
                          className="p-1 hover:bg-slate-100 rounded text-[#cc2727]"
                          title="Unpin"
                        >
                          <Pin className="w-3 h-3 fill-current" />
                        </button>
                      </div>
                    ))}
                </div>
              )}

              {/* Other Filters Section */}
              <div className="py-1">
                <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Available Filters
                </div>
                {otherFields
                  .filter((f) => f.label.toLowerCase().includes(dropdownSearch.toLowerCase()))
                  .map((f) => (
                    <div
                      key={f.key}
                      className="px-3 py-1.5 flex items-center justify-between hover:bg-slate-50 cursor-pointer"
                      onClick={() => {
                        setOpenInstantField(f.key);
                        setIsFilterDropdownOpen(false);
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-slate-700 font-medium">{f.label}</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                          {f.category}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePinField(f.key);
                        }}
                        className="p-1 hover:bg-slate-100 rounded text-slate-300 hover:text-slate-600"
                        title="Pin this filter"
                      >
                        <Pin className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
              </div>
            </div>

            {/* Bottom Actions: Advanced Filters + Configure Fields */}
            <div className="p-2 border-t border-slate-100 bg-slate-50/70 space-y-1">
              <button
                type="button"
                onClick={() => {
                  setIsFilterDropdownOpen(false);
                  setIsAdvancedModalOpen(true);
                }}
                className="w-full py-1.5 px-3 rounded-lg bg-white border border-slate-200 text-slate-800 hover:bg-slate-50 hover:shadow-xs flex items-center justify-center gap-2 font-bold text-xs transition-colors cursor-pointer"
              >
                <Sliders className="w-3.5 h-3.5 text-[#cc2727]" />
                <span>Open Advanced Filters Modal</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsFilterDropdownOpen(false);
                  setTempConfiguredKeys(pinnedFieldKeys);
                  setIsConfigureModalOpen(true);
                }}
                className="w-full py-1.5 px-3 rounded-lg text-slate-600 hover:bg-white hover:shadow-xs flex items-center justify-center gap-2 font-medium text-xs transition-colors cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5 text-slate-500" />
                <span>Configure Pinned Fields</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 2. Instant Pinned Filter Pills */}
      {pinnedFields.map((field) => {
        let isFieldActive = false;
        let activeValueLabel = "";

        if (field.type === "select") {
          const val = filters[field.key as keyof LeadFilters];
          if (val) {
            isFieldActive = true;
            activeValueLabel = String(val);
          }
        } else if (field.type === "dateRange") {
          const from = filters[field.fromKey!];
          const to = filters[field.toKey!];
          if (from || to) {
            isFieldActive = true;
            activeValueLabel = `${from || "Start"} to ${to || "End"}`;
          }
        } else if (field.type === "numberRange") {
          const min = filters[field.fromKey!];
          const max = filters[field.toKey!];
          if (min || max) {
            isFieldActive = true;
            activeValueLabel = `${min || "0"} - ${max || "100"}`;
          }
        }

        const isPickerOpen = openInstantField === field.key;

        return (
          <div key={field.key} className="relative">
            <button
              type="button"
              onClick={() => setOpenInstantField((prev) => (prev === field.key ? null : field.key))}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                isFieldActive
                  ? "bg-[#cc2727]/10 text-[#cc2727] border-[#cc2727]/30 font-semibold"
                  : "bg-white text-slate-700 hover:bg-slate-50 border-slate-300"
              }`}
            >
              <span>{field.label}</span>
              {isFieldActive && (
                <span className="font-bold text-[#cc2727] truncate max-w-[130px]">
                  : {activeValueLabel}
                </span>
              )}
              <ChevronDown className="w-3 h-3 text-slate-400 ml-0.5" />
            </button>

            {/* Instant Filter Dropdown Picker */}
            {isPickerOpen && (
              <div className="absolute left-0 top-full mt-1.5 w-64 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-2 text-xs animate-in fade-in slide-in-from-top-1">
                {field.type === "select" ? (
                  <div className="space-y-1 max-h-60 overflow-y-auto">
                    <button
                      type="button"
                      onClick={() => {
                        updateFilter(field.key as keyof LeadFilters, "");
                        setOpenInstantField(null);
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded hover:bg-slate-100 text-slate-500 font-medium"
                    >
                      All / Clear Selection
                    </button>
                    {(field.options || []).map((opt) => {
                      const isSelected = filters[field.key as keyof LeadFilters] === opt;
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => {
                            updateFilter(field.key as keyof LeadFilters, opt);
                            setOpenInstantField(null);
                          }}
                          className={`w-full text-left px-2.5 py-1.5 rounded flex items-center justify-between transition-colors ${
                            isSelected
                              ? "bg-[#cc2727]/10 text-[#cc2727] font-semibold"
                              : "text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          <span className="truncate">{opt}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-[#cc2727]" />}
                        </button>
                      );
                    })}
                  </div>
                ) : field.type === "dateRange" ? (
                  <div className="p-2 space-y-2.5">
                    <div>
                      <span className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                        From Date
                      </span>
                      <input
                        type="date"
                        value={filters[field.fromKey!]}
                        onChange={(e) => updateFilter(field.fromKey!, e.target.value)}
                        className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-800 [color-scheme:light]"
                      />
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                        To Date
                      </span>
                      <input
                        type="date"
                        value={filters[field.toKey!]}
                        onChange={(e) => updateFilter(field.toKey!, e.target.value)}
                        className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-800 [color-scheme:light]"
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-1 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => {
                          updateFilter(field.fromKey!, "");
                          updateFilter(field.toKey!, "");
                          setOpenInstantField(null);
                        }}
                        className="px-2.5 py-1 text-slate-500 hover:text-slate-800"
                      >
                        Clear
                      </button>
                      <button
                        type="button"
                        onClick={() => setOpenInstantField(null)}
                        className="px-3 py-1 bg-[#cc2727] text-white rounded font-medium text-xs shadow-xs"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-2 space-y-2.5">
                    <div>
                      <span className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                        Min Lead Score
                      </span>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        placeholder="e.g. 10"
                        value={filters[field.fromKey!]}
                        onChange={(e) => updateFilter(field.fromKey!, e.target.value)}
                        className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-800"
                      />
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                        Max Lead Score
                      </span>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        placeholder="e.g. 50"
                        value={filters[field.toKey!]}
                        onChange={(e) => updateFilter(field.toKey!, e.target.value)}
                        className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-800"
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-1 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => {
                          updateFilter(field.fromKey!, "");
                          updateFilter(field.toKey!, "");
                          setOpenInstantField(null);
                        }}
                        className="px-2.5 py-1 text-slate-500 hover:text-slate-800"
                      >
                        Clear
                      </button>
                      <button
                        type="button"
                        onClick={() => setOpenInstantField(null)}
                        className="px-3 py-1 bg-[#cc2727] text-white rounded font-medium text-xs shadow-xs"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* 3. Reset Button when active filters exist */}
      {activeFilterCount > 0 && (
        <button
          type="button"
          onClick={handleResetFilters}
          className="flex items-center gap-1 px-2.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          title="Reset all active filters"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset</span>
        </button>
      )}

      {/* 4. Configure Filter Fields Modal */}
      {isConfigureModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-800">Configure Filter Fields</h3>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                  {tempConfiguredKeys.length}/{filterFieldsWithDynamicOptions.length}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsConfigureModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search Box */}
            <div className="p-3 border-b border-slate-100 bg-slate-50/50 shrink-0">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search fields to pin..."
                  value={configureSearch}
                  onChange={(e) => setConfigureSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#cc2727]"
                />
              </div>
            </div>

            {/* Fields Checklist */}
            <div className="p-3 overflow-y-auto space-y-1 flex-1 text-xs">
              {filterFieldsWithDynamicOptions
                .filter((f) => f.label.toLowerCase().includes(configureSearch.toLowerCase()))
                .map((f) => {
                  const isChecked = tempConfiguredKeys.includes(f.key);
                  return (
                    <label
                      key={f.key}
                      className="flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-slate-50 cursor-pointer select-none"
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            setTempConfiguredKeys((prev) =>
                              prev.includes(f.key)
                                ? prev.filter((k) => k !== f.key)
                                : [...prev, f.key]
                            );
                          }}
                          className="w-4 h-4 rounded border-slate-300 text-[#cc2727] focus:ring-[#cc2727] cursor-pointer"
                        />
                        <span className="text-slate-700 font-medium">{f.label}</span>
                      </div>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                        {f.category}
                      </span>
                    </label>
                  );
                })}
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => setTempConfiguredKeys(DEFAULT_PINNED_FIELD_KEYS)}
                className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold shadow-xs"
              >
                Restore Default
              </button>
              <button
                type="button"
                onClick={() => {
                  savePinnedFilters(tempConfiguredKeys);
                  setIsConfigureModalOpen(false);
                }}
                className="px-4 py-1.5 bg-[#cc2727] hover:bg-[#b02121] text-white rounded-lg text-xs font-bold shadow-sm shadow-[#cc2727]/25"
              >
                Update
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Comprehensive Categorized Advanced Filters Modal */}
      {isAdvancedModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-5xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[#cc2727]/10 text-[#cc2727]">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Advanced Lead Filters</h3>
                  <p className="text-xs text-slate-500">
                    Comprehensive multi-field filtering criteria mapped with 49 CRM columns
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAdvancedModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body - Categorized Sections */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs bg-slate-50/50">
              {/* Category 1: Centres & Camps */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <MapPin className="w-4 h-4 text-[#cc2727]" />
                  <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                    Centres & Camps
                  </h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Centre Location
                    </label>
                    <select
                      value={filters.centreLocation || filters.location || ""}
                      onChange={(e) => updateFilter("centreLocation", e.target.value)}
                      className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    >
                      <option value="">All Centres</option>
                      {CENTRE_LOCATIONS.map((loc) => (
                        <option key={loc} value={loc}>
                          {loc}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Camp Location
                    </label>
                    <select
                      value={filters.campLocation || ""}
                      onChange={(e) => updateFilter("campLocation", e.target.value)}
                      className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    >
                      <option value="">All Camps / NA</option>
                      {CAMP_LOCATIONS.map((camp) => (
                        <option key={camp} value={camp}>
                          {camp}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Patient City / State
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="City"
                        value={filters.ptCity || ""}
                        onChange={(e) => updateFilter("ptCity", e.target.value)}
                        className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                      />
                      <input
                        type="text"
                        placeholder="State"
                        value={filters.ptState || ""}
                        onChange={(e) => updateFilter("ptState", e.target.value)}
                        className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Category 2: Status & Disposition */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <Activity className="w-4 h-4 text-[#cc2727]" />
                  <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                    Status & Disposition
                  </h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Sub Status (40 Options)
                    </label>
                    <select
                      value={filters.subStatus || filters.subDispositions || ""}
                      onChange={(e) => updateFilter("subStatus", e.target.value)}
                      className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    >
                      <option value="">All Sub Statuses</option>
                      {SUB_DISPOSITIONS.map((sub: string) => (
                        <option key={sub} value={sub}>
                          {sub}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Lead Stage
                    </label>
                    <select
                      value={filters.leadStage || filters.dispositions || ""}
                      onChange={(e) => updateFilter("leadStage", e.target.value)}
                      className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    >
                      <option value="">All Lead Stages</option>
                      {DISPOSITIONS.map((stg: string) => (
                        <option key={stg} value={stg}>
                          {stg}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Valid Status
                    </label>
                    <select
                      value={filters.leadValidStatus || filters.validStatus || ""}
                      onChange={(e) => updateFilter("leadValidStatus", e.target.value)}
                      className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    >
                      <option value="">All Valid Statuses</option>
                      {VALID_STATUS_LIST.map((vs: string) => (
                        <option key={vs} value={vs}>
                          {vs}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Category 3: Marketing & Attribution */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <Megaphone className="w-4 h-4 text-[#cc2727]" />
                  <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                    Marketing & Attribution (Campaign, Source & Channel)
                  </h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Campaign Name
                    </label>
                    <select
                      value={filters.campaignName || ""}
                      onChange={(e) => updateFilter("campaignName", e.target.value)}
                      className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    >
                      <option value="">All Campaigns</option>
                      {CAMPAIGN_NAMES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Source (Channel)
                    </label>
                    <select
                      value={filters.source || ""}
                      onChange={(e) => updateFilter("source", e.target.value)}
                      className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    >
                      <option value="">All Sources</option>
                      <option value="Meta">Meta</option>
                      <option value="Google">Google</option>
                      <option value="General">General</option>
                      <option value="Aisensy">Aisensy</option>
                      <option value="WhatsApp Direct">WhatsApp Direct</option>
                      <option value="Website">Website</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Source Name (DID/Phone)
                    </label>
                    <select
                      value={filters.sourceName || ""}
                      onChange={(e) => updateFilter("sourceName", e.target.value)}
                      className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    >
                      <option value="">All Source Names</option>
                      {SOURCE_NAMES.map((sn) => (
                        <option key={sn} value={sn}>
                          {sn}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Lead Source / UTM
                    </label>
                    <select
                      value={filters.leadSource || ""}
                      onChange={(e) => updateFilter("leadSource", e.target.value)}
                      className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    >
                      <option value="">All UTM Sources</option>
                      {LEAD_SOURCES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Category 4: Quality, Lead Score & Profile */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <Award className="w-4 h-4 text-[#cc2727]" />
                  <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                    Quality, Lead Score & Patient Profile
                  </h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Lead Owner / Caller
                    </label>
                    <select
                      value={filters.leadOwner || filters.callerName || ""}
                      onChange={(e) => updateFilter("leadOwner", e.target.value)}
                      className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    >
                      <option value="">All Owners / Callers</option>
                      {distinctCallers.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Lead Score Range (0 - 100)
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        placeholder="Min (e.g. 15)"
                        value={filters.leadScoreMin || ""}
                        onChange={(e) => updateFilter("leadScoreMin", e.target.value)}
                        className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                      />
                      <input
                        type="number"
                        min="0"
                        max="100"
                        placeholder="Max (e.g. 50)"
                        value={filters.leadScoreMax || ""}
                        onChange={(e) => updateFilter("leadScoreMax", e.target.value)}
                        className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Registration Status
                    </label>
                    <select
                      value={filters.registrationStatus || ""}
                      onChange={(e) => updateFilter("registrationStatus", e.target.value)}
                      className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    >
                      <option value="">All</option>
                      <option value="Yes">Yes (Registered)</option>
                      <option value="No">No (Not Registered)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      When Planning Treatment
                    </label>
                    <select
                      value={filters.whenPlanningToStartTreatment || ""}
                      onChange={(e) => updateFilter("whenPlanningToStartTreatment", e.target.value)}
                      className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    >
                      <option value="">All Timelines</option>
                      {WHEN_START_TREATMENT_OPTIONS.map((w) => (
                        <option key={w} value={w}>
                          {w}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Category 5: Date Ranges (Lead Entry, Follow Up, Appointment, Centre Visit, Camp Visit) */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <Calendar className="w-4 h-4 text-[#cc2727]" />
                  <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                    Date Ranges & Visit Schedules
                  </h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {/* Lead Entry Date */}
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Lead Entry Date / Created On
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="date"
                        value={filters.leadEntryDateFrom}
                        onChange={(e) => updateFilter("leadEntryDateFrom", e.target.value)}
                        className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded text-xs [color-scheme:light]"
                      />
                      <input
                        type="date"
                        value={filters.leadEntryDateTo}
                        onChange={(e) => updateFilter("leadEntryDateTo", e.target.value)}
                        className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded text-xs [color-scheme:light]"
                      />
                    </div>
                  </div>

                  {/* Follow Up Date */}
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Follow Up Date
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="date"
                        value={filters.followUpDateFrom}
                        onChange={(e) => updateFilter("followUpDateFrom", e.target.value)}
                        className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded text-xs [color-scheme:light]"
                      />
                      <input
                        type="date"
                        value={filters.followUpDateTo}
                        onChange={(e) => updateFilter("followUpDateTo", e.target.value)}
                        className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded text-xs [color-scheme:light]"
                      />
                    </div>
                  </div>

                  {/* Appointment Date */}
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Appointment Date
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="date"
                        value={filters.appointmentDateFrom}
                        onChange={(e) => updateFilter("appointmentDateFrom", e.target.value)}
                        className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded text-xs [color-scheme:light]"
                      />
                      <input
                        type="date"
                        value={filters.appointmentDateTo}
                        onChange={(e) => updateFilter("appointmentDateTo", e.target.value)}
                        className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded text-xs [color-scheme:light]"
                      />
                    </div>
                  </div>

                  {/* Centre Visited Date */}
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Centre Visited Date
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="date"
                        value={filters.centreVisitedDateFrom || ""}
                        onChange={(e) => updateFilter("centreVisitedDateFrom", e.target.value)}
                        className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded text-xs [color-scheme:light]"
                      />
                      <input
                        type="date"
                        value={filters.centreVisitedDateTo || ""}
                        onChange={(e) => updateFilter("centreVisitedDateTo", e.target.value)}
                        className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded text-xs [color-scheme:light]"
                      />
                    </div>
                  </div>

                  {/* Camp Visited Date */}
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Camp Visited Date
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="date"
                        value={filters.campVisitedDateFrom || ""}
                        onChange={(e) => updateFilter("campVisitedDateFrom", e.target.value)}
                        className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded text-xs [color-scheme:light]"
                      />
                      <input
                        type="date"
                        value={filters.campVisitedDateTo || ""}
                        onChange={(e) => updateFilter("campVisitedDateTo", e.target.value)}
                        className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded text-xs [color-scheme:light]"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-3 py-1.5 text-rose-600 hover:text-rose-700 font-semibold text-xs transition-colors cursor-pointer"
              >
                Clear All Filters
              </button>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-medium">
                  {activeFilterCount} filter(s) active
                </span>
                <button
                  type="button"
                  onClick={() => setIsAdvancedModalOpen(false)}
                  className="px-5 py-2 bg-[#cc2727] hover:bg-[#b02121] text-white rounded-xl text-xs font-bold shadow-md shadow-[#cc2727]/25 cursor-pointer"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
