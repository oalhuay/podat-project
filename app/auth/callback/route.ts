import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { Rol } from "@/types/database";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const redirectUrl = new URL("/", origin);
  const cookieStore = await cookies();
  const code = searchParams.get("code");
  const rol = searchParams.get("rol");
  const rolDesdeCookie = cookieStore.get("podat_rol")?.value;
  const rolCrudo = rol ?? rolDesdeCookie ?? null;
  const rolSeleccionado: Exclude<Rol, null> | null =
    rolCrudo === "admin" || rolCrudo === "docente" ? rolCrudo : null;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    redirectUrl.searchParams.set("auth_status", "error");
    redirectUrl.searchParams.set("auth_error", "missing_env");
    return NextResponse.redirect(redirectUrl);
  }

  if (code) {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    });

    const {
      data: { session },
      error: authError,
    } = await supabase.auth.exchangeCodeForSession(code);

    if (authError) {
      redirectUrl.searchParams.set("auth_status", "error");
      redirectUrl.searchParams.set("auth_error", `auth_${authError.code ?? "unknown"}`);
      return NextResponse.redirect(redirectUrl);
    }

    if (session?.user && rolSeleccionado) {
      // Use the fresh access token directly to ensure auth.uid() is available in this request.
      const supabaseAuthed = createClient(supabaseUrl, supabaseAnonKey, {
        global: {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        },
      });

      let { error: dbError } = await supabaseAuthed
        .from("perfiles")
        .upsert(
          {
            id: session.user.id,
            rol: rolSeleccionado,
            correo: session.user.email ?? null,
          },
          { onConflict: "id" }
        );

      // If `correo` column does not exist yet, retry saving only mandatory fields.
      const isMissingCorreoColumn =
        !!dbError &&
        (dbError.code === "42703" ||
          dbError.code === "PGRST204" ||
          dbError.message.toLowerCase().includes("correo"));

      if (isMissingCorreoColumn) {
        const retry = await supabaseAuthed
          .from("perfiles")
          .upsert(
            {
              id: session.user.id,
              rol: rolSeleccionado,
            },
            { onConflict: "id" }
          );
        dbError = retry.error;
      }

      if (dbError) {
        console.error(
          `Database error saving profile [${dbError.code ?? "no_code"}]:`,
          dbError.message
        );
        redirectUrl.searchParams.set("auth_status", "error");
        redirectUrl.searchParams.set("auth_error", `db_${dbError.code ?? "unknown"}`);
        return NextResponse.redirect(redirectUrl);
      }

      redirectUrl.searchParams.set("auth_status", "ok");
      redirectUrl.searchParams.set("rol", rolSeleccionado);
      redirectUrl.searchParams.set("auth_error", "");
      cookieStore.delete("podat_rol");
      return NextResponse.redirect(redirectUrl);
    }
  }

  redirectUrl.searchParams.set("auth_status", "error");
  redirectUrl.searchParams.set("auth_error", "missing_code_or_role");
  return NextResponse.redirect(redirectUrl);
}
