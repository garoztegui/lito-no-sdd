export default function TelefonoWhatsApp({ telefono }: { telefono: string }) {
  const limpio = telefono.trim();
  if (!/^[+\d\s().-]+$/.test(limpio)) return <>{telefono}</>;

  let numero = limpio.replace(/\D/g, '');
  if (/^09\d{7}$/.test(numero)) numero = `598${numero.slice(1)}`;
  else if (numero.startsWith('00')) numero = numero.slice(2);
  else if (!limpio.startsWith('+') && !numero.startsWith('598')) return <>{telefono}</>;

  if (/^59809\d{7}$/.test(numero)) numero = `598${numero.slice(4)}`;

  if (!/^[1-9]\d{7,14}$/.test(numero)) return <>{telefono}</>;
  return <a href={`https://wa.me/${numero}`} target="_blank" rel="noopener noreferrer">{telefono}</a>;
}
