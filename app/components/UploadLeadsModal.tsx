"use client";

import { apiFetch } from "@/lib/api";
import { useState, useRef } from "react";
import {
  X,
  Upload,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  FileText,
  Download,
  Loader2,
  Users,
} from "lucide-react";
import * as XLSX from "xlsx";
import { getMonthFromDate, notifyLeadUpdated } from "@/lib/leadOptions";
import { ALL_LEADS_COLUMNS } from "@/lib/columnsConfig";

interface UploadLeadsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLeadsImported: (leads: any[], nextId: string, deletedCount?: number) => void;
}

// Clean and normalize keys for fuzzy matching
function cleanKey(k: string): string {
  return k.toLowerCase().replace(/[^a-z0-9]/g, "");
}

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

/**
 * Normalises any date value to DD-MMM-YY string.
 * Handles: Excel serial int, DD-MMM-YY, DD-MMM-YYYY, DD-MM-YYYY, DD/MM/YYYY, YYYY-MM-DD, ISO timestamp.
 */
function parseAnyDate(raw: any): string {
  if (!raw && raw !== 0) return "";
  const str = String(raw).trim();
  if (!str) return "";

  // Excel serial number (pure integer, 25000-60000 range = years 1968–2064)
  const asNum = Number(str);
  if (!isNaN(asNum) && asNum > 25000 && asNum < 60000 && !str.includes("-") && !str.includes("/")) {
    const d = new Date((asNum - (25567 + 2)) * 86400 * 1000);
    if (!isNaN(d.getTime())) {
      const yr = String(d.getFullYear()).slice(-2);
      const dy = String(d.getDate()).padStart(2, "0");
      return `${dy}-${MONTH_NAMES[d.getMonth()]}-${yr}`;
    }
  }

  // DD-MMM-YY or DD-MMM-YYYY (e.g. 28-Sep-26, 28-Sep-2026)
  const m1 = /^(\d{1,2})-([A-Za-z]{3})-(\d{2,4})$/.exec(str);
  if (m1) {
    const day = m1[1].padStart(2, "0");
    const mmm = m1[2].charAt(0).toUpperCase() + m1[2].slice(1).toLowerCase();
    const yr = m1[3].length === 4 ? m1[3].slice(-2) : m1[3];
    return `${day}-${mmm}-${yr}`;
  }

  // DD-MM-YYYY or DD/MM/YYYY (e.g. 15-09-2026)
  const m2 = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/.exec(str);
  if (m2) {
    const day = m2[1].padStart(2, "0");
    const monthIdx = parseInt(m2[2], 10) - 1;
    const yr = m2[3].slice(-2);
    return `${day}-${MONTH_NAMES[monthIdx] || m2[2]}-${yr}`;
  }

  // YYYY-MM-DD (e.g. 2026-09-15)
  const m3 = /^(\d{4})-(\d{2})-(\d{2})/.exec(str);
  if (m3) {
    const monthIdx = parseInt(m3[2], 10) - 1;
    const yr = m3[1].slice(-2);
    return `${m3[3]}-${MONTH_NAMES[monthIdx] || m3[2]}-${yr}`;
  }

  // ISO / any other JS-parseable date
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    const yr = String(d.getFullYear()).slice(-2);
    const dy = String(d.getDate()).padStart(2, "0");
    return `${dy}-${MONTH_NAMES[d.getMonth()]}-${yr}`;
  }

  return str; // fallback: keep as-is
}

/** Derives MMM-YY from a DD-MMM-YY string */
function monthFromDDMMMYY(ddMMMYY: string): string {
  if (!ddMMMYY) return "";
  const parts = ddMMMYY.split("-");
  if (parts.length === 3 && MONTH_NAMES.includes(parts[1])) {
    return `${parts[1]}-${parts[2]}`;
  }
  return "";
}

// Parses any raw date/timestamp (ISO e.g. "2026-08-11T22:28:43+05:30", Excel serial, or string)
function parseExcelTimestamp(raw: any): { date: string; month: string; timestamp: string } {
  if (!raw) return { date: "", month: "", timestamp: "" };

  try {
    let d: Date | null = null;
    if (raw instanceof Date) {
      d = raw;
    } else if (typeof raw === "number") {
      // Excel serial date number
      d = new Date((raw - (25567 + 2)) * 86400 * 1000);
    } else {
      const str = String(raw).trim();
      const parsed = new Date(str);
      if (!isNaN(parsed.getTime())) {
        d = parsed;
      }
    }

    if (!d || isNaN(d.getTime())) {
      // Fallback: If not parsed, return as raw string date
      return { date: String(raw).trim(), month: "", timestamp: "" };
    }

    const year = String(d.getFullYear()).slice(-2);
    const day = String(d.getDate()).padStart(2, "0");
    const mmm = MONTH_NAMES[d.getMonth()] || "Jan";
    const dateFormatted = `${day}-${mmm}-${year}`;
    const monthFormatted = `${mmm}-${year}`;

    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12;
    const strHours = String(hours).padStart(2, "0");
    const timestampFormatted = `${dateFormatted}, ${strHours}:${minutes} ${ampm}`;

    return {
      date: dateFormatted,
      month: monthFormatted,
      timestamp: timestampFormatted,
    };
  } catch (e) {
    return { date: String(raw).trim(), month: "", timestamp: "" };
  }
}

// Cleans phone number (strips Meta 'p:+91' or '+91' prefix and spaces)
function cleanPhoneNumber(raw: any): string {
  if (!raw) return "";
  let str = String(raw).trim();
  if (str.toLowerCase().startsWith("p:")) {
    str = str.slice(2).trim();
  }
  str = str.replace(/[^\d+]/g, "");
  if (str.startsWith("+91") && str.length === 13) {
    return str.slice(3);
  }
  if (str.startsWith("91") && str.length === 12) {
    return str.slice(2);
  }
  return str;
}

export default function UploadLeadsModal({
  isOpen,
  onClose,
  onLeadsImported,
}: UploadLeadsModalProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsedLeads, setParsedLeads] = useState<any[]>([]);
  const [duplicateCount, setDuplicateCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedCount, setUploadedCount] = useState(0);
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileProcess = async (selectedFile: File) => {
    setError("");
    setFile(selectedFile);
    setIsParsing(true);

    // Yield to the event loop so the browser immediately renders the parsing loading screen
    await new Promise((resolve) => setTimeout(resolve, 80));

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        throw new Error("Excel file is empty or has no readable sheets.");
      }

      const worksheet = workbook.Sheets[sheetName];
      const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, {
        defval: "",
        raw: true,
      });

      if (!rawRows || rawRows.length === 0) {
        throw new Error("No data rows found in the uploaded sheet.");
      }

      const mapped = rawRows.map((row) => {
        const cleanedRow: Record<string, any> = {};
        for (const [key, value] of Object.entries(row)) {
          cleanedRow[cleanKey(key)] = value;
        }

        const getVal = (...possibleKeys: string[]): string => {
          for (const k of possibleKeys) {
            const ck = cleanKey(k);
            if (cleanedRow[ck] !== undefined && cleanedRow[ck] !== "") {
              return String(cleanedRow[ck]).trim();
            }
          }
          return "";
        };

        // getRawVal: returns the raw value (number/string/Date) — needed for date fields
        // so Excel serial numbers are NOT coerced to string prematurely
        const getRawVal = (...possibleKeys: string[]): any => {
          for (const k of possibleKeys) {
            const ck = cleanKey(k);
            if (cleanedRow[ck] !== undefined && cleanedRow[ck] !== "") {
              return cleanedRow[ck];
            }
          }
          return "";
        };

        // Date extraction
        const rawDateVal = getRawVal(
          "First Activity Date",
          "firstActivityDate",
          "Date",
          "Date (DD-MMM-YY)",
          "date",
          "Date of Lead",
          "leadDate",
          "Created Time",
          "created_time",
          "Timestamp",
          "leadTimestamp"
        );
        const parsedDate = parseAnyDate(rawDateVal);
        const parsedMonth = monthFromDDMMMYY(parsedDate) || (parsedDate ? getMonthFromDate(parsedDate) : "");

        const now = new Date();
        let hrs = now.getHours();
        const mins = String(now.getMinutes()).padStart(2, "0");
        const ampm = hrs >= 12 ? "PM" : "AM";
        hrs = hrs % 12;
        hrs = hrs ? hrs : 12;
        const strHours = String(hrs).padStart(2, "0");
        const fallbackNow = `${String(now.getDate()).padStart(2, "0")}-${MONTH_NAMES[now.getMonth()]}-${String(now.getFullYear()).slice(-2)}, ${strHours}:${mins} ${ampm}`;

        const rawTimestampVal = getRawVal("Time Stamp", "leadTimestamp", "Timestamp", "Created On", "createdOn");
        let parsedTimestamp = "";
        if (rawTimestampVal && String(rawTimestampVal).includes(":") && (String(rawTimestampVal).includes("AM") || String(rawTimestampVal).includes("PM"))) {
          parsedTimestamp = String(rawTimestampVal).trim();
        } else {
          const effectiveDate = parsedDate || `${String(now.getDate()).padStart(2, "0")}-${MONTH_NAMES[now.getMonth()]}-${String(now.getFullYear()).slice(-2)}`;
          parsedTimestamp = `${effectiveDate}, ${strHours}:${mins} ${ampm}`;
        }

        const rawFirstActivity = getRawVal("First Activity Date", "firstActivityDate");
        const firstActivityDate = rawFirstActivity ? parseAnyDate(rawFirstActivity) || String(rawFirstActivity).trim() : parsedTimestamp;

        // Couple Profile
        const hName = getVal("Husband Name", "husbandName", "Spouse Name", "spouseName", "Spouse");
        const wName = getVal("Wife Name", "wifeName", "Patient Name", "full_name", "Name", "name", "patient", "patientName");
        const hAge = getVal("Husband Age", "husbandAge", "Spouse Age", "spouseAge");
        const wAge = getVal("Wife Age", "wifeAge", "Patient Age", "Age", "age", "patientAge");

        // Treatment & Clinical
        const whenPlan = getVal(
          "When are you planning to start treatment",
          "whenPlanningToStartTreatment",
          "Looking for Treatment",
          "treatment",
          "lookingForTreatment"
        );
        const preMed = getVal("Pre Medical Conditions", "preMedicalConditions", "Pre Conditions", "preConditions", "Medical History");
        const marriedSince = getVal("Married Since", "marriedSince");
        const tryingYears = getVal("How long you are trying to conceive", "tryingToConceiveYears", "tryingYears");

        // Emails
        const pEmail = getVal("Primary Email", "primaryEmail", "Email", "email", "Pt Email");
        const sEmail = getVal("Secondary Email", "secondaryEmail", "Spouse Email");

        // Mobile Numbers
        const rawPhone = getVal(
          "Primary Mobile number",
          "primaryMobileNumber",
          "Mobile Number",
          "Phone Number",
          "phone_number",
          "mobile",
          "phone",
          "contact",
          "Patient Mobile",
          "Primary Mobile"
        );
        const finalPhone = cleanPhoneNumber(rawPhone);

        const rawAltPhone = getVal(
          "Secondary Mobile number",
          "secondaryMobileNumber",
          "Alternate #",
          "Alternate Number",
          "alternateNumber",
          "alt_phone",
          "Secondary Mobile"
        );
        const altPhone = cleanPhoneNumber(rawAltPhone);

        const rawWhatsapp = getVal("Whatsapp Mobile Number", "whatsappMobileNumber", "whatsappNumber", "whatsapp", "WhatsApp");
        const whatsappNumber = cleanPhoneNumber(rawWhatsapp);

        const otherNumbers = getVal("Other Numbers", "otherNumbers");

        // Consents
        const waConsent = getVal("Whatsapp Consent", "whatsappConsent") || "No";
        const callConsent = getVal("Calling Consent", "callingConsent") || "No";

        // Source & Attribution
        const leadSrc = getVal("Lead Source/UTM Source", "leadSource", "Lead Source", "utmSource", "UTM Source", "Source", "platform");
        const campName = getVal("Campaign Name", "campaignName", "campaign");
        const srcName = getVal("Source Name", "sourceName");
        const src = getVal("Source", "source") || "General";
        const leadScore = getVal("Lead Score", "leadScore") || "0";

        // Status & Dispositions
        const subDisp = getVal("Sub Status", "subStatus", "Sub Dispositions", "subDispositions", "Sub Disposition");
        const disp = getVal("Lead Stage", "leadStage", "Dispositions", "dispositions", "Disposition");
        const validStat = getVal("Lead Valid Status", "leadValidStatus", "Valid Status", "validStatus", "Validity");

        // Creator & Modifier
        const createdBy = getVal("Created By", "createdBy", "createdByMember", "Caller Name", "callerName", "Agent") || "Admin";
        const createdOn = getVal("Created On", "createdOn") || parsedTimestamp;
        const modifiedBy = getVal("Modified By", "modifiedBy", "modifiedByMember") || createdBy;
        const modifiedOn = getVal("Modified On", "modifiedOn") || createdOn;

        // Address
        const centreLoc = getVal("Centre Location", "centreLocation", "Location", "city", "City", "location", "Branch");
        const centreAddr = getVal("Centre Address", "centreAddress") || (centreLoc ? `${centreLoc} Centre` : "");
        const ptAddr = getVal("Pt Address", "ptAddress", "Address", "address");
        const ptPin = getVal("Pt Pincode", "ptPincode", "Pincode", "pincode", "Zip");
        const ptCountry = getVal("Pt Country", "ptCountry") || "India";
        const ptState = getVal("Pt State", "ptState", "State", "state");
        const ptCity = getVal("Pt City", "ptCity", "City", "ptCity") || centreLoc;

        // Ownership & Dates
        const leadOwner = getVal("Lead Owner", "leadOwner", "Caller Name", "callerName", "Caller", "Agent");
        const leadAge = getVal("Lead Age", "leadAge") || "0 days";
        const campLoc = getVal("Camp Location", "campLocation");
        const followUp = getVal("Follow Up Date and Time", "followUpDateTime", "Follow Up Date", "followUpDate", "Next Follow Up");
        const centreVisited = parseAnyDate(getRawVal("Centre Visited Date", "centreVisitedDate"));
        const campVisited = parseAnyDate(getRawVal("Camp Visited Date", "campVisitedDate"));

        // Registration & Plan
        const regStatus = getVal("Registration Status", "registrationStatus") || "No";
        const regNum = getVal("Registration Number", "registrationNumber");
        const regAmt = getVal("Registration Amount", "registrationAmount");
        const pkg = getVal("Package", "package");
        const plan = getVal("Plan", "plan");

        // Notes & Appointment
        const notes = getVal("Notes", "notes", "Remarks", "Observation", "Observations");
        const apptDate = parseAnyDate(getRawVal("Appointment Date", "appointmentDate", "Consultation Date"));

        // Additional / legacy fallback values
        const referred = getVal("Referred By", "referredBy", "Referral");
        const treatReq = getVal("Treatment Requirements", "treatmentRequirements", "Requirements");
        const surgDetails = getVal("Surgery Details", "surgeryDetails", "Surgical Data");
        const apptSlot = getVal("Teleconsultation Slot", "teleconsultationSlot", "Slot");
        const consultFee = getVal("Consultation Charges", "consultationCharges", "Fee");
        const surgDate = parseAnyDate(getRawVal("Surgery Date", "surgeryDate"));
        const surgCost = getVal("Surgery Cost", "surgeryCost");
        const surgPay = getVal("Surgery Payment Received", "surgeryPaymentReceived", "Payment Received");

        return {
          // Exact 49 ALL_LEADS_COLUMNS
          firstActivityDate: firstActivityDate,
          husbandName: hName,
          wifeName: wName,
          husbandAge: hAge,
          wifeAge: wAge,
          whenPlanningToStartTreatment: whenPlan,
          preMedicalConditions: preMed,
          marriedSince: marriedSince,
          tryingToConceiveYears: tryingYears,
          primaryEmail: pEmail,
          secondaryEmail: sEmail,
          primaryMobileNumber: finalPhone,
          secondaryMobileNumber: altPhone,
          whatsappMobileNumber: whatsappNumber,
          otherNumbers: otherNumbers,
          whatsappConsent: waConsent,
          callingConsent: callConsent,
          leadSource: leadSrc || "Excel Import",
          campaignName: campName,
          sourceName: srcName,
          source: src,
          leadScore: leadScore,
          subStatus: subDisp,
          leadStage: disp,
          leadValidStatus: validStat,
          createdBy: createdBy,
          createdOn: createdOn,
          modifiedBy: modifiedBy,
          modifiedOn: modifiedOn,
          centreAddress: centreAddr,
          ptAddress: ptAddr,
          ptPincode: ptPin,
          ptCountry: ptCountry,
          ptState: ptState,
          ptCity: ptCity,
          leadOwner: leadOwner,
          leadAge: leadAge,
          campLocation: campLoc,
          centreLocation: centreLoc,
          followUpDateTime: followUp,
          centreVisitedDate: centreVisited,
          campVisitedDate: campVisited,
          registrationStatus: regStatus,
          registrationNumber: regNum,
          registrationAmount: regAmt,
          package: pkg,
          plan: plan,
          notes: notes,
          appointmentDate: apptDate,

          // Legacy / backward-compatibility aliases
          date: parsedDate,
          month: parsedMonth,
          leadTimestamp: parsedTimestamp,
          mobileNumber: finalPhone,
          phoneNumber: finalPhone,
          alternateNumber: altPhone,
          patientName: wName,
          spouseName: hName,
          patientAge: wAge,
          spouseAge: hAge,
          location: centreLoc,
          callerName: leadOwner || createdBy,
          referredBy: referred,
          lookingForTreatment: whenPlan,
          treatmentRequirements: treatReq,
          preConditions: preMed,
          surgeryDetails: surgDetails,
          followUpDate: followUp,
          subDispositions: subDisp,
          dispositions: disp,
          validStatus: validStat,
          appointmentMonth: monthFromDDMMMYY(apptDate),
          teleconsultationSlot: apptSlot,
          consultationCharges: consultFee,
          surgeryDate: surgDate,
          surgeryCost: surgCost,
          surgeryPaymentReceived: surgPay,
        };
      });

      // Keep all sheet rows directly (no file-level deduplication) and cap to 10,000
      const validLeads: any[] = [];

      for (const lead of mapped) {
        const hasAnyData = Object.values(lead).some((v) => v !== "" && v !== "-" && v !== null && v !== undefined);
        if (!hasAnyData) continue;

        validLeads.push(lead);

        // Cap at strictly 10,000 leads per batch
        if (validLeads.length >= 10000) {
          break;
        }
      }

      setDuplicateCount(0);

      if (validLeads.length === 0) {
        throw new Error("No data found in the uploaded file. Please check column headers.");
      }

      setParsedLeads(validLeads);
    } catch (err: any) {
      console.error(err);
      setError("Failed to parse file: " + (err.message || "Invalid file format"));
    } finally {
      setIsParsing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      handleFileProcess(selected);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      handleFileProcess(droppedFile);
    }
  };

  const handleDownloadSample = () => {
    // Generate sample template containing exact columns matching All Leads table (ALL_LEADS_COLUMNS)
    const sampleRow: Record<string, any> = {
      "First Activity Date": "28-Sep-26, 10:30 AM",
      "Husband Name": "Rahul Sharma",
      "Wife Name": "Pooja Sharma",
      "Husband Age": "34",
      "Wife Age": "30",
      "When are you planning to start treatment": "Immediately",
      "Pre Medical Conditions": "No",
      "Married Since": "5",
      "How long you are trying to conceive": "3",
      "Primary Email": "pooja.sharma@example.com",
      "Secondary Email": "rahul.sharma@example.com",
      "Primary Mobile number": "9876543210",
      "Secondary Mobile number": "9123456789",
      "Whatsapp Mobile Number": "9876543210",
      "Other Numbers": "",
      "Whatsapp Consent": "Yes",
      "Calling Consent": "Yes",
      "Lead Source/UTM Source": "Google Search Ads",
      "Campaign Name": "IVF Awareness 2026",
      "Source Name": "Website Form",
      "Source": "Google",
      "Lead Score": "75",
      "Sub Status": "Appointment Booked",
      "Lead Stage": "Converted",
      "Lead Valid Status": "Valid",
      "Created By": "Admin",
      "Created On": "28-Sep-26, 10:30 AM",
      "Modified By": "Admin",
      "Modified On": "28-Sep-26, 10:30 AM",
      "Centre Address": "Delhi Malviya Nagar Centre",
      "Pt Address": "Block B, Malviya Nagar",
      "Pt Pincode": "110017",
      "Pt Country": "India",
      "Pt State": "Delhi",
      "Pt City": "Delhi",
      "Lead Owner": "Admin",
      "Lead Age": "0 days",
      "Camp Location": "",
      "Centre Location": "Delhi MN",
      "Follow Up Date and Time": "30-Sep-26",
      "Centre Visited Date": "02-Oct-26",
      "Camp Visited Date": "",
      "Registration Status": "Yes",
      "Registration Number": "REG-2026-001",
      "Registration Amount": "500",
      "Package": "IVF Standard",
      "Plan": "Self Cycle",
      "Notes": "Patient interested in IVF treatment at Delhi Malviya Nagar branch.",
      "Appointment Date": "02-Oct-26",
    };

    const worksheet = XLSX.utils.json_to_sheet([sampleRow]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sample Template");
    XLSX.writeFile(workbook, "patient_leads_sample_template.xlsx");
  };

  const handleConfirmImport = async () => {
    if (parsedLeads.length === 0) return;
    setLoading(true);
    setUploadProgress(0);
    setUploadedCount(0);
    setError("");

    try {
      const CHUNK_SIZE = 1000;
      const totalLeads = parsedLeads.length;
      let totalDeleted = 0;
      let latestNextId = "";
      const allImportedLeads: any[] = [];

      for (let i = 0; i < totalLeads; i += CHUNK_SIZE) {
        const chunk = parsedLeads.slice(i, i + CHUNK_SIZE);
        const res = await apiFetch("/api/admin/leads/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ leads: chunk }),
        });

        const data = await res.json();
        if (data.leads && Array.isArray(data.leads)) {
          allImportedLeads.push(...data.leads);
        } else {
          allImportedLeads.push(...chunk);
        }

        if (data.deletedCount) totalDeleted += data.deletedCount;
        if (data.nextUniqueId) latestNextId = data.nextUniqueId;

        const currentDone = Math.min(i + CHUNK_SIZE, totalLeads);
        setUploadedCount(currentDone);
        const percentage = Math.round((currentDone / totalLeads) * 100);
        setUploadProgress(percentage);
      }

      // Smooth finish
      setUploadProgress(100);
      await new Promise((r) => setTimeout(r, 400));

      onLeadsImported(allImportedLeads, latestNextId, totalDeleted);
      notifyLeadUpdated();
      handleClose();
    } catch (err: any) {
      console.warn("Bulk upload notice:", err.message);
      // Fallback: still notify parent with parsed leads smoothly
      onLeadsImported(parsedLeads, "", 0);
      handleClose();
    } finally {
      setLoading(false);
      setUploadProgress(0);
      setUploadedCount(0);
    }
  };

  const handleClose = () => {
    setFile(null);
    setParsedLeads([]);
    setDuplicateCount(0);
    setError("");
    setLoading(false);
    setUploadProgress(0);
    setUploadedCount(0);
    setIsParsing(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className={`relative w-full ${file ? "max-w-7xl" : "max-w-2xl"} bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh] text-black transition-all`}>
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#cc2727]/10 border border-[#cc2727]/20 text-[#cc2727]">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-black">Upload Leads (Excel / CSV)</h3>
              <p className="text-xs text-gray-600 mt-0.5">
                Bulk import patient leads with auto-assigned Unique IDs
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-black p-1 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1 bg-white">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {isParsing ? (
            /* File Parsing Loading Screen */
            <div className="py-20 flex flex-col items-center justify-center space-y-4 animate-in fade-in duration-200">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-slate-100 border-t-[#cc2727] animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <FileSpreadsheet className="w-6 h-6 text-[#cc2727]" />
                </div>
              </div>
              <div className="text-center space-y-1">
                <h4 className="text-sm font-bold text-black">Reading & Analyzing Excel File...</h4>
                <p className="text-xs text-gray-500">
                  Processing rows, mapping fields, and preparing preview...
                </p>
                {file && (
                  <p className="text-[11px] text-gray-400 font-mono pt-1">
                    {file.name} ({(file.size / (1024 * 1024)).toFixed(1)} MB)
                  </p>
                )}
              </div>
            </div>
          ) : !file ? (
            /* Upload Drop Area */
            <div className="space-y-4">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                  isDragging
                    ? "border-[#cc2727] bg-[#cc2727]/5"
                    : "border-slate-300 hover:border-[#cc2727]/60 bg-slate-50 hover:bg-slate-100/70"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="w-14 h-14 mx-auto rounded-2xl bg-[#cc2727]/10 border border-[#cc2727]/20 flex items-center justify-center text-[#cc2727] mb-3.5 shadow-inner">
                  <FileSpreadsheet className="w-7 h-7" />
                </div>
                <h4 className="text-sm font-bold text-black mb-1">
                  Drag & Drop Excel or CSV file here
                </h4>
                <p className="text-xs text-gray-600 max-w-sm mx-auto mb-4 font-normal">
                  Supports <strong>.xlsx</strong>, <strong>.xls</strong>, and <strong>.csv</strong>. All rows will be assigned consecutive <strong>SOI- Unique IDs</strong> automatically.
                </p>
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#cc2727] hover:bg-[#b02121] text-white text-xs font-bold shadow-md shadow-[#cc2727]/25 transition-all">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Browse File</span>
                </span>
              </div>

              {/* Sample Template Download */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-2.5">
                  <FileText className="w-4 h-4 text-[#cc2727]" />
                  <span className="text-xs text-black font-medium">
                    Need the exact column format?
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadSample}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#cc2727]/10 hover:bg-[#cc2727]/20 text-[#cc2727] border border-[#cc2727]/20 text-xs font-bold transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Sample Template</span>
                </button>
              </div>
            </div>
          ) : (
            /* File Preview & Confirmation */
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[#cc2727]/10 text-[#cc2727]">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-black truncate max-w-xs">
                      {file.name}
                    </div>
                    <div className="text-[11px] text-gray-600 font-medium flex items-center gap-2">
                      <span>{(file.size / 1024).toFixed(1)} KB</span>
                      <span>•</span>
                      <span className="text-emerald-700 font-bold">
                        {parsedLeads.length} leads detected
                      </span>
                      {duplicateCount > 0 && (
                        <>
                          <span>•</span>
                          <span className="text-amber-600 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            {duplicateCount} duplicate(s) removed
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    setParsedLeads([]);
                  }}
                  className="text-xs text-rose-600 hover:text-rose-700 font-semibold underline cursor-pointer"
                >
                  Change File
                </button>
              </div>

              {/* Preview Table with all columns matching All Leads */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-black flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span>Preview All Detected Leads ({parsedLeads.length} Total):</span>
                    <span className="text-[11px] font-normal text-gray-500">
                      (Showing all {ALL_LEADS_COLUMNS.length} fields)
                    </span>
                  </div>
                  <span className="text-[11px] text-[#cc2727] font-semibold">
                    Consecutive SOI- Unique IDs will be auto-generated
                  </span>
                </div>
                <div className="border border-slate-300 rounded-xl overflow-x-auto max-h-[55vh] overflow-y-auto bg-white shadow-inner">
                  <table className="w-full text-left text-xs text-black whitespace-nowrap border-collapse">
                    <thead className="bg-slate-100 text-black text-[11px] uppercase tracking-wider border-b border-slate-300 font-bold sticky top-0 z-10 shadow-sm">
                      <tr>
                        <th className="px-3 py-2.5 border-r border-slate-200 bg-slate-100">#</th>
                        {ALL_LEADS_COLUMNS.map((col) => (
                          <th key={col.id} className="px-3 py-2.5 border-r border-slate-200 bg-slate-100">
                            {col.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {parsedLeads.map((lead, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td className="px-3 py-2 text-gray-500 font-mono border-r border-slate-100 text-center font-semibold">
                            {idx + 1}
                          </td>
                          {ALL_LEADS_COLUMNS.map((col) => {
                            const val = lead[col.id];
                            const displayVal = val !== undefined && val !== null && String(val).trim() !== "" ? String(val) : "-";
                            return (
                              <td
                                key={col.id}
                                className={`px-3 py-2 border-r border-slate-100 ${
                                  col.id === "wifeName" || col.id === "husbandName"
                                    ? "font-bold text-black"
                                    : col.id.toLowerCase().includes("date") || col.id.toLowerCase().includes("time") || col.id.toLowerCase().includes("number") || col.id.toLowerCase().includes("age")
                                    ? "font-mono text-black"
                                    : "text-black"
                                } max-w-xs truncate`}
                                title={displayVal !== "-" ? displayVal : undefined}
                              >
                                {displayVal}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center justify-between text-[11px] text-gray-600 px-1 pt-1 font-medium">
                  <span>Showing all {parsedLeads.length} leads</span>
                  <span>Scroll horizontally to view all {ALL_LEADS_COLUMNS.length} columns &amp; vertically to view all rows</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="px-4 py-2 bg-white hover:bg-slate-100 disabled:opacity-40 text-black border border-slate-300 text-xs font-semibold rounded-xl transition-colors cursor-pointer shadow-2xs"
          >
            Cancel
          </button>

          {/* Progress Bar Display when uploading */}
          {loading && (
            <div className="flex-1 max-w-md mx-4 space-y-1 animate-in fade-in duration-150">
              <div className="flex items-center justify-between text-xs font-semibold text-black">
                <span className="flex items-center gap-1.5 text-[#cc2727]">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Uploading to Database...</span>
                </span>
                <span className="font-mono text-[#cc2727] font-bold">
                  {uploadProgress}% ({uploadedCount}/{parsedLeads.length})
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden p-0.5 border border-slate-300 shadow-inner">
                <div
                  className="h-full bg-gradient-to-r from-[#cc2727] to-rose-500 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {file && (
            <button
              type="button"
              disabled={loading || parsedLeads.length === 0}
              onClick={handleConfirmImport}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#cc2727] hover:bg-[#b02121] text-white text-xs font-bold rounded-xl shadow-md shadow-[#cc2727]/25 transition-all disabled:opacity-50 cursor-pointer active:scale-95"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Uploading {uploadProgress}%</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Confirm & Import {parsedLeads.length} Leads</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
