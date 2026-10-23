"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import AdminSidebar from "@/app/components/AdminSidebar";
import MarketingSidebar from "@/app/components/MarketingSidebar";
import Footer from "@/app/components/Footer";
import InfoTooltip from "@/app/components/InfoTooltip";
import {
  Share2,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileText,
  Sliders,
  Plus,
  Trash2,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
  Info,
  Clock,
  Briefcase,
  Megaphone,
  ChevronDown,
  ChevronUp,
  Layers,
  HelpCircle,
  BookOpen,
} from "lucide-react";

// Inline clean SVG for Facebook logo
function FacebookIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

interface SetupConfig {
  _id: string;
  integrationName: string;
  leadSource: "Meta Instant Form" | "Facebook Lead Ads" | "Instagram Lead Ads";
  metaUserId?: string;
  metaUserName?: string;
  adAccountId?: string;
  adAccountName?: string;
  pageId: string;
  pageName: string;
  formId: string;
  formName: string;
  campaignName?: string;
  campaignId?: string;
  adId?: string;
  adName?: string;
  autoSync: boolean;
  fieldMappings: Array<{ crmField: string; formFieldKey: string }>;
  status: "draft" | "active" | "paused" | "error";
  lastVerifiedAt?: string;
  lastSyncAt?: string;
  lastError?: string;
  createdAt: string;
}

interface MetaAccount {
  metaUserId: string;
  metaUserName: string;
  connectedEmail: string;
  status: "active" | "expired" | "revoked";
  adAccounts?: Array<{
    id: string;
    name: string;
    currency?: string;
    timezone_name?: string;
    account_status?: number;
  }>;
  selectedAdAccountId?: string;
  lastSyncAt?: string;
}

interface AdAccount {
  id: string;
  name: string;
  currency?: string;
  timezone_name?: string;
  account_status?: number;
}

interface Campaign {
  id: string;
  name: string;
  status: string;
  objective?: string;
  created_time?: string;
}

interface MetaPage {
  _id: string;
  pageId: string;
  pageName: string;
  status: "active" | "inactive" | "revoked";
  isSubscribed: boolean;
  subscribedAt?: string;
  lastLeadReceivedAt?: string;
  connectedBy?: string;
  selectedForms?: string[];
  createdAt?: string;
}

interface InstantForm {
  id: string;
  name: string;
  status: string;
  leads_count?: number;
  created_time?: string;
}

interface WebhookEvent {
  _id: string;
  leadgenId: string;
  pageId: string;
  formId?: string;
  status: string;
  retryCount: number;
  lastError?: string;
  createdAt: string;
}

export default function UnifiedMetaAdsIntegrationPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [connecting, setConnecting] = useState(false);

  // Active navigation tab on page
  const [activeTab, setActiveTab] = useState<"configure" | "discovery" | "telemetry" | "help">("configure");

  // Meta Account & Discovery
  const [account, setAccount] = useState<MetaAccount | null>(null);
  const [adAccounts, setAdAccounts] = useState<AdAccount[]>([]);
  const [selectedAdAccountId, setSelectedAdAccountId] = useState<string>("");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [campaignError, setCampaignError] = useState<string>("");

  const [pages, setPages] = useState<MetaPage[]>([]);
  const [formsMap, setFormsMap] = useState<Record<string, InstantForm[]>>({});
  const [loadingFormsMap, setLoadingFormsMap] = useState<Record<string, boolean>>({});
  const [expandedPages, setExpandedPages] = useState<Record<string, boolean>>({});
  const [updatingSync, setUpdatingSync] = useState<Record<string, boolean>>({});
  const [events, setEvents] = useState<WebhookEvent[]>([]);

  // Setups Configuration
  const [setups, setSetups] = useState<SetupConfig[]>([]);
  const [editingSetupId, setEditingSetupId] = useState<string | null>(null);

  // Form Configuration State
  const [integrationName, setIntegrationName] = useState("");
  const [leadSource, setLeadSource] = useState<
    "Meta Instant Form" | "Facebook Lead Ads" | "Instagram Lead Ads"
  >("Meta Instant Form");
  const [manualAdAccountId, setManualAdAccountId] = useState("");
  const [selectedPageId, setSelectedPageId] = useState("");
  const [manualPageId, setManualPageId] = useState("");
  const [pageName, setPageName] = useState("");
  const [selectedFormId, setSelectedFormId] = useState("");
  const [manualFormId, setManualFormId] = useState("");
  const [formName, setFormName] = useState("");
  const [campaignName, setCampaignName] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [adId, setAdId] = useState("");
  const [adName, setAdName] = useState("");
  const [autoSync, setAutoSync] = useState(true);

  // Field mappings
  const [fieldMappings, setFieldMappings] = useState<
    Array<{ crmField: string; formFieldKey: string }>
  >([
    { crmField: "patientName", formFieldKey: "full_name" },
    { crmField: "mobileNumber", formFieldKey: "phone_number" },
    { crmField: "location", formFieldKey: "city" },
    { crmField: "email", formFieldKey: "email" },
  ]);

  // Actions state
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  // Modals
  const [disconnectModal, setDisconnectModal] = useState<{
    open: boolean;
    type: "account" | "page";
    target: any;
  }>({
    open: false,
    type: "account",
    target: null,
  });

  // 1. Initial Load of Auth, Account, Pages, Events & Setups
  const fetchAllData = useCallback(async (isSilent = false) => {
    if (!isSilent) setRefreshing(true);
    try {
      const authRes = await fetch("/api/auth/me");
      if (!authRes.ok) {
        router.push("/admin/login");
        return;
      }
      const authData = await authRes.json();
      const user = authData?.user;
      if (!user || (user.role !== "admin" && user.role !== "marketing")) {
        router.push("/admin/login");
        return;
      }
      setCurrentUser(user);

      // Fetch Account, Pages, Events, and Setups concurrently
      const [accRes, pagesRes, eventsRes, setupsRes] = await Promise.all([
        fetch("/api/integrations/meta/account", { cache: "no-store" }),
        fetch("/api/integrations/meta/pages", { cache: "no-store" }),
        fetch("/api/integrations/meta/events?limit=30", { cache: "no-store" }),
        fetch("/api/integrations/meta/setup", { cache: "no-store" }),
      ]);

      let loadedAccount: MetaAccount | null = null;
      if (accRes.ok) {
        const accData = await accRes.json();
        loadedAccount = accData?.account || null;
        setAccount(loadedAccount);
        if (loadedAccount?.adAccounts && loadedAccount.adAccounts.length > 0) {
          setAdAccounts(loadedAccount.adAccounts);
          const initialAdId = loadedAccount.selectedAdAccountId || loadedAccount.adAccounts[0].id;
          setSelectedAdAccountId(initialAdId);
        }
      }

      if (pagesRes.ok) {
        const pagesData = await pagesRes.json();
        setPages(Array.isArray(pagesData?.pages) ? pagesData.pages : []);
      }

      if (eventsRes.ok) {
        const eventsData = await eventsRes.json();
        setEvents(Array.isArray(eventsData?.events) ? eventsData.events : []);
      }

      if (setupsRes.ok) {
        const setupsData = await setupsRes.json();
        setSetups(Array.isArray(setupsData?.setups) ? setupsData.setups : []);
      }

      if (loadedAccount?.adAccounts && loadedAccount.adAccounts.length > 0) {
        const targetAdId = loadedAccount.selectedAdAccountId || loadedAccount.adAccounts[0].id;
        loadCampaignsForAccount(targetAdId);
      }
    } catch (err: any) {
      console.error("[Meta Integration] Load error:", err);
      setStatusMessage({
        type: "error",
        text: "Failed to load integration data: " + (err.message || "Unknown error"),
      });
    } finally {
      setLoading(false);
      if (!isSilent) setRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Load campaigns for selected ad account
  const loadCampaignsForAccount = async (adAccountId: string) => {
    if (!adAccountId) return;
    setLoadingCampaigns(true);
    setCampaignError("");
    try {
      const res = await fetch(
        `/api/integrations/meta/campaigns?adAccountId=${encodeURIComponent(adAccountId)}`,
        { cache: "no-store" }
      );
      const data = await res.json();
      if (res.ok) {
        setCampaigns(Array.isArray(data?.campaigns) ? data.campaigns : []);
      } else {
        setCampaignError(
          data?.error || "Requires 'ads_read' permission or verified Meta Marketing API access."
        );
        setCampaigns([]);
      }
    } catch (err: any) {
      setCampaignError(err.message || "Network error loading campaigns");
      setCampaigns([]);
    } finally {
      setLoadingCampaigns(false);
    }
  };

  // Start Meta OAuth
  const handleConnectOAuth = async () => {
    setConnecting(true);
    try {
      const res = await fetch("/api/integrations/meta/oauth/start");
      const data = await res.json();
      if (!res.ok || !data?.authUrl) {
        throw new Error(data?.error || "Failed to generate authorization URL");
      }
      window.location.href = data.authUrl;
    } catch (err: any) {
      console.error("[Meta OAuth] Launch error:", err);
      setStatusMessage({
        type: "error",
        text: err.message || "Could not launch Facebook Login.",
      });
      setConnecting(false);
    }
  };

  // Toggle page accordion & load forms
  const togglePageAccordion = async (pageId: string) => {
    const nextState = !expandedPages[pageId];
    setExpandedPages((prev) => ({ ...prev, [pageId]: nextState }));

    if (nextState && !formsMap[pageId]) {
      setLoadingFormsMap((prev) => ({ ...prev, [pageId]: true }));
      try {
        const res = await fetch(`/api/integrations/meta/pages/${pageId}/forms`, {
          cache: "no-store",
        });
        const data = await res.json();
        if (res.ok) {
          setFormsMap((prev) => ({
            ...prev,
            [pageId]: Array.isArray(data?.forms) ? data.forms : [],
          }));
        }
      } catch (err) {
        console.error("Failed to load forms for page:", err);
      } finally {
        setLoadingFormsMap((prev) => ({ ...prev, [pageId]: false }));
      }
    }
  };

  // Toggle selective form sync
  const handleToggleFormSync = async (page: MetaPage, formId: string) => {
    setUpdatingSync((prev) => ({ ...prev, [formId]: true }));
    try {
      const currentSelected = Array.isArray(page.selectedForms) ? [...page.selectedForms] : [];
      let updatedForms: string[];

      if (currentSelected.includes(formId)) {
        updatedForms = currentSelected.filter((id) => id !== formId);
      } else {
        updatedForms = [...currentSelected, formId];
      }

      const res = await fetch(`/api/integrations/meta/pages/${page.pageId}/forms/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formIds: updatedForms }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update form sync settings");
      }

      setPages((prev) =>
        prev.map((p) => (p.pageId === page.pageId ? { ...p, selectedForms: updatedForms } : p))
      );
      setStatusMessage({
        type: "success",
        text: `Form sync preferences updated for "${page.pageName}".`,
      });
    } catch (err: any) {
      setStatusMessage({
        type: "error",
        text: err.message || "Failed to update form sync",
      });
    } finally {
      setUpdatingSync((prev) => ({ ...prev, [formId]: false }));
    }
  };

  // Disconnect Confirmation
  const handleConfirmDisconnect = async () => {
    try {
      if (disconnectModal.type === "account") {
        const res = await fetch("/api/integrations/meta/disconnect-account", { method: "POST" });
        if (!res.ok) throw new Error("Failed to disconnect Meta account");
        setStatusMessage({
          type: "info",
          text: "Meta Account disconnected. Stored leads and connection configurations are preserved.",
        });
      } else if (disconnectModal.type === "page" && disconnectModal.target?.pageId) {
        const pageId = disconnectModal.target.pageId;
        const res = await fetch(`/api/integrations/meta/pages/${pageId}`, { method: "DELETE" });
        if (!res.ok) throw new Error(`Failed to disconnect page ${pageId}`);
        setStatusMessage({
          type: "info",
          text: `Page "${disconnectModal.target.pageName}" disconnected. Historical leads preserved.`,
        });
      }
      setDisconnectModal({ open: false, type: "account", target: null });
      fetchAllData(true);
    } catch (err: any) {
      setStatusMessage({
        type: "error",
        text: err.message || "Could not complete disconnect",
      });
    }
  };

  // When Page selected in manual setup form, fetch forms
  const handlePageSelectForSetup = async (pId: string) => {
    setSelectedPageId(pId);
    setManualPageId("");
    setSelectedFormId("");
    setManualFormId("");

    const pageObj = pages.find((p) => p.pageId === pId);
    if (pageObj) {
      setPageName(pageObj.pageName);
    }

    if (!pId) return;

    if (!formsMap[pId]) {
      setLoadingFormsMap((prev) => ({ ...prev, [pId]: true }));
      try {
        const res = await fetch(`/api/integrations/meta/pages/${pId}/forms`, {
          cache: "no-store",
        });
        const data = await res.json();
        if (res.ok && Array.isArray(data?.forms)) {
          setFormsMap((prev) => ({ ...prev, [pId]: data.forms }));
        }
      } catch {
        // ignore
      } finally {
        setLoadingFormsMap((prev) => ({ ...prev, [pId]: false }));
      }
    }
  };

  // Field mapping handlers
  const addFieldMapping = () => {
    setFieldMappings([...fieldMappings, { crmField: "", formFieldKey: "" }]);
  };

  const removeFieldMapping = (index: number) => {
    setFieldMappings(fieldMappings.filter((_, i) => i !== index));
  };

  const updateFieldMapping = (index: number, key: "crmField" | "formFieldKey", value: string) => {
    const updated = [...fieldMappings];
    updated[index][key] = value;
    setFieldMappings(updated);
  };

  // Validate Details
  const handleValidateDetails = async () => {
    const targetPageId = selectedPageId || manualPageId.trim();
    const targetFormId = selectedFormId || manualFormId.trim();

    if (!targetPageId) {
      setStatusMessage({
        type: "error",
        text: "Please select or enter a Facebook Page ID to validate.",
      });
      return;
    }

    setValidating(true);
    setValidationResult(null);
    setStatusMessage(null);

    try {
      const res = await fetch("/api/integrations/meta/setup/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageId: targetPageId,
          formId: targetFormId || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setValidationResult(data);
        if (data.page?.name) setPageName(data.page.name);
        if (data.form?.name) setFormName(data.form.name);
        setStatusMessage({
          type: "success",
          text: `Page '${data.page?.name || targetPageId}' validated successfully.${
            data.form ? ` Form '${data.form.name}' verified.` : ""
          }`,
        });
      } else {
        setStatusMessage({
          type: "error",
          text: data.error || "Validation failed: This form does not belong to the selected Page.",
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: "error",
        text: err.message || "Network error validating details.",
      });
    } finally {
      setValidating(false);
    }
  };

  // Save Configuration
  const handleSaveConfiguration = async () => {
    const targetPageId = selectedPageId || manualPageId.trim();
    const targetFormId = selectedFormId || manualFormId.trim();
    const targetAdAccountId = selectedAdAccountId || manualAdAccountId.trim();

    if (!integrationName.trim()) {
      setStatusMessage({ type: "error", text: "Integration Name is required." });
      return;
    }
    if (!targetPageId) {
      setStatusMessage({ type: "error", text: "Facebook Page ID is required." });
      return;
    }
    if (!targetFormId) {
      setStatusMessage({ type: "error", text: "Instant Form ID is required." });
      return;
    }

    setSaving(true);
    setStatusMessage(null);

    try {
      const payload = {
        id: editingSetupId || undefined,
        integrationName: integrationName.trim(),
        leadSource,
        metaUserId: account?.metaUserId,
        metaUserName: account?.metaUserName,
        adAccountId: targetAdAccountId,
        adAccountName:
          adAccounts.find((a) => a.id === targetAdAccountId)?.name || targetAdAccountId,
        pageId: targetPageId,
        pageName: pageName || `Page (${targetPageId})`,
        formId: targetFormId,
        formName: formName || `Form (${targetFormId})`,
        campaignName: campaignName.trim() || undefined,
        campaignId: campaignId.trim() || undefined,
        adId: adId.trim() || undefined,
        adName: adName.trim() || undefined,
        autoSync,
        fieldMappings: fieldMappings.filter((m) => m.crmField.trim() && m.formFieldKey.trim()),
      };

      const res = await fetch("/api/integrations/meta/setup/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMessage({
          type: "success",
          text: `Setup configuration '${integrationName}' saved successfully!`,
        });
        setEditingSetupId(null);
        fetchAllData(true);
      } else {
        setStatusMessage({
          type: "error",
          text: data.error || "Failed to save configuration.",
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: "error",
        text: err.message || "Network error while saving setup.",
      });
    } finally {
      setSaving(false);
    }
  };

  // Test Connection
  const handleTestConnection = async (setupId: string) => {
    setTestingId(setupId);
    setStatusMessage(null);
    try {
      const res = await fetch(`/api/integrations/meta/setup/${setupId}/test`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMessage({
          type: "success",
          text: `Connection test passed: Page authorization verified, Webhook is ${
            data.details?.webhookSubscribed ? "subscribed" : "ready"
          }.`,
        });
        fetchAllData(true);
      } else {
        setStatusMessage({
          type: "error",
          text: data.error || "Connection test failed.",
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: "error",
        text: err.message || "Network error during connection test.",
      });
    } finally {
      setTestingId(null);
    }
  };

  // Edit existing setup
  const handleEditSetup = (s: SetupConfig) => {
    setEditingSetupId(s._id);
    setIntegrationName(s.integrationName);
    setLeadSource(s.leadSource);
    setSelectedPageId(s.pageId);
    setPageName(s.pageName);
    setSelectedFormId(s.formId);
    setFormName(s.formName);
    if (s.adAccountId) setSelectedAdAccountId(s.adAccountId);
    if (s.campaignName) setCampaignName(s.campaignName);
    if (s.campaignId) setCampaignId(s.campaignId);
    if (s.adId) setAdId(s.adId);
    if (s.adName) setAdName(s.adName);
    setAutoSync(s.autoSync);
    if (Array.isArray(s.fieldMappings) && s.fieldMappings.length > 0) {
      setFieldMappings(s.fieldMappings);
    }
    setActiveTab("configure");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Delete setup
  const handleDeleteSetup = async (setupId: string, name: string) => {
    if (
      !confirm(
        `Are you sure you want to remove setup '${name}'? Existing leads and events will be preserved.`
      )
    ) {
      return;
    }
    try {
      const res = await fetch(`/api/integrations/meta/setup/${setupId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setStatusMessage({
          type: "info",
          text: `Setup '${name}' removed.`,
        });
        fetchAllData(true);
      }
    } catch (err: any) {
      setStatusMessage({
        type: "error",
        text: err.message || "Failed to delete setup.",
      });
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      router.push(currentUser?.role === "marketing" ? "/marketing/login" : "/admin/login");
    }
  };

  // Telemetry metrics
  const totalEvents = events.length;
  const processedCount = events.filter((e) => e.status === "processed").length;
  const duplicatePhoneCount = events.filter((e) => e.status === "skipped_duplicate_phone").length;
  const alreadyExistsCount = events.filter((e) => e.status === "already_exists").length;
  const failedEvents = events.filter((e) => e.status === "failed");
  const lastEvent = events[0];

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {currentUser?.role === "marketing" ? (
        <MarketingSidebar user={currentUser} onLogout={handleLogout} />
      ) : (
        <AdminSidebar user={currentUser} onLogout={handleLogout} />
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 sticky top-0 z-20 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-slate-900 leading-tight">
                  Meta Ads Integration
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold">
                  Unified Tab
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Connect your Meta account, select your Page and Instant Form, and configure automatic lead syncing.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => fetchAllData(false)}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>

            <button
              onClick={handleConnectOAuth}
              disabled={connecting}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-xl bg-[#1877F2] hover:bg-[#166fe5] text-white text-xs font-semibold shadow-sm transition-all shadow-blue-500/20 disabled:opacity-50"
            >
              <FacebookIcon className="w-4 h-4" />
              <span>
                {connecting
                  ? "Connecting..."
                  : account
                  ? "Reconnect Meta Account"
                  : "Connect Meta Account"}
              </span>
            </button>
          </div>
        </header>

        {/* Feedback Alert Banner */}
        {statusMessage && (
          <div
            className={`mx-6 mt-4 px-4 py-3 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all shadow-sm ${
              statusMessage.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : statusMessage.type === "error"
                ? "bg-rose-50 border-rose-200 text-rose-800"
                : "bg-blue-50 border-blue-200 text-blue-800"
            }`}
          >
            <div className="flex items-center gap-2">
              {statusMessage.type === "success" && <CheckCircle2 className="w-4 h-4 shrink-0" />}
              {statusMessage.type === "error" && <XCircle className="w-4 h-4 shrink-0" />}
              {statusMessage.type === "info" && <Info className="w-4 h-4 shrink-0" />}
              <span>{statusMessage.text}</span>
            </div>
            <button
              onClick={() => setStatusMessage(null)}
              className="text-slate-400 hover:text-slate-600 font-bold px-1"
            >
              ✕
            </button>
          </div>
        )}

        {/* Main Content Body */}
        <main className="p-6 space-y-6 flex-1 max-w-7xl w-full mx-auto">
          {/* Navigation Sub-Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
            <button
              onClick={() => setActiveTab("configure")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === "configure"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Configure Instant Forms</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-700 text-slate-200">
                {setups.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("discovery")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === "discovery"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Discovered Pages & Ad Accounts</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700">
                {pages.length} Pages
              </span>
            </button>

            <button
              onClick={() => setActiveTab("telemetry")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === "telemetry"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Sync Activity & Telemetry</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700">
                {events.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("help")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ml-auto ${
                activeTab === "help"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200"
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Meta Field Help Guide</span>
            </button>
          </div>

          {/* ========================================================================= */}
          {/* TAB 1: CONFIGURE INSTANT FORMS (Manual Setup & Field Mapping) */}
          {/* ========================================================================= */}
          {activeTab === "configure" && (
            <div className="space-y-6">
              {/* Introduction Card */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50/50 rounded-2xl border border-blue-100 p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">
                      Connect & Map Meta Instant Forms to SOI CRM
                    </h2>
                    <p className="text-xs text-slate-600 mt-1">
                      Connect your Meta account, select your Page and Instant Form, and configure automatic lead syncing.
                      Hover or tap any <span className="font-semibold text-blue-600">ⓘ</span> icon for step-by-step guidance on finding IDs in Meta.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`px-2.5 py-1 rounded-md text-xs font-bold ${
                        account?.status === "active"
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                          : "bg-amber-100 text-amber-800 border border-amber-200"
                      }`}
                    >
                      {account?.status === "active"
                        ? `Meta: ${account.metaUserName || "Authorized"}`
                        : "Meta Account Not Connected"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Main Setup Form Card */}
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6 space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <Sliders className="w-5 h-5 text-[#cc2727]" />
                      <span>{editingSetupId ? "Edit Form Sync Configuration" : "New Instant Form Sync Setup"}</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Configure lead routing, auto-sync rules, and custom question-to-lead field mappings.
                    </p>
                  </div>

                  {editingSetupId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingSetupId(null);
                        setIntegrationName("");
                        setSelectedFormId("");
                        setManualFormId("");
                      }}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
                    >
                      Cancel Editing
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Field 1: Integration Name */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <label className="text-xs font-bold text-slate-700">
                        Integration Name <span className="text-rose-500">*</span>
                      </label>
                      <InfoTooltip
                        title="Integration Name"
                        meaning="A friendly, descriptive title to identify this specific lead campaign in the CRM."
                        howToFind="You can choose any name you like (e.g. 'Patna Summer IVF Campaign 2026') to distinguish this configuration from others."
                        sourceType="manual"
                        example="Delhi Free Fertility Camp"
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="e.g. Patna Summer IVF Campaign"
                      value={integrationName}
                      onChange={(e) => setIntegrationName(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#cc2727]/20 focus:border-[#cc2727]"
                    />
                    <span className="text-[11px] text-slate-400">
                      A unique descriptive title for identifying this campaign configuration.
                    </span>
                  </div>

                  {/* Field 2: Lead Source */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <label className="text-xs font-bold text-slate-700">
                        Lead Source <span className="text-rose-500">*</span>
                      </label>
                      <InfoTooltip
                        title="Lead Source"
                        meaning="The primary lead source tag that will be assigned to incoming leads in the CRM table."
                        howToFind="Select the exact channel where your ads are being served (Meta Instant Form, Facebook Lead Ads, or Instagram Lead Ads)."
                        sourceType="manual"
                        example="Meta Instant Form"
                      />
                    </div>
                    <select
                      value={leadSource}
                      onChange={(e) => setLeadSource(e.target.value as any)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#cc2727]/20 focus:border-[#cc2727] bg-white"
                    >
                      <option value="Meta Instant Form">Meta Instant Form</option>
                      <option value="Facebook Lead Ads">Facebook Lead Ads</option>
                      <option value="Instagram Lead Ads">Instagram Lead Ads</option>
                    </select>
                    <span className="text-[11px] text-slate-400">
                      The primary source attribution stored on CRM lead records.
                    </span>
                  </div>

                  {/* Field 3: Meta Account */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <label className="text-xs font-bold text-slate-700">Meta Account</label>
                      <InfoTooltip
                        title="Meta Account"
                        meaning="The authorized Facebook identity that grants the CRM permission to access your Pages and lead ads."
                        howToFind="Click Connect Meta Account and log in using the authorized Facebook account. Grant the requested permissions. You normally only need to connect the account once."
                        sourceType="auto"
                        example={account?.connectedEmail || "marketing@example.com"}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        disabled
                        value={
                          account
                            ? `${account.metaUserName} (${account.connectedEmail})`
                            : "No account connected via OAuth"
                        }
                        className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-600"
                      />
                      {!account && (
                        <button
                          type="button"
                          onClick={handleConnectOAuth}
                          className="px-3 py-2 text-xs font-medium text-[#1877f2] bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 whitespace-nowrap"
                        >
                          Connect
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Field 4: Ad Account */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <label className="text-xs font-bold text-slate-700">
                        Ad Account (Select or Enter Manual ID)
                      </label>
                      <InfoTooltip
                        title="Ad Account ID"
                        meaning="The Meta Advertising Account running your campaign and ads."
                        howToFind="Open Meta Ads Manager. Use the account selector to choose the correct ad account. If the account is not listed, ask the Meta Business administrator to grant you access. Find the ad account in Meta Ads Manager or Business Settings → Accounts → Ad Accounts. Copy its numeric ID. Do not enter the Page ID here."
                        sourceType="both"
                        example="act_101241015968987"
                      />
                    </div>
                    {adAccounts.length > 0 ? (
                      <div className="space-y-1.5">
                        <select
                          value={selectedAdAccountId}
                          onChange={(e) => {
                            setSelectedAdAccountId(e.target.value);
                            setManualAdAccountId("");
                            loadCampaignsForAccount(e.target.value);
                          }}
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#cc2727]/20 focus:border-[#cc2727] bg-white"
                        >
                          <option value="">-- Choose Ad Account --</option>
                          {adAccounts.map((act) => (
                            <option key={act.id} value={act.id}>
                              {act.name} ({act.id})
                            </option>
                          ))}
                        </select>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-400">or enter manual ID:</span>
                          <input
                            type="text"
                            placeholder="act_123456789012"
                            value={manualAdAccountId}
                            onChange={(e) => {
                              setManualAdAccountId(e.target.value);
                              setSelectedAdAccountId("");
                            }}
                            className="flex-1 px-2.5 py-1 text-xs border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-[#cc2727]"
                          />
                        </div>
                      </div>
                    ) : (
                      <input
                        type="text"
                        placeholder="e.g. act_123456789012"
                        value={manualAdAccountId}
                        onChange={(e) => setManualAdAccountId(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#cc2727]/20 focus:border-[#cc2727]"
                      />
                    )}
                    <span className="text-[11px] text-slate-400">
                      Prefer selecting the account from the dropdown; enter an ID manually only when necessary.
                    </span>
                  </div>

                  {/* Field 5: Facebook Page */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <label className="text-xs font-bold text-slate-700">
                        Facebook Page <span className="text-rose-500">*</span>
                      </label>
                      <InfoTooltip
                        title="Facebook Page / Page ID"
                        meaning="The Facebook Page that owns and runs the Lead Ads."
                        howToFind="Select the Facebook Page associated with the campaign from the available Pages list. If missing, verify that the connected Facebook account has access to that Page. For manual ID, open the Facebook Page, go to Page transparency or About, and copy the numeric Page ID. If the Page dropdown is available, select the Page instead of entering the ID manually."
                        sourceType="both"
                        example="101241015968987"
                      />
                    </div>
                    {pages.length > 0 ? (
                      <div className="space-y-1.5">
                        <select
                          value={selectedPageId}
                          onChange={(e) => handlePageSelectForSetup(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#cc2727]/20 focus:border-[#cc2727] bg-white"
                        >
                          <option value="">-- Select Discovered Page --</option>
                          {pages.map((p) => (
                            <option key={p.pageId} value={p.pageId}>
                              {p.pageName} ({p.pageId}) {p.isSubscribed ? "• Subscribed" : ""}
                            </option>
                          ))}
                        </select>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-400">or enter manual Page ID:</span>
                          <input
                            type="text"
                            placeholder="Page ID (e.g. 101241015968987)"
                            value={manualPageId}
                            onChange={(e) => {
                              setManualPageId(e.target.value);
                              setSelectedPageId("");
                            }}
                            className="flex-1 px-2.5 py-1 text-xs border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-[#cc2727]"
                          />
                        </div>
                      </div>
                    ) : (
                      <input
                        type="text"
                        placeholder="Enter Facebook Page ID (e.g. 101241015968987)"
                        value={manualPageId}
                        onChange={(e) => setManualPageId(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#cc2727]/20 focus:border-[#cc2727]"
                      />
                    )}
                    <span className="text-[11px] text-slate-400">
                      The Facebook Page hosting the lead ads. Must be authorized in backend registry.
                    </span>
                  </div>

                  {/* Field 6: Instant Form ID */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <label className="text-xs font-bold text-slate-700">
                        Instant Form <span className="text-rose-500">*</span>
                      </label>
                      <InfoTooltip
                        title="Instant Form / Form ID"
                        meaning="The specific Meta Instant Form attached to the ad where patients submit their contact details."
                        howToFind="Open Meta Business Suite → All tools → Instant Forms, or the relevant Page's Lead Forms section. Select the form attached to the lead-generation ad. Make sure you choose the correct Page and form. For manual entry, obtain the numeric form ID from form details. Do not enter the campaign ID or Page ID here."
                        sourceType="both"
                        example="8923748291038"
                      />
                    </div>
                    {selectedPageId && formsMap[selectedPageId] && formsMap[selectedPageId].length > 0 ? (
                      <div className="space-y-1.5">
                        <select
                          value={selectedFormId}
                          onChange={(e) => {
                            setSelectedFormId(e.target.value);
                            setManualFormId("");
                            const f = formsMap[selectedPageId].find((x) => x.id === e.target.value);
                            if (f) setFormName(f.name);
                          }}
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#cc2727]/20 focus:border-[#cc2727] bg-white"
                        >
                          <option value="">-- Choose Discovered Form --</option>
                          {formsMap[selectedPageId].map((f) => (
                            <option key={f.id} value={f.id}>
                              {f.name} ({f.id}) - {f.status}
                            </option>
                          ))}
                        </select>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-400">or enter manual Form ID:</span>
                          <input
                            type="text"
                            placeholder="Form ID (e.g. 987654321098)"
                            value={manualFormId}
                            onChange={(e) => {
                              setManualFormId(e.target.value);
                              setSelectedFormId("");
                            }}
                            className="flex-1 px-2.5 py-1 text-xs border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-[#cc2727]"
                          />
                        </div>
                      </div>
                    ) : (
                      <input
                        type="text"
                        placeholder={
                          loadingFormsMap[selectedPageId]
                            ? "Fetching forms from Meta..."
                            : "Enter Instant Form ID (e.g. 987654321098)"
                        }
                        value={manualFormId}
                        onChange={(e) => setManualFormId(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#cc2727]/20 focus:border-[#cc2727]"
                      />
                    )}
                    <span className="text-[11px] text-slate-400">
                      The Instant Form ID whose leads will be ingested by this integration.
                    </span>
                  </div>

                  {/* Field 7: Campaign Name / Campaign ID */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <label className="text-xs font-bold text-slate-700">Campaign Name (Optional)</label>
                      <InfoTooltip
                        title="Campaign Name / Campaign ID"
                        meaning="The advertising campaign that contains the ad set and lead ads."
                        howToFind="Open Meta Ads Manager, choose the correct ad account, and find the campaign in the Campaigns tab. The campaign name is displayed in the table. For the ID, open or inspect the campaign details. Select automatically when supported."
                        sourceType="both"
                        example="Summer IVF Awareness Camp"
                      />
                    </div>
                    {campaigns.length > 0 ? (
                      <select
                        value={campaignName}
                        onChange={(e) => {
                          setCampaignName(e.target.value);
                          const c = campaigns.find((x) => x.name === e.target.value);
                          if (c) setCampaignId(c.id);
                        }}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#cc2727]/20 focus:border-[#cc2727] bg-white"
                      >
                        <option value="">-- Choose Campaign --</option>
                        {campaigns.map((c) => (
                          <option key={c.id} value={c.name}>
                            {c.name} ({c.id})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        placeholder="e.g. Summer Fertility Camp 2026"
                        value={campaignName}
                        onChange={(e) => setCampaignName(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#cc2727]/20 focus:border-[#cc2727]"
                      />
                    )}
                  </div>

                  {/* Field 8: Campaign ID & Ad ID */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1">
                        <label className="text-xs font-bold text-slate-700">Campaign ID</label>
                        <InfoTooltip
                          title="Campaign ID"
                          meaning="The unique numeric ID of the Meta Campaign."
                          howToFind="Found in the URL or 'Campaign ID' column in Meta Ads Manager."
                          sourceType="both"
                          example="120205839201"
                        />
                      </div>
                      <input
                        type="text"
                        placeholder="e.g. 120205839201"
                        value={campaignId}
                        onChange={(e) => setCampaignId(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#cc2727]/20 focus:border-[#cc2727]"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1">
                        <label className="text-xs font-bold text-slate-700">Ad ID / Ad Name</label>
                        <InfoTooltip
                          title="Ad ID / Ad Name"
                          meaning="The specific creative Ad ID from which the user submitted the form."
                          howToFind="In Meta Ads Manager, switch to the Ads tab after selecting the correct campaign. Find the relevant ad and its details. Do not confuse the Ad ID with the Campaign ID."
                          sourceType="both"
                          example="120205839202"
                        />
                      </div>
                      <input
                        type="text"
                        placeholder="e.g. 120205839202"
                        value={adId}
                        onChange={(e) => setAdId(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#cc2727]/20 focus:border-[#cc2727]"
                      />
                    </div>
                  </div>
                </div>

                {/* Field 9: Field Mapping */}
                <div className="border-t border-slate-200 pt-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        Lead Field Mapping
                      </h4>
                      <InfoTooltip
                        title="Field Mapping"
                        meaning="Match each CRM field with the corresponding question or answer from the Instant Form."
                        howToFind="Match each CRM field with the corresponding question or answer from the Instant Form. Verify the patient's name, mobile number, email, location, and treatment interest before saving. Available questions depend on the selected form."
                        sourceType="manual"
                        example="patientName ← full_name, mobileNumber ← phone_number"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={addFieldMapping}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Field
                    </button>
                  </div>

                  <div className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    {fieldMappings.map((mapping, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <div className="w-1/3">
                          <select
                            value={mapping.crmField}
                            onChange={(e) => updateFieldMapping(idx, "crmField", e.target.value)}
                            className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                          >
                            <option value="">-- CRM Field --</option>
                            <option value="patientName">Patient Name</option>
                            <option value="mobileNumber">Mobile Number</option>
                            <option value="location">Location / City</option>
                            <option value="email">Email</option>
                            <option value="lookingForTreatment">Treatment Requirement</option>
                            <option value="notes">Notes / Observation</option>
                          </select>
                        </div>

                        <span className="text-slate-400 text-xs font-bold">←</span>

                        <div className="flex-1">
                          <input
                            type="text"
                            placeholder="Meta Form Field Key (e.g. full_name, phone_number, city)"
                            value={mapping.formFieldKey}
                            onChange={(e) => updateFieldMapping(idx, "formFieldKey", e.target.value)}
                            className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => removeFieldMapping(idx)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md transition-colors"
                          title="Remove mapping"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Field 10: Auto Sync Toggle */}
                <div className="border-t border-slate-200 pt-5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-800">Auto Sync New Leads</span>
                        <InfoTooltip
                          title="Auto Sync"
                          meaning="When enabled, eligible new leads from the configured form are synced automatically into the CRM in real time via Meta webhooks. When disabled, automatic lead ingestion is paused."
                          howToFind="Toggle ON to receive leads immediately when users submit forms on Facebook or Instagram. Toggle OFF during maintenance or campaign testing."
                          sourceType="manual"
                          example="Enabled (Real-time webhook sync active)"
                        />
                      </div>
                      <p className="text-xs text-slate-500">
                        Automatically ingest incoming leads from this form in real-time.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setAutoSync(!autoSync)}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      autoSync
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-300"
                        : "bg-slate-100 text-slate-600 border border-slate-300"
                    }`}
                  >
                    {autoSync ? (
                      <>
                        <ToggleRight className="w-4 h-4 text-emerald-600" />
                        Enabled
                      </>
                    ) : (
                      <>
                        <ToggleLeft className="w-4 h-4 text-slate-400" />
                        Disabled
                      </>
                    )}
                  </button>
                </div>

                {/* Action Buttons */}
                <div className="border-t border-slate-200 pt-5 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={handleValidateDetails}
                      disabled={validating}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors disabled:opacity-50"
                    >
                      <ShieldCheck className="w-4 h-4 text-slate-600" />
                      {validating ? "Validating..." : "Validate Details"}
                    </button>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={handleSaveConfiguration}
                      disabled={saving}
                      className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-[#cc2727] hover:bg-[#b02020] text-white text-xs font-bold transition-all shadow-md shadow-[#cc2727]/20 disabled:opacity-50"
                    >
                      {saving ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4" />
                      )}
                      {saving ? "Saving..." : editingSetupId ? "Update Configuration" : "Save Configuration"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Saved Configurations Table */}
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Configured Meta Form Integrations</h3>
                    <p className="text-xs text-slate-500">
                      Active lead integrations currently syncing leads into SOI CRM.
                    </p>
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                    {setups.length} Configured
                  </span>
                </div>

                {setups.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-xs">
                    No configurations created yet. Use the form above to add your first Meta Ads setup.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="px-4 py-3">Integration</th>
                          <th className="px-4 py-3">Page & Form</th>
                          <th className="px-4 py-3">Lead Source</th>
                          <th className="px-4 py-3">Auto Sync</th>
                          <th className="px-4 py-3">Last Verified</th>
                          <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {setups.map((s) => (
                          <tr key={s._id} className="hover:bg-slate-50/50">
                            <td className="px-4 py-3">
                              <div className="font-semibold text-slate-900">{s.integrationName}</div>
                              {s.campaignName && (
                                <div className="text-[10px] text-slate-400">Campaign: {s.campaignName}</div>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-medium text-slate-800">{s.pageName || s.pageId}</div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                Form: {s.formName || s.formId}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-medium">
                                {s.leadSource}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium ${
                                  s.autoSync
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : "bg-slate-100 text-slate-600 border border-slate-200"
                                }`}
                              >
                                {s.autoSync ? "Enabled" : "Paused"}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-slate-500">
                              {s.lastVerifiedAt
                                ? new Date(s.lastVerifiedAt).toLocaleDateString()
                                : "Never"}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleTestConnection(s._id)}
                                  disabled={testingId === s._id}
                                  className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors disabled:opacity-50"
                                >
                                  {testingId === s._id ? "Testing..." : "Test"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleEditSetup(s)}
                                  className="px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded transition-colors"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteSetup(s._id, s.integrationName)}
                                  className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                                  title="Delete Configuration"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: DISCOVERED PAGES & AD ACCOUNTS (Account & Assets) */}
          {/* ========================================================================= */}
          {activeTab === "discovery" && (
            <div className="space-y-6">
              {/* Account Card */}
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-sm shrink-0">
                      <FacebookIcon className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-bold text-slate-900">
                          {account?.metaUserName || "Meta Advertiser Account"}
                        </h2>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            account?.status === "active"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          {account?.status === "active" ? "Connected" : "Not Authorized"}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {account?.connectedEmail
                          ? `Authorized by: ${account.connectedEmail}`
                          : "No Meta account currently connected."}
                        {account?.lastSyncAt &&
                          ` • Last Synced: ${new Date(account.lastSyncAt).toLocaleString()}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleConnectOAuth}
                      disabled={connecting}
                      className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-2xs"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>{account ? "Reconnect Account" : "Connect Meta Account"}</span>
                    </button>

                    {account && (
                      <button
                        onClick={() =>
                          setDisconnectModal({ open: true, type: "account", target: account })
                        }
                        className="px-3 py-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold transition-colors"
                      >
                        Disconnect
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Ad Accounts & Campaigns Pipeline */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Section: Discovered Ad Accounts */}
                <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-blue-600" />
                      <h3 className="text-sm font-bold text-slate-900">Ad Accounts</h3>
                    </div>
                    <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                      {adAccounts.length} Discovered
                    </span>
                  </div>

                  {adAccounts.length === 0 ? (
                    <div className="text-center py-6 text-xs text-slate-500 space-y-1">
                      <p className="font-semibold text-slate-700">No Ad Accounts Discovered</p>
                      <p className="text-[11px] text-slate-400">
                        Connect an authorized Meta account with <code>ads_read</code> scope.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {adAccounts.map((adAcc) => {
                        const isSelected = selectedAdAccountId === adAcc.id;
                        return (
                          <div
                            key={adAcc.id}
                            onClick={() => {
                              setSelectedAdAccountId(adAcc.id);
                              loadCampaignsForAccount(adAcc.id);
                            }}
                            className={`p-3 rounded-xl border cursor-pointer transition-all ${
                              isSelected
                                ? "bg-blue-50/70 border-blue-300 ring-1 ring-blue-500/20"
                                : "bg-white border-slate-200 hover:border-slate-300"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-900 truncate pr-2">
                                {adAcc.name}
                              </span>
                              <span className="text-[9px] font-mono px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
                                {adAcc.currency || "USD"}
                              </span>
                            </div>
                            <div className="text-[10px] font-mono text-slate-400 mt-1 flex items-center justify-between">
                              <span>{adAcc.id}</span>
                              <span>{adAcc.timezone_name || "UTC"}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Section: Campaigns */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <Megaphone className="w-4 h-4 text-purple-600" />
                      <h3 className="text-sm font-bold text-slate-900">Campaigns & Attribution</h3>
                    </div>
                    {selectedAdAccountId && (
                      <span className="text-[10px] font-mono bg-purple-50 text-purple-700 px-2 py-0.5 rounded border border-purple-200">
                        Target: {selectedAdAccountId}
                      </span>
                    )}
                  </div>

                  {loadingCampaigns ? (
                    <div className="py-8 text-center space-y-2">
                      <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                      <p className="text-xs text-slate-500">Querying Meta Marketing API campaigns...</p>
                    </div>
                  ) : campaignError ? (
                    <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-1.5 text-xs text-amber-900">
                      <div className="flex items-center gap-2 font-bold">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>Marketing API Scope Notice</span>
                      </div>
                      <p className="text-[11px] leading-relaxed text-amber-800">{campaignError}</p>
                      <p className="text-[10px] text-amber-700 mt-1">
                        Instant Form lead synchronization continues via webhooks regardless of campaign reporting scope.
                      </p>
                    </div>
                  ) : campaigns.length === 0 ? (
                    <div className="text-center py-8 text-xs text-slate-500">
                      No active campaigns found in this Ad Account.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto pr-1">
                      {campaigns.map((camp) => (
                        <div key={camp.id} className="py-2.5 flex items-center justify-between text-xs">
                          <div className="min-w-0 pr-3">
                            <div className="font-semibold text-slate-900 truncate">{camp.name}</div>
                            <div className="text-[10px] font-mono text-slate-400">
                              ID: {camp.id} • Obj: {camp.objective || "LEADS"}
                            </div>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                              camp.status === "ACTIVE"
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {camp.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Pages & Instant Lead Forms Card */}
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">
                      Discovered Facebook Pages & Instant Lead Forms
                    </h2>
                    <p className="text-xs text-slate-500">
                      Select specific forms below to synchronize incoming leads directly into the CRM.
                    </p>
                  </div>
                  <span className="px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg">
                    {pages.length} Connected
                  </span>
                </div>

                {loading ? (
                  <div className="p-8 text-center space-y-3">
                    <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="text-xs font-medium text-slate-500">Loading authorized Pages...</p>
                  </div>
                ) : pages.length === 0 ? (
                  <div className="p-12 text-center max-w-md mx-auto space-y-4">
                    <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                      <FacebookIcon className="w-7 h-7" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">No Facebook Pages Discovered</h3>
                      <p className="text-xs text-slate-500 mt-1">
                        Connect your Meta account to discover your authorized Facebook Pages and Instant Lead Forms automatically.
                      </p>
                    </div>
                    <button
                      onClick={handleConnectOAuth}
                      disabled={connecting}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1877F2] hover:bg-[#166fe5] text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all"
                    >
                      <FacebookIcon className="w-4 h-4" />
                      <span>{connecting ? "Connecting..." : "Connect Meta Account"}</span>
                    </button>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {pages.map((page) => {
                      const isExpanded = Boolean(expandedPages[page.pageId]);
                      const forms = formsMap[page.pageId] || [];
                      const isLoadingForms = Boolean(loadingFormsMap[page.pageId]);
                      const selectedCount = Array.isArray(page.selectedForms)
                        ? page.selectedForms.length
                        : 0;

                      return (
                        <div key={page.pageId} className="transition-colors hover:bg-slate-50/50">
                          <div className="px-6 py-4 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3.5 min-w-0">
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
                                {page.pageName.charAt(0) || "P"}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h3 className="text-sm font-bold text-slate-900 truncate">
                                    {page.pageName}
                                  </h3>
                                  <span
                                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                      page.isSubscribed
                                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                        : "bg-amber-50 text-amber-700 border border-amber-200"
                                    }`}
                                  >
                                    {page.isSubscribed ? "Webhook Subscribed" : "Subscription Pending"}
                                  </span>
                                  <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                    ID: {page.pageId}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                                  <span>Connected by {page.connectedBy || "admin"}</span>
                                  <span>•</span>
                                  <span>
                                    {selectedCount === 0
                                      ? "All forms synced by default"
                                      : `${selectedCount} form${selectedCount > 1 ? "s" : ""} selected for sync`}
                                  </span>
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                onClick={() => togglePageAccordion(page.pageId)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                              >
                                <FileText className="w-3.5 h-3.5 text-slate-500" />
                                <span>{isExpanded ? "Hide Forms" : "Manage Forms"}</span>
                                {isExpanded ? (
                                  <ChevronUp className="w-3.5 h-3.5" />
                                ) : (
                                  <ChevronDown className="w-3.5 h-3.5" />
                                )}
                              </button>

                              <button
                                onClick={() =>
                                  setDisconnectModal({ open: true, type: "page", target: page })
                                }
                                title="Disconnect Page"
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* Expanded Forms List */}
                          {isExpanded && (
                            <div className="bg-slate-50/80 px-6 py-4 border-t border-slate-100 space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                  Instant Lead Forms on Meta
                                </span>
                                <span className="text-xs text-slate-500">
                                  Toggle individual forms to selectively sync leads.
                                </span>
                              </div>

                              {isLoadingForms ? (
                                <div className="p-4 text-center">
                                  <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-1"></div>
                                  <span className="text-xs text-slate-500">
                                    Fetching lead forms from Meta Graph API...
                                  </span>
                                </div>
                              ) : forms.length === 0 ? (
                                <div className="p-4 bg-white rounded-xl border border-slate-200 text-center text-xs text-slate-500">
                                  No Instant Lead Forms discovered on this Facebook Page.
                                </div>
                              ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {forms.map((form) => {
                                    const isSyncEnabled =
                                      Array.isArray(page.selectedForms) && page.selectedForms.length > 0
                                        ? page.selectedForms.includes(form.id)
                                        : true;

                                    const isBusy = updatingSync[form.id];

                                    return (
                                      <div
                                        key={form.id}
                                        className={`p-3.5 rounded-xl border transition-all ${
                                          isSyncEnabled
                                            ? "bg-white border-blue-200 shadow-2xs ring-1 ring-blue-500/10"
                                            : "bg-slate-50/60 border-slate-200/80 opacity-75"
                                        }`}
                                      >
                                        <div className="flex items-start justify-between gap-3">
                                          <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-1.5">
                                              <h4 className="text-xs font-bold text-slate-900 truncate">
                                                {form.name}
                                              </h4>
                                              <span
                                                className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                                                  form.status === "ACTIVE"
                                                    ? "bg-emerald-50 text-emerald-700"
                                                    : "bg-slate-100 text-slate-600"
                                                }`}
                                              >
                                                {form.status}
                                              </span>
                                            </div>
                                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                              Form ID: {form.id}
                                            </div>
                                            {form.leads_count !== undefined && (
                                              <div className="text-[11px] text-slate-500 mt-1">
                                                Leads on Meta: {form.leads_count}
                                              </div>
                                            )}
                                          </div>

                                          <button
                                            onClick={() => handleToggleFormSync(page, form.id)}
                                            disabled={isBusy}
                                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
                                              isSyncEnabled
                                                ? "bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200"
                                                : "bg-slate-200 text-slate-600 hover:bg-slate-300"
                                            } disabled:opacity-50`}
                                          >
                                            {isSyncEnabled ? (
                                              <>
                                                <ToggleRight className="w-4 h-4 text-blue-600" />
                                                <span>Syncing</span>
                                              </>
                                            ) : (
                                              <>
                                                <ToggleLeft className="w-4 h-4 text-slate-400" />
                                                <span>Disabled</span>
                                              </>
                                            )}
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: SYNC ACTIVITY & TELEMETRY */}
          {/* ========================================================================= */}
          {activeTab === "telemetry" && (
            <div className="space-y-6">
              {/* Telemetry Metrics Cards */}
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Lead Sync Status & Webhook Health
                    </h3>
                    <p className="text-xs text-slate-500">Live delivery metrics and deduplication telemetry</p>
                  </div>
                  <span className="text-[10px] font-mono bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200">
                    Webhook Endpoint: Active
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Total Received
                    </div>
                    <div className="text-xl font-bold text-slate-900 mt-1">{totalEvents}</div>
                    <p className="text-[10px] text-slate-500">Webhook events logged</p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Ingested Leads
                    </div>
                    <div className="text-xl font-bold text-emerald-600 mt-1">{processedCount}</div>
                    <p className="text-[10px] text-slate-500">Saved to CRM leads</p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Duplicates Handled
                    </div>
                    <div className="text-xl font-bold text-blue-600 mt-1">
                      {duplicatePhoneCount + alreadyExistsCount}
                    </div>
                    <p className="text-[10px] text-slate-500">Safely cross-referenced</p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Last Event
                    </div>
                    <div className="text-xs font-bold text-slate-800 mt-2 truncate">
                      {lastEvent ? new Date(lastEvent.createdAt).toLocaleTimeString() : "None yet"}
                    </div>
                    <p className="text-[10px] text-slate-500">
                      {lastEvent ? `Status: ${lastEvent.status}` : "Awaiting lead submission"}
                    </p>
                  </div>
                </div>

                {/* Error Diagnostics Callout */}
                {failedEvents.length > 0 && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      <span>Recent Event Failure Detected</span>
                    </div>
                    <p className="text-[11px] text-rose-700">
                      {failedEvents[0]?.lastError || "Transient Graph API error during lead retrieval."}
                    </p>
                  </div>
                )}
              </div>

              {/* Webhook Events Log */}
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Recent Webhook Lead Delivery Events</h3>
                    <p className="text-xs text-slate-500">Audit log of leadgen triggers dispatched by Meta</p>
                  </div>
                  <span className="text-xs text-slate-500 font-mono">
                    Showing latest {events.length} events
                  </span>
                </div>

                {events.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500">
                    No webhook events recorded yet. Once ads generate leads, triggers will appear here in real-time.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="px-4 py-3">Leadgen ID</th>
                          <th className="px-4 py-3">Page ID</th>
                          <th className="px-4 py-3">Form ID</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3">Timestamp</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                        {events.map((ev) => (
                          <tr key={ev._id} className="hover:bg-slate-50/50">
                            <td className="px-4 py-3 font-semibold text-slate-900">{ev.leadgenId}</td>
                            <td className="px-4 py-3 text-slate-600">{ev.pageId}</td>
                            <td className="px-4 py-3 text-slate-600">{ev.formId || "—"}</td>
                            <td className="px-4 py-3">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-sans font-bold ${
                                  ev.status === "processed"
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : ev.status === "skipped_duplicate_phone" || ev.status === "already_exists"
                                    ? "bg-blue-50 text-blue-700 border border-blue-200"
                                    : "bg-rose-50 text-rose-700 border border-rose-200"
                                }`}
                              >
                                {ev.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-slate-500 font-sans">
                              {new Date(ev.createdAt).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 4: META FIELD HELP GUIDE */}
          {/* ========================================================================= */}
          {activeTab === "help" && (
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6 space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-blue-600" />
                  Marketing Team Guide: Where to Find Meta IDs & Settings
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Non-technical instructions on locating and configuring each parameter inside Meta Business Suite and Ads Manager.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs leading-relaxed">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <span className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <FacebookIcon className="w-4 h-4 text-[#1877F2]" />
                    Meta Account
                  </span>
                  <p className="text-slate-600">
                    Click <strong>Connect Meta Account</strong> and log in using the authorized Facebook account. Grant the requested permissions. You normally only need to connect the account once.
                  </p>
                  <div className="text-[11px] text-slate-500 bg-white p-2 rounded border border-slate-200 font-mono">
                    Permissions required: pages_show_list, pages_read_engagement, pages_manage_metadata, leads_retrieval, ads_read
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <span className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-blue-600" />
                    Ad Account & Ad Account ID
                  </span>
                  <p className="text-slate-600">
                    Open Meta Ads Manager. Use the account selector to choose the correct ad account. If the account is not listed, ask the Meta Business administrator to grant you access. Prefer selecting the account from the dropdown; enter an ID manually only when necessary.
                  </p>
                  <p className="text-slate-600">
                    Find the ad account in <strong>Meta Ads Manager</strong> or <strong>Business Settings → Accounts → Ad Accounts</strong>. Copy its numeric ID. Do not enter the Page ID here.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <span className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-600" />
                    Facebook Page & Page ID
                  </span>
                  <p className="text-slate-600">
                    Select the Facebook Page associated with the campaign from the available Pages list. If it is missing, verify that the connected Facebook account has access to that Page.
                  </p>
                  <p className="text-slate-600">
                    Open the relevant Facebook Page and find its Page ID in <strong>Page transparency / About</strong> or the Page settings, depending on the current interface. If the Page dropdown is available, select the Page instead of entering the ID manually.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <span className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-[#cc2727]" />
                    Instant Form & Form ID
                  </span>
                  <p className="text-slate-600">
                    Open <strong>Meta Business Suite → All tools → Instant Forms</strong>, or the relevant Page's Lead Forms section. Select the form attached to the lead-generation ad. Make sure you choose the correct Page and form.
                  </p>
                  <p className="text-slate-600">
                    Use the form dropdown when possible. For manual entry, obtain the numeric form ID from the form details or the authorized Meta Graph API data. Do not enter the campaign ID or Page ID here.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <span className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <Megaphone className="w-4 h-4 text-purple-600" />
                    Campaign & Ad Attribution
                  </span>
                  <p className="text-slate-600">
                    Open Meta Ads Manager, choose the correct ad account, and find the campaign in the <strong>Campaigns</strong> tab. The campaign name is displayed in the table. For the ID, open or inspect the campaign details. Select automatically when supported.
                  </p>
                  <p className="text-slate-600">
                    In Meta Ads Manager, switch to the <strong>Ads</strong> tab after selecting the correct campaign. Find the relevant ad and its details. Do not confuse the Ad ID with the Campaign ID.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <span className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    Field Mapping & Auto Sync
                  </span>
                  <p className="text-slate-600">
                    <strong>Field Mapping:</strong> Match each CRM field with the corresponding question or answer from the Instant Form. Verify the patient's name, mobile number, email, location, and treatment interest before saving. Available questions depend on the selected form.
                  </p>
                  <p className="text-slate-600">
                    <strong>Auto Sync:</strong> When enabled, eligible new leads from the configured form can be synced automatically, provided the Meta connection, permissions, Page subscription, webhook, and backend processing are working. When disabled, do not automatically import new leads for this configuration.
                  </p>
                </div>
              </div>
            </div>
          )}
        </main>

        <Footer />
      </div>

      {/* Disconnect Confirmation Modal */}
      {disconnectModal.open && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-xl border border-slate-100">
            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold text-slate-900">
                {disconnectModal.type === "account"
                  ? "Disconnect Meta Account?"
                  : "Disconnect Facebook Page?"}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {disconnectModal.type === "account"
                  ? "Are you sure you want to disconnect your Meta Advertiser account? Lead sync will be paused until reconnected."
                  : `Are you sure you want to disconnect "${disconnectModal.target?.pageName}"?`}
              </p>
              <div className="mt-2 p-2.5 bg-slate-50 rounded-lg text-[11px] text-slate-600">
                🔒 All previously synced leads and notes history will remain safe in the CRM database.
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setDisconnectModal({ open: false, type: "account", target: null })}
                className="flex-1 py-2 px-3 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDisconnect}
                className="flex-1 py-2 px-3 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-sm"
              >
                Confirm Disconnect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
