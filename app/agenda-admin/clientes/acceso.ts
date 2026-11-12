import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function accesoAdministrador() {
  const almacenamiento = await cookies();
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: { getAll: () => almacenamiento.getAll(), setAll: () => {} },
  });
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { estado: 'sin_sesion' as const };
  const { data: perfil, error: errorPerfil } = await supabase.from('perfiles').select('es_administrador').eq('id', user.id).maybeSingle();
  if (errorPerfil) return { estado: 'error' as const };
  if (!perfil?.es_administrador) return { estado: 'sin_acceso' as const };
  return { estado: 'autorizado' as const, supabase };
}
