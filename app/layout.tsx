import type { ReactNode } from 'react';
import MenuCuenta from './menu-cuenta';
import './globals.css';

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="es"><body>
    <div className="barra-marca"><div className="barra-marca-interior">
      <a className="identidad" href="/" aria-label="Lito Masajes, ir al inicio"><span className="identidad-simbolo" aria-hidden="true" /><span>LITO<br />MASAJES</span></a>
      <MenuCuenta />
    </div></div>
    {children}
    <footer className="pie-sitio"><span>LITO MASAJES</span><span aria-hidden="true" className="pie-marcas" /></footer>
  </body></html>;
}
