import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function esClienteAutenticado() {
  try {
    const almacenamiento = await cookies();
    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
      cookies: { getAll: () => almacenamiento.getAll(), setAll: () => {} },
    });
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return false;
    const { data: perfil, error: errorPerfil } = await supabase.from('perfiles').select('es_administrador,nombre,telefono,sexo').eq('id', user.id).maybeSingle();
    return !errorPerfil && perfil?.es_administrador === false && Boolean(perfil.nombre?.trim()) && Boolean(perfil.telefono?.trim())
      && ['Hombre', 'Mujer', 'Prefiero no especificar'].includes(perfil.sexo ?? '');
  } catch {
    return false;
  }
}
