import BotonVolver from '../boton-volver';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { esClienteAutenticado } from '../acceso-cliente';

export default async function Ubicacion() {
  if (!await esClienteAutenticado()) redirect('/');
  const almacenamiento = await cookies();
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { cookies: { getAll: () => almacenamiento.getAll(), setAll: () => {} } });
  const { data: contacto, error } = await supabase.from('contacto_config').select('direccion').eq('id', true).single();
  if (error || !contacto) throw new Error('No se pudo cargar la dirección.');
  return <main className="container">
    <h1>Ubicación</h1>
    <BotonVolver href="/">Volver al inicio</BotonVolver>
    <section className="informacion" aria-label="Dirección de LITO">
      <h2>¿Dónde estamos?</h2>
      <p>{contacto.direccion}</p>
      <p>🅿️ 🚗 ESTACIONAMIENTO DISPONIBLE! Es cerrado, dentro del consultorio.</p>
      <iframe className="mapa-ubicacion" title="Mapa de ubicación de LITO" src={`https://maps.google.com/maps?${new URLSearchParams({ q: contacto.direccion, output: 'embed' })}`} loading="lazy" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen />
    </section>
  </main>;
}
