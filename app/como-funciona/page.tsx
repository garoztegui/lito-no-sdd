export default function ComoFunciona() {
  return <main className="container">
    <h1>¿Cómo funciona?</h1>
    <a href="/">Volver al inicio</a>
    <section className="informacion" aria-label="Cómo reservar una cita">
      <h2>Tu cita, paso a paso ✨</h2>
      <ol>
        <li><strong>Elige tu momento 📅</strong><p>Selecciona un servicio y un horario disponible. Puedes solicitarlo con al menos 4 horas de anticipación y hasta 3 meses antes.</p></li>
        <li><strong>Espera la respuesta ⏳</strong><p>Tu solicitud queda pendiente mientras Lito la revisa. Puede aceptarla, rechazarla o proponerte otro horario.</p></li>
        <li><strong>¿Hay propuesta? Tú decides 🤔</strong><p>En Mis citas puedes aceptar el nuevo horario para confirmarlo o rechazarlo para cancelar la cita. Sin vueltas ni contrapropuestas.</p></li>
        <li><strong>Que no se pase el reloj ⏰</strong><p>Las solicitudes y propuestas pendientes vencen 4 horas antes de la cita y liberan el horario.</p></li>
        <li><strong>¿Cambio de planes? 🗓️</strong><p>Puedes cancelar una cita cuando faltan más de 12 horas. Si rechazas una propuesta vigente, se cancela aunque falten 12 horas o menos. Lito puede cancelar una cita confirmada hasta una hora antes e informarte el motivo.</p></li>
      </ol>
    </section>
  </main>;
}
