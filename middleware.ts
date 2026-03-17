import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const adminOnlyPrefixes = ["/admin/usuarios", "/admin/importar", "/admin/materias"];
const docenteAllowedPrefixes = [
  "/admin/notas",
  "/admin/asistencias",
  "/admin/estadisticas",
  "/admin/mis-materias",
];

export async function middleware(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next();
  }

  const response = NextResponse.next();
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.searchParams.set("auth_status", "error");
    url.searchParams.set("auth_error", "unauthorized");
    return NextResponse.redirect(url);
  }

  const { data: perfilData } = await supabase
    .from("perfiles")
    .select("rol")
    .eq("id", user.id)
    .maybeSingle();

  const rol = perfilData?.rol ?? null;
  const pathname = request.nextUrl.pathname;

  const isAdminOnly = adminOnlyPrefixes.some((prefix) => pathname.startsWith(prefix));
  if (isAdminOnly && rol !== "admin") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.searchParams.set("auth_status", "error");
    url.searchParams.set("auth_error", "forbidden");
    return NextResponse.redirect(url);
  }

  if (!isAdminOnly) {
    const isAdminRoute = pathname.startsWith("/admin");
    const isDocenteAllowed = docenteAllowedPrefixes.some((prefix) =>
      pathname.startsWith(prefix)
    );

    if (isAdminRoute && !(rol === "admin" || (rol === "docente" && isDocenteAllowed))) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      url.searchParams.set("auth_status", "error");
      url.searchParams.set("auth_error", "forbidden");
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*"],
};
