# Despliegue: frontend (Render) + backend (Vercel)

El navegador **nunca** llama al backend por su dominio. Todas las peticiones
salen del mismo origen y Next las reescribe:

```
Navegador  →  https://the-origen-frontend.onrender.com/backend/api/v1/*
                    │  (rewrite en el servidor de Next)
                    ▼
              https://the-origen-backend.vercel.app/api/v1/*
```

Motivo: la sesión vive en cookies `httpOnly` y el CSRF es de doble envío. Si el
navegador llamara a otro dominio, la cookie dejaría de ser de primer origen y
habría que abrir CORS, `SameSite=None` y `credentials: include` en cada fetch.
Con el rewrite, Render y Vercel se comportan igual que `localhost`.

Configuración centralizada: `frontend/lib/api.ts`
(`API_URL`, `API_INTERNAL_URL`, `API_BASE`, `SITE_URL`). El rewrite vive en
`frontend/next.config.ts`.

## Variables de entorno

### Frontend (Render → servicio web de Next)

| Variable | Local | Producción | Cuándo se lee |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | `https://the-origen-backend.vercel.app` | build y runtime |
| `API_INTERNAL_URL` | vacío (usa la anterior) | misma URL que arriba | build (rewrite) y runtime (SSR) |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` | `https://the-origen-frontend.onrender.com` | build (canonical, sitemap, OG) |

> En Render, define las tres **antes del build**. Next graba el destino del
> rewrite y los metadatos canónicos en el build; cambiarlas después exige
> volver a desplegar.

### Backend (Vercel)

| Variable | Valor |
| --- | --- |
| `APP_ENV` | `production` |
| `SEED_DEMO` | `false` |
| `JWT_SECRET` | 32+ caracteres aleatorios |
| `DATA_ENCRYPTION_KEY` | 32 bytes en base64 (AES-256-GCM) |
| `DATABASE_URL` | Postgres gestionado (`postgresql+asyncpg://…`) |
| `FRONTEND_ORIGIN` | `https://the-origen-frontend.onrender.com` |
| `COOKIE_SECURE` | `true` |
| `ALLOWED_HOSTS` | `the-origen-backend.vercel.app,*.vercel.app` |
| `TRUST_PROXY` | `true` solo si la plataforma reescribe `X-Forwarded-For` |

`FRONTEND_ORIGIN` sigue siendo obligatorio: el rewrite reenvía la cabecera
`Origin` del navegador y el backend la valida contra ese valor.

## Verificación tras desplegar

```bash
# 1. El proxy responde (debe ser 200 y JSON de FastAPI)
curl -i https://the-origen-frontend.onrender.com/backend/api/v1/health

# 2. La ruta antigua sin proxy no existe (404)
curl -i https://the-origen-frontend.onrender.com/api/v1/health

# 3. Metadatos y rutas SEO
curl -s https://the-origen-frontend.onrender.com/robots.txt
curl -s https://the-origen-frontend.onrender.com/sitemap.xml | head -n 12
curl -s https://the-origen-frontend.onrender.com/es | grep -o 'rel="canonical"[^>]*'
curl -sI https://the-origen-frontend.onrender.com/es/opengraph-image

# 4. Login real (las cookies deben quedar en el dominio de Render)
#    desde el navegador: demo@theorigen.cu / Origen2026!
```

Comprobaciones en el navegador: DevTools → Application → Cookies. Deben
aparecer `origen_access`, `origen_refresh` (httpOnly) y `origen_csrf`, todas
con dominio `the-origen-frontend.onrender.com` y `Secure`.

## Problemas típicos

| Síntoma | Causa probable |
| --- | --- |
| `502` en `/backend/...` | `NEXT_PUBLIC_API_URL`/`API_INTERNAL_URL` mal escrita o backend caído |
| `400 Invalid host header` | falta el host del backend en `ALLOWED_HOSTS` |
| `403 csrf_failed` | `FRONTEND_ORIGIN` no coincide con la URL de Render |
| Login responde 200 pero `/auth/me` da 401 | cookies bloqueadas: `COOKIE_SECURE=false` en HTTPS o dominio distinto |
| El menú llega vacío en el HTML | el SSR no alcanza el backend; revisa `API_INTERNAL_URL` y el timeout de 4 s |
| Se indexa `localhost` | `NEXT_PUBLIC_SITE_URL` no estaba definida en el build |

## Docker Compose

`docker-compose.yml` pasa `API_INTERNAL_URL=http://api:8000` como *build arg*
(para el rewrite) y como variable de runtime (para el SSR). El navegador sigue
usando `/backend/*`.
