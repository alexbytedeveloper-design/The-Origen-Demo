# Agents.md – Proyecto DEMO The Origen

## 🎯 Objetivo
Construir un DEMO funcional del sitio web *The Origen* con:
- Frontend completo e interactivo.
- Backend básico para login y carga dinámica.
- Seguridad obligatoria (OSWAP Top 10).
- SQL mínimo para registrar usuarios.
- Traducción del sitio (ES/EN/FR/RU).
- Estilo visual gourmet con mezcla de Skeuomorfismo + Glassmorfismo.

---

## 🧩 Agentes

- **Agente Frontend (DeepSeek V4 Free)**  
  - Implementa UI completa .
  - Interacción mínima: scroll → carga de contenido.  
  - Diseño gourmet optimizado para móviles.  
  - Soporte multilenguaje (ES/EN/FR/RU).  
  - **Estilo visual:**  
    - **Skeuomorfismo:** tarjetas de menú con textura papel/madera, botones con relieve metálico, iconos realistas (platos, copas, cubiertos), fondos con mármol/cuero.  
    - **Glassmorfismo:** navbar translúcida con blur, modales de login/reservas con efecto cristal, tarjetas secundarias translúcidas para reseñas/promos, hover states con brillo translúcido.  
    - **Paleta de colores gourmet:**  
      - Blanco crema + dorado suave.  
      - Negro profundo + plateado metálico.  
      - Burdeos vino + cobre.  
      - Verde botella + oro viejo.  
      - **Gradientes sugeridos:** crema → dorado → cobre; negro → plateado → azul oscuro; burdeos → vino → púrpura translúcido.  

- **Agente Backend (DeepSeek V4 Free)**  
  - APIs básicas para login y autenticación.  
  - Manejo de lógica de carga dinámica.  
  - Conexión mínima con SQL (tabla de usuarios).  

- **Agente Seguridad (DeepSeek V4 Free)**  
  - Cumplimiento estricto de **OSWAP Top 10**.  
  - Protección contra XSS, CSRF, SQL Injection.  
  - Autenticación segura con JWT.  
  - Configuración de HTTPS/TLS.  

- **Agente Traducción (DeepSeek V4 Free)**  
  - Sistema i18n para ES/EN/FR/RU.  
  - Traducción de contenido estático y dinámico.  
  - Documentación bilingüe para el equipo.  

---

## ⚖️ Restricciones
- Cumplir con OSWAP Top 10 sin excepciones.  
- SQL mínimo: tabla `users` con login seguro.  
- Optimización para móviles y accesibilidad (WCAG).  
- Evitar dependencias externas innecesarias.  

---

## 📊 Flujo de trabajo
1. **Frontend**: UI completa + scroll loading + skeuo/glass visual.  
2. **Backend**: APIs básicas + SQL login.  
3. **Seguridad**: Aplicar OSWAP Top 10.  
4. **Traducción**: Implementar i18n (ES/EN/FR/RU).  
5. **Testing básico**: Validar login y carga dinámica.
# STACK 
1. Next.js para Frontend
2. Python con FastAPI para Backend
3. Postgre SQL 
4. OSWAP TOP 10

