"use client";

import { ALL_LEADS_COLUMNS } from "@/lib/columnsConfig";
import LeadSquaredFilter from "@/app/components/LeadSquaredFilter";
import ManageColumnsModal, { ColumnItem } from "@/app/components/ManageColumnsModal";
import { renderLeadTableCell } from "@/app/components/LeadTableCellRenderer";
import { useEffect, useState, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  FolderKanban,
  UserPlus,
  Phone,
  MapPin,
  Calendar,
  Clock,
  CheckCircle,
  Search,
  ChevronRight,
  User,
  Hash,
  Trash2,
  AlertCircle,
  Activity,
  FileText,
  Stethoscope,
  SlidersHorizontal,
  Check,
  Filter,
  RotateCcw,
  X,
  ChevronDown,
  Sliders,
  RefreshCw,
  Bell,
  CalendarClock,
  ChevronLeft,
} from "lucide-react";
import AgentSidebar from "@/app/components/AgentSidebar";
import Footer from "@/app/components/Footer";
import AddLeadModal from "@/app/components/AddLeadModal";
import {
  LOCATIONS,
  TREATMENTS,
  LEAD_SOURCES,
  SUB_DISPOSITIONS,
  parseDDMMMYYToISO,
  notifyLeadUpdated,
} from "@/lib/leadOptions";
import {
  getCachedLeads,
  setCachedLeads,
  setCachedLeadDetail,
  invalidateLeadsCache,
} from "@/lib/leadsCache";

interface ColumnConfig {
  id: string;
  label: string;
}

import { LeadFilters, INITIAL_LEAD_FILTERS } from "@/types/leadFilters";

const initialFilters: LeadFilters = { ...INITIAL_LEAD_FILTERS };

function normalizeDateStr(dateStr: string | undefined | null): string {
  if (!dateStr) return "";
  let trimmed = String(dateStr).trim();
  if (trimmed.includes(",")) {
    trimmed = trimmed.split(",")[0].trim();
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    return trimmed.slice(0, 10);
  }
  const iso = parseDDMMMYYToISO(trimmed);
  if (iso) return iso;
  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) {
    return d.toISOString().slice(0, 10);
  }
  return "";
}

function matchesDateRange(
  dateVal: string | undefined | null,
  fromIso: string,
  toIso: string
): boolean {
  if (!fromIso && !toIso) return true;
  if (!dateVal) return false;
  const iso = normalizeDateStr(dateVal);
  if (!iso) return false;
  if (fromIso && iso < fromIso) return false;
  if (toIso && iso > toIso) return false;
  return true;
}

const TABLE_COLUMNS: ColumnConfig[] = ALL_LEADS_COLUMNS;

export default function AgentLeadsPage() {
  const router = useRouter();
  // Instant preview from in-memory cache (0ms loading time)
  const cachedInitial = typeof window !== "undefined" ? getCachedLeads("agent") : null;
  const [user, setUser] = useState<any>(null);
  const [leads, setLeads] = useState<any[]>(() => cachedInitial?.leads || []);
  const [nextUniqueId, setNextUniqueId] = useState<string>(() => cachedInitial?.nextUniqueId || "SOI-1");
  const [loading, setLoading] = useState(() => !cachedInitial);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [toastMessage, setToastMessage] = useState("");

  // Advanced Filters State with localStorage persistence
  const [filters, setFilters] = useState<LeadFilters>(initialFilters);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

  // Load saved filters on mount
  useEffect(() => {
    try {
      const savedFilters = localStorage.getItem("crm_leads_filters_agent");
      if (savedFilters) {
        const parsed = JSON.parse(savedFilters);
        setFilters((prev) => ({ ...prev, ...parsed }));
      }
    } catch (e) {
      // ignore
    }
  }, []);

  const updateFilter = (key: keyof LeadFilters, value: string) => {
    setFilters((prev) => {
      const updated = { ...prev, [key]: value };
      try {
        localStorage.setItem("crm_leads_filters_agent", JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  const handleResetFilters = () => {
    setFilters(initialFilters);
    try {
      localStorage.removeItem("crm_leads_filters_agent");
    } catch (e) {}
  };

  // Column visibility state
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    TABLE_COLUMNS.forEach((col) => {
      initial[col.id] = true;
    });
    return initial;
  });
  const [isColumnDropdownOpen, setIsColumnDropdownOpen] = useState(false);
  const [isManageColumnsModalOpen, setIsManageColumnsModalOpen] = useState(false);
  const [columnOrder, setColumnOrder] = useState<string[]>(() => TABLE_COLUMNS.map((c) => c.id));
  const [pinnedColumns, setPinnedColumns] = useState<string[]>([]);
  const [columnSearch, setColumnSearch] = useState("");
  const columnDropdownRef = useRef<HTMLDivElement>(null);

  // Table Scroll Container Ref & Last Viewed Lead State
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const [highlightedLeadId, setHighlightedLeadId] = useState<string | null>(null);

  // Save scroll position when navigating to a lead
  const handleOpenLead = (lead: any) => {
    const id = lead.uniqueId || lead._id;
    try {
      if (id) {
        sessionStorage.setItem("crm_last_viewed_lead_agent", id);
        setCachedLeadDetail(id, lead);
      }
      if (tableScrollRef.current) {
        sessionStorage.setItem("crm_leads_scroll_top_agent", String(tableScrollRef.current.scrollTop));
      }
    } catch (e) {}
    router.push(`/agent/leads/${id}`);
  };

  // Load column preferences from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("crm_leads_visible_columns");
      if (saved) {
        const parsed = JSON.parse(saved);
        setVisibleColumns((prev) => ({ ...prev, ...parsed }));
      }
      const savedOrder = localStorage.getItem("crm_leads_column_order_agent");
      if (savedOrder) {
        try {
          const parsedOrder = JSON.parse(savedOrder);
          if (Array.isArray(parsedOrder)) setColumnOrder(parsedOrder);
        } catch (e) {}
      }
      const savedPinned = localStorage.getItem("crm_leads_pinned_columns_agent");
      if (savedPinned) {
        try {
          const parsedPinned = JSON.parse(savedPinned);
          if (Array.isArray(parsedPinned)) setPinnedColumns(parsedPinned);
        } catch (e) {}
      }
    } catch (e) {
      // ignore
    }
  }, []);

  // Close column dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        columnDropdownRef.current &&
        !columnDropdownRef.current.contains(event.target as Node)
      ) {
        setIsColumnDropdownOpen(false);
      }
    }
    if (isColumnDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isColumnDropdownOpen]);

  // Calculate dynamic ordered columns strictly based on user's columnOrder preference
  const orderedColumns = useMemo(() => {
    const all = [...columnOrder];
    TABLE_COLUMNS.forEach((c) => {
      if (!all.includes(c.id)) all.push(c.id);
    });
    return all.filter((id) => visibleColumns[id]);
  }, [columnOrder, visibleColumns]);

  const handleApplyColumns = (
    newVisible: Record<string, boolean>,
    newOrder: string[],
    newPinned?: string[]
  ) => {
    setVisibleColumns(newVisible);
    setColumnOrder(newOrder);
    setPinnedColumns(newPinned || []);
    try {
      localStorage.setItem("crm_leads_visible_columns", JSON.stringify(newVisible));
      localStorage.setItem("crm_leads_column_order_agent", JSON.stringify(newOrder));
      localStorage.removeItem("crm_leads_pinned_columns_agent");
    } catch (e) {}
  };

  const handleRestoreDefaultColumns = () => {
    const defVisible: Record<string, boolean> = {};
    const defOrder = TABLE_COLUMNS.map((c) => c.id);
    TABLE_COLUMNS.forEach((c) => {
      defVisible[c.id] = true;
    });
    setVisibleColumns(defVisible);
    setColumnOrder(defOrder);
    setPinnedColumns([]);
    try {
      localStorage.setItem("crm_leads_visible_columns", JSON.stringify(defVisible));
      localStorage.removeItem("crm_leads_column_order_agent");
      localStorage.removeItem("crm_leads_pinned_columns_agent");
    } catch (e) {}
  };

  const toggleColumn = (colId: string) => {
    setVisibleColumns((prev) => {
      const updated = { ...prev, [colId]: !prev[colId] };
      try {
        localStorage.setItem("crm_leads_visible_columns", JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  const setAllColumns = (val: boolean) => {
    const updated: Record<string, boolean> = {};
    TABLE_COLUMNS.forEach((col) => {
      updated[col.id] = val;
    });
    setVisibleColumns(updated);
    try {
      localStorage.setItem("crm_leads_visible_columns", JSON.stringify(updated));
    } catch (e) {}
  };



  // Delete confirmation state
  const [leadToDelete, setLeadToDelete] = useState<any>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSessionAndLeads = async (isBackground = false) => {
    try {
      if (!isBackground && leads.length === 0) {
        setRefreshing(true);
      }
      // Parallel execution of Agent Auth and Assigned Leads fetch
      const [meRes, leadsRes] = await Promise.all([
        fetch("/api/auth/me"),
        fetch("/api/admin/leads", { cache: "no-store" }),
      ]);

      if (!meRes.ok) {
        if (meRes.status === 403) {
          router.push("/agent/login?error=deactivated");
        } else {
          router.push("/agent/login");
        }
        return;
      }
      const meData = await meRes.json();
      if (!meData.user || meData.user.role !== "agent") {
        router.push("/agent/login");
        return;
      }
      setUser(meData.user);

      if (leadsRes.ok) {
        const leadsData = await leadsRes.json();
        const loadedLeads = leadsData.leads || [];
        setLeads(loadedLeads);
        if (leadsData.nextUniqueId) {
          setNextUniqueId(leadsData.nextUniqueId);
        }
        // Save to cache for instant page switching
        setCachedLeads("agent", loadedLeads, leadsData.nextUniqueId);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      if (!isBackground) {
        setRefreshing(false);
      }
    }
  };

  useEffect(() => {
    // 1. Initial Load from DB
    fetchSessionAndLeads();

    // 2. Real-time background safety sync (every 60 seconds) from MongoDB
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && !document.hidden && !isModalOpen) {
        fetchSessionAndLeads(true);
      }
    }, 60000);

    // 3. Instant refresh on tab focus / visibility change
    const handleVisibilityOrFocus = () => {
      if (typeof document !== "undefined" && !document.hidden && !isModalOpen) {
        fetchSessionAndLeads(true);
      }
    };
    window.addEventListener("focus", handleVisibilityOrFocus);
    document.addEventListener("visibilitychange", handleVisibilityOrFocus);

    // 4. Real-time Cross-tab Sync event
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "surgical_crm_leads_updated") {
        fetchSessionAndLeads(true);
      }
    };
    window.addEventListener("storage", handleStorageChange);

    // 5. In-app custom event sync
    const handleCustomLeadUpdate = () => {
      fetchSessionAndLeads(true);
    };
    window.addEventListener("lead_updated", handleCustomLeadUpdate);
    window.addEventListener("crm:leadUpdated", handleCustomLeadUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleVisibilityOrFocus);
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("lead_updated", handleCustomLeadUpdate);
      window.removeEventListener("crm:leadUpdated", handleCustomLeadUpdate);
    };
  }, [isModalOpen]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/agent/login");
  };

  const handleLeadAdded = (newLead: any) => {
    invalidateLeadsCache("agent");
    setLeads((prev) => [newLead, ...prev]);
    setFilters(initialFilters);
    try { localStorage.removeItem("crm_leads_filters_agent"); } catch (e) {}
    notifyLeadUpdated();
    // Compute next ID
    const match = newLead.uniqueId?.match(/^(?:SOI|SC)-(\d+)$/i);
    if (match) {
      const nextNum = parseInt(match[1], 10) + 1;
      setNextUniqueId(`SOI-${nextNum}`);
    }
    setToastMessage(`Patient lead ${newLead.patientName || newLead.uniqueId} created successfully!`);
    setTimeout(() => setToastMessage(""), 4000);
  };

  const handleConfirmDelete = async () => {
    if (!leadToDelete) return;
    setDeleting(true);

    try {
      const targetId = leadToDelete.uniqueId || leadToDelete._id;
      const res = await fetch(`/api/admin/leads/${targetId}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete lead");
      }

      setLeads((prev) =>
        prev.filter((l) => (l.uniqueId || l._id) !== targetId)
      );
      notifyLeadUpdated();
      setToastMessage(`Lead ${leadToDelete.uniqueId || "record"} deleted successfully!`);
      setTimeout(() => setToastMessage(""), 4000);
      setIsDeleteModalOpen(false);
      setLeadToDelete(null);
    } catch (err: any) {
      setToastMessage(err.message || "Failed to delete lead");
      setTimeout(() => setToastMessage(""), 4000);
    } finally {
      setDeleting(false);
    }
  };

  const distinctLocations = useMemo(() => {
    const set = new Set<string>(LOCATIONS.filter((l) => l !== "Other"));
    leads.forEach((l) => {
      const loc = l.location || l.otherCity;
      if (loc && loc !== "Other") set.add(loc);
    });
    return Array.from(set).sort();
  }, [leads]);

  const distinctCallers = useMemo(() => {
    const set = new Set<string>();
    leads.forEach((l) => {
      if (l.callerName) set.add(l.callerName);
    });
    return Array.from(set).sort();
  }, [leads]);

  const distinctCampaignNames = useMemo(() => {
    const set = new Set<string>();
    leads.forEach((l) => {
      if (l.campaignName) set.add(l.campaignName);
    });
    return Array.from(set).sort();
  }, [leads]);

  const distinctSourceNames = useMemo(() => {
    const set = new Set<string>();
    leads.forEach((l) => {
      if (l.sourceName) set.add(l.sourceName);
    });
    return Array.from(set).sort();
  }, [leads]);

  const distinctSources = useMemo(() => {
    const set = new Set<string>();
    leads.forEach((l) => {
      if (l.source) set.add(l.source);
    });
    return Array.from(set).sort();
  }, [leads]);

  const distinctCampLocations = useMemo(() => {
    const set = new Set<string>();
    leads.forEach((l) => {
      if (l.campLocation) set.add(l.campLocation);
    });
    return Array.from(set).sort();
  }, [leads]);

  const distinctLeadSources = useMemo(() => {
    const set = new Set<string>(LEAD_SOURCES);
    leads.forEach((l) => {
      if (l.leadSource) set.add(l.leadSource);
    });
    return Array.from(set).sort();
  }, [leads]);

  const distinctTreatments = useMemo(() => {
    const set = new Set<string>(TREATMENTS.filter((t) => t !== "Other"));
    leads.forEach((l) => {
      const t = l.lookingForTreatment || l.treatmentRequired || l.treatment;
      if (t && t !== "Other") set.add(t);
    });
    return Array.from(set).sort();
  }, [leads]);

  const distinctSubDispositions = useMemo(() => {
    const set = new Set<string>(SUB_DISPOSITIONS);
    leads.forEach((l) => {
      const s = l.subStatus || l.subDispositions || l.subDisposition;
      if (s) set.add(s);
    });
    return Array.from(set).sort();
  }, [leads]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.leadEntryDateFrom || filters.leadEntryDateTo) count++;
    if (filters.centreLocation || filters.location) count++;
    if (filters.campLocation) count++;
    if (filters.leadOwner || filters.callerName) count++;
    if (filters.leadSource) count++;
    if (filters.campaignName) count++;
    if (filters.sourceName) count++;
    if (filters.source) count++;
    if (filters.subStatus || filters.subDispositions) count++;
    if (filters.leadStage || filters.dispositions) count++;
    if (filters.leadValidStatus || filters.validStatus) count++;
    if (filters.followUpDateFrom || filters.followUpDateTo) count++;
    if (filters.appointmentDateFrom || filters.appointmentDateTo) count++;
    if (filters.centreVisitedDateFrom || filters.centreVisitedDateTo) count++;
    if (filters.campVisitedDateFrom || filters.campVisitedDateTo) count++;
    if (filters.registrationStatus) count++;
    if (filters.leadScoreMin || filters.leadScoreMax) count++;
    if (filters.ptCity) count++;
    if (filters.ptState) count++;
    if (filters.whenPlanningToStartTreatment) count++;
    if (filters.preMedicalConditions) count++;
    if (filters.quickMetricFilter) count++;
    return count;
  }, [filters]);

  // Today's Follow-up Calculations & Notification
  const todayStr = useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, []);

  const todayFormatted = useMemo(() => {
    const d = new Date();
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }, []);

  const todayFollowUps = useMemo(() => {
    return leads.filter((lead) => {
      const fDate = normalizeDateStr(lead.followUpDate || lead.followUpDates);
      return fDate === todayStr;
    });
  }, [leads, todayStr]);

  const handleShowTodayFollowUps = () => {
    setFilters((prev) => {
      const updated = {
        ...prev,
        followUpDateFrom: todayStr,
        followUpDateTo: todayStr,
      };
      try {
        localStorage.setItem("crm_leads_filters_agent", JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

    const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      // 0. Quick Metric Filter (from Dashboard KPI cards)
      if (filters.quickMetricFilter) {
        if (filters.quickMetricFilter === "follow_up") {
          const hasFollowUp = !!(lead.followUpDate && lead.followUpDate.trim()) || !!(lead.followUpDates && lead.followUpDates.trim());
          if (!hasFollowUp) return false;
        } else if (filters.quickMetricFilter === "unassigned") {
          const disp = (lead.dispositions || lead.disposition || "").trim().toLowerCase();
          const isAssignedCategory =
            disp === "converted" ||
            disp === "contacted" ||
            disp === "contact attempt" ||
            disp.includes("attempt") ||
            disp === "closed";
          if (isAssignedCategory) return false;
        }
      }

      // 1. Text Search Query (Supports couple names, phone numbers, campaign, source, IDs)
      if (searchQuery.trim()) {
        const tokens = searchQuery.trim().toLowerCase().split(/\s+/).filter(Boolean);
        const id = (lead.uniqueId || "").toLowerCase();
        const wife = (lead.wifeName || lead.patientName || "").toLowerCase();
        const husband = (lead.husbandName || "").toLowerCase();
        const primPhone = (lead.primaryMobileNumber || lead.mobileNumber || lead.phoneNumber || "").toLowerCase();
        const secPhone = (lead.secondaryMobileNumber || lead.alternateNumber || "").toLowerCase();
        const waPhone = (lead.whatsappMobileNumber || "").toLowerCase();
        const centre = (lead.centreLocation || lead.location || lead.otherCity || "").toLowerCase();
        const camp = (lead.campLocation || "").toLowerCase();
        const sub = (lead.subStatus || lead.subDispositions || "").toLowerCase();
        const stage = (lead.leadStage || lead.dispositions || "").toLowerCase();
        const owner = (lead.leadOwner || lead.callerName || "").toLowerCase();
        const campName = (lead.campaignName || "").toLowerCase();
        const srcName = (lead.sourceName || "").toLowerCase();
        const src = (lead.source || lead.leadSource || "").toLowerCase();
        const notes = (lead.notes || "").toLowerCase();

        const matchesQuery = tokens.some((token) => {
          const cleanToken = token.replace(/\D/g, "");
          const cleanPrim = primPhone.replace(/\D/g, "");
          const cleanSec = secPhone.replace(/\D/g, "");
          const cleanWa = waPhone.replace(/\D/g, "");

          if (cleanToken.length >= 5) {
            if (cleanPrim.includes(cleanToken) || cleanSec.includes(cleanToken) || cleanWa.includes(cleanToken)) {
              return true;
            }
          }

          return (
            id.includes(token) ||
            wife.includes(token) ||
            husband.includes(token) ||
            primPhone.includes(token) ||
            secPhone.includes(token) ||
            waPhone.includes(token) ||
            centre.includes(token) ||
            camp.includes(token) ||
            sub.includes(token) ||
            stage.includes(token) ||
            owner.includes(token) ||
            campName.includes(token) ||
            srcName.includes(token) ||
            src.includes(token) ||
            notes.includes(token)
          );
        });

        if (!matchesQuery) return false;
      }

      // 2. Lead Entry Date / Created On
      const entryDate = lead.date || lead.dateOfLead || lead.createdAt || lead.createdOn || lead.leadTimestamp;
      if (!matchesDateRange(entryDate, filters.leadEntryDateFrom, filters.leadEntryDateTo)) {
        return false;
      }

      // 3. Centre Location
      const filterCentre = filters.centreLocation || filters.location;
      if (filterCentre) {
        const leadCentre = (lead.centreLocation || lead.location || lead.otherCity || "").toLowerCase();
        if (leadCentre !== filterCentre.toLowerCase()) return false;
      }

      // 4. Camp Location
      if (filters.campLocation) {
        const leadCamp = (lead.campLocation || "").toLowerCase();
        if (leadCamp !== filters.campLocation.toLowerCase()) return false;
      }

      // 5. Lead Owner / Caller
      const filterOwner = filters.leadOwner || filters.callerName;
      if (filterOwner) {
        const leadOwner = (lead.leadOwner || lead.callerName || "").toLowerCase();
        if (leadOwner !== filterOwner.toLowerCase()) return false;
      }

      // 6. Campaign Name
      if (filters.campaignName) {
        const leadCamp = (lead.campaignName || "").toLowerCase();
        if (leadCamp !== filters.campaignName.toLowerCase()) return false;
      }

      // 7. Source Name (DID/Number)
      if (filters.sourceName) {
        const leadSrcName = (lead.sourceName || "").toLowerCase();
        if (leadSrcName !== filters.sourceName.toLowerCase()) return false;
      }

      // 8. Source Channel (Meta, Google, General, etc.)
      if (filters.source) {
        const leadSrc = (lead.source || "").toLowerCase();
        if (leadSrc !== filters.source.toLowerCase()) return false;
      }

      // 9. Lead Source / UTM
      if (filters.leadSource) {
        const leadUtm = (lead.leadSource || "").toLowerCase();
        if (leadUtm !== filters.leadSource.toLowerCase()) return false;
      }

      // 10. Sub Status
      const filterSub = filters.subStatus || filters.subDispositions;
      if (filterSub) {
        const leadSub = (lead.subStatus || lead.subDispositions || lead.subDisposition || "").toLowerCase();
        if (leadSub !== filterSub.toLowerCase()) return false;
      }

      // 11. Lead Stage
      const filterStage = filters.leadStage || filters.dispositions;
      if (filterStage) {
        const leadStage = (lead.leadStage || lead.dispositions || lead.disposition || "").toLowerCase();
        if (leadStage !== filterStage.toLowerCase()) return false;
      }

      // 12. Lead Valid Status
      const filterVal = filters.leadValidStatus || filters.validStatus;
      if (filterVal) {
        const leadVal = (lead.leadValidStatus || lead.validStatus || "").toLowerCase();
        if (leadVal !== filterVal.toLowerCase()) return false;
      }

      // 13. Follow Up Date
      if (!matchesDateRange(lead.followUpDate || lead.followUpDates || lead.followUpDateTime, filters.followUpDateFrom, filters.followUpDateTo)) {
        return false;
      }

      // 14. Appointment Date
      if (!matchesDateRange(lead.appointmentDate, filters.appointmentDateFrom, filters.appointmentDateTo)) {
        return false;
      }

      // 15. Centre Visited Date
      if (!matchesDateRange(lead.centreVisitedDate, filters.centreVisitedDateFrom, filters.centreVisitedDateTo)) {
        return false;
      }

      // 16. Camp Visited Date
      if (!matchesDateRange(lead.campVisitedDate, filters.campVisitedDateFrom, filters.campVisitedDateTo)) {
        return false;
      }

      // 17. Registration Status
      if (filters.registrationStatus) {
        const leadReg = (lead.registrationStatus || "").toLowerCase();
        if (leadReg !== filters.registrationStatus.toLowerCase()) return false;
      }

      // 18. Lead Score Range (Min - Max)
      if (filters.leadScoreMin || filters.leadScoreMax) {
        const scoreVal = parseInt(String(lead.leadScore || "0").replace(/\D/g, ""), 10) || 0;
        if (filters.leadScoreMin) {
          const minVal = parseInt(filters.leadScoreMin, 10);
          if (!isNaN(minVal) && scoreVal < minVal) return false;
        }
        if (filters.leadScoreMax) {
          const maxVal = parseInt(filters.leadScoreMax, 10);
          if (!isNaN(maxVal) && scoreVal > maxVal) return false;
        }
      }

      // 19. Patient City
      if (filters.ptCity) {
        const city = (lead.ptCity || "").toLowerCase();
        if (!city.includes(filters.ptCity.toLowerCase())) return false;
      }

      // 20. Patient State
      if (filters.ptState) {
        const st = (lead.ptState || "").toLowerCase();
        if (!st.includes(filters.ptState.toLowerCase())) return false;
      }

      // 21. When planning treatment
      if (filters.whenPlanningToStartTreatment) {
        const when = (lead.whenPlanningToStartTreatment || "").toLowerCase();
        if (when !== filters.whenPlanningToStartTreatment.toLowerCase()) return false;
      }

      // 22. Medical condition
      if (filters.preMedicalConditions) {
        const med = (lead.preMedicalConditions || "").toLowerCase();
        if (med !== filters.preMedicalConditions.toLowerCase()) return false;
      }

      return true;
    }).sort((a, b) => {
      const numA = parseInt((a.uniqueId || "").replace(/\D/g, ""), 10) || 0;
      const numB = parseInt((b.uniqueId || "").replace(/\D/g, ""), 10) || 0;
      if (numA !== numB) return numB - numA;
      const dateA = new Date(a.createdAt || a.date || 0).getTime();
      const dateB = new Date(b.createdAt || b.date || 0).getTime();
      return dateB - dateA;
    });
  }, [leads, searchQuery, filters]);

  // High-performance windowed pagination (100 leads per page)
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 100;
  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / pageSize));

  // Reset to page 1 whenever filters or search query change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filters]);

  // Keep page within bounds
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const paginatedLeads = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredLeads.slice(startIndex, startIndex + pageSize);
  }, [filteredLeads, currentPage, pageSize]);

  // Restore scroll position instantly after data is loaded (clean, professional, no animated jumping)
  useEffect(() => {
    if (loading || filteredLeads.length === 0) return;

    try {
      const savedLeadId = sessionStorage.getItem("crm_last_viewed_lead_agent");
      const savedScrollTop = sessionStorage.getItem("crm_leads_scroll_top_agent");

      if (savedLeadId) {
        setHighlightedLeadId(savedLeadId);
      }

      // Restore exact scroll position instantly
      requestAnimationFrame(() => {
        if (tableScrollRef.current) {
          if (savedScrollTop) {
            tableScrollRef.current.scrollTop = Number(savedScrollTop);
          } else if (savedLeadId) {
            const rowElem = document.getElementById(`lead-row-${savedLeadId}`);
            if (rowElem) {
              rowElem.scrollIntoView({ block: "nearest" });
            }
          }
        }
      });
    } catch (e) {}
  }, [loading, filteredLeads.length]);

  // Keep saved scroll position updated on user scroll (so page refresh also remembers scroll)
  useEffect(() => {
    const el = tableScrollRef.current;
    if (!el) return;
    const handleScroll = () => {
      try {
        sessionStorage.setItem("crm_leads_scroll_top_agent", String(el.scrollTop));
      } catch (e) {}
    };
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [loading]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#cc2727]/30 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen bg-slate-50 text-black flex overflow-hidden">
      {/* Sidebar with All Leads Tab (Fixed height, no scroll with leads) */}
      <AgentSidebar user={user} onLogout={handleLogout} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Header - Fixed at top, does not scroll */}
        <header className="h-16 shrink-0 border-b border-slate-200 bg-white/90 backdrop-blur-md px-6 flex items-center justify-between z-20">
          <div className="flex items-center gap-2">
            <FolderKanban className="w-5 h-5 text-[#cc2727]" />
            <h1 className="text-base font-bold text-black">All Leads</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#cc2727]/10 text-[#cc2727] border border-[#cc2727]/20 font-semibold ml-2">
              {filteredLeads.length} {filteredLeads.length === leads.length ? "Total" : `of ${leads.length}`}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Today's Follow-ups Quick Notification Button / Badge */}
            <button
              onClick={handleShowTodayFollowUps}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                todayFollowUps.length > 0
                  ? "bg-rose-50 hover:bg-rose-100 text-[#cc2727] border-[#cc2727]/30 shadow-sm animate-pulse hover:animate-none"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300"
              }`}
              title={`View ${todayFollowUps.length} follow-up(s) scheduled for today (${todayFormatted})`}
            >
              <div className="relative">
                <Bell className={`w-4 h-4 ${todayFollowUps.length > 0 ? "text-[#cc2727]" : "text-slate-500"}`} />
                {todayFollowUps.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#cc2727] ring-2 ring-white" />
                )}
              </div>
              <span>Today's Follow-ups:</span>
              <span className={`px-1.5 py-0.2 rounded-full text-xs font-bold ${
                todayFollowUps.length > 0
                  ? "bg-[#cc2727] text-white"
                  : "bg-slate-200 text-slate-700"
              }`}>
                {todayFollowUps.length}
              </span>
            </button>

            {/* Live DB Sync Indicator */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200/20 rounded-xl text-[11px] font-semibold text-emerald-700">
              <span className="w-2 h-2 rounded-full bg-[#cc2727] animate-pulse" />
              <span>Live DB</span>
            </div>

            {/* Manual Refresh from DB */}
            <button
              onClick={() => fetchSessionAndLeads(false)}
              disabled={refreshing}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-black hover:text-black rounded-xl border border-slate-300 transition-colors cursor-pointer"
              title="Refresh leads from database"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`}
              />
            </button>

            {/* Add Lead Button */}
            <button
              onClick={() => setIsModalOpen(true)}
              className="py-2 px-4 bg-[#cc2727] hover:bg-[#b02121] text-white text-xs font-semibold rounded-xl flex items-center gap-2 shadow-lg shadow-[#cc2727]/20 transition-all active:scale-95 cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add Lead</span>
            </button>
          </div>
        </header>

        <main className="flex-1 flex flex-col px-4 pt-4 sm:px-6 sm:pt-6 pb-0 space-y-4 overflow-hidden min-h-0">
          {/* Toast Notification */}
          {toastMessage && (
            <div className="shrink-0 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
              <CheckCircle className="w-5 h-5 shrink-0" />
              <span className="text-sm font-medium">{toastMessage}</span>
            </div>
          )}

          {/* Today's Follow-up Notification Alert Banner */}
          <div className={`shrink-0 p-3 sm:p-3.5 rounded-2xl border flex items-center justify-between gap-3 shadow-sm transition-all ${
            todayFollowUps.length > 0
              ? "bg-rose-50/80 border-[#cc2727]/30 text-slate-800"
              : "bg-slate-50 border-slate-200 text-slate-700"
          }`}>
            <div className="flex items-center gap-3 min-w-0">
              <div className={`p-2 rounded-xl shrink-0 ${
                todayFollowUps.length > 0
                  ? "bg-[#cc2727] text-white shadow-md shadow-[#cc2727]/20"
                  : "bg-slate-200 text-slate-600"
              }`}>
                <CalendarClock className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-800">
                  <span className="font-bold text-slate-900 mr-1.5">
                    🔔 Today&apos;s Follow-ups Reminder ({todayFormatted}):
                  </span>
                  {todayFollowUps.length > 0 ? (
                    <>
                      You have{" "}
                      <span className="font-bold text-[#cc2727] text-sm px-1.5 py-0.5 rounded bg-rose-100 border border-rose-200 mx-0.5">
                        {todayFollowUps.length}
                      </span>{" "}
                      patient follow-up(s) scheduled for today.
                    </>
                  ) : (
                    <span className="text-slate-500">
                      No follow-ups scheduled for today.
                    </span>
                  )}
                </p>
              </div>
            </div>

            {todayFollowUps.length > 0 && (
              <button
                type="button"
                onClick={handleShowTodayFollowUps}
                className="shrink-0 px-3 py-1.5 bg-[#cc2727] hover:bg-[#b02121] text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-sm transition-all active:scale-95 cursor-pointer"
              >
                <span>View Today&apos;s Leads</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Important Calling Update Reminder Banner */}
          <div className="shrink-0 p-3 sm:p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded-xl bg-amber-100 border border-amber-200 text-amber-700 shrink-0">
                <AlertCircle className="w-4 h-4" />
              </div>
              <p className="text-xs text-amber-950">
                <strong className="text-amber-950 font-bold">Call Logging Reminder:</strong> You must update either <strong className="text-amber-800 font-bold">Notes &amp; Observations</strong> or <strong className="text-amber-800 font-bold">Sub Dispositions</strong> on each patient call, otherwise the call will not be added to your Total Calls count.
              </p>
            </div>
            <span className="hidden md:inline-flex text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-200 shrink-0">
              Required
            </span>
          </div>

                    {/* Search Bar & LeadSquared Filters */}
          <div className="space-y-3 shrink-0">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[280px] max-w-md">
                <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by Lead Number, Prospect ID, Wife Name, Husband Name, Phone, Centre..."
                  className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-black text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#cc2727] shadow-sm"
                />
              </div>

              {/* LeadSquared Filter Button & Instant Pinned Filters */}
              <LeadSquaredFilter
                filters={filters}
                updateFilter={updateFilter}
                handleResetFilters={handleResetFilters}
                activeFilterCount={activeFilterCount}
                distinctLocations={distinctLocations}
                distinctCallers={distinctCallers}
                distinctLeadSources={distinctLeadSources}
                distinctCampaignNames={distinctCampaignNames}
                distinctSourceNames={distinctSourceNames}
                distinctSources={distinctSources}
                distinctCampLocations={distinctCampLocations}
                distinctSubDispositions={distinctSubDispositions}
                storageKeyPrefix="agent"
              />

              {/* Column Visibility Filter on the far right */}
              <div className="ml-auto relative z-30">
                <div className="relative self-end sm:self-auto z-50" ref={columnDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsManageColumnsModalOpen(true)}
                  className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200/80 text-black border border-slate-300 rounded-xl text-xs font-medium transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-[#cc2727] cursor-pointer"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-[#cc2727]" />
                  <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-[#cc2727]/10 text-[#cc2727] rounded-md">
                    {Object.values(visibleColumns).filter(Boolean).length}/{TABLE_COLUMNS.length}
                  </span>
                </button>

                
              </div>
              </div>
            </div>

            {/* Active Filter Chips */}
            {activeFilterCount > 0 && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-[11px] font-semibold text-gray-500">Active Filters:</span>

                {(filters.leadEntryDateFrom || filters.leadEntryDateTo) && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-[#cc2727]/10 text-[#cc2727] border border-[#cc2727]/20">
                    <span>Entry: {filters.leadEntryDateFrom || "Start"} to {filters.leadEntryDateTo || "End"}</span>
                    <button
                      type="button"
                      onClick={() => {
                        updateFilter("leadEntryDateFrom", "");
                        updateFilter("leadEntryDateTo", "");
                      }}
                      className="hover:text-black"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {(filters.centreLocation || filters.location) && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-[#cc2727]/10 text-[#cc2727] border border-[#cc2727]/20">
                    <span>Centre: {filters.centreLocation || filters.location}</span>
                    <button
                      type="button"
                      onClick={() => {
                        updateFilter("centreLocation", "");
                        updateFilter("location", "");
                      }}
                      className="hover:text-black"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {filters.campLocation && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-[#cc2727]/10 text-[#cc2727] border border-[#cc2727]/20">
                    <span>Camp: {filters.campLocation}</span>
                    <button type="button" onClick={() => updateFilter("campLocation", "")} className="hover:text-black">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {(filters.leadOwner || filters.callerName) && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-[#cc2727]/10 text-[#cc2727] border border-[#cc2727]/20">
                    <span>Owner: {filters.leadOwner || filters.callerName}</span>
                    <button
                      type="button"
                      onClick={() => {
                        updateFilter("leadOwner", "");
                        updateFilter("callerName", "");
                      }}
                      className="hover:text-black"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {filters.campaignName && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-[#cc2727]/10 text-[#cc2727] border border-[#cc2727]/20">
                    <span>Campaign: {filters.campaignName}</span>
                    <button type="button" onClick={() => updateFilter("campaignName", "")} className="hover:text-black">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {filters.sourceName && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-[#cc2727]/10 text-[#cc2727] border border-[#cc2727]/20">
                    <span>Source Name: {filters.sourceName}</span>
                    <button type="button" onClick={() => updateFilter("sourceName", "")} className="hover:text-black">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {filters.source && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-[#cc2727]/10 text-[#cc2727] border border-[#cc2727]/20">
                    <span>Channel: {filters.source}</span>
                    <button type="button" onClick={() => updateFilter("source", "")} className="hover:text-black">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {filters.leadSource && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-[#cc2727]/10 text-[#cc2727] border border-[#cc2727]/20">
                    <span>Source/UTM: {filters.leadSource}</span>
                    <button type="button" onClick={() => updateFilter("leadSource", "")} className="hover:text-black">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {(filters.subStatus || filters.subDispositions) && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-[#cc2727]/10 text-[#cc2727] border border-[#cc2727]/20">
                    <span>Sub Status: {filters.subStatus || filters.subDispositions}</span>
                    <button
                      type="button"
                      onClick={() => {
                        updateFilter("subStatus", "");
                        updateFilter("subDispositions", "");
                      }}
                      className="hover:text-black"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {(filters.leadStage || filters.dispositions) && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-[#cc2727]/10 text-[#cc2727] border border-[#cc2727]/20">
                    <span>Stage: {filters.leadStage || filters.dispositions}</span>
                    <button
                      type="button"
                      onClick={() => {
                        updateFilter("leadStage", "");
                        updateFilter("dispositions", "");
                      }}
                      className="hover:text-black"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {(filters.leadValidStatus || filters.validStatus) && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-[#cc2727]/10 text-[#cc2727] border border-[#cc2727]/20">
                    <span>Valid: {filters.leadValidStatus || filters.validStatus}</span>
                    <button
                      type="button"
                      onClick={() => {
                        updateFilter("leadValidStatus", "");
                        updateFilter("validStatus", "");
                      }}
                      className="hover:text-black"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {(filters.followUpDateFrom || filters.followUpDateTo) && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-[#cc2727]/10 text-[#cc2727] border border-[#cc2727]/20">
                    <span>Follow Up: {filters.followUpDateFrom || "Start"} to {filters.followUpDateTo || "End"}</span>
                    <button
                      type="button"
                      onClick={() => {
                        updateFilter("followUpDateFrom", "");
                        updateFilter("followUpDateTo", "");
                      }}
                      className="hover:text-black"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {(filters.appointmentDateFrom || filters.appointmentDateTo) && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-[#cc2727]/10 text-[#cc2727] border border-[#cc2727]/20">
                    <span>Appt: {filters.appointmentDateFrom || "Start"} to {filters.appointmentDateTo || "End"}</span>
                    <button
                      type="button"
                      onClick={() => {
                        updateFilter("appointmentDateFrom", "");
                        updateFilter("appointmentDateTo", "");
                      }}
                      className="hover:text-black"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {(filters.centreVisitedDateFrom || filters.centreVisitedDateTo) && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-[#cc2727]/10 text-[#cc2727] border border-[#cc2727]/20">
                    <span>Centre Visited: {filters.centreVisitedDateFrom || "Start"} to {filters.centreVisitedDateTo || "End"}</span>
                    <button
                      type="button"
                      onClick={() => {
                        updateFilter("centreVisitedDateFrom", "");
                        updateFilter("centreVisitedDateTo", "");
                      }}
                      className="hover:text-black"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {(filters.campVisitedDateFrom || filters.campVisitedDateTo) && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-[#cc2727]/10 text-[#cc2727] border border-[#cc2727]/20">
                    <span>Camp Visited: {filters.campVisitedDateFrom || "Start"} to {filters.campVisitedDateTo || "End"}</span>
                    <button
                      type="button"
                      onClick={() => {
                        updateFilter("campVisitedDateFrom", "");
                        updateFilter("campVisitedDateTo", "");
                      }}
                      className="hover:text-black"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {(filters.leadScoreMin || filters.leadScoreMax) && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-[#cc2727]/10 text-[#cc2727] border border-[#cc2727]/20">
                    <span>Lead Score: {filters.leadScoreMin || "0"} - {filters.leadScoreMax || "100"}</span>
                    <button
                      type="button"
                      onClick={() => {
                        updateFilter("leadScoreMin", "");
                        updateFilter("leadScoreMax", "");
                      }}
                      className="hover:text-black"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {filters.registrationStatus && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-[#cc2727]/10 text-[#cc2727] border border-[#cc2727]/20">
                    <span>Registered: {filters.registrationStatus}</span>
                    <button type="button" onClick={() => updateFilter("registrationStatus", "")} className="hover:text-black">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {filters.ptCity && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-[#cc2727]/10 text-[#cc2727] border border-[#cc2727]/20">
                    <span>City: {filters.ptCity}</span>
                    <button type="button" onClick={() => updateFilter("ptCity", "")} className="hover:text-black">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {filters.ptState && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-[#cc2727]/10 text-[#cc2727] border border-[#cc2727]/20">
                    <span>State: {filters.ptState}</span>
                    <button type="button" onClick={() => updateFilter("ptState", "")} className="hover:text-black">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {filters.whenPlanningToStartTreatment && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-[#cc2727]/10 text-[#cc2727] border border-[#cc2727]/20">
                    <span>Planning: {filters.whenPlanningToStartTreatment}</span>
                    <button type="button" onClick={() => updateFilter("whenPlanningToStartTreatment", "")} className="hover:text-black">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {filters.quickMetricFilter && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-[#cc2727]/10 text-[#cc2727] border border-[#cc2727]/20">
                    <span>Filter: {filters.quickMetricFilter === "follow_up" ? "Follow Up Scheduled" : "Unassigned Leads"}</span>
                    <button type="button" onClick={() => updateFilter("quickMetricFilter", "")} className="hover:text-black">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="text-xs text-rose-500 hover:text-rose-700 font-bold underline ml-1 cursor-pointer"
                >
                  Clear all
                </button>
              </div>
            )}
          </div>

          {/* Leads Table Container */}
          <div className="flex-1 flex flex-col min-h-0 bg-white border-t border-x border-slate-200 rounded-t-2xl shadow-sm overflow-hidden relative">
            

            {filteredLeads.length === 0 ? (
              <div className="py-16 text-center">
                <FolderKanban className="w-12 h-12 text-black mx-auto mb-3" />
                <h3 className="text-base font-semibold text-black">
                  No leads found
                </h3>
                <p className="text-xs text-gray-600 max-w-sm mx-auto mt-1 mb-5">
                  {searchQuery
                    ? "No leads matched your search query."
                    : 'Click "Add Lead" to register your first patient lead.'}
                </p>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#cc2727]/20 text-[#cc2727] border border-[#cc2727]/30 rounded-xl text-xs font-semibold hover:bg-[#cc2727]/30 transition-all"
                >
                  <UserPlus className="w-4 h-4" />
                  Add Lead
                </button>
              </div>
            ) : (
              <div ref={tableScrollRef} className="flex-1 overflow-auto min-h-0">
                <table className="w-full text-left text-xs text-black whitespace-nowrap">
                  <thead className="bg-slate-50 text-black uppercase tracking-wider border-b border-slate-200 text-[11px] sticky top-0 z-20 shadow-sm">
                    <tr>
                      {/* 1. Unique ID */}
                      <th scope="col" className="px-4 py-3.5 font-semibold sticky top-0 left-0 bg-white z-30 shadow-[2px_0_5px_rgba(0,0,0,0.5)]">
                        Lead ID
                      </th>

                      {/* Dynamic Ordered Column Headers */}
                      {orderedColumns.map((colId) => {
                        const colDef = TABLE_COLUMNS.find((c) => c.id === colId);
                        return (
                          <th
                            key={colId}
                            scope="col"
                            className="px-4 py-3.5 font-semibold sticky top-0 bg-white z-20"
                          >
                            <span>{colDef?.label || colId}</span>
                          </th>
                        );
                      })}

                      {/* Action */}
                      <th scope="col" className="px-4 py-3.5 font-semibold text-right sticky top-0 right-0 bg-white z-30 shadow-[-2px_0_5px_rgba(0,0,0,0.5)]">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedLeads.map((lead) => {
                      const leadId = lead.uniqueId || lead._id;
                      const isHighlighted = highlightedLeadId === leadId;
                      return (
                      <tr
                        key={lead._id || lead.uniqueId}
                        id={`lead-row-${leadId}`}
                        onClick={() => handleOpenLead(lead)}
                        className={`cursor-pointer transition-colors group ${
                          isHighlighted
                            ? "bg-amber-100/70 hover:bg-amber-100 font-medium ring-1 ring-inset ring-amber-400"
                            : "hover:bg-slate-100/60"
                        }`}
                      >
                        {/* 1. Unique ID (Sticky Left) */}
                        <td className="px-4 py-3.5 sticky left-0 bg-white group-hover:bg-slate-100/90 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.5)]">
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#cc2727]/10 text-[#cc2727] border border-[#cc2727]/20 text-xs font-mono font-bold">
                            {lead.uniqueId || "N/A"}
                          </div>
                        </td>

                        {/* Dynamic Ordered & Pinned Column Cells */}
                        {orderedColumns.map((colId) => (
                          renderLeadTableCell({ colId, lead, leadId })
                        ))}

                        {/* Action Column (Sticky Right) */}
                        <td className="px-4 py-3.5 text-right sticky right-0 bg-white group-hover:bg-slate-100/90 z-10 shadow-[-2px_0_5px_rgba(0,0,0,0.5)]">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenLead(lead);
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-[#cc2727]/10 hover:bg-[#cc2727]/20 text-[#cc2727] hover:text-black border border-[#cc2727]/20 text-xs font-medium transition-colors flex items-center gap-1"
                            >
                              <span>View / Edit</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {filteredLeads.length > pageSize && (
              <div className="shrink-0 flex items-center justify-between px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-black shadow-xs">
                <span className="text-gray-500">
                  Showing <strong className="text-black">{((currentPage - 1) * pageSize) + 1}</strong> - <strong className="text-black">{Math.min(currentPage * pageSize, filteredLeads.length)}</strong> of <strong className="text-black">{filteredLeads.length}</strong> leads
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentPage((p) => Math.max(1, p - 1));
                      if (tableScrollRef.current) tableScrollRef.current.scrollTop = 0;
                    }}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed text-black cursor-pointer transition-colors"
                    title="Previous page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="px-2.5 py-1 rounded-md bg-slate-100 font-mono text-[11px]">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentPage((p) => Math.min(totalPages, p + 1));
                      if (tableScrollRef.current) tableScrollRef.current.scrollTop = 0;
                    }}
                    disabled={currentPage >= totalPages}
                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed text-black cursor-pointer transition-colors"
                    title="Next page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
        <Footer />
      </div>

      {/* Add Lead Modal */}
      <AddLeadModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onLeadAdded={handleLeadAdded}
        suggestedUniqueId={nextUniqueId}
        existingLeads={leads}
        defaultCallerName={user?.name || ""}
      />
    
      {/* Manage Columns LeadSquared Modal */}
      <ManageColumnsModal
        isOpen={isManageColumnsModalOpen}
        onClose={() => setIsManageColumnsModalOpen(false)}
        allColumns={TABLE_COLUMNS}
        visibleColumns={visibleColumns}
        columnOrder={columnOrder}
        pinnedColumns={pinnedColumns}
        onApply={handleApplyColumns}
        onRestoreDefault={handleRestoreDefaultColumns}
      />
    </div>
  );
}
