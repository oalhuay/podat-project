"use client";

type StatusMessage = {
  type: "success" | "error" | "info";
  text: string;
};

type StatusBannerProps = {
  message: StatusMessage;
};

const statusMessageClasses = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  error: "border-rose-200 bg-rose-50 text-rose-800",
  info: "border-slate-200 bg-slate-50 text-slate-700",
};

const statusAccentClasses = {
  success: "bg-emerald-500",
  error: "bg-rose-500",
  info: "bg-[#5D9AD4]",
};

export default function StatusBanner({ message }: StatusBannerProps) {
  return (
    <div
      className={`mt-6 flex items-start gap-3 rounded-[1.5rem] border px-4 py-3 text-sm font-medium shadow-sm ${statusMessageClasses[message.type]}`}
      role="status"
      aria-live="polite"
    >
      <span
        aria-hidden="true"
        className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${statusAccentClasses[message.type]}`}
      />
      <span className="leading-6">{message.text}</span>
    </div>
  );
}
