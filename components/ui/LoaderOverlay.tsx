import React from "react";

interface LoaderOverlayProps {
  isLoading: boolean;
  message?: string;
  className?: string;
}

export default function LoaderOverlay({
  isLoading,
  message,
  className = "rounded-[2rem]",
}: LoaderOverlayProps) {
  if (!isLoading) return null;

  return (
    <div
      className={`absolute inset-0 flex flex-col items-center justify-center bg-slate-50/60 backdrop-blur-[2px] z-30 transition-all duration-300 ${className}`}
    >
      <div className="flex flex-col items-center gap-3">
        <div className="relative h-12 w-12">
          {/* Círculo de fondo */}
          <div className="absolute inset-0 rounded-full border-4 border-slate-200/80"></div>
          {/* Círculo giratorio */}
          <div className="absolute inset-0 rounded-full border-4 border-t-[#5D9AD4] border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
        </div>
        {message && (
          <p className="text-xs font-black text-slate-500 uppercase tracking-widest animate-pulse">
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
