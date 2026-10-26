"use client";

import { useState, useEffect, useMemo } from "react";
import {
  X,
  UserPlus,
  Sparkles,
  AlertCircle,
  Clock,
  Phone,
  User,
  ExternalLink,
  ShieldAlert,
  MapPin,
  Calendar,
  Building,
  Heart,
  FileText,
} from "lucide-react";
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
  getCurrentMonthMMMYY,
  getFormattedTimestamp,
  notifyLeadUpdated,
} from "@/lib/leadOptions";
import { IFormField } from "@/types/formConfig";
import { DEFAULT_FORM_FIELDS } from "@/lib/defaultFormFields";

interface AddLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLeadAdded: (lead: any) => void;
  suggestedUniqueId?: string;
  existingLeads?: any[];
  defaultCallerName?: string; // auto-fill for agent panel
}

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

export default function AddLeadModal({
  isOpen,
  onClose,
  onLeadAdded,
  suggestedUniqueId,
  existingLeads,
  defaultCallerName,
}: AddLeadModalProps) {
  const [callerOptions, setCallerOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formFields, setFormFields] = useState<IFormField[]>(DEFAULT_FORM_FIELDS);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, any>>({});
  const [subDispositionMappings, setSubDispositionMappings] = useState<
    Record<string, { disposition: string; validStatus: string }>
  >({ ...SUB_DISPOSITIONS_MAP });

  // Country code selector states
  const [primaryCountryCode, setPrimaryCountryCode] = useState("+91");
  const [primaryRawPhone, setPrimaryRawPhone] = useState("");

  const [secondaryCountryCode, setSecondaryCountryCode] = useState("+91");
  const [secondaryRawPhone, setSecondaryRawPhone] = useState("");

  const [whatsappCountryCode, setWhatsappCountryCode] = useState("+91");
  const [whatsappRawPhone, setWhatsappRawPhone] = useState("");

  const [otherCountryCode, setOtherCountryCode] = useState("+91");
  const [otherRawPhone, setOtherRawPhone] = useState("");

  const [leadTimestamp, setLeadTimestamp] = useState<string>(getFormattedTimestamp());

  // Real-time duplicates tracking
  const [primaryDuplicates, setPrimaryDuplicates] = useState<any[]>([]);

  const getInitialFormData = (
    uid = suggestedUniqueId || "SOI-1",
    owner = defaultCallerName || ""
  ) => ({
    // Identification
    uniqueId: uid,
    firstActivityDate: getFormattedTimestamp(),

    // Couple Profile
    husbandName: "",
    wifeName: "",
    husbandAge: "",
    wifeAge: "",

    // Treatment & Clinical
    whenPlanningToStartTreatment: "",
    preMedicalConditions: "No",
    marriedSince: "",
    tryingToConceiveYears: "",

    // Emails
    primaryEmail: "",
    secondaryEmail: "",

    // Numbers
    primaryMobileNumber: "",
    secondaryMobileNumber: "",
    whatsappMobileNumber: "",
    otherNumbers: "",

    // Consents
    whatsappConsent: "No",
    callingConsent: "No",

    // Source & Attribution
    leadSource: "General",
    utmSource: "",
    campaignName: "General",
    sourceName: "",
    source: "General",
    leadScore: "0",

    // Dispositions
    subStatus: "",
    leadStage: "",
    leadValidStatus: "",

    // System
    createdBy: owner,
    createdOn: getFormattedTimestamp(),
    modifiedBy: owner,
    modifiedOn: getFormattedTimestamp(),

    // Address
    centreAddress: "",
    ptAddress: "",
    ptPincode: "",
    ptCountry: "India",
    ptState: "",
    ptCity: "",

    // Ownership & Dates
    leadOwner: owner,
    leadAge: "0 days",
    campLocation: "",
    centreLocation: "",
    followUpDateTime: "",
    centreVisitedDate: "",
    campVisitedDate: "",
    appointmentDate: "",

    // Registration & Plan
    registrationStatus: "No",
    registrationNumber: "",
    registrationAmount: "",
    package: "",
    plan: "",

    // Notes
    notes: "",
  });

  const [formData, setFormData] = useState(getInitialFormData());

  // Keep live timestamp updated
  useEffect(() => {
    if (!isOpen) return;
    const stamp = getFormattedTimestamp();
    setLeadTimestamp(stamp);
    const interval = setInterval(() => {
      setLeadTimestamp(getFormattedTimestamp());
    }, 10000);
    return () => clearInterval(interval);
  }, [isOpen]);

  // Clean reset on open
  useEffect(() => {
    if (isOpen) {
      setFormData(
        getInitialFormData(
          suggestedUniqueId || "SOI-1",
          defaultCallerName || ""
        )
      );
      setPrimaryCountryCode("+91");
      setPrimaryRawPhone("");
      setSecondaryCountryCode("+91");
      setSecondaryRawPhone("");
      setWhatsappCountryCode("+91");
      setWhatsappRawPhone("");
      setOtherCountryCode("+91");
      setOtherRawPhone("");
      setPrimaryDuplicates([]);
      setError("");

      const fetchConfigAndCallers = async () => {
        try {
          const cfgRes = await fetch("/api/admin/form-config");
          if (cfgRes.ok) {
            const cfgData = await cfgRes.json();
            if (cfgData.config?.fields && Array.isArray(cfgData.config.fields)) {
              setFormFields(cfgData.config.fields);
            }
            if (cfgData.config?.subDispositionMappings) {
              setSubDispositionMappings(cfgData.config.subDispositionMappings);
            }
          }
        } catch {}

        try {
          const res = await fetch("/api/admin/members");
          if (res.ok) {
            const data = await res.json();
            const names = (data.members || []).map((m: any) => m.name).filter(Boolean);
            setCallerOptions(names);
          }
        } catch {}
      };

      fetchConfigAndCallers();
    }
  }, [isOpen, suggestedUniqueId, defaultCallerName]);

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
    setFormData((prev) => (prev.leadScore !== score ? { ...prev, leadScore: score } : prev));
  }, [
    formData.husbandAge,
    formData.wifeAge,
    formData.preMedicalConditions,
    formData.marriedSince,
    formData.tryingToConceiveYears,
    formData.whenPlanningToStartTreatment,
  ]);

  // Campaign Name change -> Auto fills Source and Source Name
  const handleCampaignNameChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const camp = e.target.value;
    const mapping = CAMPAIGN_TO_INFO[camp];
    setFormData((prev) => ({
      ...prev,
      campaignName: camp,
      source: mapping?.source || prev.source,
      sourceName: mapping?.sourceName || prev.sourceName,
    }));
  };

  // Source Name change -> Auto fills Campaign Name and Source
  const handleSourceNameChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const sName = e.target.value;
    const mapping = SOURCE_NAME_TO_INFO[sName];
    setFormData((prev) => ({
      ...prev,
      sourceName: sName,
      campaignName: mapping?.campaignName || prev.campaignName,
      source: mapping?.source || prev.source,
    }));
  };

  // Handle Camp Location -> Centre Location Auto-fill
  const handleCampLocationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const camp = e.target.value;
    if (camp === "NA") {
      // If NA is selected, do not autofill centre location, let user manually choose
      setFormData((prev) => ({
        ...prev,
        campLocation: camp,
        centreLocation: "",
        centreAddress: "",
      }));
    } else if (CAMP_TO_CENTRE_MAP[camp]) {
      const centre = CAMP_TO_CENTRE_MAP[camp];
      setFormData((prev) => ({
        ...prev,
        campLocation: camp,
        centreLocation: centre,
        centreAddress: centre ? `${centre} Centre Location Link` : prev.centreAddress,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        campLocation: camp,
      }));
    }
  };

  // Handle Centre Location
  const handleCentreLocationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const centre = e.target.value;
    setFormData((prev) => ({
      ...prev,
      centreLocation: centre,
      centreAddress: centre ? `${centre} Centre Location Link` : "",
    }));
  };

  // Sub Status auto selection cascading
  const handleSubStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const sub = e.target.value;
    const mapping =
      subDispositionMappings[sub] ||
      SUB_DISPOSITIONS_MAP[sub] || {
        disposition: "",
        validStatus: "",
      };

    setFormData((prev) => {
      const updated: any = {
        ...prev,
        subStatus: sub,
        leadStage: mapping.disposition,
        leadValidStatus: mapping.validStatus,
      };

      // If stage becomes Converted or Closed, empty follow up date & time
      if (mapping.disposition === "Converted" || mapping.disposition === "Closed") {
        updated.followUpDateTime = "";
      }

      return updated;
    });
  };

  // Generic change handler
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Numbers only validator (marriedSince, tryingToConceiveYears)
  const handleNumberOnlyChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: "marriedSince" | "tryingToConceiveYears"
  ) => {
    const raw = e.target.value;
    const cleaned = raw.replace(/\D/g, "");
    setFormData((prev) => ({ ...prev, [field]: cleaned }));
  };

  // 2 Digit Age validator
  const handleAgeChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: "husbandAge" | "wifeAge"
  ) => {
    const raw = e.target.value;
    const digits = raw.replace(/\D/g, "").slice(0, 2);
    setFormData((prev) => ({ ...prev, [field]: digits }));
  };

  // Primary Phone change with country code rules & check duplicate
  const handlePrimaryPhoneChange = async (digits: string, countryCode = primaryCountryCode) => {
    // Digits only
    const cleanDigits = digits.replace(/\D/g, "");
    // If India (+91), min 10, max 10 for local number. If International, max total 14 digits with country code.
    const maxDigits = countryCode === "+91" ? 10 : 14 - countryCode.replace(/\D/g, "").length;
    const limitedDigits = cleanDigits.slice(0, maxDigits);

    setPrimaryRawPhone(limitedDigits);
    const fullPhone = limitedDigits ? `${countryCode} ${limitedDigits}` : "";

    setFormData((prev) => ({
      ...prev,
      primaryMobileNumber: fullPhone,
    }));

    if (limitedDigits.length >= 10) {
      try {
        const res = await fetch(`/api/admin/leads/check-phone?phone=${encodeURIComponent(limitedDigits)}`);
        if (res.ok) {
          const data = await res.json();
          setPrimaryDuplicates(data.duplicates || []);
        }
      } catch {
        setPrimaryDuplicates([]);
      }
    } else {
      setPrimaryDuplicates([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Validate Primary Mobile Length
      if (primaryCountryCode === "+91" && primaryRawPhone.length < 10) {
        throw new Error("Primary Mobile number must be at least 10 digits for Indian numbers.");
      }
      if (primaryCountryCode !== "+91" && (primaryCountryCode.length + primaryRawPhone.length < 10)) {
        throw new Error("International phone number must have at least 10 digits including country code.");
      }

      // Conditional mandate checks
      if ((formData.subStatus === "Visited Centre" || formData.subStatus === "Visited at Centre") && !formData.centreVisitedDate) {
        throw new Error("Centre Visited Date is mandatory when Sub status is 'Visited at Centre'.");
      }
      if ((formData.subStatus === "Visited Camp" || formData.subStatus === "Visited at Camp") && !formData.campVisitedDate) {
        throw new Error("Camp Visited Date is mandatory when Sub status is 'Visited at Camp'.");
      }

      const secondaryFull = secondaryRawPhone ? `${secondaryCountryCode} ${secondaryRawPhone}` : "";
      const whatsappFull = whatsappRawPhone ? `${whatsappCountryCode} ${whatsappRawPhone}` : "";
      const otherFull = otherRawPhone ? `${otherCountryCode} ${otherRawPhone}` : "";

      const payload = {
        ...formData,
        primaryMobileNumber: `${primaryCountryCode} ${primaryRawPhone}`.trim(),
        secondaryMobileNumber: secondaryFull,
        whatsappMobileNumber: whatsappFull,
        otherNumbers: otherFull,
        firstActivityDate: leadTimestamp,
        customFields: customFieldValues,
      };

      const res = await fetch("/api/admin/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create lead");
      }

      onLeadAdded(data.lead);
      notifyLeadUpdated();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to add lead");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-8 p-6 sm:p-8 max-h-[92vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-gray-500 hover:text-black transition-colors cursor-pointer p-1.5 rounded-xl hover:bg-slate-100"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3.5 mb-6 pb-4 border-b border-slate-100">
          <div className="w-12 h-12 rounded-2xl bg-[#cc2727]/10 text-[#cc2727] border border-[#cc2727]/20 flex items-center justify-center shadow-md shadow-[#cc2727]/10">
            <UserPlus className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-black">Add New Patient Lead</h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#cc2727]/10 text-[#cc2727] border border-[#cc2727]/20 font-mono font-bold">
                {formData.uniqueId}
              </span>
            </div>
            <p className="text-xs text-gray-600 mt-0.5">
              Fill all mandatory couple details, contact numbers, centre & sub status dispositions.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Lead Identification & Overview */}
          <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-4">
            <h3 className="text-xs font-bold text-[#cc2727] uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5" /> 1. Lead Identification & Overview
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Unique ID / Lead ID */}
              <div>
                <label className="block text-xs font-bold text-black mb-1.5">
                  Lead ID <span className="text-[#cc2727]">*</span>
                </label>
                <input
                  type="text"
                  readOnly
                  value={formData.uniqueId}
                  className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-300 rounded-xl text-[#cc2727] text-xs font-mono font-bold cursor-not-allowed"
                />
              </div>

              {/* Lead Source / UTM Source */}
              <div>
                <label className="block text-xs font-bold text-black mb-1.5">
                  Lead Source / UTM Source <span className="text-[#cc2727]">*</span>
                </label>
                <select
                  required
                  name="leadSource"
                  value={formData.leadSource}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-xs focus:outline-none focus:ring-2 focus:ring-[#cc2727] font-medium"
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
                <label className="block text-xs font-bold text-black mb-1.5">
                  Campaign Name <span className="text-[#cc2727]">*</span>
                </label>
                <select
                  required
                  name="campaignName"
                  value={formData.campaignName}
                  onChange={handleCampaignNameChange}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-xs focus:outline-none focus:ring-2 focus:ring-[#cc2727] font-medium"
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
                <label className="block text-xs font-bold text-black mb-1.5">
                  Source Name
                </label>
                <select
                  name="sourceName"
                  value={formData.sourceName}
                  onChange={handleSourceNameChange}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-xs focus:outline-none focus:ring-2 focus:ring-[#cc2727] font-medium font-mono"
                >
                  <option value="">Select Source Name</option>
                  {SOURCE_NAMES.map((sn) => (
                    <option key={sn} value={sn}>
                      {sn}
                    </option>
                  ))}
                </select>
              </div>

              {/* Source (Meta/Google/General) */}
              <div>
                <label className="block text-xs font-bold text-black mb-1.5">
                  Source <span className="text-[#cc2727]">*</span>
                </label>
                <select
                  required
                  name="source"
                  value={formData.source}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-xs focus:outline-none focus:ring-2 focus:ring-[#cc2727] font-medium"
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
                <label className="block text-xs font-bold text-black mb-1.5">
                  Lead Score <span className="text-[#cc2727]">*</span>
                </label>
                <input
                  type="text"
                  readOnly
                  name="leadScore"
                  value={formData.leadScore}
                  placeholder="Auto-calculated Score"
                  className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-300 rounded-xl text-amber-700 font-bold text-xs font-mono cursor-not-allowed"
                />
              </div>

              {/* Lead Owner */}
              <div>
                <label className="block text-xs font-bold text-black mb-1.5">
                  Lead Owner <span className="text-[#cc2727]">*</span>
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
                <label className="block text-xs font-bold text-black mb-1.5">
                  Lead Age (Today - Created) <span className="text-[#cc2727]">*</span>
                </label>
                <input
                  type="text"
                  readOnly
                  value={formData.leadAge}
                  className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-300 rounded-xl text-black text-xs font-medium cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Couple Profile & Medical Details */}
          <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-4">
            <h3 className="text-xs font-bold text-[#cc2727] uppercase tracking-wider flex items-center gap-2">
              <Heart className="w-3.5 h-3.5" /> 2. Couple Profile & Medical Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Husband Name */}
              <div>
                <label className="block text-xs font-bold text-black mb-1.5">
                  Husband Name <span className="text-[#cc2727]">*</span>
                </label>
                <input
                  type="text"
                  required
                  name="husbandName"
                  value={formData.husbandName}
                  onChange={handleChange}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#cc2727] font-medium"
                />
              </div>

              {/* Wife Name */}
              <div>
                <label className="block text-xs font-bold text-black mb-1.5">
                  Wife Name <span className="text-[#cc2727]">*</span>
                </label>
                <input
                  type="text"
                  required
                  name="wifeName"
                  value={formData.wifeName}
                  onChange={handleChange}
                  placeholder="e.g. Pooja Sharma"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#cc2727] font-medium"
                />
              </div>

              {/* Husband Age (2 digits) */}
              <div>
                <label className="block text-xs font-bold text-black mb-1.5">
                  Husband Age (2 Digits) <span className="text-[#cc2727]">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={2}
                  placeholder="e.g. 34"
                  value={formData.husbandAge}
                  onChange={(e) => handleAgeChange(e, "husbandAge")}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#cc2727] font-mono font-medium"
                />
              </div>

              {/* Wife Age (2 digits) */}
              <div>
                <label className="block text-xs font-bold text-black mb-1.5">
                  Wife Age (2 Digits) <span className="text-[#cc2727]">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={2}
                  placeholder="e.g. 30"
                  value={formData.wifeAge}
                  onChange={(e) => handleAgeChange(e, "wifeAge")}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#cc2727] font-mono font-medium"
                />
              </div>

              {/* When are you planning to start treatment */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-black mb-1.5">
                  When are you planning to start treatment
                </label>
                <select
                  name="whenPlanningToStartTreatment"
                  value={formData.whenPlanningToStartTreatment}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-xs focus:outline-none focus:ring-2 focus:ring-[#cc2727] font-medium"
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
                <label className="block text-xs font-bold text-black mb-1.5">
                  Pre Medical Conditions <span className="text-[#cc2727]">*</span>
                </label>
                <select
                  required
                  name="preMedicalConditions"
                  value={formData.preMedicalConditions}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-xs focus:outline-none focus:ring-2 focus:ring-[#cc2727] font-medium"
                >
                  <option value="No">No</option>
                  <option value="Yes">Yes</option>
                </select>
              </div>

              {/* Married Since (Numbers only) */}
              <div>
                <label className="block text-xs font-bold text-black mb-1.5">
                  Married Since (Years) <span className="text-[#cc2727]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.marriedSince}
                  onChange={(e) => handleNumberOnlyChange(e, "marriedSince")}
                  placeholder="e.g. 5"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#cc2727] font-mono font-medium"
                />
              </div>

              {/* How long you are trying to conceive */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-black mb-1.5">
                  How long you are trying to conceive (Years) <span className="text-[#cc2727]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.tryingToConceiveYears}
                  onChange={(e) => handleNumberOnlyChange(e, "tryingToConceiveYears")}
                  placeholder="e.g. 3"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#cc2727] font-mono font-medium"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Contact & Address Information */}
          <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-4">
            <h3 className="text-xs font-bold text-[#cc2727] uppercase tracking-wider flex items-center gap-2">
              <Phone className="w-3.5 h-3.5" /> 3. Contact & Address Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Primary Mobile Number (Wife Mobile # with country code) */}
              <div className="sm:col-span-2 relative">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-black">
                    Primary Mobile number (Wife) <span className="text-[#cc2727]">*</span>
                  </label>
                  {primaryDuplicates.length > 0 && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-300 animate-pulse">
                      <ShieldAlert className="w-3 h-3 text-amber-600" />
                      {primaryDuplicates.length} Duplicate{primaryDuplicates.length > 1 ? "s" : ""}
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  <select
                    value={primaryCountryCode}
                    onChange={(e) => {
                      setPrimaryCountryCode(e.target.value);
                      handlePrimaryPhoneChange(primaryRawPhone, e.target.value);
                    }}
                    className="w-32 px-2.5 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#cc2727]"
                  >
                    {COUNTRY_CODES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.code} ({c.country.split(" ")[0]})
                      </option>
                    ))}
                  </select>

                  <input
                    type="tel"
                    required
                    placeholder="e.g. 9876543210"
                    value={primaryRawPhone}
                    onChange={(e) => handlePrimaryPhoneChange(e.target.value)}
                    className="flex-1 px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-xs font-mono font-medium focus:outline-none focus:ring-2 focus:ring-[#cc2727]"
                  />
                </div>

                {/* Duplicates preview */}
                {primaryDuplicates.length > 0 && (
                  <div className="mt-2 p-2.5 bg-white border border-amber-300 rounded-xl shadow-lg space-y-1.5 text-xs">
                    <span className="font-bold text-amber-800 text-[11px] block">
                      Existing Leads Matching This Phone:
                    </span>
                    {primaryDuplicates.map((dup) => (
                      <div key={dup.uniqueId || dup._id} className="flex justify-between items-center text-slate-700 bg-amber-50/50 p-1.5 rounded-lg">
                        <span>{dup.wifeName || dup.patientName || "Unnamed"} ({dup.uniqueId})</span>
                        <a
                          href={`/admin/leads/${dup.uniqueId}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#cc2727] font-semibold flex items-center gap-1 hover:underline text-[11px]"
                        >
                          View <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Secondary Mobile Number */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-black mb-1.5">
                  Secondary Mobile number
                </label>
                <div className="flex gap-2">
                  <select
                    value={secondaryCountryCode}
                    onChange={(e) => setSecondaryCountryCode(e.target.value)}
                    className="w-32 px-2.5 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#cc2727]"
                  >
                    {COUNTRY_CODES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.code}
                      </option>
                    ))}
                  </select>
                  <input
                    type="tel"
                    placeholder="e.g. 9876543211"
                    value={secondaryRawPhone}
                    onChange={(e) => setSecondaryRawPhone(e.target.value.replace(/\D/g, ""))}
                    className="flex-1 px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-xs font-mono font-medium focus:outline-none focus:ring-2 focus:ring-[#cc2727]"
                  />
                </div>
              </div>

              {/* Whatsapp Mobile Number */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-black mb-1.5">
                  Whatsapp Mobile Number
                </label>
                <div className="flex gap-2">
                  <select
                    value={whatsappCountryCode}
                    onChange={(e) => setWhatsappCountryCode(e.target.value)}
                    className="w-32 px-2.5 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#cc2727]"
                  >
                    {COUNTRY_CODES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.code}
                      </option>
                    ))}
                  </select>
                  <input
                    type="tel"
                    placeholder="e.g. 9876543210"
                    value={whatsappRawPhone}
                    onChange={(e) => setWhatsappRawPhone(e.target.value.replace(/\D/g, ""))}
                    className="flex-1 px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-xs font-mono font-medium focus:outline-none focus:ring-2 focus:ring-[#cc2727]"
                  />
                </div>
              </div>

              {/* Other Numbers */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-black mb-1.5">
                  Other Numbers
                </label>
                <div className="flex gap-2">
                  <select
                    value={otherCountryCode}
                    onChange={(e) => setOtherCountryCode(e.target.value)}
                    className="w-32 px-2.5 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#cc2727]"
                  >
                    {COUNTRY_CODES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.code}
                      </option>
                    ))}
                  </select>
                  <input
                    type="tel"
                    placeholder="e.g. 0112345678"
                    value={otherRawPhone}
                    onChange={(e) => setOtherRawPhone(e.target.value.replace(/\D/g, ""))}
                    className="flex-1 px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-xs font-mono font-medium focus:outline-none focus:ring-2 focus:ring-[#cc2727]"
                  />
                </div>
              </div>

              {/* Primary Email */}
              <div>
                <label className="block text-xs font-bold text-black mb-1.5">
                  Primary Email (Pt Email)
                </label>
                <input
                  type="email"
                  name="primaryEmail"
                  value={formData.primaryEmail}
                  onChange={handleChange}
                  placeholder="patient@gmail.com"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#cc2727] font-medium"
                />
              </div>

              {/* Secondary Email */}
              <div>
                <label className="block text-xs font-bold text-black mb-1.5">
                  Secondary Email (Spouse)
                </label>
                <input
                  type="email"
                  name="secondaryEmail"
                  value={formData.secondaryEmail}
                  onChange={handleChange}
                  placeholder="spouse@gmail.com"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#cc2727] font-medium"
                />
              </div>

              {/* Whatsapp Consent */}
              <div>
                <label className="block text-xs font-bold text-black mb-1.5">
                  Whatsapp Consent
                </label>
                <select
                  name="whatsappConsent"
                  value={formData.whatsappConsent}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-xs focus:outline-none focus:ring-2 focus:ring-[#cc2727] font-medium"
                >
                  <option value="No">No</option>
                  <option value="Yes">Yes</option>
                </select>
              </div>

              {/* Calling Consent */}
              <div>
                <label className="block text-xs font-bold text-black mb-1.5">
                  Calling Consent
                </label>
                <select
                  name="callingConsent"
                  value={formData.callingConsent}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-xs focus:outline-none focus:ring-2 focus:ring-[#cc2727] font-medium"
                >
                  <option value="No">No</option>
                  <option value="Yes">Yes</option>
                </select>
              </div>

              {/* Patient Complete Address */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-black mb-1.5">
                  Pt Address
                </label>
                <input
                  type="text"
                  name="ptAddress"
                  value={formData.ptAddress}
                  onChange={handleChange}
                  placeholder="Complete patient residence address"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#cc2727] font-medium"
                />
              </div>

              {/* Pt Pincode */}
              <div>
                <label className="block text-xs font-bold text-black mb-1.5">
                  Pt Pincode
                </label>
                <input
                  type="text"
                  name="ptPincode"
                  value={formData.ptPincode}
                  onChange={handleChange}
                  placeholder="e.g. 110001"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-xs font-mono font-medium focus:outline-none focus:ring-2 focus:ring-[#cc2727]"
                />
              </div>

              {/* Pt Country */}
              <div>
                <label className="block text-xs font-bold text-black mb-1.5">
                  Pt Country
                </label>
                <input
                  type="text"
                  name="ptCountry"
                  value={formData.ptCountry}
                  onChange={handleChange}
                  placeholder="e.g. India"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#cc2727]"
                />
              </div>

              {/* Pt State */}
              <div>
                <label className="block text-xs font-bold text-black mb-1.5">
                  Pt State
                </label>
                <input
                  type="text"
                  name="ptState"
                  value={formData.ptState}
                  onChange={handleChange}
                  placeholder="e.g. Delhi / UP"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#cc2727]"
                />
              </div>

              {/* Pt City */}
              <div>
                <label className="block text-xs font-bold text-black mb-1.5">
                  Pt City
                </label>
                <input
                  type="text"
                  name="ptCity"
                  value={formData.ptCity}
                  onChange={handleChange}
                  placeholder="e.g. New Delhi"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#cc2727]"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Disposition, Centre, Visits & Registration */}
          <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-4">
            <h3 className="text-xs font-bold text-[#cc2727] uppercase tracking-wider flex items-center gap-2">
              <Building className="w-3.5 h-3.5" /> 4. Disposition, Centre, Visits & Registration
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Sub Status (Mandate) */}
              <div>
                <label className="block text-xs font-bold text-black mb-1.5">
                  Sub Status <span className="text-[#cc2727]">*</span>
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
                <label className="block text-xs font-bold text-black mb-1.5">
                  Lead Stage <span className="text-[#cc2727]">*</span>
                </label>
                <input
                  type="text"
                  readOnly
                  value={formData.leadStage}
                  placeholder="Autofilled based on Sub Status"
                  className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-300 rounded-xl text-[#cc2727] font-bold text-xs cursor-not-allowed"
                />
              </div>

              {/* Lead Valid Status (Autofilled) */}
              <div>
                <label className="block text-xs font-bold text-black mb-1.5">
                  Lead Valid Status <span className="text-[#cc2727]">*</span>
                </label>
                <input
                  type="text"
                  readOnly
                  value={formData.leadValidStatus}
                  placeholder="Autofilled based on Sub Status"
                  className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-300 rounded-xl font-bold text-xs cursor-not-allowed text-slate-800"
                />
              </div>

              {/* Camp Location (Optional) */}
              <div>
                <label className="block text-xs font-bold text-black mb-1.5">
                  Camp Location (Optional)
                </label>
                <select
                  name="campLocation"
                  value={formData.campLocation}
                  onChange={handleCampLocationChange}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-xs focus:outline-none focus:ring-2 focus:ring-[#cc2727] font-medium"
                >
                  <option value="">Select Camp Location</option>
                  {CAMP_LOCATIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Centre Location (Mandate, Autofilled if Camp Location filled) */}
              <div>
                <label className="block text-xs font-bold text-black mb-1.5">
                  Centre Location <span className="text-[#cc2727]">*</span>
                </label>
                <select
                  required
                  name="centreLocation"
                  value={formData.centreLocation}
                  onChange={handleCentreLocationChange}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-xs focus:outline-none focus:ring-2 focus:ring-[#cc2727] font-semibold"
                >
                  <option value="">Select Centre Location</option>
                  {CENTRE_LOCATIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Centre Address */}
              <div>
                <label className="block text-xs font-bold text-black mb-1.5">
                  Centre Address <span className="text-[#cc2727]">*</span>
                </label>
                <input
                  type="text"
                  name="centreAddress"
                  value={formData.centreAddress}
                  onChange={handleChange}
                  placeholder="Centre address with location link"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#cc2727] font-medium"
                />
              </div>

              {/* Follow Up Date and Time */}
              <div>
                <label className="block text-xs font-bold text-black mb-1.5">
                  Follow Up Date and Time
                </label>
                <input
                  type="datetime-local"
                  name="followUpDateTime"
                  value={formData.followUpDateTime}
                  onChange={handleChange}
                  disabled={formData.leadStage === "Converted" || formData.leadStage === "Closed"}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-xs focus:outline-none focus:ring-2 focus:ring-[#cc2727] disabled:bg-slate-100 disabled:cursor-not-allowed font-medium"
                />
                {(formData.leadStage === "Converted" || formData.leadStage === "Closed") && (
                  <span className="text-[10px] text-gray-500 mt-1 block">
                    Auto-cleared because Lead Stage is {formData.leadStage}
                  </span>
                )}
              </div>

              {/* Appointment Date */}
              <div>
                <label className="block text-xs font-bold text-black mb-1.5">
                  Appointment Date
                </label>
                <input
                  type="date"
                  name="appointmentDate"
                  value={formData.appointmentDate}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-xs focus:outline-none focus:ring-2 focus:ring-[#cc2727] font-medium"
                />
              </div>

              {/* Centre Visited Date */}
              <div>
                <label className="block text-xs font-bold text-black mb-1.5">
                  Centre Visited Date {(formData.subStatus === "Visited Centre" || formData.subStatus === "Visited at Centre") && <span className="text-[#cc2727]">*</span>}
                </label>
                <input
                  type="date"
                  name="centreVisitedDate"
                  required={(formData.subStatus === "Visited Centre" || formData.subStatus === "Visited at Centre")}
                  value={formData.centreVisitedDate}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-xs focus:outline-none focus:ring-2 focus:ring-[#cc2727] font-medium"
                />
              </div>

              {/* Camp Visited Date */}
              <div>
                <label className="block text-xs font-bold text-black mb-1.5">
                  Camp Visited Date {(formData.subStatus === "Visited Camp" || formData.subStatus === "Visited at Camp") && <span className="text-[#cc2727]">*</span>}
                </label>
                <input
                  type="date"
                  name="campVisitedDate"
                  required={(formData.subStatus === "Visited Camp" || formData.subStatus === "Visited at Camp")}
                  value={formData.campVisitedDate}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-xs focus:outline-none focus:ring-2 focus:ring-[#cc2727] font-medium"
                />
              </div>

              {/* Registration Status */}
              <div>
                <label className="block text-xs font-bold text-black mb-1.5">
                  Registration Status
                </label>
                <select
                  name="registrationStatus"
                  value={formData.registrationStatus}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-xs focus:outline-none focus:ring-2 focus:ring-[#cc2727] font-medium"
                >
                  <option value="No">No</option>
                  <option value="Yes">Yes</option>
                </select>
              </div>

              {/* Registration Number */}
              <div>
                <label className="block text-xs font-bold text-black mb-1.5">
                  Registration Number
                </label>
                <input
                  type="text"
                  name="registrationNumber"
                  value={formData.registrationNumber}
                  onChange={handleChange}
                  placeholder="e.g. REG-2026-001"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-xs font-mono font-medium focus:outline-none focus:ring-2 focus:ring-[#cc2727]"
                />
              </div>

              {/* Registration Amount */}
              <div>
                <label className="block text-xs font-bold text-black mb-1.5">
                  Registration Amount
                </label>
                <input
                  type="text"
                  name="registrationAmount"
                  value={formData.registrationAmount}
                  onChange={handleChange}
                  placeholder="e.g. 500"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-xs font-mono font-medium focus:outline-none focus:ring-2 focus:ring-[#cc2727]"
                />
              </div>

              {/* Package */}
              <div>
                <label className="block text-xs font-bold text-black mb-1.5">
                  Package
                </label>
                <input
                  type="text"
                  name="package"
                  value={formData.package}
                  onChange={handleChange}
                  placeholder="Selected Package"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#cc2727]"
                />
              </div>

              {/* Plan */}
              <div>
                <label className="block text-xs font-bold text-black mb-1.5">
                  Plan
                </label>
                <input
                  type="text"
                  name="plan"
                  value={formData.plan}
                  onChange={handleChange}
                  placeholder="Selected Plan"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#cc2727]"
                />
              </div>
            </div>

            {/* Notes (Agent Mandate) */}
            <div className="pt-2">
              <label className="block text-xs font-bold text-black mb-1.5">
                Notes (Remarks & Observations) <span className="text-[#cc2727]">*</span>
              </label>
              <textarea
                required
                name="notes"
                rows={3}
                value={formData.notes}
                onChange={handleChange}
                placeholder="Open text for adding notes, patient history, caller observations..."
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#cc2727] resize-none font-medium"
              />
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-3 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 bg-white hover:bg-slate-100 text-black text-xs font-bold rounded-xl transition-colors border border-slate-300 shadow-2xs cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 px-4 bg-[#cc2727] hover:bg-[#b02121] text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-[#cc2727]/25 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Create Lead</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
