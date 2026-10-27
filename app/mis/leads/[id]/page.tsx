"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Save,
  Trash2,
  CheckCircle,
  AlertCircle,
  Hash,
  Phone,
  User,
  MapPin,
  Sparkles,
  Activity,
  HeartPulse,
  FileText,
  Clock,
  Heart,
  Building,
  Edit3,
} from "lucide-react";
import MISSidebar from "@/app/components/MISSidebar";
import Footer from "@/app/components/Footer";
import LeadSquaredTabsHeader, { LeadDetailTab } from "@/app/components/LeadSquaredTabsHeader";
import LeadSquaredActivityHistory from "@/app/components/LeadSquaredActivityHistory";
import LeadSquaredAuditTrail from "@/app/components/LeadSquaredAuditTrail";
import LeadSquaredLeadDetails from "@/app/components/LeadSquaredLeadDetails";
import LeadSquaredNotes from "@/app/components/LeadSquaredNotes";
import EditLeadModal from "@/app/components/EditLeadModal";
import AddNoteModal from "@/app/components/AddNoteModal";
import {
  CENTRE_LOCATIONS,
  CAMP_LOCATIONS,
  CAMP_TO_CENTRE_MAP,
  WHEN_START_TREATMENT_OPTIONS,
  LEAD_SOURCES,
  CAMPAIGN_NAMES,
  calculateLeadScore,
  SOURCE_NAMES,
  CAMPAIGN_TO_INFO,
  SOURCE_NAME_TO_INFO,
  GENERAL_SOURCES,
  SUB_DISPOSITIONS_MAP,
  notifyLeadUpdated,
} from "@/lib/leadOptions";
import { IFormField } from "@/types/formConfig";
import { DEFAULT_FORM_FIELDS } from "@/lib/defaultFormFields";
import { getCachedLeadDetail } from "@/lib/leadsCache";

const COUNTRY_CODES = [
  { code: "+91", country: "India (IN)" },
  { code: "+1", country: "USA/Canada (US/CA)" },
  { code: "+44", country: "United Kingdom (UK)" },
  { code: "+971", country: "United Arab Emirates (UAE)" },
  { code: "+61", country: "Australia (AU)" },
  { code: "+65", country: "Singapore (SG)" },
  { code: "+966", country: "Saudi Arabia (KSA)" },
  { code: "+974", country: "Qatar (QA)" },
  { code: "+965", country: "Kuwait (KW)" },
  { code: "+968", country: "Oman (OM)" },
  { code: "+977", country: "Nepal (NP)" },
  { code: "+880", country: "Bangladesh (BD)" },
];

function splitPhone(fullPhone: string | undefined) {
  if (!fullPhone) return { code: "+91", raw: "" };
  const trimmed = fullPhone.trim();
  for (const c of COUNTRY_CODES) {
    if (trimmed.startsWith(c.code)) {
      return {
        code: c.code,
        raw: trimmed.slice(c.code.length).trim(),
      };
    }
  }
  return { code: "+91", raw: trimmed };
}

export default function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const leadId = resolvedParams.id;
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddNoteModalOpen, setIsAddNoteModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<LeadDetailTab>("activity_history");
  const [hideEmptyFields, setHideEmptyFields] = useState(false);
  const [error, setError] = useState("");
  const [toastMessage, setToastMessage] = useState("");
  const [callerOptions, setCallerOptions] = useState<string[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [notesHistory, setNotesHistory] = useState<any[]>([]);
  const [formFields, setFormFields] = useState<IFormField[]>(DEFAULT_FORM_FIELDS);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, any>>({});

  const [subDispositionMappings, setSubDispositionMappings] = useState<
    Record<string, { disposition: string; validStatus: string }>
  >({ ...SUB_DISPOSITIONS_MAP });

  // Phone states
  const [primaryCountryCode, setPrimaryCountryCode] = useState("+91");
  const [primaryRawPhone, setPrimaryRawPhone] = useState("");
  const [secondaryCountryCode, setSecondaryCountryCode] = useState("+91");
  const [secondaryRawPhone, setSecondaryRawPhone] = useState("");
  const [whatsappCountryCode, setWhatsappCountryCode] = useState("+91");
  const [whatsappRawPhone, setWhatsappRawPhone] = useState("");
  const [otherCountryCode, setOtherCountryCode] = useState("+91");
  const [otherRawPhone, setOtherRawPhone] = useState("");

  const [formData, setFormData] = useState<any>({
    uniqueId: "",
    firstActivityDate: "",
    husbandName: "",
    wifeName: "",
    husbandAge: "",
    wifeAge: "",
    whenPlanningToStartTreatment: "",
    preMedicalConditions: "No",
    marriedSince: "",
    tryingToConceiveYears: "",
    primaryEmail: "",
    secondaryEmail: "",
    primaryMobileNumber: "",
    secondaryMobileNumber: "",
    whatsappMobileNumber: "",
    otherNumbers: "",
    whatsappConsent: "No",
    callingConsent: "No",
    leadSource: "General",
    utmSource: "",
    campaignName: "General",
    sourceName: "",
    source: "General",
    leadScore: "0",
    subStatus: "",
    leadStage: "",
    leadValidStatus: "",
    createdByMember: "",
    createdOn: "",
    modifiedByMember: "",
    modifiedOn: "",
    centreAddress: "",
    ptAddress: "",
    ptPincode: "",
    ptCountry: "India",
    ptState: "",
    ptCity: "",
    leadOwner: "",
    leadAge: "0 days",
    campLocation: "",
    centreLocation: "",
    followUpDateTime: "",
    centreVisitedDate: "",
    campVisitedDate: "",
    appointmentDate: "",
    registrationStatus: "No",
    registrationNumber: "",
    registrationAmount: "",
    package: "",
    plan: "",
    notes: "",
  });

  const applyLeadData = (l: any) => {
    const pPhone = splitPhone(l.primaryMobileNumber || l.mobileNumber || l.phoneNumber);
    setPrimaryCountryCode(pPhone.code);
    setPrimaryRawPhone(pPhone.raw);

    const sPhone = splitPhone(l.secondaryMobileNumber || l.alternateNumber);
    setSecondaryCountryCode(sPhone.code);
    setSecondaryRawPhone(sPhone.raw);

    const wPhone = splitPhone(l.whatsappMobileNumber);
    setWhatsappCountryCode(wPhone.code);
    setWhatsappRawPhone(wPhone.raw);

    const oPhone = splitPhone(l.otherNumbers);
    setOtherCountryCode(oPhone.code);
    setOtherRawPhone(oPhone.raw);

    setFormData({
      uniqueId: l.uniqueId || "",
      firstActivityDate: l.firstActivityDate || l.createdOn || l.leadTimestamp || "",
      husbandName: l.husbandName || l.spouseName || "",
      wifeName: l.wifeName || l.patientName || "",
      husbandAge: l.husbandAge || l.spouseAge || "",
      wifeAge: l.wifeAge || l.patientAge || "",
      whenPlanningToStartTreatment: l.whenPlanningToStartTreatment || l.lookingForTreatment || "",
      preMedicalConditions: l.preMedicalConditions || (l.preConditions ? "Yes" : "No"),
      marriedSince: l.marriedSince || "",
      tryingToConceiveYears: l.tryingToConceiveYears || "",
      primaryEmail: l.primaryEmail || "",
      secondaryEmail: l.secondaryEmail || "",
      primaryMobileNumber: l.primaryMobileNumber || l.mobileNumber || l.phoneNumber || "",
      secondaryMobileNumber: l.secondaryMobileNumber || l.alternateNumber || "",
      whatsappMobileNumber: l.whatsappMobileNumber || "",
      otherNumbers: l.otherNumbers || "",
      whatsappConsent: l.whatsappConsent || "No",
      callingConsent: l.callingConsent || "No",
      leadSource: l.leadSource || l.utmSource || "General",
      utmSource: l.utmSource || l.leadSource || "",
      campaignName: l.campaignName || "General",
      sourceName: l.sourceName || "",
      source: l.source || "General",
      leadScore: l.leadScore || "0",
      subStatus: l.subStatus || l.subDispositions || "",
      leadStage: l.leadStage || l.dispositions || "",
      leadValidStatus: l.leadValidStatus || l.validStatus || "",
      createdByMember: l.createdByMember || (typeof l.createdBy === "object" ? l.createdBy?.name : l.createdBy) || "",
      createdOn: l.createdOn || l.leadTimestamp || l.date || "",
      modifiedByMember: l.modifiedByMember || "",
      modifiedOn: l.modifiedOn || "",
      centreAddress: l.centreAddress || "",
      ptAddress: l.ptAddress || "",
      ptPincode: l.ptPincode || "",
      ptCountry: l.ptCountry || "India",
      ptState: l.ptState || "",
      ptCity: l.ptCity || "",
      leadOwner: l.leadOwner || l.callerName || "",
      leadAge: l.leadAge || "0 days",
      campLocation: l.campLocation || "",
      centreLocation: l.centreLocation || l.location || l.otherCity || "",
      followUpDateTime: l.followUpDateTime || l.followUpDate || "",
      centreVisitedDate: l.centreVisitedDate || "",
      campVisitedDate: l.campVisitedDate || "",
      appointmentDate: l.appointmentDate || "",
      registrationStatus: l.registrationStatus || "No",
      registrationNumber: l.registrationNumber || "",
      registrationAmount: l.registrationAmount || "",
      package: l.package || "",
      plan: l.plan || "",
      notes: l.notes || "",
    });

    if (l.customFields) {
      setCustomFieldValues(l.customFields);
    }
    if (l.auditLogs) {
      setAuditLogs(l.auditLogs);
    }
    if (l.notesHistory) {
      setNotesHistory(l.notesHistory);
    }
  };

  useEffect(() => {
    const cachedLead = getCachedLeadDetail(leadId);
    if (cachedLead) {
      applyLeadData(cachedLead);
      setLoading(false);
    }
  }, [leadId]);

  const loadData = async () => {
    try {
      const [meRes, cfgRes, membersRes, leadRes] = await Promise.all([
        fetch("/api/auth/me"),
        fetch("/api/admin/form-config").catch(() => null),
        fetch("/api/admin/members").catch(() => null),
        fetch(`/api/mis/leads/${leadId}`, { cache: "no-store" }),
      ]);

      if (!meRes.ok) {
        router.push("/mis/login");
        return;
      }
      const meData = await meRes.json();
      if (!meData.user) {
        router.push("/mis/login");
        return;
      }
      setUser(meData.user);

      if (cfgRes && cfgRes.ok) {
        const cfgData = await cfgRes.json();
        if (cfgData.config?.fields && Array.isArray(cfgData.config.fields)) {
          setFormFields(cfgData.config.fields);
        }
        if (cfgData.config?.subDispositionMappings && Object.keys(cfgData.config.subDispositionMappings).length > 0) {
          setSubDispositionMappings(cfgData.config.subDispositionMappings);
        }
      }

      if (membersRes && membersRes.ok) {
        const mData = await membersRes.json();
        const names = (mData.members || []).map((m: any) => m.name).filter(Boolean);
        setCallerOptions(names);
      }

      if (!leadRes.ok) {
        throw new Error("Patient lead not found");
      }
      const data = await leadRes.json();
      if (data.lead) {
        applyLeadData(data.lead);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load lead details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [leadId, router]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({
      ...prev,
      [name]: value,
    }));
  };

  useEffect(() => {
    const score = calculateLeadScore({
      husbandAge: formData.husbandAge,
      wifeAge: formData.wifeAge,
      preMedicalConditions: formData.preMedicalConditions,
      marriedSince: formData.marriedSince,
      tryingToConceiveYears: formData.tryingToConceiveYears,
      whenPlanningToStartTreatment: formData.whenPlanningToStartTreatment,
    });
    setFormData((prev: any) => (prev.leadScore !== score ? { ...prev, leadScore: score } : prev));
  }, [
    formData.husbandAge,
    formData.wifeAge,
    formData.preMedicalConditions,
    formData.marriedSince,
    formData.tryingToConceiveYears,
    formData.whenPlanningToStartTreatment,
  ]);

  const handleCampaignNameChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const camp = e.target.value;
    const mapping = CAMPAIGN_TO_INFO[camp];
    setFormData((prev: any) => ({
      ...prev,
      campaignName: camp,
      source: mapping?.source || prev.source,
      sourceName: mapping?.sourceName || prev.sourceName,
    }));
  };

  const handleSourceNameChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const sName = e.target.value;
    const mapping = SOURCE_NAME_TO_INFO[sName];
    setFormData((prev: any) => ({
      ...prev,
      sourceName: sName,
      campaignName: mapping?.campaignName || prev.campaignName,
      source: mapping?.source || prev.source,
    }));
  };

  const handleCampLocationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const camp = e.target.value;
    if (camp === "NA") {
      setFormData((prev: any) => ({
        ...prev,
        campLocation: camp,
        centreLocation: "",
        centreAddress: "",
      }));
    } else if (CAMP_TO_CENTRE_MAP[camp]) {
      const centre = CAMP_TO_CENTRE_MAP[camp];
      setFormData((prev: any) => ({
        ...prev,
        campLocation: camp,
        centreLocation: centre,
        centreAddress: centre ? `${centre} Centre Location Link` : prev.centreAddress,
      }));
    } else {
      setFormData((prev: any) => ({
        ...prev,
        campLocation: camp,
      }));
    }
  };

  const handleCentreLocationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const centre = e.target.value;
    setFormData((prev: any) => ({
      ...prev,
      centreLocation: centre,
      centreAddress: centre ? `${centre} Centre Location Link` : "",
    }));
  };

  const handleSubStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const sub = e.target.value;
    const mapping =
      subDispositionMappings[sub] ||
      SUB_DISPOSITIONS_MAP[sub] || {
        disposition: "",
        validStatus: "",
      };

    setFormData((prev: any) => {
      const updated: any = {
        ...prev,
        subStatus: sub,
        leadStage: mapping.disposition,
        leadValidStatus: mapping.validStatus,
      };
      if (mapping.disposition === "Converted" || mapping.disposition === "Closed") {
        updated.followUpDateTime = "";
      }
      return updated;
    });
  };

  const handleAgeChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: "husbandAge" | "wifeAge"
  ) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 2);
    setFormData((prev: any) => ({ ...prev, [field]: raw }));
  };

  const handleNumberOnlyChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: "marriedSince" | "tryingToConceiveYears"
  ) => {
    const raw = e.target.value.replace(/\D/g, "");
    setFormData((prev: any) => ({ ...prev, [field]: raw }));
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const primaryFull = primaryRawPhone ? `${primaryCountryCode} ${primaryRawPhone}`.trim() : "";
      const secondaryFull = secondaryRawPhone ? `${secondaryCountryCode} ${secondaryRawPhone}`.trim() : "";
      const whatsappFull = whatsappRawPhone ? `${whatsappCountryCode} ${whatsappRawPhone}`.trim() : "";
      const otherFull = otherRawPhone ? `${otherCountryCode} ${otherRawPhone}`.trim() : "";

      const res = await fetch(`/api/mis/leads/${leadId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          primaryMobileNumber: primaryFull,
          secondaryMobileNumber: secondaryFull,
          whatsappMobileNumber: whatsappFull,
          otherNumbers: otherFull,
          customFields: customFieldValues,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save lead changes");
      }

      if (data.lead?.auditLogs) {
        setAuditLogs(data.lead.auditLogs);
      }
      if (data.lead?.notesHistory) {
        setNotesHistory(data.lead.notesHistory);
      }

      setToastMessage("Lead details updated successfully!");
      setIsEditModalOpen(false);
      notifyLeadUpdated();
      setTimeout(() => setToastMessage(""), 4000);
    } catch (err: any) {
      setError(err.message || "Failed to update lead");
    } finally {
      setSaving(false);
    }
  };

  const handleAddQuickNote = async (noteText: string) => {
    const res = await fetch(`/api/mis/leads/${leadId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...formData,
        notes: noteText,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Failed to submit note");
    }

    if (data.lead?.auditLogs) {
      setAuditLogs(data.lead.auditLogs);
    }
    if (data.lead?.notesHistory) {
      setNotesHistory(data.lead.notesHistory);
    }
    setFormData((prev: any) => ({ ...prev, notes: noteText }));
    setToastMessage("Note added successfully!");
    notifyLeadUpdated();
    setTimeout(() => setToastMessage(""), 4000);
  };

  const handleDelete = async () => {
    setDeleting(true);
    setError("");

    try {
      const res = await fetch(`/api/mis/leads/${leadId}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete lead");
      }

      notifyLeadUpdated();
      router.push("/mis/leads");
    } catch (err: any) {
      setError(err.message || "Failed to delete lead");
      setDeleting(false);
      setIsConfirmDeleteOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#cc2727]/30 border-t-[#cc2727] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <MISSidebar activeTab="leads" user={user} onLogout={() => router.push("/mis/login")} />

      <div className="flex-1 flex flex-col min-w-0 pb-16">
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-6 py-3.5 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <Link
              href="/mis/leads"
              className="p-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-slate-900">
                  {formData.wifeName || formData.husbandName || "Lead Details"}
                </h1>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#cc2727]/10 text-[#cc2727] border border-[#cc2727]/20 font-mono font-bold">
                  {formData.uniqueId || "N/A"}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Created: <span className="font-semibold text-slate-700">{formData.createdOn || "-"}</span> | Center: <span className="font-semibold text-slate-700">{formData.centreLocation || "NA"}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(true)}
              className="py-1.5 px-3.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5 text-slate-500" />
              <span>Edit Lead</span>
            </button>

            <button
              type="button"
              onClick={() => setIsConfirmDeleteOpen(true)}
              className="py-1.5 px-3 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Delete</span>
            </button>
          </div>
        </header>

        {/* LeadSquared Main View Body */}
        <main className="p-4 sm:p-6 lg:p-7 space-y-5 max-w-[1700px] w-full mx-auto">
          {toastMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-3 animate-in fade-in text-xs font-medium">
              <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{toastMessage}</span>
            </div>
          )}

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-3 text-xs font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* 2-Column LeadSquared Layout (Screenshot 1, 2, 3 Match) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left 8 Cols: Tabs Header + Active Tab Content */}
            <div className="lg:col-span-8 space-y-4">
              <LeadSquaredTabsHeader activeTab={activeTab} onTabChange={setActiveTab} />

              {/* Tab 1: Activity History */}
              {activeTab === "activity_history" && (
                <LeadSquaredActivityHistory
                  auditLogs={auditLogs}
                  leadData={formData}
                />
              )}

              {/* Tab 2: Audit Trail */}
              {activeTab === "audit_trail" && (
                <LeadSquaredAuditTrail
                  auditLogs={auditLogs}
                  leadUniqueId={formData.uniqueId}
                />
              )}

              {/* Tab 3: Lead Details */}
              {activeTab === "lead_details" && (
                <LeadSquaredLeadDetails
                  formData={formData}
                  onEditClick={() => setIsEditModalOpen(true)}
                  hideEmptyFields={hideEmptyFields}
                  onToggleHideEmpty={() => setHideEmptyFields((prev) => !prev)}
                />
              )}

              </div>

            {/* Right 4 Cols: LeadSquared Notes Stream (Exact match to Screenshot Right Panel) */}
            <div className="lg:col-span-4 sticky top-20">
              <LeadSquaredNotes
                notesHistory={notesHistory}
                currentNotes={formData.notes}
                onAddNoteClick={() => setIsAddNoteModalOpen(true)}
                leadUniqueId={formData.uniqueId}
              />
            </div>
          </div>
        </main>
        <Footer />
      </div>

      {/* Quick Add Note Modal */}
      <AddNoteModal
        isOpen={isAddNoteModalOpen}
        onClose={() => setIsAddNoteModalOpen(false)}
        onSubmit={handleAddQuickNote}
        patientName={formData.wifeName || formData.husbandName}
        leadUniqueId={formData.uniqueId}
      />

      {/* Edit Full Lead Modal */}
      <EditLeadModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        formData={formData}
        handleChange={handleChange}
        handleCampaignNameChange={handleCampaignNameChange}
        handleSourceNameChange={handleSourceNameChange}
        handleCampLocationChange={handleCampLocationChange}
        handleCentreLocationChange={handleCentreLocationChange}
        handleSubStatusChange={handleSubStatusChange}
        handleAgeChange={handleAgeChange}
        handleNumberOnlyChange={handleNumberOnlyChange}
        handleSave={handleSave}
        saving={saving}
        callerOptions={callerOptions}
      />

      {/* Delete Confirmation Modal */}
      {isConfirmDeleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-black">Delete Patient Lead</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to permanently delete lead{" "}
                <span className="font-bold text-black">{formData.wifeName || formData.uniqueId}</span>?
                This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmDeleteOpen(false)}
                className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-black text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDelete}
                className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-lg shadow-rose-600/20 cursor-pointer"
              >
                {deleting ? (
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>Delete Lead</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
