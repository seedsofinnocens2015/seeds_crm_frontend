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
} from "lucide-react";
import MISSidebar from "@/app/components/MISSidebar";
import Footer from "@/app/components/Footer";
import LeadAuditHistory, { AuditLog } from "@/app/components/LeadAuditHistory";
import NotesHistory, { NoteHistoryItem } from "@/app/components/NotesHistory";
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
  formatDateToDDMMMYY,
  parseDDMMMYYToISO,
  getTodayDDMMMYY,
  getFormattedTimestamp,
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
  const [error, setError] = useState("");
  const [toastMessage, setToastMessage] = useState("");
  const [callerOptions, setCallerOptions] = useState<string[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [notesHistory, setNotesHistory] = useState<NoteHistoryItem[]>([]);
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
    // Phone splits
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
      notes: "", // keep clean for new remarks entry
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

  useEffect(() => {
    async function loadData() {
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
        if (!meData.user || (meData.user.role !== "mis" && meData.user.role !== "admin")) {
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
    }

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

  // Auto-calculate Lead Score based on the 6 clinical/demographic criteria
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
      // If NA is selected, do not autofill centre location, let user manually choose
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

  const handleCustomFieldChange = (fieldId: string, value: any) => {
    setCustomFieldValues((prev) => ({
      ...prev,
      [fieldId]: value,
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
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

      setFormData((prev: any) => ({
        ...prev,
        notes: "",
      }));
      setToastMessage("Lead details updated successfully!");
      notifyLeadUpdated();
      setTimeout(() => setToastMessage(""), 4000);
    } catch (err: any) {
      setError(err.message || "Failed to update lead");
    } finally {
      setSaving(false);
    }
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

  const renderDynamicSectionFields = (sectionId: 1 | 2 | 3 | 4) => {
    const customFieldsInSec = formFields.filter(
      (f) => f.section === sectionId && !f.isSystem && f.enabled !== false
    );
    if (customFieldsInSec.length === 0) return null;

    return (
      <div className="pt-3 border-t border-slate-200 mt-4">
        <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-2">
          Custom Added Fields
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {customFieldsInSec.map((f) => (
            <div key={f.id} className={f.type === "textarea" ? "sm:col-span-2" : ""}>
              <label className="block text-xs font-semibold text-black mb-1.5">
                {f.label} {f.required && <span className="text-rose-600">*</span>}
              </label>

              {f.type === "select" ? (
                <select
                  required={f.required}
                  value={customFieldValues[f.id] || ""}
                  onChange={(e) => handleCustomFieldChange(f.id, e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-xs focus:outline-none focus:ring-2 focus:ring-[#cc2727]"
                >
                  <option value="">Select {f.label}</option>
                  {(f.options || []).map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              ) : f.type === "textarea" ? (
                <textarea
                  required={f.required}
                  rows={3}
                  value={customFieldValues[f.id] || ""}
                  onChange={(e) => handleCustomFieldChange(f.id, e.target.value)}
                  placeholder={f.placeholder || ""}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-xs focus:outline-none focus:ring-2 focus:ring-[#cc2727] resize-none"
                />
              ) : (
                <input
                  required={f.required}
                  type={f.type || "text"}
                  value={customFieldValues[f.id] || ""}
                  onChange={(e) => handleCustomFieldChange(f.id, e.target.value)}
                  placeholder={f.placeholder || ""}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-xs focus:outline-none focus:ring-2 focus:ring-[#cc2727]"
                />
              )}
            </div>
          ))}
        </div>
      </div>
    );
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
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200 px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/mis/leads"
              className="p-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-black">
                  {formData.wifeName || formData.husbandName || "Lead Details"}
                </h1>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#cc2727]/10 text-[#cc2727] border border-[#cc2727]/20 font-mono font-bold">
                  {formData.uniqueId}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Lead ID: <span className="font-mono font-bold text-[#cc2727]">{formData.uniqueId || "N/A"}</span> | Created: {formData.createdOn || "-"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setIsConfirmDeleteOpen(true)}
              className="py-2 px-3 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Delete</span>
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="py-2 px-4 bg-[#cc2727] hover:bg-[#b02121] text-white text-xs font-semibold rounded-xl flex items-center gap-2 shadow-lg shadow-[#cc2727]/20 transition-all active:scale-95 disabled:opacity-50"
            >
              {saving ? (
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              <span>Save Changes</span>
            </button>
          </div>
        </header>

        {/* Form Body */}
        <main className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] w-full mx-auto">
          {toastMessage && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-3 animate-in fade-in">
              <CheckCircle className="w-5 h-5 shrink-0" />
              <span className="text-sm font-medium">{toastMessage}</span>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span className="text-sm font-medium">{error}</span>
            </div>
          )}

          {/* Patient Overview Summary */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-[#cc2727]/10 text-[#cc2727] border border-[#cc2727]/20 flex items-center justify-center font-extrabold text-2xl uppercase shrink-0">
                {formData.wifeName ? formData.wifeName.charAt(0) : "W"}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-black">
                    {formData.wifeName} {formData.husbandName ? `& ${formData.husbandName}` : ""}
                  </h2>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono font-bold">
                    Age: {formData.wifeAge || "-"} / {formData.husbandAge || "-"}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-slate-600">
                  <span className="font-mono font-semibold text-slate-800">
                    📞 {formData.primaryMobileNumber || "-"}
                  </span>
                  <span>📍 {formData.centreLocation || "Centre Not Assigned"}</span>
                  <span className="font-semibold text-indigo-700">
                    ⏱️ Age: {formData.leadAge || "0 days"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs px-3 py-1 rounded-lg font-bold bg-[#cc2727]/10 text-[#cc2727] border border-[#cc2727]/20">
                Stage: {formData.leadStage || "Pending"}
              </span>
              <span className="text-xs px-3 py-1 rounded-lg font-bold bg-slate-100 text-slate-800 border border-slate-200">
                Status: {formData.leadValidStatus || "NA"}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 cols: Main Form */}
            <div className="lg:col-span-2 space-y-6">
              <form onSubmit={handleSave} className="space-y-6">
                {/* Section 1: Lead Identification & Overview */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                  <div className="border-b border-slate-200 pb-3 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#cc2727]" />
                    <h3 className="text-sm font-bold text-black uppercase tracking-wider">
                      1. Lead Identification & Overview
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Unique ID / Lead ID */}
                    <div>
                      <label className="block text-xs font-semibold text-black mb-1.5">
                        Lead ID
                      </label>
                      <input
                        type="text"
                        readOnly
                        value={formData.uniqueId}
                        className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-300 rounded-xl text-[#cc2727] text-xs font-mono font-bold cursor-not-allowed"
                      />
                    </div>

                    {/* First Activity Date */}
                    <div>
                      <label className="block text-xs font-semibold text-black mb-1.5">
                        First Activity Date
                      </label>
                      <input
                        type="text"
                        readOnly
                        value={formData.firstActivityDate ? new Date(formData.firstActivityDate).toLocaleString() : "Auto-filled"}
                        className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-300 rounded-xl text-black text-xs font-medium cursor-not-allowed"
                      />
                    </div>

                    {/* Lead Source / UTM Source */}
                    <div>
                      <label className="block text-xs font-semibold text-black mb-1.5">
                        Lead Source / UTM Source *
                      </label>
                      <select
                        required
                        name="leadSource"
                        value={formData.leadSource}
                        onChange={handleChange}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#cc2727]"
                      >
                        <option value="">Select Lead Source</option>
                        {LEAD_SOURCES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Campaign Name */}
                    <div>
                      <label className="block text-xs font-semibold text-black mb-1.5">
                        Campaign Name *
                      </label>
                      <select
                        required
                        name="campaignName"
                        value={formData.campaignName}
                        onChange={handleCampaignNameChange}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#cc2727]"
                      >
                        <option value="">Select Campaign</option>
                        {CAMPAIGN_NAMES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Source Name */}
                    <div>
                      <label className="block text-xs font-semibold text-black mb-1.5">
                        Source Name
                      </label>
                      <select
                        name="sourceName"
                        value={formData.sourceName}
                        onChange={handleSourceNameChange}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-xs font-medium font-mono focus:outline-none focus:ring-2 focus:ring-[#cc2727]"
                      >
                        <option value="">Select Source Name</option>
                        {SOURCE_NAMES.map((sn) => (
                          <option key={sn} value={sn}>
                            {sn}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Source */}
                    <div>
                      <label className="block text-xs font-semibold text-black mb-1.5">
                        Source *
                      </label>
                      <select
                        required
                        name="source"
                        value={formData.source}
                        onChange={handleChange}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#cc2727]"
                      >
                        {GENERAL_SOURCES.map((src) => (
                          <option key={src} value={src}>
                            {src}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Lead Score */}
                    <div>
                      <label className="block text-xs font-semibold text-black mb-1.5">
                        Lead Score *
                      </label>
                      <input
                        type="text"
                        readOnly
                        name="leadScore"
                        value={formData.leadScore}
                        className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-300 rounded-xl text-amber-700 font-bold text-xs font-mono cursor-not-allowed"
                      />
                    </div>

                    {/* Lead Owner */}
                    <div>
                      <label className="block text-xs font-semibold text-black mb-1.5">
                        Lead Owner *
                      </label>
                      <select
                        name="leadOwner"
                        value={formData.leadOwner}
                        onChange={handleChange}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#cc2727]"
                      >
                        <option value="">Select Lead Owner</option>
                        {callerOptions.map((name) => (
                          <option key={name} value={name}>
                            {name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Lead Age */}
                    <div>
                      <label className="block text-xs font-semibold text-black mb-1.5">
                        Lead Age (Today - Created)
                      </label>
                      <input
                        type="text"
                        readOnly
                        value={formData.leadAge}
                        className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-300 rounded-xl text-black text-xs font-medium cursor-not-allowed"
                      />
                    </div>
                  </div>

                  {renderDynamicSectionFields(1)}
                </div>

                {/* Section 2: Couple Profile & Medical Details */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                  <div className="border-b border-slate-200 pb-3 flex items-center gap-2">
                    <Heart className="w-4 h-4 text-[#cc2727]" />
                    <h3 className="text-sm font-bold text-black uppercase tracking-wider">
                      2. Couple Profile & Medical Details
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Husband Name */}
                    <div>
                      <label className="block text-xs font-semibold text-black mb-1.5">
                        Husband Name *
                      </label>
                      <input
                        type="text"
                        required
                        name="husbandName"
                        value={formData.husbandName}
                        onChange={handleChange}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-xs focus:outline-none focus:ring-2 focus:ring-[#cc2727]"
                      />
                    </div>

                    {/* Wife Name */}
                    <div>
                      <label className="block text-xs font-semibold text-black mb-1.5">
                        Wife Name *
                      </label>
                      <input
                        type="text"
                        required
                        name="wifeName"
                        value={formData.wifeName}
                        onChange={handleChange}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-xs focus:outline-none focus:ring-2 focus:ring-[#cc2727]"
                      />
                    </div>

                    {/* Husband Age (2 digits) */}
                    <div>
                      <label className="block text-xs font-semibold text-black mb-1.5">
                        Husband Age (2 Digits) *
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={2}
                        value={formData.husbandAge}
                        onChange={(e) => handleAgeChange(e, "husbandAge")}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#cc2727]"
                      />
                    </div>

                    {/* Wife Age (2 digits) */}
                    <div>
                      <label className="block text-xs font-semibold text-black mb-1.5">
                        Wife Age (2 Digits) *
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={2}
                        value={formData.wifeAge}
                        onChange={(e) => handleAgeChange(e, "wifeAge")}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#cc2727]"
                      />
                    </div>

                    {/* When are you planning to start treatment */}
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-black mb-1.5">
                        When are you planning to start treatment
                      </label>
                      <select
                        name="whenPlanningToStartTreatment"
                        value={formData.whenPlanningToStartTreatment}
                        onChange={handleChange}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-xs focus:outline-none focus:ring-2 focus:ring-[#cc2727]"
                      >
                        <option value="">Select Timeline</option>
                        {WHEN_START_TREATMENT_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Pre Medical Conditions (Yes/No) */}
                    <div>
                      <label className="block text-xs font-semibold text-black mb-1.5">
                        Pre Medical Conditions *
                      </label>
                      <select
                        required
                        name="preMedicalConditions"
                        value={formData.preMedicalConditions}
                        onChange={handleChange}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-xs focus:outline-none focus:ring-2 focus:ring-[#cc2727]"
                      >
                        <option value="No">No</option>
                        <option value="Yes">Yes</option>
                      </select>
                    </div>

                    {/* Married Since (Numbers only) */}
                    <div>
                      <label className="block text-xs font-semibold text-black mb-1.5">
                        Married Since (Years) *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.marriedSince}
                        onChange={(e) => handleNumberOnlyChange(e, "marriedSince")}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#cc2727]"
                      />
                    </div>

                    {/* How long you are trying to conceive */}
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-black mb-1.5">
                        How long you are trying to conceive (Years) *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.tryingToConceiveYears}
                        onChange={(e) => handleNumberOnlyChange(e, "tryingToConceiveYears")}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#cc2727]"
                      />
                    </div>
                  </div>
                  {renderDynamicSectionFields(2)}
                </div>

                {/* Section 3: Contact & Address Information */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                  <div className="border-b border-slate-200 pb-3 flex items-center gap-2">
                    <Phone className="w-4 h-4 text-[#cc2727]" />
                    <h3 className="text-sm font-bold text-black uppercase tracking-wider">
                      3. Contact & Address Information
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Primary Mobile Number (Wife) */}
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-black mb-1.5">
                        Primary Mobile number (Wife) *
                      </label>
                      <div className="flex gap-2">
                        <select
                          value={primaryCountryCode}
                          onChange={(e) => setPrimaryCountryCode(e.target.value)}
                          className="w-28 px-2 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#cc2727]"
                        >
                          {COUNTRY_CODES.map((c) => (
                            <option key={c.code} value={c.code}>
                              {c.code}
                            </option>
                          ))}
                        </select>
                        <input
                          type="tel"
                          required
                          value={primaryRawPhone}
                          onChange={(e) => setPrimaryRawPhone(e.target.value.replace(/\D/g, ""))}
                          className="flex-1 px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#cc2727]"
                        />
                      </div>
                    </div>

                    {/* Secondary Mobile Number */}
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-black mb-1.5">
                        Secondary Mobile number
                      </label>
                      <div className="flex gap-2">
                        <select
                          value={secondaryCountryCode}
                          onChange={(e) => setSecondaryCountryCode(e.target.value)}
                          className="w-28 px-2 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#cc2727]"
                        >
                          {COUNTRY_CODES.map((c) => (
                            <option key={c.code} value={c.code}>
                              {c.code}
                            </option>
                          ))}
                        </select>
                        <input
                          type="tel"
                          value={secondaryRawPhone}
                          onChange={(e) => setSecondaryRawPhone(e.target.value.replace(/\D/g, ""))}
                          className="flex-1 px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#cc2727]"
                        />
                      </div>
                    </div>

                    {/* Whatsapp Mobile Number */}
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-black mb-1.5">
                        Whatsapp Mobile Number
                      </label>
                      <div className="flex gap-2">
                        <select
                          value={whatsappCountryCode}
                          onChange={(e) => setWhatsappCountryCode(e.target.value)}
                          className="w-28 px-2 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#cc2727]"
                        >
                          {COUNTRY_CODES.map((c) => (
                            <option key={c.code} value={c.code}>
                              {c.code}
                            </option>
                          ))}
                        </select>
                        <input
                          type="tel"
                          value={whatsappRawPhone}
                          onChange={(e) => setWhatsappRawPhone(e.target.value.replace(/\D/g, ""))}
                          className="flex-1 px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#cc2727]"
                        />
                      </div>
                    </div>

                    {/* Other Numbers */}
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-black mb-1.5">
                        Other Numbers
                      </label>
                      <div className="flex gap-2">
                        <select
                          value={otherCountryCode}
                          onChange={(e) => setOtherCountryCode(e.target.value)}
                          className="w-28 px-2 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#cc2727]"
                        >
                          {COUNTRY_CODES.map((c) => (
                            <option key={c.code} value={c.code}>
                              {c.code}
                            </option>
                          ))}
                        </select>
                        <input
                          type="tel"
                          value={otherRawPhone}
                          onChange={(e) => setOtherRawPhone(e.target.value.replace(/\D/g, ""))}
                          className="flex-1 px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#cc2727]"
                        />
                      </div>
                    </div>

                    {/* Primary Email */}
                    <div>
                      <label className="block text-xs font-semibold text-black mb-1.5">
                        Primary Email (Pt Email)
                      </label>
                      <input
                        type="email"
                        name="primaryEmail"
                        value={formData.primaryEmail}
                        onChange={handleChange}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-xs focus:outline-none focus:ring-2 focus:ring-[#cc2727]"
                      />
                    </div>

                    {/* Secondary Email */}
                    <div>
                      <label className="block text-xs font-semibold text-black mb-1.5">
                        Secondary Email (Spouse)
                      </label>
                      <input
                        type="email"
                        name="secondaryEmail"
                        value={formData.secondaryEmail}
                        onChange={handleChange}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-xs focus:outline-none focus:ring-2 focus:ring-[#cc2727]"
                      />
                    </div>

                    {/* Whatsapp Consent */}
                    <div>
                      <label className="block text-xs font-semibold text-black mb-1.5">
                        Whatsapp Consent
                      </label>
                      <select
                        name="whatsappConsent"
                        value={formData.whatsappConsent}
                        onChange={handleChange}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-xs focus:outline-none focus:ring-2 focus:ring-[#cc2727]"
                      >
                        <option value="No">No</option>
                        <option value="Yes">Yes</option>
                      </select>
                    </div>

                    {/* Calling Consent */}
                    <div>
                      <label className="block text-xs font-semibold text-black mb-1.5">
                        Calling Consent
                      </label>
                      <select
                        name="callingConsent"
                        value={formData.callingConsent}
                        onChange={handleChange}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-xs focus:outline-none focus:ring-2 focus:ring-[#cc2727]"
                      >
                        <option value="No">No</option>
                        <option value="Yes">Yes</option>
                      </select>
                    </div>

                    {/* Pt Address */}
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-black mb-1.5">
                        Pt Address
                      </label>
                      <input
                        type="text"
                        name="ptAddress"
                        value={formData.ptAddress}
                        onChange={handleChange}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-xs focus:outline-none focus:ring-2 focus:ring-[#cc2727]"
                      />
                    </div>

                    {/* Pt Pincode */}
                    <div>
                      <label className="block text-xs font-semibold text-black mb-1.5">
                        Pt Pincode
                      </label>
                      <input
                        type="text"
                        name="ptPincode"
                        value={formData.ptPincode}
                        onChange={handleChange}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#cc2727]"
                      />
                    </div>

                    {/* Pt Country */}
                    <div>
                      <label className="block text-xs font-semibold text-black mb-1.5">
                        Pt Country
                      </label>
                      <input
                        type="text"
                        name="ptCountry"
                        value={formData.ptCountry}
                        onChange={handleChange}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-xs focus:outline-none focus:ring-2 focus:ring-[#cc2727]"
                      />
                    </div>

                    {/* Pt State */}
                    <div>
                      <label className="block text-xs font-semibold text-black mb-1.5">
                        Pt State
                      </label>
                      <input
                        type="text"
                        name="ptState"
                        value={formData.ptState}
                        onChange={handleChange}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-xs focus:outline-none focus:ring-2 focus:ring-[#cc2727]"
                      />
                    </div>

                    {/* Pt City */}
                    <div>
                      <label className="block text-xs font-semibold text-black mb-1.5">
                        Pt City
                      </label>
                      <input
                        type="text"
                        name="ptCity"
                        value={formData.ptCity}
                        onChange={handleChange}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-xs focus:outline-none focus:ring-2 focus:ring-[#cc2727]"
                      />
                    </div>
                  </div>
                  {renderDynamicSectionFields(3)}
                </div>

                {/* Section 4: Disposition, Centre, Visits & Registration */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                  <div className="border-b border-slate-200 pb-3 flex items-center gap-2">
                    <Building className="w-4 h-4 text-[#cc2727]" />
                    <h3 className="text-sm font-bold text-black uppercase tracking-wider">
                      4. Disposition, Centre, Visits & Registration
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Sub Status */}
                    <div>
                      <label className="block text-xs font-semibold text-black mb-1.5">
                        Sub Status *
                      </label>
                      <select
                        required
                        name="subStatus"
                        value={formData.subStatus}
                        onChange={handleSubStatusChange}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-xs focus:outline-none focus:ring-2 focus:ring-[#cc2727] font-semibold"
                      >
                        <option value="">Select Sub Status</option>
                        {Object.keys(SUB_DISPOSITIONS_MAP).map((sub) => (
                          <option key={sub} value={sub}>
                            {sub}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Lead Stage (Autofilled) */}
                    <div>
                      <label className="block text-xs font-semibold text-black mb-1.5">
                        Lead Stage (Autofilled)
                      </label>
                      <input
                        type="text"
                        readOnly
                        value={formData.leadStage}
                        className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-300 rounded-xl text-[#cc2727] font-bold text-xs cursor-not-allowed"
                      />
                    </div>

                    {/* Lead Valid Status (Autofilled) */}
                    <div>
                      <label className="block text-xs font-semibold text-black mb-1.5">
                        Lead Valid Status (Autofilled)
                      </label>
                      <input
                        type="text"
                        readOnly
                        value={formData.leadValidStatus}
                        className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-300 rounded-xl text-slate-800 font-bold text-xs cursor-not-allowed"
                      />
                    </div>

                    {/* Camp Location */}
                    <div>
                      <label className="block text-xs font-semibold text-black mb-1.5">
                        Camp Location (Optional)
                      </label>
                      <select
                        name="campLocation"
                        value={formData.campLocation}
                        onChange={handleCampLocationChange}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-xs focus:outline-none focus:ring-2 focus:ring-[#cc2727]"
                      >
                        <option value="">Select Camp Location</option>
                        {CAMP_LOCATIONS.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Centre Location */}
                    <div>
                      <label className="block text-xs font-semibold text-black mb-1.5">
                        Centre Location *
                      </label>
                      <select
                        required
                        name="centreLocation"
                        value={formData.centreLocation}
                        onChange={handleCentreLocationChange}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-xs focus:outline-none focus:ring-2 focus:ring-[#cc2727] font-semibold"
                      >
                        <option value="">Select Centre</option>
                        {CENTRE_LOCATIONS.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Centre Address */}
                    <div>
                      <label className="block text-xs font-semibold text-black mb-1.5">
                        Centre Address *
                      </label>
                      <input
                        type="text"
                        name="centreAddress"
                        value={formData.centreAddress}
                        onChange={handleChange}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-xs focus:outline-none focus:ring-2 focus:ring-[#cc2727]"
                      />
                    </div>

                    {/* Follow Up Date and Time */}
                    <div>
                      <label className="block text-xs font-semibold text-black mb-1.5">
                        Follow Up Date and Time
                      </label>
                      <input
                        type="datetime-local"
                        name="followUpDateTime"
                        value={formData.followUpDateTime}
                        onChange={handleChange}
                        disabled={formData.leadStage === "Converted" || formData.leadStage === "Closed"}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-xs focus:outline-none focus:ring-2 focus:ring-[#cc2727] disabled:bg-slate-100 disabled:cursor-not-allowed"
                      />
                    </div>

                    {/* Appointment Date */}
                    <div>
                      <label className="block text-xs font-semibold text-black mb-1.5">
                        Appointment Date
                      </label>
                      <input
                        type="date"
                        name="appointmentDate"
                        value={formData.appointmentDate}
                        onChange={handleChange}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-xs focus:outline-none focus:ring-2 focus:ring-[#cc2727]"
                      />
                    </div>

                    {/* Centre Visited Date */}
                    <div>
                      <label className="block text-xs font-semibold text-black mb-1.5">
                        Centre Visited Date {(formData.subStatus === "Visited Centre" || formData.subStatus === "Visited at Centre") && <span className="text-rose-600">*</span>}
                      </label>
                      <input
                        type="date"
                        name="centreVisitedDate"
                        required={(formData.subStatus === "Visited Centre" || formData.subStatus === "Visited at Centre")}
                        value={formData.centreVisitedDate}
                        onChange={handleChange}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-xs focus:outline-none focus:ring-2 focus:ring-[#cc2727]"
                      />
                    </div>

                    {/* Camp Visited Date */}
                    <div>
                      <label className="block text-xs font-semibold text-black mb-1.5">
                        Camp Visited Date {(formData.subStatus === "Visited Camp" || formData.subStatus === "Visited at Camp") && <span className="text-rose-600">*</span>}
                      </label>
                      <input
                        type="date"
                        name="campVisitedDate"
                        required={(formData.subStatus === "Visited Camp" || formData.subStatus === "Visited at Camp")}
                        value={formData.campVisitedDate}
                        onChange={handleChange}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-xs focus:outline-none focus:ring-2 focus:ring-[#cc2727]"
                      />
                    </div>

                    {/* Registration Status */}
                    <div>
                      <label className="block text-xs font-semibold text-black mb-1.5">
                        Registration Status
                      </label>
                      <select
                        name="registrationStatus"
                        value={formData.registrationStatus}
                        onChange={handleChange}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-xs focus:outline-none focus:ring-2 focus:ring-[#cc2727]"
                      >
                        <option value="No">No</option>
                        <option value="Yes">Yes</option>
                      </select>
                    </div>

                    {/* Registration Number */}
                    <div>
                      <label className="block text-xs font-semibold text-black mb-1.5">
                        Registration Number
                      </label>
                      <input
                        type="text"
                        name="registrationNumber"
                        value={formData.registrationNumber}
                        onChange={handleChange}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#cc2727]"
                      />
                    </div>

                    {/* Registration Amount */}
                    <div>
                      <label className="block text-xs font-semibold text-black mb-1.5">
                        Registration Amount
                      </label>
                      <input
                        type="text"
                        name="registrationAmount"
                        value={formData.registrationAmount}
                        onChange={handleChange}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#cc2727]"
                      />
                    </div>

                    {/* Package */}
                    <div>
                      <label className="block text-xs font-semibold text-black mb-1.5">
                        Package
                      </label>
                      <input
                        type="text"
                        name="package"
                        value={formData.package}
                        onChange={handleChange}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-xs focus:outline-none focus:ring-2 focus:ring-[#cc2727]"
                      />
                    </div>

                    {/* Plan */}
                    <div>
                      <label className="block text-xs font-semibold text-black mb-1.5">
                        Plan
                      </label>
                      <input
                        type="text"
                        name="plan"
                        value={formData.plan}
                        onChange={handleChange}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-xs focus:outline-none focus:ring-2 focus:ring-[#cc2727]"
                      />
                    </div>
                  </div>
                  {renderDynamicSectionFields(4)}
                </div>

                {/* Section 5: Notes & Observations */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                  <div className="border-b border-slate-200 pb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#cc2727]" />
                    <h3 className="text-sm font-bold text-black uppercase tracking-wider">
                      5. Notes & Observations *
                    </h3>
                  </div>
                  <div>
                    <textarea
                      name="notes"
                      rows={4}
                      value={formData.notes}
                      onChange={handleChange}
                      placeholder="Add new patient remarks, call observations or internal notes..."
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-xs focus:outline-none focus:ring-2 focus:ring-[#cc2727] resize-none"
                    />
                  </div>
                </div>

                {/* Bottom Save Bar */}
                <div className="flex items-center justify-between p-4 bg-white/90 border border-slate-200 rounded-2xl sticky bottom-4 z-20 backdrop-blur-md shadow-sm">
                  <span className="text-xs text-gray-500">
                    Modified: <span className="font-mono text-black font-semibold">{formData.modifiedOn || "Not modified yet"}</span>
                  </span>
                  <button
                    type="submit"
                    disabled={saving}
                    className="py-2.5 px-6 bg-[#cc2727] hover:bg-[#b02121] text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-[#cc2727]/25 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {saving ? (
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Save className="w-3.5 h-3.5" />
                    )}
                    <span>Save Changes</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Right 1 col: Notes History & Audit Logs */}
            <div className="space-y-6">
              <NotesHistory notesHistory={notesHistory} />
              <LeadAuditHistory auditLogs={auditLogs} />
            </div>
          </div>
        </main>
        <Footer />
      </div>

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
                className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-black text-xs font-semibold rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDelete}
                className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-lg shadow-rose-600/20"
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
