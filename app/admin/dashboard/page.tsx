"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LayoutDashboard, Clock } from "lucide-react";
import AdminSidebar from "@/app/components/AdminSidebar";
import Footer from "@/app/components/Footer";

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) {
          router.push("/admin/login");
          return;
        }
        const data = await res.json();
        if (!data.user || data.user.role !== "admin") {
          router.push("/admin/login");
          return;
        }
        setUser(data.user);
      } catch (err) {
        console.error("Auth error:", err);
        router.push("/admin/login");
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [router]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/admin/login");
    } catch {
      router.push("/admin/login");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#cc2727]/30 border-t-[#cc2727] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-black flex">
      {/* Sidebar with Navigation */}
      <AdminSidebar activeTab="dashboard" user={user} onLogout={handleLogout} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 shrink-0 border-b border-slate-200 bg-white/90 backdrop-blur-md px-6 flex items-center justify-between z-20">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#cc2727]/10 border border-[#cc2727]/20 text-[#cc2727]">
              <LayoutDashboard className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-black leading-tight">Admin Dashboard</h1>
              <p className="text-[11px] text-gray-500">
                Welcome, {user?.name || "Admin"}
              </p>
            </div>
          </div>
        </header>

        {/* Clean Dashboard Placeholder */}
        <main className="flex-1 p-6 sm:p-8 flex items-center justify-center">
          <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 p-8 shadow-sm text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-[#cc2727]/10 text-[#cc2727] flex items-center justify-center">
              <Clock className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-black">Dashboard Under Setup</h2>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </div>
  );
}
