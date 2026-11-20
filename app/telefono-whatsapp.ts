export function enlaceWhatsApp(telefono: string): string | null {
  const limpio = telefono.trim();
  if (!/^[+\d\s().-]+$/.test(limpio)) return null;
  let numero = limpio.replace(/\D/g, '');
  if (/^09\d{7}$/.test(numero)) numero = `598${numero.slice(1)}`;
  else if (numero.startsWith('00')) numero = numero.slice(2);
  else if (!limpio.startsWith('+') && !numero.startsWith('598')) return null;
  if (/^59809\d{7}$/.test(numero)) numero = `598${numero.slice(4)}`;
  return /^[1-9]\d{7,14}$/.test(numero) ? `https://wa.me/${numero}` : null;
}
