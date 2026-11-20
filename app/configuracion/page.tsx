import BotonVolver from '../boton-volver';
import ConfiguracionCliente from '../configuracion-cliente';
import PreferenciaAgendaDiaria from '../preferencia-agenda-diaria';
import ConfiguracionContacto from '../configuracion-contacto';
import ConfiguracionPlazos from '../configuracion-plazos';
import ConfiguracionCuentas from '../configuracion-cuentas';

export default function Configuracion() {
  return <main className="container"><h1>Mi cuenta</h1><BotonVolver href="/">Volver al inicio</BotonVolver><ConfiguracionCliente /><PreferenciaAgendaDiaria /><ConfiguracionContacto /><ConfiguracionCuentas /><ConfiguracionPlazos /></main>;
}
