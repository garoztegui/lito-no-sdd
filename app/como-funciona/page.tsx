'use client';

import BotonVolver from '../boton-volver';
import { horas, usePlazos } from '../plazos';
import { createBrowserClient } from '@supabase/ssr';
import { useEffect, useState } from 'react';
import { conLimite } from '../limite';

export default function ComoFunciona() {
  const { plazos, error } = usePlazos();
  const [esAdministrador, setEsAdministrador] = useState(false);
  useEffect(() => {
    let vigente = true;
    const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
    async function consultarRol() {
      try {
        const { data: { user }, error: errorUsuario } = await conLimite(() => supabase.auth.getUser());
        if (errorUsuario || !user) return;
        const perfil = await conLimite(signal => supabase.from('perfiles').select('es_administrador').eq('id', user.id).abortSignal(signal).maybeSingle());
        if (vigente && !perfil.error) setEsAdministrador(perfil.data?.es_administrador === true);
      } catch {
        if (vigente) setEsAdministrador(false);
      }
    }
    void consultarRol();
    return () => { vigente = false; };
  }, []);
  return <main className="container">
    <h1>¿Cómo funciona?</h1>
    <BotonVolver href="/">Volver al inicio</BotonVolver>
    <section className="informacion" aria-label="Cómo reservar una cita">
      <h2>{esAdministrador ? '¿Cómo funciona para el usuario?' : 'Tu cita, paso a paso ✨'}</h2>
      {error ? <p role="alert">No se pudieron cargar los plazos.</p> : !plazos ? <p>Cargando plazos...</p> : <ol>
        <li><strong>Elige tu momento 📅</strong><p>Selecciona un servicio y un horario disponible. Puedes solicitarlo con al menos {horas(plazos.reserva)} de anticipación y hasta 3 meses antes.</p></li>
        <li><strong>Espera la respuesta ⏳</strong><p>Tu solicitud queda pendiente mientras Lito la revisa. Puede aceptarla, rechazarla o proponerte otro horario.</p></li>
        <li><strong>¿Hay propuesta? Tú decides 🤔</strong><p>En Mis citas puedes aceptar el nuevo horario para confirmarlo o rechazarlo para cancelar la cita. Sin vueltas ni contrapropuestas.</p></li>
        <li><strong>Que no se pase el reloj ⏰</strong><p>Las solicitudes y propuestas pendientes vencen {horas(plazos.reserva)} antes de la cita y liberan el horario.</p></li>
        <li><strong>¿Cambio de planes? 🗓️</strong><p>Puedes cancelar una cita cuando faltan más de {horas(plazos.cancelacion)}. Si rechazas una propuesta vigente, se cancela aunque falten {horas(plazos.cancelacion)} o menos. Lito puede cancelar una cita confirmada hasta una hora antes e informarte el motivo.</p></li>
      </ol>}
    </section>
    {esAdministrador && <section className="informacion" aria-labelledby="ayuda-administrador">
      <h2 id="ayuda-administrador">¿Qué puedo hacer como administrador?</h2>
      <ol>
        <li><strong>Gestionar la agenda 📅</strong><p>Consulta las citas y acepta o rechaza solicitudes. También puedes proponer otro horario o cancelar una cita confirmada indicando el motivo.</p></li>
        <li><strong>Reservar para otras personas 🤝</strong><p>Crea citas para usuarios registrados o para personas que todavía no tienen una cuenta.</p></li>
        <li><strong>Organizar los turnos ⏰</strong><p>Define tus horarios habituales y bloquea días u horas cuando no puedas atender.</p></li>
        <li><strong>Administrar servicios y usuarios 📋</strong><p>Actualiza los servicios, consulta los datos y el historial de tus clientes y envíate la lista de usuarios por email.</p></li>
        <li><strong>Ajustar tu espacio ⚙️</strong><p>Desde tu cuenta puedes configurar los plazos, el contacto, las cuentas bancarias y las notificaciones de la agenda.</p></li>
      </ol>
    </section>}
  </main>;
}
