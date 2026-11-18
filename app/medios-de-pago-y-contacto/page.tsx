import { redirect } from 'next/navigation';
import { esClienteAutenticado } from '../acceso-cliente';
import TelefonoWhatsApp from '../agenda-admin/telefono-whatsapp';

export default async function MediosDePagoYContacto() {
  if (!await esClienteAutenticado()) redirect('/');
  return <main className="container">
    <h1>Medios de pago y contacto</h1>
    <a href="/">Volver al inicio</a>
    <section className="informacion" aria-label="Contacto y medios de pago">
      <h2>Contacto de Lito</h2>
      <p>Teléfono: <TelefonoWhatsApp telefono="094 553 211" /></p>
      <h2>Medios de pago</h2>
      <h3>Cuenta bancaria</h3>
      <p>José Luis</p>
      <p>BANCO REPUBLICA $ 00040248300001</p>
      <h3>EFECTIVO</h3>
    </section>
  </main>;
}
