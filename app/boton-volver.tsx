import type { ReactNode } from 'react';

export default function BotonVolver({ href, children }: { href: string; children: ReactNode }) {
  return <form action={href} className="formulario-volver"><button type="submit" className="volver-menu">{children}</button></form>;
}
