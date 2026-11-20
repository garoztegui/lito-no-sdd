'use client';

import BotonVolver from '../boton-volver';
import { horas, usePlazos } from '../plazos';

export default function ComoFunciona() {
  const { plazos, error } = usePlazos();
  return <main className="container">
    <h1>¿Cómo funciona?</h1>
    <BotonVolver href="/">Volver al inicio</BotonVolver>
    <section className="informacion" aria-label="Cómo reservar una cita">
      <h2>Tu cita, paso a paso ✨</h2>
      {error ? <p role="alert">No se pudieron cargar los plazos.</p> : !plazos ? <p>Cargando plazos...</p> : <ol>
        <li><strong>Elige tu momento 📅</strong><p>Selecciona un servicio y un horario disponible. Puedes solicitarlo con al menos {horas(plazos.reserva)} de anticipación y hasta 3 meses antes.</p></li>
        <li><strong>Espera la respuesta ⏳</strong><p>Tu solicitud queda pendiente mientras Lito la revisa. Puede aceptarla, rechazarla o proponerte otro horario.</p></li>
        <li><strong>¿Hay propuesta? Tú decides 🤔</strong><p>En Mis citas puedes aceptar el nuevo horario para confirmarlo o rechazarlo para cancelar la cita. Sin vueltas ni contrapropuestas.</p></li>
        <li><strong>Que no se pase el reloj ⏰</strong><p>Las solicitudes y propuestas pendientes vencen {horas(plazos.reserva)} antes de la cita y liberan el horario.</p></li>
        <li><strong>¿Cambio de planes? 🗓️</strong><p>Puedes cancelar una cita cuando faltan más de {horas(plazos.cancelacion)}. Si rechazas una propuesta vigente, se cancela aunque falten {horas(plazos.cancelacion)} o menos. Lito puede cancelar una cita confirmada hasta una hora antes e informarte el motivo.</p></li>
      </ol>}
    </section>
  </main>;
}
