import { enlaceWhatsApp } from '../telefono-whatsapp';

export default function TelefonoWhatsApp({ telefono }: { telefono: string }) {
  const enlace = enlaceWhatsApp(telefono);
  return enlace ? <a href={enlace} target="_blank" rel="noopener noreferrer">{telefono}</a> : <>{telefono}</>;
}
