"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cx, ui } from "@/components/ui/styles";

type SelectOption<T extends string> = {
  label: string;
  value: T;
};

type InlineSelectProps<T extends string> = {
  options: SelectOption<T>[];
  value: T;
  onChange: (value: T) => void;
  placeholder?: string;
  className?: string;
};

export default function InlineSelect<T extends string>({
  options,
  value,
  onChange,
  placeholder = "Seleccionar",
  className = "",
}: InlineSelectProps<T>) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const selectedOption = useMemo(
    () => options.find((option) => option.value === value) ?? null,
    [options, value]
  );

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className={`relative mt-2 ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className={cx(ui.input, "flex items-center justify-between text-left")}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className={selectedOption ? "font-semibold" : "text-slate-400"}>
          {selectedOption?.label ?? placeholder}
        </span>
        <span
          className={`text-slate-500 transition-transform ${isOpen ? "rotate-180" : ""}`}
          aria-hidden="true"
        >
          <svg viewBox="0 0 20 20" className="h-5 w-5 fill-current">
            <path d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.1 1.02l-4.25 4.5a.75.75 0 0 1-1.1 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z" />
          </svg>
        </span>
      </button>

      {isOpen && (
        <div
          role="listbox"
          className="absolute left-0 right-0 z-30 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-200/70"
        >
          <div className="max-h-64 overflow-y-auto p-2">
            {options.map((option) => {
              const isSelected = option.value === value;

              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${
                    isSelected
                      ? "bg-[#5D9AD4]/12 font-bold text-[#2f5f91]"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <span>{option.label}</span>
                  {isSelected && (
                    <span className="text-[#5D9AD4]" aria-hidden="true">
                      <svg viewBox="0 0 20 20" className="h-4 w-4 fill-current">
                        <path d="M16.7 5.29a1 1 0 0 1 .01 1.41l-7.2 7.3a1 1 0 0 1-1.42 0l-3.8-3.85a1 1 0 1 1 1.42-1.4l3.1 3.15 6.49-6.58a1 1 0 0 1 1.4-.03Z" />
                      </svg>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
