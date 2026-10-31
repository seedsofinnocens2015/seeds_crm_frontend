"use client";

import React from "react";
import { Hash } from "lucide-react";
import ClickToCallButton from "./ClickToCallButton";

interface LeadTableCellProps {
  colId: string;
  lead: any;
  leadId: string;
}

export function renderLeadTableCell({ colId, lead, leadId }: LeadTableCellProps) {
  switch (colId) {
    case "firstActivityDate":
      return (
        <td key={colId} className="px-4 py-3.5 text-xs text-slate-700 font-mono">
          {lead.firstActivityDate || lead.createdOn || "-"}
        </td>
      );

    case "husbandName":
      return (
        <td key={colId} className="px-4 py-3.5 font-semibold text-black">
          {lead.husbandName || lead.spouseName || "-"}
        </td>
      );

    case "wifeName":
      return (
        <td key={colId} className="px-4 py-3.5 font-semibold text-black group-hover:text-[#cc2727] transition-colors">
          {lead.wifeName || lead.patientName || "-"}
        </td>
      );

    case "husbandAge":
      return (
        <td key={colId} className="px-4 py-3.5 font-mono text-black">
          {lead.husbandAge || lead.spouseAge || "-"}
        </td>
      );

    case "wifeAge":
      return (
        <td key={colId} className="px-4 py-3.5 font-mono text-black">
          {lead.wifeAge || lead.patientAge || "-"}
        </td>
      );

    case "whenPlanningToStartTreatment":
      return (
        <td key={colId} className="px-4 py-3.5 text-black">
          {lead.whenPlanningToStartTreatment || lead.lookingForTreatment || "-"}
        </td>
      );

    case "preMedicalConditions":
      return (
        <td key={colId} className="px-4 py-3.5 text-black font-medium">
          <span
            className={`inline-flex px-2 py-0.5 rounded-md text-xs font-semibold ${
              lead.preMedicalConditions === "Yes"
                ? "bg-rose-50 text-rose-700 border border-rose-200"
                : "bg-slate-100 text-slate-700"
            }`}
          >
            {lead.preMedicalConditions || "No"}
          </span>
        </td>
      );

    case "marriedSince":
      return (
        <td key={colId} className="px-4 py-3.5 font-mono text-black">
          {lead.marriedSince ? `${lead.marriedSince} Yrs` : "-"}
        </td>
      );

    case "tryingToConceiveYears":
      return (
        <td key={colId} className="px-4 py-3.5 font-mono text-black">
          {lead.tryingToConceiveYears ? `${lead.tryingToConceiveYears} Yrs` : "-"}
        </td>
      );

    case "primaryEmail":
      return (
        <td key={colId} className="px-4 py-3.5 text-slate-700 font-mono text-xs">
          {lead.primaryEmail || "-"}
        </td>
      );

    case "secondaryEmail":
      return (
        <td key={colId} className="px-4 py-3.5 text-slate-700 font-mono text-xs">
          {lead.secondaryEmail || "-"}
        </td>
      );

    case "primaryMobileNumber":
      return (
        <td key={colId} className="px-4 py-3.5 font-mono text-black font-semibold">
          <ClickToCallButton
            leadId={lead.uniqueId || lead._id || leadId}
            phoneDisplay={lead.primaryMobileNumber || lead.mobileNumber || "-"}
            variant="table-icon"
          />
        </td>
      );

    case "secondaryMobileNumber":
      return (
        <td key={colId} className="px-4 py-3.5 font-mono text-gray-500">
          {lead.secondaryMobileNumber || lead.alternateNumber || "-"}
        </td>
      );

    case "whatsappMobileNumber":
      return (
        <td key={colId} className="px-4 py-3.5 font-mono text-emerald-700">
          {lead.whatsappMobileNumber || "-"}
        </td>
      );

    case "otherNumbers":
      return (
        <td key={colId} className="px-4 py-3.5 font-mono text-gray-500">
          {lead.otherNumbers || "-"}
        </td>
      );

    case "whatsappConsent":
      return (
        <td key={colId} className="px-4 py-3.5 text-black">
          {lead.whatsappConsent || "No"}
        </td>
      );

    case "callingConsent":
      return (
        <td key={colId} className="px-4 py-3.5 text-black">
          {lead.callingConsent || "No"}
        </td>
      );

    case "leadSource":
      return (
        <td key={colId} className="px-4 py-3.5 text-black font-medium">
          {lead.leadSource || lead.utmSource || "-"}
        </td>
      );

    case "campaignName":
      return (
        <td key={colId} className="px-4 py-3.5 text-slate-700">
          {lead.campaignName || "-"}
        </td>
      );

    case "sourceName":
      return (
        <td key={colId} className="px-4 py-3.5 text-slate-700 font-mono text-xs">
          {lead.sourceName || "-"}
        </td>
      );

    case "source":
      return (
        <td key={colId} className="px-4 py-3.5 text-slate-700">
          {lead.source || "General"}
        </td>
      );

    case "leadScore":
      return (
        <td key={colId} className="px-4 py-3.5 font-mono text-xs font-bold text-amber-700">
          {lead.leadScore ?? "0"}
        </td>
      );

    case "subStatus":
      return (
        <td key={colId} className="px-4 py-3.5 font-medium text-black">
          <span className="inline-flex px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-200 text-xs font-semibold">
            {lead.subStatus || lead.subDispositions || "-"}
          </span>
        </td>
      );

    case "leadStage":
      return (
        <td key={colId} className="px-4 py-3.5 font-medium text-black">
          {lead.leadStage || lead.dispositions ? (
            <span
              className={`inline-flex px-2 py-0.5 rounded-md text-xs font-semibold ${
                (lead.leadStage || lead.dispositions) === "Converted"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : (lead.leadStage || lead.dispositions) === "Contacted"
                  ? "bg-blue-50 text-blue-700 border border-blue-200"
                  : (lead.leadStage || lead.dispositions) === "Contact Attempt"
                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                  : "bg-slate-100 text-slate-700 border border-slate-200"
              }`}
            >
              {lead.leadStage || lead.dispositions}
            </span>
          ) : (
            "-"
          )}
        </td>
      );

    case "leadValidStatus":
      return (
        <td key={colId} className="px-4 py-3.5 font-medium text-black">
          {lead.leadValidStatus || lead.validStatus ? (
            <span
              className={`inline-flex px-2 py-0.5 rounded-md text-xs font-semibold ${
                (lead.leadValidStatus || lead.validStatus) === "Valid"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : (lead.leadValidStatus || lead.validStatus) === "Invalid"
                  ? "bg-rose-50 text-rose-700 border border-rose-200"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {lead.leadValidStatus || lead.validStatus}
            </span>
          ) : (
            "-"
          )}
        </td>
      );

    case "createdBy":
      return (
        <td key={colId} className="px-4 py-3.5 text-xs text-slate-700">
          {lead.createdByMember || (typeof lead.createdBy === "object" ? lead.createdBy?.name : lead.createdBy) || "-"}
        </td>
      );

    case "createdOn":
      return (
        <td key={colId} className="px-4 py-3.5 text-xs font-mono text-slate-600">
          {lead.createdOn || lead.leadTimestamp || lead.date || "-"}
        </td>
      );

    case "modifiedBy":
      return (
        <td key={colId} className="px-4 py-3.5 text-xs text-slate-700">
          {lead.modifiedByMember || "-"}
        </td>
      );

    case "modifiedOn":
      return (
        <td key={colId} className="px-4 py-3.5 text-xs font-mono text-slate-600">
          {lead.modifiedOn || "-"}
        </td>
      );

    case "centreAddress":
      return (
        <td key={colId} className="px-4 py-3.5 text-xs text-slate-700 max-w-xs truncate" title={lead.centreAddress}>
          {lead.centreAddress || "-"}
        </td>
      );

    case "ptAddress":
      return (
        <td key={colId} className="px-4 py-3.5 text-xs text-slate-700 max-w-xs truncate" title={lead.ptAddress}>
          {lead.ptAddress || "-"}
        </td>
      );

    case "ptPincode":
      return (
        <td key={colId} className="px-4 py-3.5 font-mono text-black">
          {lead.ptPincode || "-"}
        </td>
      );

    case "ptCountry":
      return (
        <td key={colId} className="px-4 py-3.5 text-black">
          {lead.ptCountry || "India"}
        </td>
      );

    case "ptState":
      return (
        <td key={colId} className="px-4 py-3.5 text-black">
          {lead.ptState || "-"}
        </td>
      );

    case "ptCity":
      return (
        <td key={colId} className="px-4 py-3.5 text-black">
          {lead.ptCity || "-"}
        </td>
      );

    case "leadOwner":
      return (
        <td key={colId} className="px-4 py-3.5 font-semibold text-black">
          {lead.leadOwner || lead.callerName || "-"}
        </td>
      );

    case "leadAge":
      return (
        <td key={colId} className="px-4 py-3.5 font-mono text-xs font-semibold text-indigo-700">
          {lead.leadAge || "0 days"}
        </td>
      );

    case "campLocation":
      return (
        <td key={colId} className="px-4 py-3.5 text-black">
          {lead.campLocation || "-"}
        </td>
      );

    case "centreLocation":
      return (
        <td key={colId} className="px-4 py-3.5 font-semibold text-black">
          {lead.centreLocation || lead.location || lead.otherCity || "-"}
        </td>
      );

    case "followUpDateTime":
      return (
        <td key={colId} className="px-4 py-3.5 font-mono text-black text-xs">
          {lead.followUpDateTime || lead.followUpDate || "-"}
        </td>
      );

    case "centreVisitedDate":
      return (
        <td key={colId} className="px-4 py-3.5 font-mono text-black">
          {lead.centreVisitedDate || "-"}
        </td>
      );

    case "campVisitedDate":
      return (
        <td key={colId} className="px-4 py-3.5 font-mono text-black">
          {lead.campVisitedDate || "-"}
        </td>
      );

    case "registrationStatus":
      return (
        <td key={colId} className="px-4 py-3.5 text-black">
          <span
            className={`inline-flex px-2 py-0.5 rounded-md text-xs font-semibold ${
              lead.registrationStatus === "Yes"
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-slate-100 text-slate-700"
            }`}
          >
            {lead.registrationStatus || "No"}
          </span>
        </td>
      );

    case "registrationNumber":
      return (
        <td key={colId} className="px-4 py-3.5 font-mono text-black">
          {lead.registrationNumber || "-"}
        </td>
      );

    case "registrationAmount":
      return (
        <td key={colId} className="px-4 py-3.5 font-mono text-black">
          {lead.registrationAmount ? `₹${lead.registrationAmount}` : "-"}
        </td>
      );

    case "package":
      return (
        <td key={colId} className="px-4 py-3.5 text-black">
          {lead.package || "-"}
        </td>
      );

    case "plan":
      return (
        <td key={colId} className="px-4 py-3.5 text-black">
          {lead.plan || "-"}
        </td>
      );

    case "notes":
      return (
        <td key={colId} className="px-4 py-3.5 max-w-xs truncate text-gray-600" title={lead.notes}>
          {lead.notes || "-"}
        </td>
      );

    case "appointmentDate":
      return (
        <td key={colId} className="px-4 py-3.5 font-mono text-black">
          {lead.appointmentDate || "-"}
        </td>
      );

    default:
      const customVal = lead.customFields?.[colId] ?? lead[colId] ?? "-";
      return (
        <td key={colId} className="px-4 py-3.5 text-black">
          {typeof customVal === "object" ? JSON.stringify(customVal) : String(customVal)}
        </td>
      );
  }
}
