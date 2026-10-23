"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, XCircle, AlertCircle, Loader2, ArrowLeft, RefreshCw } from "lucide-react";

function OAuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [status, setStatus] = useState<"loading" | "success" | "error" | "cancelled">("loading");
  const [message, setMessage] = useState<string>("Exchanging authorization with Meta...");
  const [errorDetails, setErrorDetails] = useState<string>("");
  const [registeredPages, setRegisteredPages] = useState<any[]>([]);

  // Strict Mode & Duplicate Execution Protection:
  // Tracks whether the code exchange request has already been dispatched.
  const exchangeDispatchedRef = useRef<boolean>(false);

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");
    const errorReason = searchParams.get("error_reason");
    const errorDescription = searchParams.get("error_description");

    // 1. User cancellation or Meta dialog error
    if (error) {
      if (error === "access_denied" || errorReason === "user_denied") {
        setStatus("cancelled");
        setMessage("Meta authorization was cancelled by the user.");
        setErrorDetails("You can re-connect your Meta account anytime from the Integrations tab.");
      } else {
        setStatus("error");
        setMessage(errorDescription || "Meta authorization failed.");
        setErrorDetails(errorReason ? `Reason: ${errorReason}` : "");
      }
      return;
    }

    // 2. Missing authorization code or state
    if (!code || !state) {
      // If code was already stripped by history.replaceState, don't revert to error
      if (exchangeDispatchedRef.current) return;

      setStatus("error");
      setMessage("Invalid callback parameters.");
      setErrorDetails("Authorization code or CSRF state was not returned by Meta.");
      return;
    }

    // 3. Prevent duplicate code dispatch (React Strict Mode mounting twice in dev)
    if (exchangeDispatchedRef.current) {
      return;
    }
    exchangeDispatchedRef.current = true;

    // Dispatch code exchange to backend
    const exchangeOAuthCode = async () => {
      try {
        setMessage("Verifying security state and registering authorized Facebook Pages...");
        const res = await fetch(
          `/api/integrations/meta/oauth/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`,
          {
            method: "GET",
            headers: {
              Accept: "application/json",
            },
          }
        );

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          setStatus("error");
          setMessage(data?.error || "Failed to exchange authorization code with Meta.");
          setErrorDetails(data?.details || "Please check that your Meta user has Admin/Advertiser tasks on the Page.");
          return;
        }

        setStatus("success");
        setMessage(data?.message || "Meta Account connected successfully!");
        setRegisteredPages(Array.isArray(data?.pages) ? data.pages : []);

        // Clean URL to prevent re-submitting code on page refresh
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch (err: any) {
        setStatus("error");
        setMessage("Network error connecting to backend service.");
        setErrorDetails(err.message || "Failed to contact integration endpoint.");
      }
    };

    exchangeOAuthCode();
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-100 p-8 text-center">
        {status === "loading" && (
          <div className="space-y-4">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto animate-pulse">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Connecting to Meta</h2>
            <p className="text-sm text-slate-600">{message}</p>
            <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-500 font-mono">
              Validating security state & discovering Pages...
            </div>
          </div>
        )}

        {status === "success" && (
          <div className="space-y-5">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Account Connected!</h2>
              <p className="text-sm text-slate-600 mt-1">{message}</p>
            </div>

            {registeredPages.length > 0 && (
              <div className="text-left bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-2">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Discovered Pages ({registeredPages.length})
                </div>
                <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                  {registeredPages.map((p, idx) => (
                    <div
                      key={p.pageId || idx}
                      className="flex items-center justify-between text-xs bg-white p-2 rounded-lg border border-slate-200 shadow-2xs"
                    >
                      <span className="font-semibold text-slate-800 truncate pr-2">{p.pageName}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                          p.isSubscribed
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}
                      >
                        {p.isSubscribed ? "Webhook Active" : "Pending Subscription"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => router.push("/admin/integrations/meta")}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm transition-colors shadow-sm flex items-center justify-center gap-2"
            >
              <span>Go to Meta Integration Dashboard</span>
            </button>
          </div>
        )}

        {status === "cancelled" && (
          <div className="space-y-4">
            <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Connection Cancelled</h2>
            <p className="text-sm text-slate-600">{message}</p>
            {errorDetails && <p className="text-xs text-slate-500">{errorDetails}</p>}
            <div className="pt-2">
              <Link
                href="/admin/integrations/meta"
                className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 py-2 px-4 rounded-xl transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Return to Integrations
              </Link>
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-4">
            <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto">
              <XCircle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Connection Error</h2>
            <p className="text-sm text-rose-600 font-medium">{message}</p>
            {errorDetails && (
              <div className="p-3 bg-rose-50/50 border border-rose-100 rounded-xl text-xs text-rose-800 text-left">
                {errorDetails}
              </div>
            )}
            <div className="pt-3 flex gap-2">
              <Link
                href="/admin/integrations/meta"
                className="flex-1 py-2 px-3 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center justify-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Integrations
              </Link>
              <button
                onClick={() => window.location.reload()}
                className="py-2 px-3 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MetaOAuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="flex items-center gap-3 text-slate-600 font-medium">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            <span>Loading Meta authorization callback...</span>
          </div>
        </div>
      }
    >
      <OAuthCallbackContent />
    </Suspense>
  );
}
