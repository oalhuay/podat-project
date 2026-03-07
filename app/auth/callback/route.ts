import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { Rol } from '@/types/database'

export async function GET(request: Request) {
  // 1. Capturamos la URL y los datos que vienen de Google
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code') // El código de Google
  const rolSeleccionado = searchParams.get('rol') as Rol // El rol que elegimos en el botón

  if (code) {
    const supabase = createRouteHandlerClient({ cookies })
    
    // 2. Intercambiamos el código por una sesión real
    const { data: { session } } = await supabase.auth.exchangeCodeForSession(code)

    // 3. Si tenemos sesión y un rol, guardamos en la base de datos de forma MODULAR
    if (session?.user && rolSeleccionado) {
      await db.asignarRol(session.user.id, rolSeleccionado)
    }
  }

  // 4. Lo mandamos de vuelta al inicio, ya logueado y con su rol guardado
  return NextResponse.redirect(`${origin}`)
}