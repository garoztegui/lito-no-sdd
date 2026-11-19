import ConfiguracionCliente from '../configuracion-cliente';
import PreferenciaAgendaDiaria from '../preferencia-agenda-diaria';

export default function Configuracion() {
  return <main className="container"><h1>Mi cuenta</h1><a href="/">Volver al inicio</a><ConfiguracionCliente /><PreferenciaAgendaDiaria /></main>;
}
