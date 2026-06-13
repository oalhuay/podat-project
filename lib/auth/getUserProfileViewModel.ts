import type { User } from "@supabase/supabase-js";

export type UserProfileViewModel = {
  name: string;
  email: string;
  avatar: string | null;
  initials: string;
};

export function getUserProfileViewModel(user: User | null): UserProfileViewModel {
  const metadata = user?.user_metadata;
  const name: string =
    metadata?.full_name ?? metadata?.name ?? user?.email?.split("@")[0] ?? "Usuario";
  const email = user?.email ?? "Sin correo";
  const avatar = metadata?.avatar_url ?? metadata?.picture ?? null;
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
