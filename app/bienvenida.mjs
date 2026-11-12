/** @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {(message: {to: string, subject: string, text: string}) => Promise<unknown>} send */
export async function enviarBienvenida(supabase, send) {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user?.email) return;
    const { data: claimed, error: claimError } = await supabase.rpc('reclamar_bienvenida');
    if (claimError || !claimed) return;
    await send({
      to: user.email,
      subject: '¡Bienvenido a LITO Reservas! 🎉',
      text: '¡Te damos la bienvenida a LITO Reservas! 😊\n\nTu cuenta está lista. Ya podés elegir un momento para dedicarte a tu bienestar. ✨\n\nSerá un gusto acompañarte.\n\nEl equipo de LITO',
    });
  } catch {
    console.error('No se pudo enviar el email de bienvenida.');
  }
}
