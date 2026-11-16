# The Origen — memoria técnica del demo

Última actualización: 2026-11-16 · Estado: cambios locales sin commit.

Este documento resume la arquitectura, el modelo de seguridad, la auditoría
aplicada, las pruebas y las decisiones que no conviene revertir. `README.md`
pertenece al usuario y no se modificó.

---

## 1. Resumen ejecutivo

The Origen es un sitio demo premium para una parrilla y barra en Miramar, La
Habana. Tiene cuatro idiomas (ES/EN/FR/RU), portada editorial, carta completa con
índice pegajoso, reservas, acceso con sesión y páginas legales. El backend es
FastAPI + SQLAlchemy async; el frontend es Next.js 16 (App Router) y habla con la
API únicamente a través de un proxy del mismo origen.

Lo importante del estado actual:

- **135 pruebas de backend** y **67 pruebas de frontend** en verde.
- `npm run build` y `npm run typecheck` pasan.
- `npm audit --omit=dev` (frontend): **0 vulnerabilidades de producción**.
- Prueba de carga local: **600 peticiones, 32 en paralelo, 0 fallos**.
- El límite de cuerpo, el CSRF, el bloqueo progresivo y el cifrado de datos
  personales ya están cubiertos por pruebas de regresión.
- El demo sigue siendo de una sola instancia: el limitador de ráfagas y el
  candado de escritura del guardia viven en memoria. Para varias réplicas hay
  que moverlos a Redis o a la base de datos (ver §8).

---

## 2. Cómo ejecutarlo

### API

```powershell
cd backend
$env:DATABASE_URL="sqlite+aiosqlite:///./origen.db"
$env:JWT_SECRET="dev-only-secret-change-me-0123456789abcdef"
$env:DATA_ENCRYPTION_KEY="dev-data-key-0123456789abcdef!!!"
$env:COOKIE_SECURE="false"
$env:SEED_DEMO="true"
$env:APP_ENV="development"
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

También existe `npm run dev:api`, que carga `.env` y usa SQLite por defecto.

### Web

```powershell
npm run build
npm --prefix frontend run start
```

`API_INTERNAL_URL` (por defecto `http://127.0.0.1:8000`) decide a qué API apunta
el proxy de Next. El navegador solo ve `/backend/api/v1/...` en el mismo origen.

### Pruebas

```powershell
npm run test:api       # pytest dentro de backend/.venv
npm run test:web       # vitest del frontend
npm run typecheck
npm run build
npm run stress:api     # requiere la API arrancada
```

Usuario demo: `demo@theorigen.cu` / `Origen2026!`.

---

## 3. Arquitectura

### Frontend

```
frontend/
  app/[locale]/page.tsx              portada editorial
  app/[locale]/menu/page.tsx         carta completa
  app/[locale]/legal/[slug]/page.tsx privacidad y créditos
  components/sections/               Hero, House, Fire, Reviews, Events, Bar, Booking
  components/menu/                   portada de carta, capítulos e índice sticky
  components/auth/                   modal y proveedor de sesión
  components/content/                carga diferida del contenido
  messages/{es,en,fr,ru}.ts          copy de interfaz
  lib/{api,contact,format,legal}.ts  cliente HTTP y datos verificables
  lib/server-content.ts              carga inicial de la carta en servidor
  tests/                             pruebas Vitest
```

- La portada **no muestra la carta**. El menú vive en la barra de navegación y
  en `/{locale}/menu`.
- La portada y la carta piden el contenido en el **servidor** (`lib/server-content.ts`)
  y lo entregan ya renderizado en el primer HTML. Así la carta, las reseñas y la
  barra funcionan en pestañas ocultas o en segundo plano. La carga diferida del
  cliente (`ContentProvider` + `useContentOnView`) queda como reintento si la
  API no responde en ese primer intento.
- Los nombres de platos se quedan en español en los cuatro idiomas; el resto de
  la interfaz se traduce.
- El índice de la carta usa `position: sticky` dentro de `.menu-book`; en móvil
  se convierte en una tira horizontal pegajosa. `.menu-page` usa
  `overflow: clip` para contener adornos sin crear un contenedor de scroll.
- Las reseñas están marcadas como muestra (`sample: true` + aviso visible)
  hasta que el restaurante entregue las reales.

### Backend

```
backend/app/
  main.py             app, middleware, manejadores de error, health
  config.py           configuración validada y secretos
  db.py               motor async, pool, PRAGMAs de SQLite
  models.py           User, LoginGuard, Reservation
  schemas.py          contratos Pydantic y ventana de reservas
  security.py         Argon2id, JWT, huellas de refresh
  session.py          cookies de sesión y rotación
  crypto.py           AES-256-GCM para PII
  encrypted.py        tipo SQLAlchemy cifrado
  login_guard.py      bloqueo progresivo por IP y cuenta
  rate_limit.py       limitador de ráfagas acotado (LRU)
  body_limit.py       límite real de bytes del cuerpo
  net.py              IP del cliente y validación de Origin
  clock.py            fecha local del restaurante
  routers/            auth, content, reservations
  content/*.json      carta y reseñas por idioma
```

- SQLite en desarrollo; Postgres con `asyncpg` en producción.
- `GET /api/v1/health` comprueba la base con `SELECT 1`.
- Los errores de validación no devuelven los valores enviados (podrían ser
  contraseñas); solo campo, tipo y mensaje.
- Cada respuesta lleva `X-Request-ID`; si el cliente manda uno válido se
  conserva.

---

## 4. Modelo de seguridad

### Sesiones

- Cookies `origen_access` y `origen_refresh`: `HttpOnly`, `SameSite=Lax`,
  `Secure` en producción, `Path=/`.
- El refresh rota en cada uso y guarda una huella (`refresh_hash`) en la base.
  Reutilizar un refresh viejo revoca la sesión completa.
- Un refresh no sirve como access ni un access como refresh; ambos tokens
  llevan `typ` y se validan por separado.
- El logout funciona incluso con el access caducado: revoca el refresh y borra
  cookies.
- Errores de acceso desconocido y contraseña incorrecta son idénticos; se usa
  un hash señuelo (`DUMMY_HASH`) para igualar tiempos.

### Contraseñas y datos personales

- Contraseñas: **Argon2id**, con rehash transparente si cambian los parámetros.
  No se usa “AES-256 como hash”: un hash no es cifrado reversible.
- Datos personales de reservas (nombre, correo, teléfono, notas): **AES-256-GCM**
  con prefijo `enc:v1:`, AAD y detección de manipulación. El texto vacío también
  se cifra correctamente. Las columnas antiguas en claro se siguen leyendo y se
  migran al escribir.
- La clave de datos se valida al arrancar: 32 bytes en texto, base64 o hex.
  En producción `DATA_ENCRYPTION_KEY` es obligatoria.

### CSRF y origen

- Doble envío: cookie `origen_csrf` legible por JavaScript + cabecera
  `X-CSRF-Token`; la comparación es en bytes y en tiempo constante.
- Se exige `Origin` permitido y se rechaza `Sec-Fetch-Site: cross-site`.
- Un `Origin` malformado o una cabecera CSRF no ASCII devuelven 403, nunca 500.
- La cookie CSRF se emite en peticiones seguras y rota al iniciar sesión.

### Fuerza bruta

- 5 fallos por IP y por cuenta en una ventana de 24 h.
- Al quinto: bloqueo de `24 h × 3^(strike−1)`, con techo de 30 días
  (`24 h → 72 h → 216 h → …`).
- Si la IP acumula 5 strikes, queda **bloqueada de forma permanente**.
- Un acceso correcto limpia fallos y bloqueo, pero conserva los strikes.
- Los strikes caducan a los 90 días sin nuevos fallos.
- Ráfagas adicionales: login 10/min por IP y por correo, registro 5/h,
  reservas 10/h.
- Las escrituras del guardia se serializan por bucle de eventos y hacen commit
  dentro del candado. Si dos peticiones simultáneas cruzan el umbral, la que
  llega después también recibe 429 en lugar de un 401 engañoso.

> El candado y el limitador son **por proceso**. Varias réplicas requieren
> Redis o un candado de base de datos (ver §8).

### Cabeceras y configuración

- `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, CSP restrictiva,
  `Referrer-Policy`, `Permissions-Policy`, CORP/COOP, `X-Robots-Tag: noindex`.
- HSTS solo en producción.
- `TrustedHostMiddleware` con lista explícita; `CORS` con origen permitido.
- En producción: `SEED_DEMO=false`, `COOKIE_SECURE=true`, sin `*` en hosts,
  documentación OpenAPI desactivada y secretos obligatorios.
- `BodyLimitMiddleware` cuenta los bytes reales, también en `Transfer-Encoding:
  chunked`, y responde 413 con las cabeceras de seguridad.
- `Content-Length` negativo o no numérico: 400 `bad_content_length`.

### Reservas

- Fecha entre hoy y 90 días, en la zona horaria del restaurante
  (`America/Havana`, con desfase fijo de respaldo si falta `tzdata`).
- Horarios de 12:00 a 23:00, 1–8 comensales.
- Nombre normalizado; correo en minúsculas; teléfono validado; notas de hasta
  400 caracteres.
- Un usuario autenticado queda vinculado a su reserva; la respuesta no expone
  `userId`.

---

## 5. Auditoría: hallazgos corregidos

| Área | Hallazgo | Corrección |
| --- | --- | --- |
| Límite de cuerpo | Solo se miraba `Content-Length`; un cuerpo chunked gigante llegaba al parser | Middleware que cuenta bytes reales y responde 413 antes de deserializar |
| CSRF | Cabecera no ASCII podía provocar 500 | Comparación en bytes UTF-8 y 403 controlado |
| Origin | Puertos/URLs malformadas podían lanzar excepción | `origin_allowed` captura y rechaza sin romper |
| Cifrado | Texto vacío no se podía descifrar (longitud mínima mal calculada) | `len < 28` y prueba de ida y vuelta con `""` |
| Fuerza bruta | Escrituras concurrentes podían perder fallos | Candado por bucle + commit dentro del candado |
| Fuerza bruta | Una petición simultánea posterior al bloqueo devolvía 401 | Si el guardia ya está bloqueado, devuelve 429/403 |
| Fechas | La validación usaba la fecha UTC del servidor | `restaurant_today()` con zona del restaurante |
| Memoria | Limitador de ráfagas podía crecer sin límite con correos distintos | LRU acotada (10 000 claves) |
| Pool DB | Sin configuración de pool para Postgres | `DB_POOL_SIZE`, `DB_POOL_TIMEOUT`, `DB_POOL_RECYCLE`, `DB_MAX_OVERFLOW` |
| Caché de contenido | `stat()` duplicado por petición | Una sola lectura de mtime |
| Código muerto | `User.failed_attempts`, `User.locked_until`, `deps.current_user`, `login_guard.clear_all` | Eliminados; el estado vive en `LoginGuard` |
| Docker | Runner de Next sin `next.config.ts`; compose con `APP_ENV=production` y cookies inseguras | Config copiada, compose de demo coherente, build arg de URL pública |
| Servidor | Cabecera `Server` de Uvicorn | `--no-server-header` |

Riesgos aceptados o pendientes:

- Las reseñas son muestras claramente marcadas; no son reseñas reales.
- Las fotos siguen siendo placeholders de Wikimedia Commons con atribución.
- El texto legal debe revisarse antes de publicar; describe el
  comportamiento real del demo, pero no sustituye asesoría legal.
- La retención de reservas a seis meses está prometida en la política de
  privacidad; **falta un job operativo** que borre/resuma datos antiguos.
- `ruff`, `vulture`, `bandit`, `pip-audit` y `tzdata` no se pudieron instalar
  porque el acceso a PyPI estaba bloqueado en este entorno. La revisión fue
  manual + `pytest` + `npm audit`. En un entorno con red conviene ejecutarlos.

---

## 6. Pruebas

### Backend — 135 pruebas

Cubren, entre otras cosas:

- Configuración y validación de secretos, hosts, orígenes y límites.
- Cifrado AES-GCM: ida y vuelta, vacío, manipulación, truncado, prefijo.
- Tokens: expiración, tipo, firma alterada, refresh reutilizado, logout con
  access caducado.
- Cookies y CSRF: rotación, cookie legible, cabecera no ASCII, origen inválido.
- Guardia de acceso: ventana, escalada 24 h/72 h, caducidad de strikes, bloqueo
  concurrente por IP.
- Reservas: límites de fecha/hora/comensales, teléfono, notas vacías y Unicode,
  cifrado en base, rate limit, vínculo con usuario.
- Contenido: cuatro idiomas, precios positivos, sin HTML, reseñas de muestra,
  cabeceras de caché e idioma.
- Infraestructura: cuerpo chunked, `Content-Length` inválido, hosts no
  permitidos, CORS, cabeceras de seguridad.
- Estrés: health/contenido/reservas en paralelo y bloqueo tras fallos
  concurrentes.

### Frontend — 79 pruebas

- `server-content`: carga sin caché, codificación del idioma, API caída,
  respuesta de error y JSON incompleto.
- `format`: precios, fechas largas, plurales ES/EN/RU, fechas locales.
- `contact`: teléfono, dirección, Instagram, WhatsApp codificado.
- `api`: proxy, codificación de locale, CSRF, 204, errores de red/API, JSON
  inválido.
- `messages`: paridad de estructura entre idiomas, textos vacíos, “La Casa”,
  nombres del menú, datos reales, reseñas marcadas y encabezados editoriales
  elegidos (con regresión por idioma).
- `legal`: cinco secciones por idioma, teléfono, cookies técnicas, créditos.
- `menu`: 6 secciones / 19 grupos / 92 platos, ids estables, nombres de platos
  en español, precios positivos, reseñas de muestra.

### Resultados

```text
backend: 135 passed
frontend: 79 passed (7 archivos)
next build: OK
tsc --noEmit: OK
npm audit --omit=dev (frontend): 0 vulnerabilidades
```

---

## 7. Estrés y soporte

`scripts/stress_api.py` (envoltorio `npm run stress:api`) hace:

1. **Preflight**: health, eco de `X-Request-ID`, 404 controlado, cabeceras de
   seguridad, contenido de los cuatro idiomas y `Content-Language`.
2. **Carga mixta**: 75 % health y 25 % contenido, con `ThreadPoolExecutor`.
3. **Métricas**: min, p50, p95, p99, máximo, media y req/s; devuelve código de
   salida distinto de cero si hay fallos o si se supera `--max-p95`.

No escribe reservas ni intenta accesos, así que puede correrse contra el demo
sin ensuciar la base.

Resultados locales (Windows, SQLite, un proceso Uvicorn):

| Peticiones | Concurrencia | Fallos | p50 | p95 | p99 | Ritmo |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 400 | 24 | 0 | 88 ms | 117 ms | 124 ms | ~278 req/s |
| 600 | 32 | 0 | 158 ms | 374 ms | 542 ms | ~185 req/s |

Son cifras de demo, no un benchmark de producción: incluyen logging de Uvicorn y
SQLite en el mismo equipo. Lo relevante es que no hubo errores ni respuestas
inconsistentes.

---

## 8. Escalabilidad

El diseño actual aguanta bien el tráfico de un restaurante y permite crecer sin
reescribir la aplicación. Orden recomendado:

1. **Varias réplicas de API**: mover `RateLimiter` a Redis (o al proxy) y el
   candado de `login_guard` a Redis/Postgres (`SELECT … FOR UPDATE` o advisory
   lock). Sin esto, cada réplica lleva su propio contador y el bloqueo deja de
   ser global.
2. **Proxy inverso**: TLS, límite de cuerpo y de conexiones en nginx/Caddy o en
   el balanceador; activar `TRUST_PROXY=true` solo si el proxy es de confianza.
   El limitador del proxy complementa al de la app.
3. **Postgres**: dimensionar `(DB_POOL_SIZE + DB_MAX_OVERFLOW) × réplicas` por
   debajo de `max_connections`. Añadir índices de administración cuando exista
   panel: `reservations(status, booking_date)` y `reservations(created_at)`.
4. **Contenido**: la carta vive en JSON y se cachea por proceso. Si crece o la
   edita el restaurante, mover a un CMS/objeto estático y servir con CDN. El
   frontend ya separa la carga de la carta del HTML inicial.
5. **Imágenes**: seguir usando `next/image` (AVIF/WebP) y servir originales
   desde CDN/almacenamiento de objetos. Las fotos actuales son placeholders.
6. **Correo/notificaciones**: las reservas no envían correo todavía. Añadir una
   cola (por ejemplo, un job en Postgres o un servicio externo) para no bloquear
   la petición ni perder avisos.
7. **Observabilidad**: recolectar `X-Request-ID`, latencias y códigos; alertar
   sobre picos de 401/403/429/500 y sobre el health. Añadir backups y prueba de
   restauración.
8. **Retención**: job diario que borre o anonimice reservas de más de seis meses
   y cuentas inactivas, alineado con la política de privacidad.
9. **Panel interno**: si se añade, protegerlo con rol `staff`, MFA y auditoría
   de accesos; hoy solo existe el rol en el modelo.

---

## 9. Pendientes externos (no inventar)

- Fotos reales del restaurante (hoy: placeholders con crédito).
- Fecha del evento Habano (el bloque es premium, pero la fecha no se conoce).
- Correo de reservas / destino de avisos.
- URL pública del demo y dominio definitivo.
- Revisión legal de los textos de privacidad y créditos.
- Sustituir reseñas de muestra por reseñas reales cuando estén disponibles.

---

## 10. Decisiones que no se deben revertir

- **Argon2id para contraseñas**; AES-256-GCM solo para PII en reposo.
- **CSRF de doble envío + Origin + Sec-Fetch-Site** en toda escritura.
- **Límite real de bytes** además de `Content-Length`.
- **Bloqueo progresivo** 24 h → 72 h → … con techo de 30 días y bloqueo
  permanente de IP tras 5 strikes.
- **Menú solo en navbar y `/{locale}/menu`**, nunca en la portada.
- **Nombres de platos en español** en los cuatro idiomas.
- **Reseñas marcadas como muestra** hasta tener reales.
- **Índice de carta sticky** y `.menu-page` con `overflow: clip` (no `hidden`).
- **Datos verificables**: teléfono `+53 50667554`, dirección “Calle 3ra entre 24
  y 26, Miramar”, horario 12:00–00:00, Instagram `@origen_cuba`, piedra
  caliente (no dry-aged).
- **Contenido en el primer HTML**: la portada y la carta piden el contenido en el
  servidor; la carga diferida del cliente es solo reintento. Revertirlo devuelve
  los esqueletos en pestañas ocultas.
- **Encabezados elegidos por el restaurante** (ES; el resto traducido en
  `frontend/messages/{en,fr,ru}.ts`):
  - 01 Nosotros: “Un lugar para disfrutar.”
  - 02 La piedra: “El punto exacto de la carne sobre tu mesa.”
  - 03 Reseñas: “Siempre se habla al final.”
  - 04 La barra: “Detrás de la barra, el tiempo se mide en sorbos.”
  - 05 La noche: “La noche también suena.”
  - 06 Reservas: “Una mesa para ti.”
  - Kicker de la barra: “Coctelería” (los demás quedan como estaban).
  - H3 de la piedra: “El sello” · “Lo que trae el día” · “El punto justo”.
  - H3 de la noche: “La agenda de noviembre.” y “Habano, ron y sobremesa.”;
    “Catas y encuentros” sin ampersand.
- **No tocar `README.md`**; el control de Git lo lleva el usuario.

---

## 11. Últimos cambios locales

Sin commit, a la espera de revisión del usuario. Los archivos principales
modificados o añadidos están listados en `git status`. Las pruebas nuevas están
en `backend/tests/` y `frontend/tests/`; los scripts operativos, en
`scripts/`. La base local `backend/origen.db` y la clave `.origen-data-key` son
de desarrollo y están ignoradas por Git.

Cambios de esta ronda: renderizado del contenido en servidor
(`lib/server-content.ts`, `ContentProvider` con `initialData`, portada y carta)
y encabezados editoriales definitivos en los cuatro idiomas con su prueba de
regresión. El servidor de producción local se reconstruyó y se verificó en
`/es`, `/en`, `/fr`, `/ru` y `/es/menu`.
