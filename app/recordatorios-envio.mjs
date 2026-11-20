export async function procesarRecordatorios(ids, obtener, enviar, finalizar, registrar = console.error) {
  let enviados = 0;
  let errores = 0;
  await Promise.all(ids.map(async id => {
    let enviado = false;
    try {
      const cita = await obtener(id);
      if (cita) {
        await enviar(cita);
        enviado = true;
        enviados++;
      }
    } catch (error) {
      errores++;
      registrar('No se pudo enviar un recordatorio.', { code: typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined });
    }
    try { await finalizar(id, enviado); }
    catch { errores++; registrar('No se pudo registrar un recordatorio.'); }
  }));
  return { procesados: ids.length, enviados, errores };
}
