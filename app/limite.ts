const esperaMaxima = 15000;

export async function conLimite<T>(operacion: (signal: AbortSignal) => PromiseLike<T>, controlador = new AbortController()): Promise<T> {
  let temporizador: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Promise.resolve(operacion(controlador.signal)),
      new Promise<never>((_, rechazar) => {
        temporizador = setTimeout(() => {
          controlador.abort();
          rechazar(new Error('Tiempo de espera agotado'));
        }, esperaMaxima);
      }),
    ]);
  } finally {
    clearTimeout(temporizador);
  }
}
