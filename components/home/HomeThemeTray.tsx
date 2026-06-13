"use client";

import { useRef, useState } from "react";
import ThemeToggle from "@/components/theme/ThemeToggle";

export default function HomeThemeTray() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const handleBlur = (event: React.FocusEvent<HTMLDivElement>) => {
    if (!containerRef.current?.contains(event.relatedTarget as Node | null)) {
      setIsOpen(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className="absolute right-0 top-3 z-30 flex items-center px-2 py-2 md:right-2 md:px-4"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
      onFocusCapture={() => setIsOpen(true)}
      onBlur={handleBlur}
    >
      <div aria-hidden="true" className="absolute right-[-20px] top-0 h-full w-5" />
      <div
        className={`flex items-center transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-[calc(100%-1.1rem)]"
        }`}
      >
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-expanded={isOpen}
          aria-controls="home-theme-tray"
          aria-label={isOpen ? "Ocultar selector de tema" : "Mostrar selector de tema"}
          className={`theme-shell flex h-11 items-center justify-center overflow-hidden rounded-l-2xl border border-r-0 border-slate-200 bg-white/85 text-lg text-slate-500 shadow-sm transition-all duration-300 hover:bg-slate-50 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#5D9AD4]/18 ${
            isOpen ? "w-0 border-none opacity-0" : "w-11"
          }`}
        >
          <span
            className={`transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
            aria-hidden="true"
          >
            {"<"}
          </span>
        </button>

        <div id="home-theme-tray" className="rounded-r-2xl">
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}
