'use client';

import { createBrowserClient } from '@supabase/ssr';
import { useEffect, useState, type FormEvent } from 'react';
import AgendaCliente from './agenda-cliente';
import { enviarEmailBienvenida } from './bienvenida-actions';

function BotonRegistro({ pending }: { pending: boolean }) {
  return <button type="submit" disabled={pending}>{pending ? 'Registrando...' : 'Registrarse'}</button>;
}

function BotonIngreso({ pending }: { pending: boolean }) {
  return <button type="submit" disabled={pending}>{pending ? 'Ingresando...' : 'Ingresar'}</button>;
}

export default function Home() {
  const [mensaje, setMensaje] = useState('');
  const [emailUsuario, setEmailUsuario] = useState<string | null>(null);
  const ingresado = emailUsuario !== null;
  const [errorIngreso, setErrorIngreso] = useState('');
  const [registrando, setRegistrando] = useState(false);
  const [ingresando, setIngresando] = useState(false);
  const [versionCitas, setVersionCitas] = useState(0);

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    );
    supabase.auth.getUser().then(({ data }) => setEmailUsuario(data.user?.email ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange(event => {
      if (event === 'SIGNED_OUT') {
        setEmailUsuario(null);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  async function ingresar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    );
    setIngresando(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: String(formData.get('email')),
      password: String(formData.get('password')),
    });
    setIngresando(false);
    setErrorIngreso(error ? 'No se pudo iniciar sesión.' : '');
    if (!error) setEmailUsuario(data.user.email ?? null);
  }

  async function registrar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    if (!String(formData.get('nombre')).trim()) {
      setMensaje('Ingresá tu nombre completo.');
      return;
    }
    if (!String(formData.get('telefono')).trim()) {
      setMensaje('Ingresá tu teléfono.');
      return;
    }
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    );
    setRegistrando(true);
    const { error } = await supabase.auth.signUp({
      email: String(formData.get('email')),
      password: String(formData.get('password')),
      options: { data: {
        nombre: String(formData.get('nombre')),
        telefono: String(formData.get('telefono')),
        sexo: String(formData.get('sexo')),
      } },
    });
    setRegistrando(false);
    setMensaje(error ? 'No se pudo completar el registro.' : 'Cuenta creada.');
    if (!error) {
      void enviarEmailBienvenida().catch(() => {});
    }
  }

  return (
    <main className="container">
      <header className={ingresado ? 'introduccion introduccion-cuenta' : 'introduccion'}>{!ingresado && <p className="marca">BIENVENIDO A LITO</p>}<h1>{ingresado ? 'LITO MASAJES' : <>Tu bienestar<br />comienza acá</>}<span className="punto-titulo">.</span></h1><p>{ingresado ? 'Elegí una opción para continuar.' : 'Creá tu cuenta o ingresá para acceder a LITO.'}</p></header>
      {ingresado ? <AgendaCliente key={emailUsuario} versionCitas={versionCitas} onSolicitudFinalizada={() => setVersionCitas(valor => valor + 1)} /> : <div className="formularios">
      <form aria-label="Registro" onSubmit={registrar}>
        <h2>Crear cuenta</h2>
        <label>Nombre completo<input name="nombre" aria-describedby={mensaje === 'Ingresá tu nombre completo.' ? 'error-nombre' : undefined} /></label>
        {mensaje === 'Ingresá tu nombre completo.' && <p id="error-nombre" role="alert">{mensaje}</p>}
        <label>Email<input name="email" type="email" /></label>
        <label>Teléfono<input name="telefono" type="tel" aria-describedby={mensaje === 'Ingresá tu teléfono.' ? 'error-telefono' : undefined} /></label>
        {mensaje === 'Ingresá tu teléfono.' && <p id="error-telefono" role="alert">{mensaje}</p>}
        <label>Sexo<select name="sexo">
          <option>Hombre</option>
          <option>Mujer</option>
          <option>Prefiero no especificar</option>
        </select></label>
        <label>Contraseña<input name="password" type="password" /></label>
        <BotonRegistro pending={registrando} />
        {mensaje !== 'Ingresá tu nombre completo.' && mensaje !== 'Ingresá tu teléfono.' && <p role="status">{mensaje}</p>}
      </form>
      <form aria-label="Iniciar sesión" onSubmit={ingresar}>
        <h2>Iniciar sesión</h2>
        <label>Email<input name="email" type="email" /></label>
        <label>Contraseña<input name="password" type="password" /></label>
        <BotonIngreso pending={ingresando} />
        <p role="alert">{errorIngreso}</p>
      </form>
      </div>}
    </main>
  );
}
