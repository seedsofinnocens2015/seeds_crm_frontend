"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  LogOut,
  Building2,
  ChevronRight,
  ShieldCheck,
  X,
  Mail,
  Phone,
  Calendar,
  User,
  UserCheck,
} from "lucide-react";
import UserProfileModal from "./UserProfileModal";

interface AgentSidebarProps {
  activeTab?: string;
  user: any;
  onLogout: () => void | Promise<void>;
}

export default function AgentSidebar({ user, onLogout }: AgentSidebarProps) {
  const pathname = usePathname();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const navItems = [
    {
      name: "Dashboard",
      href: "/agent/dashboard",
      icon: LayoutDashboard,
    },
    {
      name: "All Leads",
      href: "/agent/leads",
      icon: FolderKanban,
    },
  ];

  return (
    <>
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 h-screen sticky top-0 overflow-y-auto z-30 shadow-sm">
        {/* Brand & Navigation */}
        <div>
          {/* Header */}
          <div className="h-16 px-6 border-b border-slate-200 items-center gap-3 bg-white">
              <Image src="/logo.svg" alt="Seeds of Innocence CRM Logo" width={150} height={38} priority className="h-15 w-auto" />
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

        {/* User profile button (Clickable to open profile popup) */}
        <div className="p-4 border-t border-slate-200 bg-white">
          <button
            type="button"
            onClick={() => setIsProfileModalOpen(true)}
            className="w-full p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 hover:border-slate-300 transition-all flex items-center gap-3 text-left group cursor-pointer"
          >
            <div className="w-9 h-9 rounded-xl bg-[#cc2727]/10 text-[#cc2727] border border-[#cc2727]/20 flex items-center justify-center font-bold text-sm uppercase group-hover:bg-[#cc2727] group-hover:text-white transition-all shrink-0">
              {user?.name ? user.name.charAt(0) : "A"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-s font-bold text-slate-900 truncate group-hover:text-[#cc2727] transition-colors">
                {user?.name || "Agent"}
              </p>
              <span className="text-[12px] text-slate-500 block mt-0.5">
                Agent Panel
              </span>
            </div>
          </button>
        </div>
      </aside>

      {/* Profile Details Modal */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        user={user}
        onLogout={onLogout}
      />
    </>
  );
}
