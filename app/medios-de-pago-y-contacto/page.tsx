import BotonVolver from '../boton-volver';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { esClienteAutenticado } from '../acceso-cliente';
import TelefonoWhatsApp from '../agenda-admin/telefono-whatsapp';

export default async function MediosDePagoYContacto() {
  if (!await esClienteAutenticado()) redirect('/');
  const almacenamiento = await cookies();
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { cookies: { getAll: () => almacenamiento.getAll(), setAll: () => {} } });
  const { data: contacto, error } = await supabase.from('contacto_config').select('telefono').eq('id', true).single();
  if (error || !contacto) throw new Error('No se pudieron cargar los datos de contacto.');
  const { data: cuentas, error: errorCuentas } = await supabase.from('cuentas_bancarias').select('id,entidad,titular,moneda,numero').order('id');
  if (errorCuentas || !cuentas) throw new Error('No se pudieron cargar las cuentas bancarias.');
  return <main className="container">
    <h1>Medios de pago y contacto</h1>
    <BotonVolver href="/">Volver al inicio</BotonVolver>
    <section className="informacion" aria-label="Contacto y medios de pago">
      <h2>Contacto de Lito</h2>
      <p>Teléfono: <TelefonoWhatsApp telefono={contacto.telefono} /></p>
      <h2>Medios de pago</h2>
      {cuentas.map(cuenta => <div key={cuenta.id}>
        <h3>{cuenta.entidad}</h3>
        <p>Titular: {cuenta.titular}</p>
        <p>Moneda: {cuenta.moneda}</p>
        <p>Número: {cuenta.numero}</p>
      </div>)}
      <h3>EFECTIVO</h3>
    </section>
  </main>;
}
