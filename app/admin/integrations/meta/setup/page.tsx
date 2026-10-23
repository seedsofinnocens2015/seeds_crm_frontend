"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function MetaAdsSetupRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/integrations/meta");
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-[#cc2727]/30 border-t-[#cc2727] rounded-full animate-spin" />
    </div>
  );
}
