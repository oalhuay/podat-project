import type { ReactNode } from "react";
import UserAvatarMenu from "@/components/UserAvatarMenu";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.35em] text-slate-400">
              Panel
            </div>
            <div className="text-lg font-black text-slate-900">PODAT Admin</div>
          </div>

          <UserAvatarMenu />
        </div>
      </div>

      <div>{children}</div>
    </div>
  );
}
