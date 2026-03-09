"use client";

type StatusMessage = {
  type: "success" | "error" | "info";
  text: string;
};

type StatusBannerProps = {
  message: StatusMessage;
};

const statusMessageClasses = {
  success: "bg-green-50 text-green-800 border-green-200",
  error: "bg-red-50 text-red-800 border-red-200",
  info: "bg-slate-50 text-slate-700 border-slate-200",
};

export default function StatusBanner({ message }: StatusBannerProps) {
  return (
    <div
      className={`mt-6 rounded-2xl border px-4 py-3 text-sm font-medium ${statusMessageClasses[message.type]}`}
    >
      {message.text}
    </div>
  );
}

