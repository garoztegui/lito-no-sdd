'use server';

import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export async function eliminarCuenta(): Promise<{ ok: boolean }> {
  try {
    const almacenamiento = await cookies();
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const publicable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    const secreto = process.env.SUPABASE_SECRET_KEY;
    if (!url || !publicable || !secreto) return { ok: false };
    const supabase = createServerClient(url, publicable, {
      cookies: { getAll: () => almacenamiento.getAll(), setAll: cambios => cambios.forEach(({ name, value, options }) => almacenamiento.set(name, value, options)) },
    });
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return { ok: false };
    const perfil = await supabase.from('perfiles').select('es_administrador').eq('id', user.id).maybeSingle();
    if (perfil.error || !perfil.data || perfil.data.es_administrador !== false) return { ok: false };
    const administrador = createClient(url, secreto, { auth: { persistSession: false, autoRefreshToken: false } });
    const resultado = await administrador.auth.admin.deleteUser(user.id);
    if (resultado.error) return { ok: false };
    try { await supabase.auth.signOut({ scope: 'local' }); } catch { /* La cuenta ya fue eliminada. */ }
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
