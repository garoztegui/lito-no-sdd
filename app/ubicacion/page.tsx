import { redirect } from 'next/navigation';
import { esClienteAutenticado } from '../acceso-cliente';

export default async function Ubicacion() {
  if (!await esClienteAutenticado()) redirect('/');
  return <main className="container">
    <h1>Ubicación</h1>
    <a href="/">Volver al inicio</a>
    <section className="informacion" aria-label="Dirección de LITO">
      <h2>¿Dónde estamos?</h2>
      <p>Isla de Gaspar 2445, Montevideo, Uruguay</p>
      <p>🅿️ 🚗 ESTACIONAMIENTO DISPONIBLE! Es cerrado, dentro del consultorio.</p>
      <iframe className="mapa-ubicacion" title="Mapa de ubicación de LITO" src="https://maps.google.com/maps?q=Isla+de+Gaspar+2445%2C+Montevideo%2C+Uruguay&output=embed" loading="lazy" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen />
    </section>
  </main>;
}
