"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  User,
  UserCheck,
  Mail,
  Phone,
  Calendar,
  LogOut,
  PhoneCall,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from "lucide-react";

export interface UserProfileData {
  id?: string;
  _id?: string;
  name?: string;
  email?: string;
  mobile?: string;
  role?: string;
  status?: string;
  smartfloAgentId?: string;
  smartfloAgentNumber?: string;
  smartfloCallerId?: string;
  createdAt?: string;
}

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfileData | null;
  onLogout?: () => void | Promise<void>;
  onUserUpdated?: (updatedUser: UserProfileData) => void;
}

export default function UserProfileModal({
  isOpen,
  onClose,
  user,
  onLogout,
  onUserUpdated,
}: UserProfileModalProps) {
  const [extensionId, setExtensionId] = useState("");
  const [callerId, setCallerId] = useState("");
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Sync initial configuration from user data
  useEffect(() => {
    if (user) {
      setExtensionId(user.smartfloAgentId || user.smartfloAgentNumber || "");
      setCallerId(user.smartfloCallerId || "");
      setSuccessMsg("");
      setErrorMsg("");
    }
  }, [user, isOpen]);

  if (!isOpen || !user) return null;

  const handleSaveExtension = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg("");
    setErrorMsg("");

    try {
      const cleanVal = extensionId.trim();
      const cleanCallerId = callerId.trim();

      if (cleanVal.length > 30) {
        throw new Error("Extension ID cannot exceed 30 characters.");
      }

      if (cleanVal && !/^[0-9a-zA-Z_-]+$/.test(cleanVal)) {
        throw new Error("Extension ID may only contain numbers, letters, underscores, and hyphens.");
      }

      if (cleanCallerId && !/^\+?[0-9]{8,15}$/.test(cleanCallerId)) {
        throw new Error("Caller ID must be a valid number format (e.g. +919228173971 or 9228173971).");
      }

      const res = await fetch("/api/auth/smartflo-extension", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          smartfloAgentId: cleanVal,
          smartfloCallerId: cleanCallerId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || "Failed to update Smartflo settings.");
      }

      setSuccessMsg("Smartflo settings updated successfully!");
      if (onUserUpdated) {
        onUserUpdated({
          ...user,
          smartfloAgentId: cleanVal,
          smartfloAgentNumber: cleanVal,
          smartfloCallerId: cleanCallerId,
        });
      }

      // Also dispatch custom event for instant cross-component sync
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("user_profile_updated", {
            detail: { smartfloAgentId: cleanVal, smartfloAgentNumber: cleanVal, smartfloCallerId: cleanCallerId },
          })
        );
      }

      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to save Smartflo settings.");
    } finally {
      setSaving(false);
    }
  };

  const roleLabel =
    user.role === "team_leader"
      ? "Team Leader"
      : user.role === "mis"
      ? "MIS"
      : user.role === "marketing"
      ? "Marketing"
      : user.role === "admin"
      ? "Administrator"
      : "Agent";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 sm:p-7 text-slate-900 max-h-[92vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
          aria-label="Close profile modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Profile Header */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-[#cc2727]/10 text-[#cc2727] border border-[#cc2727]/20 flex items-center justify-center font-extrabold text-2xl uppercase shadow-md shadow-[#cc2727]/10 shrink-0">
            {user?.name ? user.name.charAt(0) : "U"}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-bold text-slate-900 leading-tight">
              {user?.name || "User Profile"}
            </h3>
            <span className="inline-flex items-center gap-1.5 mt-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#cc2727]/10 text-[#cc2727] border border-[#cc2727]/20">
              <User className="w-3 h-3" />
              {roleLabel}
            </span>
          </div>
        </div>

        {/* Profile Details List */}
        <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 text-xs sm:text-sm">
          <div className="flex items-center justify-between py-1.5 border-b border-slate-200">
            <span className="text-slate-500 flex items-center gap-2 shrink-0">
              <UserCheck className="w-4 h-4 text-[#cc2727]" />
              Full Name
            </span>
            <span className="font-bold text-slate-900 text-right ml-4">
              {user?.name || "N/A"}
            </span>
          </div>

          <div className="flex items-center justify-between py-1.5 border-b border-slate-200">
            <span className="text-slate-500 flex items-center gap-2 shrink-0">
              <Mail className="w-4 h-4 text-[#cc2727]" />
              Email
            </span>
            <span className="font-semibold text-slate-800 text-right ml-4 break-all select-all">
              {user?.email || "N/A"}
            </span>
          </div>

          <div className="flex items-center justify-between py-1.5 border-b border-slate-200">
            <span className="text-slate-500 flex items-center gap-2">
              <Phone className="w-4 h-4 text-[#cc2727]" />
              Mobile
            </span>
            <span className="font-semibold text-slate-800 text-right">
              {user?.mobile || "Not specified"}
            </span>
          </div>

          <div className="flex items-center justify-between py-1.5 border-b border-slate-200">
            <span className="text-slate-500 flex items-center gap-2">
              <User className="w-4 h-4 text-[#cc2727]" />
              Role
            </span>
            <span className="font-bold text-[#cc2727] uppercase tracking-wider text-[11px]">
              {user?.role || "agent"}
            </span>
          </div>

          <div className="flex items-center justify-between py-1.5">
            <span className="text-slate-500 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#cc2727]" />
              Member Since
            </span>
            <span className="font-semibold text-slate-800 text-right">
              {user?.createdAt
                ? new Date(user.createdAt).toLocaleDateString()
                : "Active"}
            </span>
          </div>
        </div>

        {/* Section: Smartflo Integration (Self-Service Extension ID Management) */}
        <div className="mb-6 p-4 bg-emerald-50/50 border border-emerald-200/80 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
              <PhoneCall className="w-3.5 h-3.5 text-emerald-600" />
              Smartflo Integration
            </span>
            <span className="text-[10px] text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full font-medium">
              Telephony
            </span>
          </div>

          <p className="text-xs text-slate-600 mb-3 leading-relaxed">
            Configure your Smartflo agent extension ID and outbound Caller ID/DID. Click-to-Call dials your extension first and displays your assigned Caller ID to the customer.
          </p>

          <form onSubmit={handleSaveExtension} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Smartflo Agent ID / Extension *
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={extensionId}
                  onChange={(e) => setExtensionId(e.target.value)}
                  placeholder="e.g. 0608426290047"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 placeholder-slate-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Assigned Outbound Caller ID / DID
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={callerId}
                  onChange={(e) => setCallerId(e.target.value)}
                  placeholder="e.g. +919228173971"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 placeholder-slate-400"
                />
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">
                The pilot DID number assigned to you in Smartflo for outbound calls.
              </span>
            </div>

            {/* Success message */}
            {successMsg && (
              <div className="p-2.5 rounded-lg bg-emerald-100/80 border border-emerald-300 text-emerald-900 text-xs font-medium flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Error message */}
            {errorMsg && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold rounded-xl text-xs transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving Settings...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Smartflo Configuration</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Sign Out Button inside Popup */}
        {onLogout && (
          <button
            onClick={() => {
              onClose();
              onLogout();
            }}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[#cc2727] hover:bg-[#b02121] text-white font-semibold rounded-xl text-sm transition-all shadow-md shadow-[#cc2727]/25 active:scale-95 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        )}
      </div>
    </div>
  );
}
