"use client";

import { cx } from "@/components/ui/styles";

type ProfileAvatarProps = {
  src?: string | null;
  alt: string;
  initials: string;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizeClasses = {
  sm: "h-10 w-10 text-sm",
  md: "h-12 w-12 text-base",
  lg: "h-14 w-14 text-base",
} as const;

export default function ProfileAvatar({
  src,
  alt,
  initials,
  size = "sm",
  className = "",
}: ProfileAvatarProps) {
  const avatarClassName = cx(
    "rounded-full border object-cover",
    sizeClasses[size],
    size === "lg" ? "border-white/80 shadow-sm" : "border-slate-200",
    className
  );

  if (src) {
    return (
      // Google avatars are remote and not configured in next/image.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={alt} className={avatarClassName} />
    );
  }

  return (
    <div
      className={cx(
        "flex items-center justify-center rounded-full bg-[#5D9AD4] font-black text-white",
        sizeClasses[size],
        className
      )}
      aria-hidden="true"
    >
      {initials || "U"}
    </div>
  );
}
