'use client';

import { createBrowserClient } from '@supabase/ssr';
import { useEffect, useState, type FormEvent } from 'react';

type DatosCuenta = { entidad: string; titular: string; moneda: string; numero: string };
type Cuenta = DatosCuenta & { id: number };
const vacia: DatosCuenta = { entidad: '', titular: '', moneda: 'Pesos', numero: '' };

export default function ConfiguracionCuentas() {
  const [admin, setAdmin] = useState(false);
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [datos, setDatos] = useState<DatosCuenta>(vacia);
  const [editando, setEditando] = useState<number | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    let vigente = true;
    const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
    async function cargar() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const perfil = await supabase.from('perfiles').select('es_administrador').eq('id', user.id).maybeSingle();
      if (!vigente || !perfil.data?.es_administrador) return;
      setAdmin(true);
      const resultado = await supabase.from('cuentas_bancarias').select('id,entidad,titular,moneda,numero').order('id');
      if (!vigente) return;
      if (resultado.error) setError('No se pudieron cargar las cuentas bancarias.');
      else setCuentas(resultado.data);
    }
    void cargar();
    return () => { vigente = false; };
  }, []);

  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (ocupado) return;
    setOcupado(true); setError(''); setMensaje('');
    try {
      const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
      const limpio = { ...datos, entidad: datos.entidad.trim(), titular: datos.titular.trim(), numero: datos.numero.trim() };
      if (!limpio.entidad || !limpio.titular || !limpio.numero) throw new Error('Campos vacíos');
      const consulta = editando === null
        ? supabase.from('cuentas_bancarias').insert(limpio)
        : supabase.from('cuentas_bancarias').update(limpio).eq('id', editando);
      const resultado = await consulta.select('id,entidad,titular,moneda,numero').single();
      if (resultado.error) throw resultado.error;
      setCuentas(actual => [...actual.filter(c => c.id !== resultado.data.id), resultado.data].sort((a, b) => a.id - b.id));
      setDatos(vacia); setEditando(null); setMensaje('Cuenta guardada.');
    } catch { setError('No se pudo guardar la cuenta. Revisá los datos e intentá nuevamente.'); }
    finally { setOcupado(false); }
  }

  async function eliminar(id: number) {
    if (ocupado) return;
    setOcupado(true); setError(''); setMensaje('');
    try {
      const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
      const resultado = await supabase.from('cuentas_bancarias').delete().eq('id', id).select('id').single();
      if (resultado.error) throw resultado.error;
      setCuentas(actual => actual.filter(c => c.id !== id));
      if (editando === id) { setEditando(null); setDatos(vacia); }
      setMensaje('Cuenta eliminada.');
    } catch { setError('No se pudo eliminar la cuenta. Intentá nuevamente.'); }
    finally { setOcupado(false); }
  }

  if (!admin) return null;
  return <section className="configuracion-aplicacion" aria-labelledby="titulo-cuentas">
    <h2 id="titulo-cuentas">Cuentas bancarias</h2>
    {cuentas.map(cuenta => <div key={cuenta.id}>
      <p>{cuenta.entidad} — {cuenta.titular} — {cuenta.moneda} — {cuenta.numero}</p>
      <div className="acciones-cuenta-bancaria">
        <button type="button" disabled={ocupado} onClick={() => { setEditando(cuenta.id); setDatos({ entidad: cuenta.entidad, titular: cuenta.titular, moneda: cuenta.moneda, numero: cuenta.numero }); setMensaje(''); setError(''); }}>Editar</button>
        <button type="button" disabled={ocupado} onClick={() => void eliminar(cuenta.id)}>Eliminar</button>
      </div>
    </div>)}
    <h3>{editando === null ? 'Agregar cuenta' : 'Editar cuenta'}</h3>
    <form onSubmit={guardar}>
      <label>Entidad bancaria<input required maxLength={150} value={datos.entidad} onChange={e => setDatos({ ...datos, entidad: e.target.value })} /></label>
      <label>Titular<input required maxLength={150} value={datos.titular} onChange={e => setDatos({ ...datos, titular: e.target.value })} /></label>
      <label>Moneda<select value={datos.moneda} onChange={e => setDatos({ ...datos, moneda: e.target.value })}><option>Pesos</option><option>Dólares</option><option>Pesos y dólares</option></select></label>
      <label>Número<input required maxLength={300} value={datos.numero} onChange={e => setDatos({ ...datos, numero: e.target.value })} /></label>
      <button type="submit" disabled={ocupado}>GUARDAR CUENTA</button>
      {editando !== null && <button type="button" disabled={ocupado} onClick={() => { setEditando(null); setDatos(vacia); }}>Cancelar edición</button>}
    </form>
    {error && <p role="alert">{error}</p>}{mensaje && <p role="status">{mensaje}</p>}
  </section>;
}
