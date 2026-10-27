"use client";

import React, { useState } from "react";
import {
  Edit3,
  ChevronDown,
  ChevronUp,
  User,
  Heart,
  Building,
  Phone,
  Mail,
  Calendar,
  Sparkles,
  MapPin,
  Clock,
  ShieldCheck,
  Award,
  Layers,
  FileText,
  Package,
} from "lucide-react";

interface LeadSquaredLeadDetailsProps {
  formData: any;
  onEditClick: () => void;
  hideEmptyFields: boolean;
  onToggleHideEmpty: () => void;
}

export default function LeadSquaredLeadDetails({
  formData,
  onEditClick,
  hideEmptyFields,
  onToggleHideEmpty,
}: LeadSquaredLeadDetailsProps) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    couple: true,
    clinical: true,
    contact: true,
    attribution: true,
    disposition: true,
    address: true,
    system: true,
  });

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Helper to determine if a value should be shown when "Hide Empty Fields" is active
  const shouldShow = (val: any) => {
    if (!hideEmptyFields) return true;
    if (val === undefined || val === null) return false;
    const str = String(val).trim();
    return str !== "" && str !== "-" && str !== "0";
  };

  const renderField = (label: string, value: any, extraClass?: string) => {
    if (!shouldShow(value)) return null;
    return (
      <div className={extraClass || ""}>
        <span className="block text-[11px] font-semibold text-slate-400 mb-0.5">
          {label}
        </span>
        <span className="font-semibold text-slate-900 text-xs break-words">
          {value !== undefined && value !== null && String(value).trim() !== "" ? String(value) : "-"}
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Top Toggle & Action Bar (Screenshot 3 Match) */}
      <div className="flex items-center justify-between bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={hideEmptyFields}
            onChange={onToggleHideEmpty}
            className="w-4 h-4 rounded border-slate-300 text-[#cc2727] focus:ring-[#cc2727] cursor-pointer"
          />
          <span className="text-xs font-bold text-slate-700">Hide Empty Fields</span>
        </label>

        <button
          type="button"
          onClick={onEditClick}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-[#cc2727] hover:bg-[#b02121] text-white rounded-xl text-xs font-bold shadow-sm shadow-[#cc2727]/20 transition-all cursor-pointer"
        >
          <Edit3 className="w-3.5 h-3.5" />
          <span>Edit Details</span>
        </button>
      </div>

      {/* Accordion 1: Couple Profile & Medical Details (Cols: husbandName, wifeName, husbandAge, wifeAge, whenPlanningToStartTreatment, preMedicalConditions, marriedSince, tryingToConceiveYears) */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div
          className="p-4 border-b border-slate-100 flex items-center justify-between cursor-pointer hover:bg-slate-50/50 transition-colors"
          onClick={() => toggleSection("couple")}
        >
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-[#cc2727]" />
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              1. Couple Profile & Clinical Info
            </h4>
          </div>
          <button type="button" className="text-slate-400">
            {openSections.couple ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {openSections.couple && (
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-y-4 gap-x-6 text-xs">
            {renderField("Wife Name", formData.wifeName)}
            {renderField("Husband Name", formData.husbandName)}
            {renderField("Wife Age", formData.wifeAge ? `${formData.wifeAge} Years` : "")}
            {renderField("Husband Age", formData.husbandAge ? `${formData.husbandAge} Years` : "")}
            {renderField("Pre Medical Conditions", formData.preMedicalConditions)}
            {renderField("Married Since", formData.marriedSince ? `${formData.marriedSince} Years` : "")}
            {renderField("How long trying to conceive", formData.tryingToConceiveYears ? `${formData.tryingToConceiveYears} Years` : "")}
            {renderField("When planning to start treatment", formData.whenPlanningToStartTreatment)}
          </div>
        )}
      </div>

      {/* Accordion 2: Contact Numbers & Communication Consents (Cols: primaryMobileNumber, secondaryMobileNumber, whatsappMobileNumber, otherNumbers, primaryEmail, secondaryEmail, whatsappConsent, callingConsent) */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div
          className="p-4 border-b border-slate-100 flex items-center justify-between cursor-pointer hover:bg-slate-50/50 transition-colors"
          onClick={() => toggleSection("contact")}
        >
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-[#cc2727]" />
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              2. Phone Numbers, Emails & Consents
            </h4>
          </div>
          <button type="button" className="text-slate-400">
            {openSections.contact ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {openSections.contact && (
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-y-4 gap-x-6 text-xs">
            {renderField("Primary Mobile number", formData.primaryMobileNumber)}
            {renderField("Secondary Mobile number", formData.secondaryMobileNumber)}
            {renderField("Whatsapp Mobile Number", formData.whatsappMobileNumber)}
            {renderField("Other Numbers", formData.otherNumbers)}
            {renderField("Primary Email (Patient)", formData.primaryEmail)}
            {renderField("Secondary Email (Spouse)", formData.secondaryEmail)}
            {renderField("Whatsapp Consent", formData.whatsappConsent)}
            {renderField("Calling Consent", formData.callingConsent)}
          </div>
        )}
      </div>

      {/* Accordion 3: Marketing & Lead Attribution (Cols: leadSource, campaignName, sourceName, source, leadScore, leadOwner, leadAge) */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div
          className="p-4 border-b border-slate-100 flex items-center justify-between cursor-pointer hover:bg-slate-50/50 transition-colors"
          onClick={() => toggleSection("attribution")}
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#cc2727]" />
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              3. Marketing, Attribution & Lead Scoring
            </h4>
          </div>
          <button type="button" className="text-slate-400">
            {openSections.attribution ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {openSections.attribution && (
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-y-4 gap-x-6 text-xs">
            {renderField("Campaign Name", formData.campaignName)}
            {renderField("Source (Channel)", formData.source)}
            {renderField("Source Name (DID)", formData.sourceName)}
            {renderField("Lead Source / UTM Source", formData.leadSource)}
            <div>
              <span className="block text-[11px] font-semibold text-slate-400 mb-0.5">
                Lead Score
              </span>
              <span className="inline-block font-mono font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-xs">
                {formData.leadScore || "0"} / 100
              </span>
            </div>
            {renderField("Lead Owner / Caller", formData.leadOwner || "Unassigned")}
            {renderField("Lead Age", formData.leadAge || "0 days")}
          </div>
        )}
      </div>

      {/* Accordion 4: Disposition, Centre, Visits & Packages (Cols: subStatus, leadStage, leadValidStatus, campLocation, centreLocation, centreAddress, followUpDateTime, appointmentDate, centreVisitedDate, campVisitedDate, registrationStatus, registrationNumber, registrationAmount, package, plan) */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div
          className="p-4 border-b border-slate-100 flex items-center justify-between cursor-pointer hover:bg-slate-50/50 transition-colors"
          onClick={() => toggleSection("disposition")}
        >
          <div className="flex items-center gap-2">
            <Building className="w-4 h-4 text-[#cc2727]" />
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              4. Disposition, Centre, Visits & Registration
            </h4>
          </div>
          <button type="button" className="text-slate-400">
            {openSections.disposition ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {openSections.disposition && (
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-4 gap-x-6 text-xs">
            <div>
              <span className="block text-[11px] font-semibold text-slate-400 mb-0.5">
                Lead Stage
              </span>
              <span className="inline-block font-bold text-[#cc2727] bg-[#cc2727]/10 border border-[#cc2727]/20 px-2 py-0.5 rounded text-xs">
                {formData.leadStage || "-"}
              </span>
            </div>
            <div>
              <span className="block text-[11px] font-semibold text-slate-400 mb-0.5">
                Sub Status
              </span>
              <span className="font-semibold text-slate-900 text-xs">
                {formData.subStatus || "-"}
              </span>
            </div>
            <div>
              <span className="block text-[11px] font-semibold text-slate-400 mb-0.5">
                Lead Valid Status
              </span>
              <span className="inline-block font-semibold text-slate-800 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-xs">
                {formData.leadValidStatus || "-"}
              </span>
            </div>
            {renderField("Centre Location", formData.centreLocation)}
            {renderField("Camp Location", formData.campLocation || "NA")}
            {renderField("Centre Address", formData.centreAddress, "sm:col-span-2")}
            {renderField("Follow Up Date and Time", formData.followUpDateTime)}
            {renderField("Appointment Date", formData.appointmentDate)}
            {renderField("Centre Visited Date", formData.centreVisitedDate)}
            {renderField("Camp Visited Date", formData.campVisitedDate)}
            {renderField("Registration Status", formData.registrationStatus)}
            {renderField("Registration Number", formData.registrationNumber)}
            {renderField("Registration Amount", formData.registrationAmount)}
            {renderField("Package", formData.package)}
            {renderField("Plan", formData.plan)}
          </div>
        )}
      </div>

      {/* Accordion 5: Patient Address & Geographics (Cols: ptAddress, ptPincode, ptCity, ptState, ptCountry) */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div
          className="p-4 border-b border-slate-100 flex items-center justify-between cursor-pointer hover:bg-slate-50/50 transition-colors"
          onClick={() => toggleSection("address")}
        >
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[#cc2727]" />
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              5. Patient Address & Location
            </h4>
          </div>
          <button type="button" className="text-slate-400">
            {openSections.address ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {openSections.address && (
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-y-4 gap-x-6 text-xs">
            {renderField("Pt Address", formData.ptAddress, "sm:col-span-2")}
            {renderField("Pt Pincode", formData.ptPincode)}
            {renderField("Pt City", formData.ptCity)}
            {renderField("Pt State", formData.ptState)}
            {renderField("Pt Country", formData.ptCountry || "India")}
          </div>
        )}
      </div>

      {/* Accordion 6: System & Audit Identifiers (Cols: uniqueId, firstActivityDate, createdBy, createdOn, modifiedBy, modifiedOn, notes) */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div
          className="p-4 border-b border-slate-100 flex items-center justify-between cursor-pointer hover:bg-slate-50/50 transition-colors"
          onClick={() => toggleSection("system")}
        >
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#cc2727]" />
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              6. System Tracking & Audit Info
            </h4>
          </div>
          <button type="button" className="text-slate-400">
            {openSections.system ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {openSections.system && (
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-4 gap-x-6 text-xs">
            {renderField("Unique Lead ID", formData.uniqueId)}
            {renderField("First Activity Date", formData.firstActivityDate)}
            {renderField("Created By", formData.createdByMember || formData.createdBy)}
            {renderField("Created On", formData.createdOn)}
            {renderField("Modified By", formData.modifiedByMember || formData.modifiedBy)}
            {renderField("Modified On", formData.modifiedOn)}
            {renderField("Clinical Notes / Remarks", formData.notes, "sm:col-span-3")}
          </div>
        )}
      </div>
    </div>
  );
}
