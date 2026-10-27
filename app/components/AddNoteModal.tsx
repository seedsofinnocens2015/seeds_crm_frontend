"use client";

import React, { useState } from "react";
import { X, Plus, Save, FileText } from "lucide-react";

interface AddNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (noteText: string) => Promise<void>;
  patientName?: string;
  leadUniqueId?: string;
}

export default function AddNoteModal({
  isOpen,
  onClose,
  onSubmit,
  patientName,
  leadUniqueId,
}: AddNoteModalProps) {
  const [noteText, setNoteText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) {
      setError("Please enter a note before submitting.");
      return;
    }
    setSubmitting(true);
    setError("");

    try {
      await onSubmit(noteText.trim());
      setNoteText("");
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to add note");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 text-slate-800">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-sky-50 text-sky-600 border border-sky-100">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Add Patient Note</h3>
              <p className="text-[11px] text-slate-500">
                {patientName || "Lead"} ({leadUniqueId || "ID"})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {error && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              {error}
            </div>
          )}

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1.5">
              Note / Remarks Content *
            </label>
            <textarea
              required
              rows={5}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Enter clinical notes, call summary, patient concerns, treatment plans..."
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#cc2727] resize-none"
            />
          </div>

          <div className="p-3 bg-sky-50/70 border border-sky-100 rounded-xl text-[11px] text-slate-600">
            Note will be permanently logged with your name, timestamp, and visible in Activity History & Notes Stream.
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:text-slate-800 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-[#cc2727] hover:bg-[#b02121] text-white rounded-xl text-xs font-bold shadow-md shadow-[#cc2727]/25 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {submitting ? (
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Plus className="w-3.5 h-3.5" />
              )}
              <span>Add Note</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
