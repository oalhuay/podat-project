import { supabase } from './supabase'
import { Rol } from '@/types/database'

// Este objeto centraliza todas las acciones de la base de datos
export const db = {
  // Función para guardar el rol del usuario
  async asignarRol(userId: string, rol: Rol) {
    const { error } = await supabase
      .from('perfiles')
      .upsert({ 
        id: userId, 
        rol: rol 
      }) 
    
    return { error }
  }
}
