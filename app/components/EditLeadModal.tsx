"use client";

import React, { useState } from "react";
import { X, Save, AlertCircle, Heart, Phone, Sparkles, Building, MapPin, Clock } from "lucide-react";
import {
  CENTRE_LOCATIONS,
  CAMP_LOCATIONS,
  CAMP_TO_CENTRE_MAP,
  WHEN_START_TREATMENT_OPTIONS,
  LEAD_SOURCES,
  CAMPAIGN_NAMES,
  SOURCE_NAMES,
  CAMPAIGN_TO_INFO,
  SOURCE_NAME_TO_INFO,
  GENERAL_SOURCES,
  SUB_DISPOSITIONS_MAP,
} from "@/lib/leadOptions";

interface EditLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  formData: any;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  handleCampaignNameChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  handleSourceNameChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  handleCampLocationChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  handleCentreLocationChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  handleSubStatusChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  handleAgeChange: (e: React.ChangeEvent<HTMLInputElement>, field: "husbandAge" | "wifeAge") => void;
  handleNumberOnlyChange: (e: React.ChangeEvent<HTMLInputElement>, field: "marriedSince" | "tryingToConceiveYears") => void;
  handleSave: (e: React.FormEvent) => void;
  saving: boolean;
  callerOptions: string[];
}

export default function EditLeadModal({
  isOpen,
  onClose,
  formData,
  handleChange,
  handleCampaignNameChange,
  handleSourceNameChange,
  handleCampLocationChange,
  handleCentreLocationChange,
  handleSubStatusChange,
  handleAgeChange,
  handleNumberOnlyChange,
  handleSave,
  saving,
  callerOptions,
}: EditLeadModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200 text-slate-800">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Edit Patient Lead: {formData.wifeName || formData.uniqueId}
            </h3>
            <p className="text-xs text-slate-500">
              Full 49-column CRM editor with automated lead scores & stage mapping
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSave} className="flex-1 flex flex-col min-h-0">
          <div className="p-6 overflow-y-auto space-y-6 text-xs bg-slate-50/50">
            {/* 1. Couple Profile & Clinical Info */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                <Heart className="w-4 h-4 text-[#cc2727]" />
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-xs">
                  1. Couple Profile & Clinical Info
                </h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Wife Name *
                  </label>
                  <input
                    type="text"
                    required
                    name="wifeName"
                    value={formData.wifeName}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Husband Name *
                  </label>
                  <input
                    type="text"
                    required
                    name="husbandName"
                    value={formData.husbandName}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Wife Age (2 Digits) *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={2}
                    value={formData.wifeAge}
                    onChange={(e) => handleAgeChange(e, "wifeAge")}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Husband Age (2 Digits) *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={2}
                    value={formData.husbandAge}
                    onChange={(e) => handleAgeChange(e, "husbandAge")}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Married Since (Years) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.marriedSince}
                    onChange={(e) => handleNumberOnlyChange(e, "marriedSince")}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    How long trying to conceive *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.tryingToConceiveYears}
                    onChange={(e) => handleNumberOnlyChange(e, "tryingToConceiveYears")}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Pre Medical Conditions *
                  </label>
                  <select
                    name="preMedicalConditions"
                    value={formData.preMedicalConditions}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  >
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    When planning to start treatment
                  </label>
                  <select
                    name="whenPlanningToStartTreatment"
                    value={formData.whenPlanningToStartTreatment}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  >
                    <option value="">Select Timeline</option>
                    {WHEN_START_TREATMENT_OPTIONS.map((w) => (
                      <option key={w} value={w}>
                        {w}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* 2. Contact Numbers & Consents */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                <Phone className="w-4 h-4 text-[#cc2727]" />
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-xs">
                  2. Phone Numbers, Emails & Communication Consents
                </h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Primary Mobile number *
                  </label>
                  <input
                    type="text"
                    required
                    name="primaryMobileNumber"
                    value={formData.primaryMobileNumber}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Secondary Mobile number
                  </label>
                  <input
                    type="text"
                    name="secondaryMobileNumber"
                    value={formData.secondaryMobileNumber}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Whatsapp Mobile Number
                  </label>
                  <input
                    type="text"
                    name="whatsappMobileNumber"
                    value={formData.whatsappMobileNumber}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Other Numbers
                  </label>
                  <input
                    type="text"
                    name="otherNumbers"
                    value={formData.otherNumbers}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Primary Email (Pt Email)
                  </label>
                  <input
                    type="email"
                    name="primaryEmail"
                    value={formData.primaryEmail}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Secondary Email (Spouse)
                  </label>
                  <input
                    type="email"
                    name="secondaryEmail"
                    value={formData.secondaryEmail}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Whatsapp Consent
                  </label>
                  <select
                    name="whatsappConsent"
                    value={formData.whatsappConsent}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  >
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Calling Consent
                  </label>
                  <select
                    name="callingConsent"
                    value={formData.callingConsent}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  >
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 3. Marketing & Lead Attribution */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                <Sparkles className="w-4 h-4 text-[#cc2727]" />
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-xs">
                  3. Marketing, Attribution & Ownership
                </h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Campaign Name *
                  </label>
                  <select
                    name="campaignName"
                    value={formData.campaignName}
                    onChange={handleCampaignNameChange}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  >
                    {CAMPAIGN_NAMES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Source Channel *
                  </label>
                  <select
                    name="source"
                    value={formData.source}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  >
                    {GENERAL_SOURCES.map((src) => (
                      <option key={src} value={src}>
                        {src}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Source Name (DID / Number)
                  </label>
                  <select
                    name="sourceName"
                    value={formData.sourceName}
                    onChange={handleSourceNameChange}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
                  >
                    <option value="">Select Source Name</option>
                    {SOURCE_NAMES.map((sn) => (
                      <option key={sn} value={sn}>
                        {sn}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Lead Source / UTM Source *
                  </label>
                  <select
                    name="leadSource"
                    value={formData.leadSource}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  >
                    {LEAD_SOURCES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Lead Owner / Caller *
                  </label>
                  <select
                    name="leadOwner"
                    value={formData.leadOwner}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  >
                    <option value="">Select Owner</option>
                    {callerOptions.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Lead Score (Auto-calculated)
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={`${formData.leadScore || 0} / 100`}
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-xs font-mono font-bold text-amber-700 cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            {/* 4. Disposition, Centre, Visits & Packages */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                <Building className="w-4 h-4 text-[#cc2727]" />
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-xs">
                  4. Disposition, Centre, Visits & Registration
                </h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Sub Status *
                  </label>
                  <select
                    name="subStatus"
                    value={formData.subStatus}
                    onChange={handleSubStatusChange}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold"
                  >
                    <option value="">Select Sub Status</option>
                    {Object.keys(SUB_DISPOSITIONS_MAP).map((sub) => (
                      <option key={sub} value={sub}>
                        {sub}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Lead Stage (Autofilled)
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={formData.leadStage}
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-[#cc2727] cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Lead Valid Status (Autofilled)
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={formData.leadValidStatus}
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Centre Location *
                  </label>
                  <select
                    name="centreLocation"
                    value={formData.centreLocation}
                    onChange={handleCentreLocationChange}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold"
                  >
                    <option value="">Select Centre</option>
                    {CENTRE_LOCATIONS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Camp Location
                  </label>
                  <select
                    name="campLocation"
                    value={formData.campLocation}
                    onChange={handleCampLocationChange}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  >
                    <option value="">Select Camp</option>
                    {CAMP_LOCATIONS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Centre Address *
                  </label>
                  <input
                    type="text"
                    name="centreAddress"
                    value={formData.centreAddress}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Follow Up Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    name="followUpDateTime"
                    value={formData.followUpDateTime}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Appointment Date
                  </label>
                  <input
                    type="date"
                    name="appointmentDate"
                    value={formData.appointmentDate}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Centre Visited Date
                  </label>
                  <input
                    type="date"
                    name="centreVisitedDate"
                    value={formData.centreVisitedDate}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Camp Visited Date
                  </label>
                  <input
                    type="date"
                    name="campVisitedDate"
                    value={formData.campVisitedDate}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Registration Status
                  </label>
                  <select
                    name="registrationStatus"
                    value={formData.registrationStatus}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  >
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Registration Number
                  </label>
                  <input
                    type="text"
                    name="registrationNumber"
                    value={formData.registrationNumber}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Registration Amount
                  </label>
                  <input
                    type="text"
                    name="registrationAmount"
                    value={formData.registrationAmount}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Package
                  </label>
                  <input
                    type="text"
                    name="package"
                    value={formData.package}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Plan
                  </label>
                  <input
                    type="text"
                    name="plan"
                    value={formData.plan}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>
            </div>

            {/* 5. Patient Address & Demographics */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                <MapPin className="w-4 h-4 text-[#cc2727]" />
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-xs">
                  5. Patient Address & Demographics
                </h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Pt Address
                  </label>
                  <input
                    type="text"
                    name="ptAddress"
                    value={formData.ptAddress}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Pt Pincode
                  </label>
                  <input
                    type="text"
                    name="ptPincode"
                    value={formData.ptPincode}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Pt City
                  </label>
                  <input
                    type="text"
                    name="ptCity"
                    value={formData.ptCity}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Pt State
                  </label>
                  <input
                    type="text"
                    name="ptState"
                    value={formData.ptState}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Pt Country
                  </label>
                  <input
                    type="text"
                    name="ptCountry"
                    value={formData.ptCountry}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>
            </div>

            {/* 6. Clinical Notes & Observations */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
              <label className="block text-[11px] font-bold text-slate-800 uppercase tracking-wider">
                6. Notes & Observations
              </label>
              <textarea
                name="notes"
                rows={3}
                value={formData.notes}
                onChange={handleChange}
                placeholder="Enter new remarks, doctor consultation updates, follow up instructions..."
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 resize-none"
              />
            </div>
          </div>

          {/* Modal Footer */}
          <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:text-slate-800 text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-[#cc2727] hover:bg-[#b02121] text-white rounded-xl text-xs font-bold shadow-md shadow-[#cc2727]/25 flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {saving ? (
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              <span>Save & Update</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
