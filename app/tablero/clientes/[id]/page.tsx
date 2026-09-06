import { redirect } from 'next/navigation';

/**
 * La entrada a un cliente.
 *
 * Desde que la empresa tiene dos pantallas —personal y dispositivos— cada una
 * vive bajo su segmento, y ésta se quedó sin contenido propio: mandar a la
 * primera es más honesto que inventarle un resumen que repetiría lo que hay una
 * pantalla más abajo.
 *
 * Redirige y no desaparece porque esta URL ya se emitió: fue la única forma de
 * entrar a un cliente desde que existe la ruta, y las filas del padrón de
 * empresas apuntaban acá. Un enlace guardado tiene que seguir llegando a algún
 * lado.
 *
 * No valida nada, a propósito. El corte entre empresas y la existencia del
 * cliente los decide la ruta de destino, que es la que va a leer el padrón;
 * hacerlo también acá serían dos lugares donde mantener la misma regla, y el
 * día que se toque uno solo, esta ruta contestaría distinto que la otra.
 */
export default function ClienteRuta({ params }: { params: { id: string } }) {
  redirect(`/tablero/clientes/${params.id}/personal`);
}
