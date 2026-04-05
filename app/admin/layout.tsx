"use client";

import type { ReactNode } from "react";
import AdminSidebar from "@/components/admin/AdminSidebar";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(93,154,212,0.12),_transparent_30%),linear-gradient(180deg,_#f8fafc_0%,_#eef4ff_100%)]">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-6 px-4 py-4 sm:px-6 lg:flex-row lg:px-8 lg:py-6">
        <AdminSidebar />
        <div className="min-w-0 flex-1">
          <div className="rounded-[2rem] border border-white/70 bg-white/90 p-6 shadow-xl shadow-slate-200/40 backdrop-blur sm:p-8">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
