import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/lib/database";
import type { Rol } from "@/types/database";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const rolSeleccionado = searchParams.get("rol") as Rol;

  // LOG 1: ¿Llegamos al peaje?
  console.log("1. 🚩 Callback alcanzado. Rol elegido:", rolSeleccionado);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("❌ Error: Faltan variables de entorno de Supabase");
    return NextResponse.redirect(origin);
  }

  if (code) {
    const cookieStore = await cookies();
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

    // LOG 2: Intentando el apretón de manos con Google
    console.log("2. 🤝 Intercambiando código por sesión...");
    const { data: { session }, error: authError } = await supabase.auth.exchangeCodeForSession(code);

    if (authError) {
      console.error("❌ Error de Auth:", authError.message);
    }

    if (session?.user && rolSeleccionado) {
      console.log("3. ✅ Sesión obtenida para ID:", session.user.id);
      
      // LOG 4: Intentando guardar en la tabla perfiles
      console.log("4. 💾 Intentando guardar rol en la base de datos...");
      const { error: dbError } = await db.asignarRol(session.user.id, rolSeleccionado);
      
      if (dbError) {
        console.error("❌ Error de Base de Datos:", dbError.message);
      } else {
        console.log("🚀 ¡ÉXITO! Rol guardado correctamente.");
      }
    } else {
      console.warn("⚠️ Advertencia: No hay sesión o no se recibió el rol.");
    }
  }

  return NextResponse.redirect(origin);
}