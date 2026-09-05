import 'server-only';

/**
 * Freno de intentos de acceso.
 *
 * En memoria del proceso: se pierde al reiniciar y no se comparte entre
 * instancias. Es a propósito — no hay base de datos todavía y un freno flojo es
 * mejor que ninguno contra el caso real, que es alguien probando contraseñas
 * contra `/api/auth/entrar` desde una misma dirección. Cuando haya base o Redis,
 * se muda el mapa y la interfaz queda igual.
 */

const VENTANA = 15 * 60 * 1000;
const TOPE = 8;

const intentos = new Map<string, { cuenta: number; hasta: number }>();

export function frenado(llave: string) {
  const reg = intentos.get(llave);
  if (!reg) return null;
  const ahora = Date.now();
  if (ahora > reg.hasta) {
    intentos.delete(llave);
    return null;
  }
  if (reg.cuenta < TOPE) return null;
  return { segundos: Math.ceil((reg.hasta - ahora) / 1000) };
}

export function anotarFallo(llave: string) {
  const ahora = Date.now();
  const reg = intentos.get(llave);
  if (!reg || ahora > reg.hasta) {
    intentos.set(llave, { cuenta: 1, hasta: ahora + VENTANA });
    return;
  }
  reg.cuenta += 1;

  /* El mapa se limpia solo al vencer cada entrada, pero si nadie vuelve a
     intentar, la entrada queda. Con este volumen no importa; con base de datos
     lo resuelve el TTL. */
  if (intentos.size > 5000) {
    intentos.forEach((v, k) => {
      if (ahora > v.hasta) intentos.delete(k);
    });
  }
}

export function limpiar(llave: string) {
  intentos.delete(llave);
}

/**
 * De dónde viene el pedido. Detrás de un proxy hay que confiar en la cabecera
 * que ese proxy escribe; sin proxy, `x-forwarded-for` es falsificable y este
 * freno vale poco. Está anotado para que quede claro qué garantiza.
 */
export function origen(cabeceras: Headers) {
  return (
    cabeceras.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    cabeceras.get('x-real-ip') ||
    'desconocido'
  );
}
