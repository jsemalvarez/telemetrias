/**
 * El firmware de un equipo: la punta de la cadena.
 *
 *     ACÁ --MQTT--> Mosquitto --MQTT--> puente --REST--> la app
 *
 * Publica lo que midió abajo de su propio serial, y no hace nada más. No conoce
 * la aplicación, no habla HTTP y no tiene credencial contra nadie más que el
 * broker. Si mañana el puente cambia de forma, esto no se toca.
 *
 * Escrito para ESP32. En un ESP8266 cambia una sola línea: `<ESP8266WiFi.h>` en
 * lugar de `<WiFi.h>`.
 *
 * ── De dónde sale, y qué reemplaza a qué ──────────────────────────────────
 *
 * Del sketch de Blynk que trajo el cliente: el mismo potenciómetro en el mismo
 * GPIO 34, leído a la misma cadencia. Lo único que cambia es a dónde va el
 * número.
 *
 * `BlynkSimpleEsp32.h` encapsulaba tres cosas, y conviene separarlas porque no
 * todas hay que reponerlas. El transporte contra su nube y la reconexión los
 * pone ahora la librería MQTT, que es de terceros y está probada — no hay nada
 * que escribir de este lado. El modelo de «pines virtuales» —V0, V1— no se
 * repone: es un nombre que sólo existe adentro de esa plataforma. Acá una
 * magnitud se llama por su clave, que es la misma palabra que la aplicación
 * muestra al declararla, y `V0` no le dice nada a nadie seis meses después.
 *
 * Por eso este archivo todavía no tiene una capa propia, y está bien que no la
 * tenga: primero se ve la aguja moverse. Envolver esto en una librería —un
 * `begin(...)` y un `reportar("clave", valor)`, para que el firmware de un
 * equipo sean quince líneas— es el paso siguiente, y sale mejor cuando ya se
 * sabe qué es exactamente lo que hay que envolver.
 *
 * ── Lo que este firmware decide ───────────────────────────────────────────
 *
 * **Publica con QoS 1, y por eso no usa PubSubClient.** La librería más
 * difundida para Arduino sólo publica en QoS 0, y un mensaje QoS 0 no se le
 * encola a un suscriptor ausente: así está el protocolo y no hay configuración
 * del broker que lo cambie. Con el puente caído —un reinicio, un deploy, una
 * notebook que se durmió— todo lo que este equipo mida se perdería sin dejar
 * rastro en ningún registro. Se usa «MQTT», de Joël Gähwiler, que sí publica en
 * QoS 1; en el gestor de bibliotecas del IDE está con ese nombre, a secas.
 *
 * **Manda todas sus magnitudes en un solo mensaje.** El puente agrupa por
 * equipo durante un cuarto de segundo justamente para poder recibirlas
 * separadas, pero juntas es una vuelta menos y un instante más exacto. La forma
 * por magnitud —`tecvol/SERIAL/lecturas/clave`, con el número pelado de cuerpo—
 * también vale, y es la más cómoda para probar con una sola.
 *
 * **No manda la hora.** No la sabe: un ESP32 sin reloj de tiempo real arranca
 * en 1970, y una lectura fechada ahí queda debajo de todas las demás para
 * siempre. Quien sella el instante es el puente, que es el primero de la cadena
 * que sí sabe qué hora es. De ahí se sigue algo práctico: en este JSON van
 * magnitudes y nada más. Cualquier clave de adorno —una fecha, un contador, un
 * `id`— vuelve de la aplicación adentro de `ignoradas`.
 *
 * ── El serial va en MAYÚSCULAS, y no es una cuestión de estilo ────────────
 *
 * El ACL del broker dice `pattern write tecvol/%u/lecturas`, donde `%u` es el
 * usuario con el que este equipo se conectó, y Mosquitto compara esas dos
 * cadenas letra por letra. Conectarse como `TVL-0001` y publicar en
 * `tecvol/tvl-0001/lecturas` es una publicación denegada.
 *
 * Y denegada, en MQTT 3.1.1, quiere decir descartada en silencio: el broker
 * contesta el PUBACK igual, el equipo cree que publicó, el puente no ve nada y
 * el único lugar del mundo donde eso está escrito es el registro del broker
 * (`docker compose logs mosquitto`). Por eso acá hay una sola constante con el
 * serial, y el tópico se arma a partir de ella.
 */

#include <WiFi.h>
#include <MQTT.h>

/**
 * Las tres credenciales —la red, su clave y la clave MQTT de este equipo— viven
 * en `secretos.h`, que no entra al repositorio. Está al lado el
 * `secretos.h.ejemplo`, que sí: copialo sin la última extensión y completalo.
 *
 * Un `.ino` con la contraseña del wifi adentro es la misma contraseña en cada
 * copia del repositorio y en cada máquina que alguna vez lo clone. Acá no hay
 * variables de entorno que valgan —esto compila para un microcontrolador, no
 * corre en Node— así que el archivo aparte es la única separación posible.
 */
#include "secretos.h"

/* ------------------------- Lo que hay que completar ------------------------- */

/**
 * El serial, en mayúsculas y tal cual se lo declaró en la aplicación.
 *
 * Es tres cosas a la vez: el usuario con el que se conecta al broker, el nivel
 * del tópico donde publica, y la fila del padrón a la que se le va a atribuir
 * la lectura. Las tres tienen que decir lo mismo.
 *
 * `TVL-DEMO-01` es «Perilla de luminosidad», en el banco de pruebas, y es el
 * equipo del padrón que declara una magnitud de 0 a 4095 — o sea, exactamente
 * un potenciómetro de doce bits. `TVL-0001` es el tablero principal y sus tres
 * magnitudes son eléctricas: reportarle cuentas del ADC no lo haría moverse.
 */
const char* SERIAL_EQUIPO = "TVL-DEMO-01";

/**
 * Dónde está el broker.
 *
 * La IP de la máquina que corre `docker compose up`, no `localhost`:
 * `localhost` acá adentro es el propio ESP32. En Windows sale de `ipconfig`, y
 * es la IPv4 de la placa que está en la misma red wifi que el equipo.
 *
 * Ojo con cuál: `ipconfig` también lista las de Docker y WSL —suelen empezar
 * con 172— y ésas no las ve nadie desde el wifi. La que sirve es la de la red
 * de casa.
 */
const char* BROKER_HOST   = "192.168.1.60";
const int   BROKER_PUERTO = 1883;

/** Cada cuánto reporta. Un segundo, como el `timer.setInterval` de Blynk. */
const unsigned long CADENCIA_MS = 1000;

/* --------------------------------- La cadena -------------------------------- */

WiFiClient red;

/* 256 bytes de buffer: el que trae por omisión son 128, y ahí no entra un JSON
   de varias magnitudes con nombres largos. Un mensaje que no entra no se manda,
   y la librería lo dice por `lastError()` y por ningún otro lado. */
MQTTClient mqtt(256);

/** `tecvol/TVL-DEMO-01/lecturas`, armado una vez en el arranque. */
char topico[96];

unsigned long ultimoReporte = 0;

/* ---------------------------------- Medir ----------------------------------- */

/**
 * El pin del potenciómetro. Viene del sketch del cliente y no se movió.
 *
 * Que sea el 34 y no cualquier otro importa más de lo que parece: los pines del
 * ADC2 —el 0, el 2, el 4, del 12 al 15 y del 25 al 27— dejan de convertir en
 * cuanto el wifi se conecta, porque la radio se queda con ese conversor. El 34
 * es del ADC1 y convive con el wifi. Un potenciómetro mudado a un pin del ADC2
 * devuelve cero para siempre, y no hay ningún error en ningún lado que lo diga.
 */
const int PIN_POTENCIOMETRO = 34;

/** Cuántas lecturas se promedian en cada reporte. */
const int MUESTRAS = 16;

/**
 * Lo que mide este equipo: el potenciómetro, en cuentas del conversor.
 *
 * Doce bits, o sea de 0 a 4095, tal cual se lo mandaba a Blynk. **Va crudo a
 * propósito en esta primera vuelta**: convertirlo a volts, o a la magnitud que
 * el potenciómetro esté haciendo de cuenta que es, pide saber el divisor y la
 * escala del instrumento, y ésa es una decisión que se toma mirando el fierro.
 * Para verlo en el panel alcanza con declararle a la magnitud una escala de 0 a
 * 4095, y la conversión entra después, acá adentro, sin tocar nada más.
 *
 * Se promedia porque el conversor del ESP32 tiene varias cuentas de ruido, y
 * una aguja que tiembla con el potenciómetro quieto se lee como un problema del
 * sistema y no del ADC.
 */
int medirPotenciometro() {
  long suma = 0;
  for (int i = 0; i < MUESTRAS; i++) suma += analogRead(PIN_POTENCIOMETRO);
  return (int)(suma / MUESTRAS);
}

/* -------------------------------- Conectarse -------------------------------- */

void conectarWifi() {
  Serial.printf("Wifi «%s»", WIFI_RED);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_RED, WIFI_CLAVE);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  /* Sin esto el ESP32 duerme la radio entre paquetes y le agrega décimas al
     reporte. Se ve en el panel como una aguja que llega tarde sin motivo. */
  WiFi.setSleep(false);
  Serial.printf(" conectado, %s\n", WiFi.localIP().toString().c_str());
}

void conectarBroker() {
  Serial.print("Broker");

  /* El identificador de cliente es el serial: único en todo el parque, que es
     lo que pide el protocolo. Dos equipos con el mismo se echan mutuamente en
     un bucle, y es el mismo cuidado que está escrito en scripts/puente.ts. */
  while (!mqtt.connect(SERIAL_EQUIPO, SERIAL_EQUIPO, BROKER_CLAVE)) {
    /* 4 y 5 del CONNACK son «usuario o contraseña mal» y «no autorizado». No
       mejoran reintentando cada dos segundos para siempre: hay que corregir la
       credencial, y eso se dice con todas las letras en vez de dejar una fila
       de puntos suspensivos que no explica nada. */
    lwmqtt_return_code_t motivo = mqtt.returnCode();
    if (motivo == LWMQTT_BAD_USERNAME_OR_PASSWORD || motivo == LWMQTT_NOT_AUTHORIZED) {
      Serial.printf("\n  El broker rechazó la credencial de %s.\n", SERIAL_EQUIPO);
      Serial.printf("  Rotala con:  npm run mqtt:credencial -- %s\n\n", SERIAL_EQUIPO);
      delay(10000);
      Serial.print("Broker");
      continue;
    }
    Serial.print(".");
    delay(2000);
  }

  Serial.printf(" conectado como %s, publicando en %s\n", SERIAL_EQUIPO, topico);
}

/* --------------------------------- Reportar --------------------------------- */

void reportar() {
  char cuerpo[192];

  /* `luminosidad` es lo que sale del rótulo «Luminosidad» al declarar la
     magnitud en la aplicación, y es lo que la pantalla muestra ahí mismo, en el
     renglón «La reporta como …». Las claves no se eligen a mano: una que no
     coincida vuelve con 200 y la lectura adentro de `ignoradas` — o sea sin
     error en ningún lado y con la aguja quieta. El puente lo escribe en su
     registro, una vez por corrida.

     Éste es el lugar donde Blynk decía `virtualWrite(V0, …)`. */
  snprintf(cuerpo, sizeof(cuerpo), "{\"luminosidad\":%d}", medirPotenciometro());

  /* QoS 1. Ver el encabezado: es lo que hace que el broker le guarde esto al
     puente mientras el puente no está. */
  if (!mqtt.publish(topico, cuerpo, false, 1)) {
    Serial.printf("no salió (%d): %s\n", mqtt.lastError(), cuerpo);
    return;
  }

  Serial.printf("%s\n", cuerpo);
}

/* ---------------------------------- Arduino --------------------------------- */

void setup() {
  Serial.begin(115200);
  delay(200);

  snprintf(topico, sizeof(topico), "tecvol/%s/lecturas", SERIAL_EQUIPO);

  conectarWifi();

  mqtt.begin(BROKER_HOST, BROKER_PUERTO, red);
  /* Antes de conectar, que es cuando el valor viaja adentro del CONNECT. */
  mqtt.setKeepAlive(30);
  conectarBroker();
}

void loop() {
  /* Perder el enlace es un estado y no un error, acá también: se reconecta y se
     sigue. Los dos se chequean en cada vuelta porque el wifi puede caerse sin
     que el socket MQTT se entere hasta el siguiente keepalive. */
  if (WiFi.status() != WL_CONNECTED) conectarWifi();
  if (!mqtt.connected()) conectarBroker();

  mqtt.loop();

  if (millis() - ultimoReporte < CADENCIA_MS) return;
  ultimoReporte = millis();
  reportar();
}
