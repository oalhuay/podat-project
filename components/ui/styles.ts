"use client";

export function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export const ui = {
  shell:
    "rounded-[2rem] border border-white/70 bg-white/90 shadow-xl shadow-slate-200/45 backdrop-blur-sm",
  card: "rounded-[1.75rem] border border-slate-200 bg-white shadow-sm shadow-slate-200/30",
  mutedCard:
    "rounded-[1.5rem] border border-slate-200/80 bg-slate-50/90 shadow-sm shadow-slate-200/20",
  dashedCard:
    "rounded-[1.75rem] border-2 border-dashed border-slate-200 bg-slate-50/90 shadow-sm shadow-slate-200/20",
  subtleCard:
    "rounded-[1.35rem] border border-slate-100 bg-white/80 shadow-sm shadow-slate-200/20",
  input:
    "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none shadow-sm shadow-slate-200/20 transition-all placeholder:text-slate-400 hover:border-slate-300 focus:border-[#5D9AD4] focus:ring-4 focus:ring-[#5D9AD4]/12",
  select:
    "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none shadow-sm shadow-slate-200/20 transition-all hover:border-slate-300 focus:border-[#5D9AD4] focus:ring-4 focus:ring-[#5D9AD4]/12",
  primaryButton:
    "rounded-2xl bg-[#5D9AD4] px-4 py-3 text-sm font-black text-white shadow-sm shadow-[#5D9AD4]/25 transition-all hover:-translate-y-0.5 hover:bg-[#4E89C0] hover:shadow-md disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60",
  secondaryButton:
    "rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm shadow-slate-200/20 transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60",
  ghostButton:
    "rounded-2xl border border-slate-200/80 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 transition-all hover:border-slate-300 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60",
  successButton:
    "rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black text-white shadow-sm shadow-emerald-600/20 transition-all hover:-translate-y-0.5 hover:bg-emerald-700 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60",
  sectionEyebrow:
    "text-[11px] font-black uppercase tracking-[0.28em] text-slate-400",
  sectionTitle: "text-2xl font-black tracking-tight text-slate-900",
  sectionText: "text-sm leading-6 text-slate-500",
};
