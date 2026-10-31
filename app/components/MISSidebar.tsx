"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  LogOut,
  ChevronRight,
  X,
  Mail,
  Phone,
  FileSpreadsheet,
} from "lucide-react";
import UserProfileModal from "./UserProfileModal";

interface MISSidebarProps {
  activeTab?: string;
  user: any;
  onLogout: () => void | Promise<void>;
}

export default function MISSidebar({ user, onLogout }: MISSidebarProps) {
  const pathname = usePathname();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const navItems = [
    {
      name: "Dashboard",
      href: "/mis/dashboard",
      icon: LayoutDashboard,
    },
    {
      name: "All Leads",
      href: "/mis/leads",
      icon: FolderKanban,
    },
  ];

  return (
    <>
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 h-screen sticky top-0 overflow-y-auto z-30 shadow-sm">
        {/* Brand & Navigation */}
        <div>
          {/* Header */}
          <div className="h-16 px-4 border-b border-slate-200 flex items-center justify-between bg-white">
            <Image
              src="/logo.svg"
              alt="Seeds of Innocence CRM Logo"
              width={140}
              height={36}
              priority
              className="h-14 w-auto"
            />
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 font-mono">
              MIS Portal
            </span>
          </div>

          {/* Menu list */}
          <div className="p-4 space-y-1.5">
            <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Main Menu
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    isActive
                      ? "bg-[#cc2727] text-white shadow-md shadow-[#cc2727]/25"
                      : "text-slate-700 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`w-4 h-4 ${
                        isActive ? "text-white" : "text-slate-500"
                      }`}
                    />
                    <span>{item.name}</span>
                  </div>
                  {isActive && <ChevronRight className="w-4 h-4 text-white/80" />}
                </Link>
              );
            })}
          </div>
        </div>

        {/* User profile button */}
        <div className="p-4 border-t border-slate-200 bg-white">
          <div
            onClick={() => setIsProfileModalOpen(true)}
            className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group mb-2 border border-transparent hover:border-slate-200"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center font-bold text-sky-700 shrink-0 shadow-xs">
                {user?.name ? user.name.charAt(0).toUpperCase() : "M"}
              </div>
              <div className="min-w-0 text-left">
                <p className="text-xs font-bold text-slate-900 truncate group-hover:text-[#cc2727] transition-colors">
                  {user?.name || "MIS Executive"}
                </p>
                <span className="text-[10px] text-sky-700 font-semibold flex items-center gap-1">
                  <FileSpreadsheet className="w-3 h-3 text-sky-600" />
                  MIS Analyst
                </span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 group-hover:translate-x-0.5 transition-all shrink-0" />
          </div>

          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-rose-200"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* User Profile Modal */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        user={user}
        onLogout={onLogout}
      />
    </>
  );
}
