import type { AuthUser } from "@/types/auth";

export type UserProfileViewModel = {
  name: string;
  email: string;
  avatar: string | null;
  initials: string;
};

export function getUserProfileViewModel(user: AuthUser | null): UserProfileViewModel {
  const metadata = user?.user_metadata;
  const rawName =
    metadata?.full_name ?? metadata?.name ?? user?.email?.split("@")[0] ?? "Usuario";
  const name = String(rawName);
  const email = user?.email ?? "Sin correo";
  const rawAvatar = metadata?.avatar_url ?? metadata?.picture;
  const avatar = typeof rawAvatar === "string" ? rawAvatar : null;
  const initials = name
    .split(" ")
    .filter((word: string) => Boolean(word))
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");

  return {
    name,
    email,
    avatar,
    initials,
  };
}
